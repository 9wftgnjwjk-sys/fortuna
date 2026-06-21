import { TrendingUp, TrendingDown, DollarSign, Loader2 } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNetWorth } from '@/hooks/useNetWorth'
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

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(142.1_76.2%_36.3%)]" />
      </div>
    )
  }

  const pieTotal = (data?.allocation ?? []).reduce((s, a) => s + a.value, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">儀表板</h1>
        <p className="text-sm text-[hsl(240_5%_64.9%)]">資產總覽</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="淨資產" value={formatCurrency(data?.netWorth ?? 0, baseCurrency)} icon={DollarSign} />
        <StatCard title="總資產" value={formatCurrency(data?.totalAssets ?? 0, baseCurrency)} icon={TrendingUp} />
        <StatCard title="總負債" value={formatCurrency(data?.totalLiabilities ?? 0, baseCurrency)} icon={TrendingDown} positive={false} />
      </div>

      {data && data.allocation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>總資產配置</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data.allocation}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ percent }) => (percent ?? 0) > 0.04 ? `${((percent ?? 0) * 100).toFixed(1)}%` : ''}
                  labelLine={false}
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
                  formatter={(value, entry: any) => {
                    const pct = pieTotal > 0 ? ((entry.payload?.value ?? 0) / pieTotal * 100).toFixed(1) : '0'
                    return <span style={{ color: 'hsl(240 5% 80%)' }}>{value} {pct}%</span>
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 負債概況 */}
      {data && data.totalLiabilities > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>負債概況</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[hsl(240_5%_64.9%)]">負債佔總資產</span>
              <span className="font-semibold text-red-400">
                {data.totalAssets > 0 ? `${(data.totalLiabilities / data.totalAssets * 100).toFixed(1)}%` : '—'}
              </span>
            </div>
            {data.totalAssets > 0 && (
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-[hsl(240_3.7%_15.9%)]">
                <div
                  className="bg-[hsl(142.1_76.2%_36.3%)] transition-all"
                  style={{ width: `${Math.min(100, data.netWorth / data.totalAssets * 100)}%` }}
                />
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${Math.min(100, data.totalLiabilities / data.totalAssets * 100)}%` }}
                />
              </div>
            )}
            <div className="flex justify-between text-xs text-[hsl(240_5%_64.9%)]">
              <span>淨資產 {formatCurrency(data.netWorth, baseCurrency)}</span>
              <span>負債 {formatCurrency(data.totalLiabilities, baseCurrency)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 資產明細 */}
      {data && data.detail.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>資產明細</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.detail.filter((d) => d.category === 'cash').length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(240_5%_64.9%)] mb-2">現金 / 銀行</p>
                <div className="space-y-1.5">
                  {data.detail.filter((d) => d.category === 'cash').map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-white">{d.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-[hsl(240_5%_64.9%)] w-12 text-right">
                          {data.totalAssets > 0 ? `${(d.value / data.totalAssets * 100).toFixed(1)}%` : '—'}
                        </span>
                        <span className="font-semibold text-white w-32 text-right">
                          {formatCurrency(d.value, baseCurrency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.detail.filter((d) => d.category === 'cash').length > 0 &&
              data.detail.filter((d) => d.category === 'investment').length > 0 && (
              <div className="border-t border-[hsl(240_3.7%_15.9%)]" />
            )}

            {data.detail.filter((d) => d.category === 'investment').length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(240_5%_64.9%)] mb-2">投資部位</p>
                <div className="space-y-1.5">
                  {data.detail.filter((d) => d.category === 'investment').map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-white">{d.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-[hsl(240_5%_64.9%)] w-12 text-right">
                          {data.totalAssets > 0 ? `${(d.value / data.totalAssets * 100).toFixed(1)}%` : '—'}
                        </span>
                        <span className="font-semibold text-white w-32 text-right">
                          {formatCurrency(d.value, baseCurrency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
