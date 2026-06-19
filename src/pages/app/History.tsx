import { Loader2 } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSnapshots } from '@/hooks/useSnapshots'
import { useSettingsStore } from '@/store/settings'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function History() {
  const { data: snapshots = [], isLoading } = useSnapshots()
  const baseCurrency = useSettingsStore((s) => s.baseCurrency)

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[hsl(142.1_76.2%_36.3%)]" /></div>
  }

  const chartData = snapshots.map((s) => ({
    date: s.snapshot_date,
    netWorth: s.net_worth,
    totalAssets: s.total_assets,
    totalLiabilities: s.total_liabilities,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">歷史趨勢</h1>
        <p className="text-sm text-[hsl(240_5%_64.9%)]">淨資產隨時間的變化</p>
      </div>

      {snapshots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[hsl(240_5%_64.9%)]">尚無歷史資料，在儀表板點「儲存快照」開始記錄！</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle>淨資產趨勢</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 3.7% 15.9%)" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(240 5% 50%)"
                    tick={{ fill: 'hsl(240 5% 64.9%)', fontSize: 12 }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis
                    stroke="hsl(240 5% 50%)"
                    tick={{ fill: 'hsl(240 5% 64.9%)', fontSize: 12 }}
                    tickFormatter={(v) => formatCurrency(v, baseCurrency)}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatCurrency(Number(value), baseCurrency),
                      name === 'netWorth' ? '淨資產' : name === 'totalAssets' ? '總資產' : '總負債',
                    ]}
                    labelFormatter={(label) => formatDate(label)}
                    contentStyle={{
                      backgroundColor: 'hsl(240 10% 8%)',
                      border: '1px solid hsl(240 3.7% 15.9%)',
                      borderRadius: '8px',
                      color: 'white',
                    }}
                  />
                  <Line type="monotone" dataKey="netWorth" stroke="hsl(142.1 76.2% 36.3%)" strokeWidth={2} dot={false} name="netWorth" />
                  <Line type="monotone" dataKey="totalAssets" stroke="hsl(210 100% 60%)" strokeWidth={2} dot={false} name="totalAssets" strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="totalLiabilities" stroke="hsl(0 70% 50%)" strokeWidth={2} dot={false} name="totalLiabilities" strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>快照記錄</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...snapshots].reverse().slice(0, 30).map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg bg-[hsl(240_3.7%_8%)] px-4 py-3 text-sm">
                    <span className="text-[hsl(240_5%_64.9%)]">{formatDate(s.snapshot_date)}</span>
                    <div className="flex gap-6">
                      <span className="text-[hsl(210_100%_60%)]">資產 {formatCurrency(s.total_assets, s.base_currency as never)}</span>
                      <span className="text-red-400">負債 {formatCurrency(s.total_liabilities, s.base_currency as never)}</span>
                      <span className="font-semibold text-[hsl(142.1_76.2%_56%)]">淨值 {formatCurrency(s.net_worth, s.base_currency as never)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
