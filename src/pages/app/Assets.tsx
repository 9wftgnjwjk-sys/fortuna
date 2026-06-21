import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from '@/hooks/useAccounts'
import { usePositions, useCreatePosition, useUpdatePosition, useDeletePosition } from '@/hooks/usePositions'
import { usePrices } from '@/hooks/usePrices'
import { fetchQuote } from '@/lib/quotes'
import { formatCurrency } from '@/lib/utils'
import type { Account, Position, AccountType, PositionType, Currency } from '@/types'

const accountTypeLabels: Record<AccountType, string> = {
  cash: '現金', bank: '銀行', real_estate: '房產', other: '其他',
}

const positionTypeLabels: Record<PositionType, string> = {
  tw_stock: '台股', us_stock: '美股', jp_stock: '日股', hk_stock: '港股', crypto: '加密貨幣',
}

const currencies: Currency[] = ['TWD', 'USD', 'JPY', 'HKD', 'EUR', 'GBP', 'BTC', 'ETH']

type AccountForm = { name: string; type: AccountType; currency: Currency; balance: string }
type PositionForm = { name: string; symbol: string; type: PositionType; quantity: string; currency: Currency; cost_price: string }

const defaultAccountForm: AccountForm = { name: '', type: 'bank', currency: 'TWD', balance: '' }
const defaultPositionForm: PositionForm = { name: '', symbol: '', type: 'tw_stock', quantity: '', currency: 'TWD', cost_price: '' }

