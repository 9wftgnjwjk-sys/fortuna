import { useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Loader2, ChevronLeft, RefreshCw } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNetWorth } from '@/hooks/useNetWorth'
import { useAccounts } from '@/hooks/useAccounts'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { usePortfolioTrend, type TrendPoint } from '@/hooks/usePortfolioTrend'
import { useSettingsStore } from '@/store/settings'
import { convertCurrency } from '@/lib/currency'
import { formatCurrency } from '@/lib/utils'
import type { Currency } from '@/types'

const DRILL_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#22c55e', '#ef4444']

function MiniTrendChart({
  data, dataKey, color, gradId, baseCurrency,
}: {
  data: TrendPoint[]
  dataKey: keyof TrendPoint
  color: string
  gradId: string
  baseCurrency: string
}) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 3.7% 15.9%)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'hsl(240 5% 64.9%)' }}
          tickFormatter={(v: string) => v.slice(5)}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(240 5% 64.9%)' }}
          tickFormatter={(v: number) => {
            if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
            if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`
            return String(v)
          }}
          width={52}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(240 10% 8%)',
            border: '1px solid hsl(240 3.7% 15.9%)',
            borderRadius: '8px',
            color: 'white',
            fontSize: 12,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => [formatCurrency(Number(value), baseCurrency as any)]}
          labelFormatter={(label: unknown) => String(label)}
        />
        <Area
          type="monotone"
          dataKey={dataKey as string}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradId})`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

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
  const { data: trendPoints = [], isLoading: trendLoading } = usePortfolioTrend()
  const { data: accounts = [] } = useAccounts()
  const { data: rates, isFetching: ratesFetching, refresh: refreshRates } = useExchangeRates()
  const [drillCategory, setDrillCategory] = useState<'cash' | 'investment' | null>(null)

  // Non-base currencies used in cash accounts
  const foreignCurrencies = [...new Set(
    accounts
      .filter((a) => a.currency !== baseCurrency)
      .map((a) => a.currency as Currency)
  )]

  const ratesUpdatedAt = rates?.timestamp
    ? new Date(rates.timestamp).toLocaleString('zh-TW', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      })
    : null

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(142.1_76.2%_36.3%)]" />
      </div>
    )
  }

  // ── Pie chart data ─────────────────────────────────────────────────────────
  const topLevel = data?.allocation ?? []

  const drillItems = drillCategory
    ? (data?.detail ?? [])
        .filter((d) => d.category === drillCategory)
        .map((d, i) => ({ name: d.name, value: d.value, color: DRILL_COLORS[i % DRILL_COLORS.length] }))
    : []

  const pieData = drillCategory ? drillItems : topLevel
  const pieTotal = pieData.reduce((s, a) => s + a.value, 0)

  const drillTitle = drillCategory === 'cash' ? '現金 / 銀行' : '投資部位'

  function handleSliceClick(entry: { name?: string }) {
    if (drillCategory) return
    if (entry.name === '現金/銀行') setDrillCategory('cash')
    else if (entry.name === '投資') setDrillCategory('investment')
  }

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

      {data && topLevel.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            {drillCategory && (
              <button
                onClick={() => setDrillCategory(null)}
                className="text-[hsl(240_5%_64.9%)] hover:text-white transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <CardTitle>{drillCategory ? drillTitle : '總資產配置'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ percent }) => (percent ?? 0) > 0.04 ? `${((percent ?? 0) * 100).toFixed(1)}%` : ''}
                  labelLine={false}
                  onClick={handleSliceClick}
                  cursor={drillCategory ? 'default' : 'pointer'}
                >
                  {pieData.map((entry, index) => (
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
                    const clickable = !drillCategory && (value === '現金/銀行' || value === '投資')
                    return (
                      <span
                        style={{ color: 'hsl(240 5% 80%)', cursor: clickable ? 'pointer' : 'default' }}
                        onClick={() => clickable && handleSliceClick({ name: value })}
                      >
                        {value} {pct}%
                      </span>
                    )
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

      {/* 資產趨勢 */}
      {(trendLoading || trendPoints.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>資產趨勢</CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[hsl(240_5%_64.9%)]" />
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="mb-1 text-xs font-semibold text-[hsl(240_5%_64.9%)]">純投資部位</p>
                  <MiniTrendChart data={trendPoints} dataKey="investments" color="#3b82f6" gradId="gradInvest" baseCurrency={baseCurrency} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold text-[hsl(240_5%_64.9%)]">投資部位 + 現金</p>
                  <MiniTrendChart data={trendPoints} dataKey="withCash" color="#f59e0b" gradId="gradWithCash" baseCurrency={baseCurrency} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold text-[hsl(240_5%_64.9%)]">淨資產（扣除負債）</p>
                  <MiniTrendChart data={trendPoints} dataKey="netWorth" color="#22c55e" gradId="gradNet" baseCurrency={baseCurrency} />
                </div>
              </div>
            )}
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

      {/* 匯率 */}
      {foreignCurrencies.length > 0 && rates && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>匯率</CardTitle>
            <button
              onClick={refreshRates}
              disabled={ratesFetching}
              title="重新整理匯率"
              className="text-[hsl(240_5%_64.9%)] hover:text-white transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${ratesFetching ? 'animate-spin' : ''}`} />
            </button>
          </CardHeader>
          <CardContent className="space-y-2">
            {foreignCurrencies.map((currency) => {
              const rate = convertCurrency(1, currency, baseCurrency as Currency, rates)
              return (
                <div key={currency} className="flex items-center justify-between text-sm">
                  <span className="text-[hsl(240_5%_64.9%)]">1 {currency}</span>
                  <span className="font-semibold text-white">
                    = {rate.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {baseCurrency}
                  </span>
                </div>
              )
            })}
            {ratesUpdatedAt && (
              <p className="pt-1 text-xs text-[hsl(240_5%_40%)]">更新時間：{ratesUpdatedAt}</p>
            )}
          </CardContent>
        </Card>
      )}

      {(!data || topLevel.length === 0) && (
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
