import { useState, useMemo, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2, History, X, Upload } from 'lucide-react'
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
import { useStockTransactions, useCreateStockTransaction, useImportStockTransactions, useApplyStockSplit, useDeleteStockTransaction } from '@/hooks/useStockTransactions'
import { fetchQuote } from '@/lib/quotes'
import { formatCurrency, extractErrorMessage } from '@/lib/utils'
import { parseCathayCSV } from '@/lib/csv'
import { fetchRecentSplits } from '@/lib/splits'
import type { SplitEvent } from '@/lib/splits'
import type { Account, Position, AccountType, PositionType, Currency, StockTransaction } from '@/types'

const accountTypeLabels: Record<AccountType, string> = {
  cash: '現金', bank: '銀行', real_estate: '房產', other: '其他',
}

const positionTypeLabels: Record<PositionType, string> = {
  tw_stock: '台股', us_stock: '美股', jp_stock: '日股', hk_stock: '港股', crypto: '加密貨幣',
}

const currencies: Currency[] = ['TWD', 'USD', 'JPY', 'HKD', 'EUR', 'GBP', 'BTC', 'ETH']

type AccountForm = { name: string; type: AccountType; currency: Currency; balance: string }
type PositionForm = { name: string; symbol: string; type: PositionType; quantity: string; currency: Currency; cost_price: string }
type TxForm = { transaction_date: string; quantity: string; price: string; note: string }

const defaultAccountForm: AccountForm = { name: '', type: 'bank', currency: 'TWD', balance: '' }
const defaultPositionForm: PositionForm = { name: '', symbol: '', type: 'tw_stock', quantity: '', currency: 'TWD', cost_price: '' }
const defaultTxForm: TxForm = { transaction_date: new Date().toISOString().split('T')[0], quantity: '', price: '', note: '' }


