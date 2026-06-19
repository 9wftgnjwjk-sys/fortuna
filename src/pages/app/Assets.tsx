import { useState } from 'react'
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
type PositionForm = { name: string; symbol: string; type: PositionType; quantity: string; currency: Currency; manual_price: string }

const defaultAccountForm: AccountForm = { name: '', type: 'bank', currency: 'TWD', balance: '' }
const defaultPositionForm: PositionForm = { name: '', symbol: '', type: 'tw_stock', quantity: '', currency: 'TWD', manual_price: '' }

export default function Assets() {
  const { data: accounts = [], isLoading: loadingAccounts } = useAccounts()
  const { data: positions = [], isLoading: loadingPositions } = usePositions()
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const deleteAccount = useDeleteAccount()
  const createPosition = useCreatePosition()
  const updatePosition = useUpdatePosition()
  const deletePosition = useDeletePosition()

  const [accountDialog, setAccountDialog] = useState<{ open: boolean; editing: Account | null }>({ open: false, editing: null })
  const [positionDialog, setPositionDialog] = useState<{ open: boolean; editing: Position | null }>({ open: false, editing: null })
  const [accountForm, setAccountForm] = useState<AccountForm>(defaultAccountForm)
  const [positionForm, setPositionForm] = useState<PositionForm>(defaultPositionForm)

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

  function openNewPosition() {
    setPositionForm(defaultPositionForm)
    setPositionDialog({ open: true, editing: null })
  }

  function openEditPosition(p: Position) {
    setPositionForm({
      name: p.name, symbol: p.symbol, type: p.type,
      quantity: String(p.quantity), currency: p.currency,
      manual_price: p.manual_price != null ? String(p.manual_price) : '',
    })
    setPositionDialog({ open: true, editing: p })
  }

  async function handleSavePosition() {
    const payload = {
      name: positionForm.name,
      symbol: positionForm.symbol.toUpperCase(),
      type: positionForm.type,
      quantity: parseFloat(positionForm.quantity) || 0,
      currency: positionForm.currency,
      manual_price: positionForm.manual_price ? parseFloat(positionForm.manual_price) : null,
    }
    if (positionDialog.editing) {
      await updatePosition.mutateAsync({ id: positionDialog.editing.id, ...payload })
    } else {
      await createPosition.mutateAsync(payload)
    }
    setPositionDialog({ open: false, editing: null })
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
                {positions.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-[hsl(240_3.7%_8%)] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{positionTypeLabels[p.type]}</Badge>
                      <div>
                        <span className="font-mono text-sm text-[hsl(142.1_76.2%_56%)]">{p.symbol}</span>
                        <span className="ml-2 text-white">{p.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[hsl(240_5%_64.9%)]">× {p.quantity}</span>
                      {p.manual_price && (
                        <span className="font-semibold text-white">{formatCurrency(p.manual_price, p.currency)}</span>
                      )}
                      {!p.manual_price && <Badge variant="default" className="text-xs">自動報價</Badge>}
                      <button onClick={() => openEditPosition(p)} className="text-[hsl(240_5%_64.9%)] hover:text-white"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => deletePosition.mutate(p.id)} className="text-[hsl(240_5%_64.9%)] hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
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
                <Input value={positionForm.symbol} onChange={(e) => setPositionForm({ ...positionForm, symbol: e.target.value })} placeholder="2330" />
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
              <Label>手動價格（留空則自動抓取）</Label>
              <Input type="number" value={positionForm.manual_price} onChange={(e) => setPositionForm({ ...positionForm, manual_price: e.target.value })} placeholder="自動" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPositionDialog({ open: false, editing: null })}>取消</Button>
            <Button onClick={handleSavePosition} disabled={createPosition.isPending || updatePosition.isPending}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
