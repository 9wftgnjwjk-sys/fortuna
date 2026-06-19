import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSettingsStore } from '@/store/settings'
import { useAuthStore } from '@/store/auth'
import type { Currency } from '@/types'

const currencies: { value: Currency; label: string }[] = [
  { value: 'TWD', label: '新台幣 (TWD)' },
  { value: 'USD', label: '美元 (USD)' },
  { value: 'JPY', label: '日圓 (JPY)' },
  { value: 'HKD', label: '港幣 (HKD)' },
  { value: 'EUR', label: '歐元 (EUR)' },
  { value: 'GBP', label: '英鎊 (GBP)' },
]

export default function Settings() {
  const baseCurrency = useSettingsStore((s) => s.baseCurrency)
  const setBaseCurrency = useSettingsStore((s) => s.setBaseCurrency)
  const user = useAuthStore((s) => s.user)

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-white">設定</h1>

      <Card>
        <CardHeader>
          <CardTitle>帳號</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-[hsl(240_5%_64.9%)]">登入帳號</p>
          <p className="font-medium text-white">{user?.email}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>顯示設定</CardTitle>
          <CardDescription>資產換算的基準幣別</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>基準幣別</Label>
            <Select value={baseCurrency} onValueChange={(v) => setBaseCurrency(v as Currency)}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-[hsl(240_5%_50%)]">
              所有資產會自動換算成此幣別顯示
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>隱私與安全</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[hsl(240_5%_64.9%)] space-y-2">
          <p>資料儲存於 Supabase 雲端，僅限本帳號存取。</p>
          <p>Percento 不儲存任何銀行密碼或交易憑證。</p>
        </CardContent>
      </Card>
    </div>
  )
}
