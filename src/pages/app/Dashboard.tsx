import { TrendingUp, TrendingDown, DollarSign, Loader2, Save } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNetWorth } from '@/hooks/useNetWorth'
import { useCreateSnapshot } from '@/hooks/useSnapshots'
import { useSettingsStore } from '@/store/settings'
import { formatCurrency } from '@/lib/utils'

function StatCard({
  title, value, icon: Icon, positive,
}: { title: string; value: string; icon: React.ElementType; positive?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-[hsl(240_5%_64.9%)]">{title}</CardTitle>
        <Icon className="h-4 w-4 text-[hsl(240_5%_64.9%)]" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${positive === false ? 'text-red-400' : 'text-white'}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const baseCurrency = useSettingsStore((s) => s.baseCurrency)
  const { data, isLoading } = useNetWorth()
  const createSnapshot = useCreateSnapshot()

  async function handleSaveSnapshot() {
    if (!data) return
    await createSnapshot.mutateAsync({
      total_assets: data.totalAssets,
      total_liabilities: data.totalLiabilities,
      net_worth: data.netWorth,
      base_currency: baseCurrency,
      snapshot_date: new Date().toISOString().split('T')[0],
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(142.1_76.2%_36.3%)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">儀表板</h1>
          <p className="text-sm text-[hsl(240_5%_64.9%)]">資產總覽</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveSnapshot}
          disabled={createSnapshot.isPending}
        >
          <Save className="h-4 w-4" />
          儲存快照
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="淨資產"
          value={formatCurrency(data?.netWorth ?? 0, baseCurrency)}
          icon={DollarSign}
        />
        <StatCard
          title="總資產"
          value={formatCurrency(data?.totalAssets ?? 0, baseCurrency)}
          icon={TrendingUp}
        />
        <StatCard
          title="總負債"
          value={formatCurrency(data?.totalLiabilities ?? 0, baseCurrency)}
          icon={TrendingDown}
          positive={false}
        />
      </div>

      {data && data.allocation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>資產配置</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.allocation}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={120}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.allocation.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value), baseCurrency)}
                  contentStyle={{
                    backgroundColor: 'hsl(240 10% 8%)',
                    border: '1px solid hsl(240 3.7% 15.9%)',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: 'hsl(240 5% 80%)' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {(!data || data.allocation.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <DollarSign className="mb-4 h-12 w-12 text-[hsl(240_5%_40%)]" />
            <p className="text-[hsl(240_5%_64.9%)]">還沒有任何資產，前往「資產」頁面開始新增吧！</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