function TransactionDialog({ position, onClose }: { position: Position; onClose: () => void }) {
  const currentPriceFromHook = usePrices([position.symbol])
  const currentPrice = currentPriceFromHook.data?.[position.symbol]?.price ?? null
  const { data: transactions = [], isLoading } = useStockTransactions(position.id)
  const createTx = useCreateStockTransaction()
  const importTx = useImportStockTransactions()
  const applySplit = useApplyStockSplit()
  const deleteTx = useDeleteStockTransaction()
  const syncCost = useUpdatePosition()
  const [txForm, setTxForm] = useState<TxForm>(defaultTxForm)
  const [txError, setTxError] = useState<string | null>(null)
  const [costSynced, setCostSynced] = useState(false)
  const [importPreview, setImportPreview] = useState<Array<{ date: string; qty: number; price: number }> | null>(null)
  const [pendingRows, setPendingRows] = useState<Array<Omit<StockTransaction, 'id' | 'user_id' | 'created_at'>> | null>(null)
  const [splitDone, setSplitDone] = useState<number | null>(null)
  const [recentSplits, setRecentSplits] = useState<SplitEvent[]>([])
  const [splitsLoading, setSplitsLoading] = useState(false)
  const [splitsStatus, setSplitsStatus] = useState<'idle' | 'ok' | 'empty' | 'error'>('idle')

  useEffect(() => {
    setSplitsLoading(true)
    fetchRecentSplits(position.symbol, position.type).then((splits) => {
      setSplitsLoading(false)
      if (splits === null) {
        setSplitsStatus('error')
      } else if (splits.length === 0) {
        setSplitsStatus('empty')
      } else {
        setSplitsStatus('ok')
        setRecentSplits(splits)
      }
    })
  }, [position.symbol, position.type])

  const totalShares = transactions.reduce((s, t) => s + t.quantity, 0)
  const totalCost = transactions.reduce((s, t) => s + t.quantity * t.price, 0)
  const avgCost = totalShares > 0 ? totalCost / totalShares : null

  const returnRate = avgCost != null && currentPrice != null
    ? (currentPrice - avgCost) / avgCost * 100
    : null

  async function handleAddTx() {
    if (!txForm.quantity || !txForm.price) return
    setTxError(null)
    try {
      await createTx.mutateAsync({
        position_id: position.id,
        transaction_date: txForm.transaction_date,
        quantity: parseFloat(txForm.quantity),
        price: parseFloat(txForm.price),
        note: txForm.note || null,
      })
      setTxForm(defaultTxForm)
    } catch (err) {
      setTxError(extractErrorMessage(err) || '新增失敗')
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const rows = parseCathayCSV(text, position.id)
      if (rows.length === 0) {
        setTxError('CSV 中找不到「現買」記錄，請確認格式為國泰證券交易明細')
        return
      }
      setPendingRows(rows)
      setImportPreview(rows.map((r) => ({ date: r.transaction_date, qty: r.quantity, price: r.price })))
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  async function handleConfirmImport() {
    if (!pendingRows) return
    setTxError(null)
    try {
      await importTx.mutateAsync(pendingRows)
      setImportPreview(null)
      setPendingRows(null)
    } catch (err) {
      setTxError(extractErrorMessage(err) || '匯入失敗')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {position.symbol}{position.name ? ` · ${position.name}` : ''} — 買入記錄
          </DialogTitle>
        </DialogHeader>

        {/* 摘要 */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-[hsl(240_3.7%_8%)] px-3 py-2">
            <p className="text-[hsl(240_5%_64.9%)]">總持股</p>
            <p className="font-semibold text-white">{totalShares.toLocaleString()} 股</p>
          </div>
          <div className="rounded-lg bg-[hsl(240_3.7%_8%)] px-3 py-2">
            <p className="text-[hsl(240_5%_64.9%)]">加權均價</p>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white">
                {avgCost != null ? formatCurrency(avgCost, position.currency) : '—'}
              </p>
              {avgCost != null && (
                <button
                  onClick={async () => {
                    setCostSynced(false)
                    await syncCost.mutateAsync({ id: position.id, cost_price: avgCost })
                    setCostSynced(true)
                  }}
                  disabled={syncCost.isPending}
                  title="同步至部位均價（修正報酬率）"
                  className="text-xs text-[hsl(240_5%_50%)] hover:text-[hsl(142.1_76.2%_56%)] transition-colors"
                >
                  {syncCost.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : '↺'}
                </button>
              )}
            </div>
            {costSynced && <p className="text-xs text-green-400 mt-0.5">均價已同步</p>}
          </div>
          <div className="rounded-lg bg-[hsl(240_3.7%_8%)] px-3 py-2">
            <p className="text-[hsl(240_5%_64.9%)]">現價</p>
            <p className="font-semibold text-white">
              {currentPrice != null ? formatCurrency(currentPrice, position.currency) : '—'}
            </p>
          </div>
          <div className="rounded-lg bg-[hsl(240_3.7%_8%)] px-3 py-2">
            <p className="text-[hsl(240_5%_64.9%)]">報酬率</p>
            <p className={`font-semibold ${returnRate == null ? 'text-white' : returnRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {returnRate != null ? `${returnRate >= 0 ? '+' : ''}${returnRate.toFixed(2)}%` : '—'}
            </p>
          </div>
        </div>

        {/* 交易清單 */}
        <div className="max-h-44 overflow-y-auto space-y-1.5">
          {isLoading
            ? <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-[hsl(240_5%_64.9%)]" /></div>
            : transactions.length === 0
              ? <p className="text-center text-sm text-[hsl(240_5%_64.9%)] py-4">尚無記錄</p>
              : transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-md bg-[hsl(240_3.7%_8%)] px-3 py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-[hsl(240_5%_64.9%)]">{t.transaction_date}</span>
                    <span className="text-white">{t.quantity} 股</span>
                    <span className="text-[hsl(240_5%_64.9%)]">@ {formatCurrency(t.price, position.currency)}</span>
                  </div>
                  <button
                    onClick={() => deleteTx.mutate({ id: t.id, positionId: position.id })}
                    className="text-[hsl(240_5%_64.9%)] hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
          }
        </div>

        {/* CSV 匯入預覽 */}
        {importPreview && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
            <p className="text-xs font-semibold text-amber-400">預覽匯入 {importPreview.length} 筆（僅現買）</p>
            <div className="max-h-28 overflow-y-auto space-y-1">
              {importPreview.slice(0, 8).map((r, i) => (
                <div key={i} className="flex gap-3 text-xs text-white">
                  <span className="text-[hsl(240_5%_64.9%)]">{r.date}</span>
                  <span>{r.qty} 股</span>
                  <span>@ {r.price}</span>
                </div>
              ))}
              {importPreview.length > 8 && (
                <p className="text-xs text-[hsl(240_5%_64.9%)]">…還有 {importPreview.length - 8} 筆</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleConfirmImport} disabled={importTx.isPending}>
                {importTx.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : '確認匯入'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setImportPreview(null); setPendingRows(null) }}>取消</Button>
            </div>
          </div>
        )}

        {txError && <p className="text-sm text-red-400">{txError}</p>}

        {/* 股票分割回溯調整 */}
        <div className="border-t border-[hsl(240_3.7%_15.9%)] pt-4 space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(240_5%_64.9%)]">股票分割調整</p>
            {splitsLoading && <Loader2 className="h-3 w-3 animate-spin text-[hsl(240_5%_64.9%)]" />}
          </div>
          {splitsStatus === 'ok' && (
            <div className="flex flex-wrap gap-2">
              {recentSplits.map((s) => (
                <button
                  key={s.date}
                  disabled={applySplit.isPending}
                  onClick={async () => {
                    setTxError(null)
                    setSplitDone(null)
                    try {
                      const count = await applySplit.mutateAsync({
                        positionId: position.id,
                        splitDate: s.date,
                        ratio: s.ratio,
                      })
                      setSplitDone(count)
                    } catch (err) {
                      setTxError(extractErrorMessage(err) || '調整失敗')
                    }
                  }}
                  className="rounded-md border border-[hsl(142.1_76.2%_36.3%)] bg-[hsl(142.1_76.2%_36.3%/0.15)] px-2.5 py-1 text-xs text-[hsl(142.1_76.2%_56%)] hover:bg-[hsl(142.1_76.2%_36.3%/0.3)] disabled:opacity-50 transition-colors"
                >
                  {applySplit.isPending
                    ? <Loader2 className="inline h-3 w-3 animate-spin" />
                    : `${s.date}  1 → ${s.ratio}`}
                </button>
              ))}
            </div>
          )}
          {splitsStatus === 'empty' && (
            <p className="text-xs text-[hsl(240_5%_50%)]">查無分割記錄</p>
          )}
          {splitsStatus === 'error' && (
            <p className="text-xs text-[hsl(240_5%_50%)]">分割記錄查詢失敗</p>
          )}
          {splitDone !== null && (
            <p className="text-xs text-green-400">已調整 {splitDone} 筆分割前紀錄</p>
          )}
        </div>

        {/* 新增表單 */}
        <div className="border-t border-[hsl(240_3.7%_15.9%)] pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(240_5%_64.9%)]">手動新增一筆</p>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-[hsl(240_3.7%_15.9%)] px-2 py-1 text-xs text-[hsl(240_5%_64.9%)] hover:text-white hover:border-white transition-colors">
              <Upload className="h-3 w-3" />
              匯入 CSV
              <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">日期</Label>
              <Input type="date" value={txForm.transaction_date} onChange={(e) => setTxForm({ ...txForm, transaction_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">股數</Label>
              <Input type="number" placeholder="1000" value={txForm.quantity} onChange={(e) => setTxForm({ ...txForm, quantity: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">成交價</Label>
              <Input type="number" placeholder="100" value={txForm.price} onChange={(e) => setTxForm({ ...txForm, price: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">備註（選填）</Label>
            <Input placeholder="第一次買入" value={txForm.note} onChange={(e) => setTxForm({ ...txForm, note: e.target.value })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>關閉</Button>
          <Button onClick={handleAddTx} disabled={createTx.isPending || !txForm.quantity || !txForm.price}>新增</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

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
  const [accountSaveError, setAccountSaveError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [txPosition, setTxPosition] = useState<Position | null>(null)

  function openNewAccount() {
    setAccountForm(defaultAccountForm)
    setAccountSaveError(null)
    setAccountDialog({ open: true, editing: null })
  }

  function openEditAccount(a: Account) {
    setAccountForm({ name: a.name, type: a.type, currency: a.currency, balance: String(a.balance) })
    setAccountSaveError(null)
    setAccountDialog({ open: true, editing: a })
  }

  async function handleSaveAccount() {
    setAccountSaveError(null)
    const payload = {
      name: accountForm.name,
      type: accountForm.type,
      currency: accountForm.currency,
      balance: parseFloat(accountForm.balance) || 0,
    }
    try {
      if (accountDialog.editing) {
        await updateAccount.mutateAsync({ id: accountDialog.editing.id, ...payload })
      } else {
        await createAccount.mutateAsync(payload)
      }
      setAccountDialog({ open: false, editing: null })
    } catch (err) {
      setAccountSaveError(extractErrorMessage(err) || '儲存失敗，請再試一次')
    }
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
      setSaveError(extractErrorMessage(err) || '儲存失敗，請再試一次')
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
            : (() => {
                // 計算有完整資料的 positions 的總覽
                const positionsWithData = positions.filter(
                  (p) => p.cost_price != null && prices[p.symbol]?.price != null
                )
                const currencies = [...new Set(positionsWithData.map((p) => p.currency))]
                const singleCurrency = currencies.length === 1 ? currencies[0] : null
                const totalCost = positionsWithData.reduce((s, p) => s + p.cost_price! * p.quantity, 0)
                const totalMarket = positionsWithData.reduce((s, p) => s + prices[p.symbol]!.price * p.quantity, 0)
                const totalGain = totalMarket - totalCost
                const totalReturnRate = totalCost > 0 ? totalGain / totalCost * 100 : null

                return (
              <div className="space-y-2">
                {positionsWithData.length >= 2 && (
                  <div className="rounded-lg border border-[hsl(240_3.7%_15.9%)] px-4 py-3 mb-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[hsl(240_5%_64.9%)]">總市值</span>
                      <span className="font-semibold text-white">
                        {formatCurrency(totalMarket, (singleCurrency ?? 'TWD') as Parameters<typeof formatCurrency>[1])}
                        {!singleCurrency && <span className="ml-1 text-xs text-[hsl(240_5%_50%)]">*</span>}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[hsl(240_5%_64.9%)]">總成本</span>
                      <span className="font-semibold text-white">
                        {formatCurrency(totalCost, (singleCurrency ?? 'TWD') as Parameters<typeof formatCurrency>[1])}
                        {!singleCurrency && <span className="ml-1 text-xs text-[hsl(240_5%_50%)]">*</span>}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[hsl(240_5%_64.9%)]">總損益</span>
                      <span className={`font-semibold ${totalGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain, (singleCurrency ?? 'TWD') as Parameters<typeof formatCurrency>[1])}
                        {!singleCurrency && <span className="ml-1 text-xs text-[hsl(240_5%_50%)]">*</span>}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[hsl(240_5%_64.9%)]">總報酬率</span>
                      {totalReturnRate != null
                        ? <span className={`font-semibold ${totalReturnRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {totalReturnRate >= 0 ? '+' : ''}{totalReturnRate.toFixed(2)}%
                          </span>
                        : <span className="text-white">—</span>
                      }
                    </div>
                    {!singleCurrency && (
                      <p className="col-span-2 text-xs text-[hsl(240_5%_50%)]">* 包含多幣別，數字未換算</p>
                    )}
                  </div>
                )}
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
                          <button onClick={() => setTxPosition(p)} className="text-[hsl(240_5%_64.9%)] hover:text-white" title="買入記錄"><History className="h-4 w-4" /></button>
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
              })()
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
          {accountSaveError && <p className="text-sm text-red-400">{accountSaveError}</p>}
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

      {/* 買入記錄 Dialog */}
      {txPosition && <TransactionDialog position={txPosition} onClose={() => setTxPosition(null)} />}
    </div>
  )
}