export default function Assets() {
  const { data: accounts = [], isLoading: loadingAccounts } = useAccounts()
  const { data: positions = [], isLoading: loadingPositions } = usePositions()
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const deleteAccount = useDeleteAccount()
  const createPosition = useCreatePosition()
  const updatePosition = useUpdatePosition()
  const deletePosition = useDeletePosition()

  const positionSymbols = useMemo(() => positions.map((p) => p.symbol), [positions])
  const { data: prices = {} } = usePrices(positionSymbols)

  const [accountDialog, setAccountDialog] = useState<{ open: boolean; editing: Account | null }>({ open: false, editing: null })
  const [positionDialog, setPositionDialog] = useState<{ open: boolean; editing: Position | null }>({ open: false, editing: null })
  const [accountForm, setAccountForm] = useState<AccountForm>(defaultAccountForm)
  const [positionForm, setPositionForm] = useState<PositionForm>(defaultPositionForm)
  const [symbolLooking, setSymbolLooking] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function openNewAccount() {
    setAccountForm(defaultAccountForm)
    setAccountDialog({ open: true, editing: null })
  }

  function openEditAccount(a: Account) {
    setAccountForm({ name: a.name, type: a.type, currency: a.currency, balance: String(a.balance) })
    setAccountDialog({ open: true, editing: a })
  }

  async function handleSaveAccount() {
    const payload = {
      name: accountForm.name,
      type: accountForm.type,
      currency: accountForm.currency,
      balance: parseFloat(accountForm.balance) || 0,
    }
    if (accountDialog.editing) {
      await updateAccount.mutateAsync({ id: accountDialog.editing.id, ...payload })
    } else {
      await createAccount.mutateAsync(payload)
    }
    setAccountDialog({ open: false, editing: null })
  }

  async function handleSymbolBlur() {
    const { symbol, type, name } = positionForm
    if (!symbol || name) return
    setSymbolLooking(true)
    const result = await fetchQuote(symbol, type)
    setSymbolLooking(false)
    if (result?.name) setPositionForm((f) => ({ ...f, name: result.name! }))
  }

  function openNewPosition() {
    setPositionForm(defaultPositionForm)
    setSaveError(null)
    setPositionDialog({ open: true, editing: null })
  }

  function openEditPosition(p: Position) {
    setPositionForm({
      name: p.name, symbol: p.symbol, type: p.type,
      quantity: String(p.quantity), currency: p.currency,
      cost_price: p.cost_price != null ? String(p.cost_price) : '',
    })
    setPositionDialog({ open: true, editing: p })
  }

  async function handleSavePosition() {
    setSaveError(null)
    const payload = {
      name: positionForm.name,
      symbol: positionForm.symbol.toUpperCase(),
      type: positionForm.type,
      quantity: parseFloat(positionForm.quantity) || 0,
      currency: positionForm.currency,
      cost_price: positionForm.cost_price ? parseFloat(positionForm.cost_price) : null,
    }
    try {
      if (positionDialog.editing) {
        await updatePosition.mutateAsync({ id: positionDialog.editing.id, ...payload })
      } else {
        await createPosition.mutateAsync(payload)
      }
      setPositionDialog({ open: false, editing: null })
    } catch (err) {
      const msg = err instanceof Error ? err.message
        : (err as { message?: string })?.message
        ?? JSON.stringify(err)
      setSaveError(msg || '儲存失敗，請再試一次')
    }
  }

  if (loadingAccounts || loadingPositions) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[hsl(142.1_76.2%_36.3%)]" /></div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">資產</h1>

      {/* 現金/銀行/房產 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>帳戶</CardTitle>
          <Button size="sm" onClick={openNewAccount}><Plus className="h-4 w-4" />新增帳戶</Button>
        </CardHeader>
        <CardContent>
          {accounts.length === 0
            ? <p className="text-center text-sm text-[hsl(240_5%_64.9%)] py-8">尚無帳戶</p>
            : (
              <div className="space-y-2">
                {accounts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg bg-[hsl(240_3.7%_8%)] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{accountTypeLabels[a.type]}</Badge>
                      <span className="text-white">{a.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-white">{formatCurrency(a.balance, a.currency)}</span>
                      <button onClick={() => openEditAccount(a)} className="text-[hsl(240_5%_64.9%)] hover:text-white"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => deleteAccount.mutate(a.id)} className="text-[hsl(240_5%_64.9%)] hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </CardContent>
      </Card>

      {/* 投資部位 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>投資部位</CardTitle>
          <Button size="sm" onClick={openNewPosition}><Plus className="h-4 w-4" />新增部位</Button>
        </CardHeader>
        <CardContent>
          {positions.length === 0
            ? <p className="text-center text-sm text-[hsl(240_5%_64.9%)] py-8">尚無投資部位</p>
            : (
              <div className="space-y-2">
                {positions.map((p) => {
                  const currentPrice = prices[p.symbol]?.price ?? null
                  const returnRate = p.cost_price != null && currentPrice != null
                    ? (currentPrice - p.cost_price) / p.cost_price * 100
                    : null
                  return (
                    <div key={p.id} className="rounded-lg bg-[hsl(240_3.7%_8%)] px-4 py-3 space-y-1.5">
                      {/* 第一行：標籤 + 名稱 + 按鈕 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{positionTypeLabels[p.type]}</Badge>
                          <span className="font-mono text-sm text-[hsl(142.1_76.2%_56%)]">{p.symbol}</span>
                          {p.name && <span className="text-white">{p.name}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditPosition(p)} className="text-[hsl(240_5%_64.9%)] hover:text-white"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => deletePosition.mutate(p.id)} className="text-[hsl(240_5%_64.9%)] hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                      {/* 第二行：持倉數字 */}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-[hsl(240_5%_64.9%)]">× {p.quantity}</span>
                        {currentPrice != null && (
                          <span className="text-white">現價 {formatCurrency(currentPrice, p.currency)}</span>
                        )}
                        {p.cost_price != null && (
                          <span className="text-[hsl(240_5%_64.9%)]">均價 {formatCurrency(p.cost_price, p.currency)}</span>
                        )}
                        {returnRate != null && (
                          <span className={`font-semibold ${returnRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {returnRate >= 0 ? '+' : ''}{returnRate.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }
        </CardContent>
      </Card>

      {/* 帳戶 Dialog */}
      <Dialog open={accountDialog.open} onOpenChange={(open) => setAccountDialog({ open, editing: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{accountDialog.editing ? '編輯帳戶' : '新增帳戶'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>名稱</Label>
              <Input value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="玉山銀行" />
            </div>
            <div className="space-y-2">
              <Label>類型</Label>
              <Select value={accountForm.type} onValueChange={(v) => setAccountForm({ ...accountForm, type: v as AccountType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(accountTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>幣別</Label>
                <Select value={accountForm.currency} onValueChange={(v) => setAccountForm({ ...accountForm, currency: v as Currency })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>餘額</Label>
                <Input type="number" value={accountForm.balance} onChange={(e) => setAccountForm({ ...accountForm, balance: e.target.value })} placeholder="0" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountDialog({ open: false, editing: null })}>取消</Button>
            <Button onClick={handleSaveAccount} disabled={createAccount.isPending || updateAccount.isPending}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 部位 Dialog */}
      <Dialog open={positionDialog.open} onOpenChange={(open) => setPositionDialog({ open, editing: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{positionDialog.editing ? '編輯部位' : '新增部位'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>代號</Label>
                <div className="relative">
                  <Input value={positionForm.symbol} onChange={(e) => setPositionForm({ ...positionForm, symbol: e.target.value })} onBlur={handleSymbolBlur} placeholder="2330" />
                  {symbolLooking && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-[hsl(240_5%_64.9%)]" />}
                </div>
              </div>
              <div className="space-y-2">
                <Label>名稱</Label>
                <Input value={positionForm.name} onChange={(e) => setPositionForm({ ...positionForm, name: e.target.value })} placeholder="台積電" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>市場類型</Label>
              <Select value={positionForm.type} onValueChange={(v) => setPositionForm({ ...positionForm, type: v as PositionType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(positionTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>持有數量</Label>
                <Input type="number" value={positionForm.quantity} onChange={(e) => setPositionForm({ ...positionForm, quantity: e.target.value })} placeholder="1000" />
              </div>
              <div className="space-y-2">
                <Label>幣別</Label>
                <Select value={positionForm.currency} onValueChange={(v) => setPositionForm({ ...positionForm, currency: v as Currency })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>均價（買入成本，選填）</Label>
              <Input type="number" value={positionForm.cost_price} onChange={(e) => setPositionForm({ ...positionForm, cost_price: e.target.value })} placeholder="0.00" />
            </div>
          </div>
          {saveError && <p className="text-sm text-red-400">{saveError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPositionDialog({ open: false, editing: null })}>取消</Button>
            <Button onClick={handleSavePosition} disabled={createPosition.isPending || updatePosition.isPending}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
