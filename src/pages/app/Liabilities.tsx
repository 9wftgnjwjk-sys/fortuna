import { useState } from 'react'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLiabilities, useCreateLiability, useUpdateLiability, useDeleteLiability } from '@/hooks/useLiabilities'
import { formatCurrency, computeLiabilityBalance, computePayoffDate } from '@/lib/utils'
import type { Liability, LiabilityType, Currency } from '@/types'

const liabilityTypeLabels: Record<LiabilityType, string> = {
  mortgage: '房貸', credit: '信貸', other: '其他',
}

const currencies: Currency[] = ['TWD', 'USD', 'JPY', 'HKD', 'EUR', 'GBP']

type LiabilityForm = {
  name: string
  type: LiabilityType
  currency: Currency
  balance: string
  monthly_payment: string
  payment_start_date: string
}

const defaultForm: LiabilityForm = {
  name: '', type: 'mortgage', currency: 'TWD', balance: '',
  monthly_payment: '', payment_start_date: '',
}

export default function Liabilities() {
  const { data: liabilities = [], isLoading } = useLiabilities()
  const createLiability = useCreateLiability()
  const updateLiability = useUpdateLiability()
  const deleteLiability = useDeleteLiability()

  const [dialog, setDialog] = useState<{ open: boolean; editing: Liability | null }>({ open: false, editing: null })
  const [form, setForm] = useState<LiabilityForm>(defaultForm)
  const [saveError, setSaveError] = useState<string | null>(null)

  function openNew() {
    setForm(defaultForm)
    setSaveError(null)
    setDialog({ open: true, editing: null })
  }

  function openEdit(l: Liability) {
    setForm({
      name: l.name,
      type: l.type,
      currency: l.currency,
      balance: String(l.balance),
      monthly_payment: l.monthly_payment != null ? String(l.monthly_payment) : '',
      // type="month" expects "YYYY-MM", strip the day part if present
      payment_start_date: l.payment_start_date ? l.payment_start_date.substring(0, 7) : '',
    })
    setSaveError(null)
    setDialog({ open: true, editing: l })
  }

  async function handleSave() {
    setSaveError(null)
    const payload = {
      name: form.name,
      type: form.type,
      currency: form.currency,
      balance: parseFloat(form.balance) || 0,
      monthly_payment: form.monthly_payment ? parseFloat(form.monthly_payment) : null,
      // append "-01" so PostgreSQL DATE type gets a valid "YYYY-MM-DD"
      payment_start_date: form.payment_start_date ? form.payment_start_date + '-01' : null,
    }
    try {
      if (dialog.editing) {
        await updateLiability.mutateAsync({ id: dialog.editing.id, ...payload })
      } else {
        await createLiability.mutateAsync(payload)
      }
      setDialog({ open: false, editing: null })
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? JSON.stringify(err)
      setSaveError(msg || '儲存失敗，請再試一次')
    }
  }

  const totalTWD = liabilities.reduce((sum, l) => {
    if (l.currency === 'TWD') return sum + computeLiabilityBalance(l)
    return sum
  }, 0)

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[hsl(142.1_76.2%_36.3%)]" /></div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">負債</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>負債清單</CardTitle>
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" />新增負債</Button>
        </CardHeader>
        <CardContent>
          {liabilities.length === 0
            ? <p className="text-center text-sm text-[hsl(240_5%_64.9%)] py-8">尚無負債紀錄</p>
            : (
              <div className="space-y-2">
                {liabilities.map((l) => {
                  const remaining = computeLiabilityBalance(l)
                  const hasAutoCalc = l.monthly_payment != null && l.payment_start_date != null
                  const payoffDate = computePayoffDate(l)
                  return (
                    <div key={l.id} className="rounded-lg bg-[hsl(240_3.7%_8%)] px-4 py-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="destructive">{liabilityTypeLabels[l.type]}</Badge>
                          <span className="text-white">{l.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-red-400">{formatCurrency(remaining, l.currency)}</span>
                          <button onClick={() => openEdit(l)} className="text-[hsl(240_5%_64.9%)] hover:text-white"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => deleteLiability.mutate(l.id)} className="text-[hsl(240_5%_64.9%)] hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                      {hasAutoCalc && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[hsl(240_5%_64.9%)]">
                          <span>原始金額 {formatCurrency(l.balance, l.currency)}</span>
                          <span>·</span>
                          <span>每月 -{formatCurrency(l.monthly_payment!, l.currency)}</span>
                          <span>·</span>
                          <span>自 {l.payment_start_date?.substring(0, 7)} 起</span>
                          {payoffDate && (
                            <>
                              <span>·</span>
                              <span>預計 <span className="text-amber-400">{payoffDate}</span> 還清</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                <div className="flex justify-between border-t border-[hsl(240_3.7%_15.9%)] pt-3 mt-3">
                  <span className="text-[hsl(240_5%_64.9%)]">台幣合計（不含換算）</span>
                  <span className="font-bold text-red-400">{formatCurrency(totalTWD, 'TWD')}</span>
                </div>
              </div>
            )
          }
        </CardContent>
      </Card>

      <Dialog open={dialog.open} onOpenChange={(open) => setDialog({ open, editing: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog.editing ? '編輯負債' : '新增負債'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>名稱</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="房屋貸款" />
            </div>
            <div className="space-y-2">
              <Label>類型</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as LiabilityType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(liabilityTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>幣別</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v as Currency })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>原始貸款金額</Label>
                <Input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>每月還款金額（選填）</Label>
                <Input type="number" value={form.monthly_payment} onChange={(e) => setForm({ ...form, monthly_payment: e.target.value })} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>開始還款日期（選填）</Label>
                <Input type="month" value={form.payment_start_date} onChange={(e) => setForm({ ...form, payment_start_date: e.target.value })} />
              </div>
            </div>
          </div>
          {saveError && <p className="text-sm text-red-400">{saveError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, editing: null })}>取消</Button>
            <Button onClick={handleSave} disabled={createLiability.isPending || updateLiability.isPending}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
