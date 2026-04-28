import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import { type ColumnDef } from '@tanstack/react-table'
import { z } from 'zod'
import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Wallet } from 'lucide-react'

import { getSupabaseServer } from '~/lib/supabase.server'
import { can } from '~/lib/auth'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { DataTable } from '~/components/data-table'
import { TextField, SelectField, TextAreaField } from '~/components/form-fields'
import { formatCurrency } from '~/lib/utils'

interface Sale {
  id: number; customer_id: number | null; sale_number: string
  total_amount: number; total_remaining: number; sale_type: 'CASH' | 'LOAN'
  discount: number; monthly_paid: number; sale_date: string
  is_finished: boolean; fast_sale: boolean; dollar: number; note: string | null
}

interface Item { product_id: number | null; name: string; price: number; quantity: number }

// ─── server fns ──────────────────────────────────────────────────────────────

const list = createServerFn({ method: 'GET' }).handler(async (): Promise<Sale[]> => {
  const sb = getSupabaseServer()
  const { data, error } = await sb.from('sales').select('*').is('deleted_at', null).order('sale_date', { ascending: false })
  if (error) throw new Error(error.message)
  return data as Sale[]
})

const listCustomers = createServerFn({ method: 'GET' }).handler(async () => {
  const sb = getSupabaseServer()
  const { data } = await sb.from('customers').select('id, name').is('deleted_at', null).order('name')
  return (data ?? []) as { id: number; name: string }[]
})

const listProducts = createServerFn({ method: 'GET' }).handler(async () => {
  const sb = getSupabaseServer()
  const { data } = await sb.from('products').select('id, name, price').is('deleted_at', null).order('name')
  return (data ?? []) as { id: number; name: string; price: number }[]
})

const getCurrentDollar = createServerFn({ method: 'GET' }).handler(async () => {
  const sb = getSupabaseServer()
  const { data } = await sb.from('dollar').select('price').eq('id', 1).single<{ price: number }>()
  return data?.price ?? 1500
})

const SaleSchema = z.object({
  customer_id: z.number().nullable(),
  sale_number: z.string().min(1),
  sale_type: z.enum(['CASH', 'LOAN']),
  discount: z.coerce.number().nonnegative().default(0),
  dollar: z.coerce.number().positive(),
  note: z.string().nullish().transform((v) => v || null),
  items: z.array(z.object({
    product_id: z.number().nullable(),
    name: z.string().min(1),
    price: z.coerce.number().nonnegative(),
    quantity: z.coerce.number().int().positive(),
  })).min(1),
})

const createSale = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => SaleSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer()
    const { data: ok } = await sb.rpc('has_permission', { p_resource: 'sales', p_action: 'write' })
    if (!ok) throw new Error('You do not have permission to create sales')
    const total = data.items.reduce((s, i) => s + i.price * i.quantity, 0) - data.discount
    const { data: sale, error } = await sb.from('sales').insert({
      customer_id: data.customer_id, sale_number: data.sale_number, sale_type: data.sale_type,
      discount: data.discount, dollar: data.dollar, note: data.note,
      total_amount: total, total_remaining: data.sale_type === 'LOAN' ? total : 0,
      is_finished: data.sale_type === 'CASH',
    }).select().single()
    if (error || !sale) throw new Error(error?.message ?? 'failed')
    const { error: itemErr } = await sb.from('sale_items').insert(
      data.items.map((i) => ({ sale_id: sale.id, product_id: i.product_id, name: i.name, price: i.price, quantity: i.quantity })),
    )
    if (itemErr) throw new Error(itemErr.message)
    return { ok: true, id: sale.id }
  })

const PaySchema = z.object({ sale_id: z.number(), amount: z.coerce.number().positive(), note: z.string().nullish() })
const collectPayment = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => PaySchema.parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer()
    const { data: ok } = await sb.rpc('has_permission', { p_resource: 'sales', p_action: 'collect' })
    if (!ok) throw new Error('You do not have permission to collect payments')
    const { data: sale, error } = await sb.from('sales').select('total_remaining').eq('id', data.sale_id).single()
    if (error || !sale) throw new Error(error?.message ?? 'sale not found')
    const remaining = Number(sale.total_remaining) - data.amount
    if (remaining < 0) throw new Error('Payment exceeds remaining balance')
    const { error: payErr } = await sb.from('paid_loans').insert({
      sale_id: data.sale_id, amount: data.amount, paid_at: new Date().toISOString(), note: data.note ?? null,
    })
    if (payErr) throw new Error(payErr.message)
    const { error: updErr } = await sb.from('sales').update({
      total_remaining: remaining, is_finished: remaining === 0,
    }).eq('id', data.sale_id)
    if (updErr) throw new Error(updErr.message)
    return { ok: true }
  })

const softDelete = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer()
    const { data: ok } = await sb.rpc('has_permission', { p_resource: 'sales', p_action: 'delete' })
    if (!ok) throw new Error('You do not have permission to delete sales')
    const { error } = await sb.from('sales').update({ deleted_at: new Date().toISOString() }).eq('id', data.id)
    if (error) throw new Error(error.message)
  })

// ─── route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/app/sales')({ component: SalesPage })

function SalesPage() {
  const { permissions = [] } = Route.useRouteContext()
  const qc = useQueryClient()
  const sales = useQuery({ queryKey: ['sales'], queryFn: list })
  const [creating, setCreating] = useState(false)
  const [collecting, setCollecting] = useState<Sale | null>(null)

  const canWrite   = can(permissions, 'sales', 'write')
  const canDelete  = can(permissions, 'sales', 'delete')
  const canCollect = can(permissions, 'sales', 'collect')

  const columns: ColumnDef<Sale>[] = [
    { accessorKey: 'sale_number', header: '#', size: 100 },
    { accessorKey: 'sale_date', header: 'Date', cell: ({ getValue }) => new Date(String(getValue())).toLocaleDateString() },
    {
      accessorKey: 'sale_type', header: 'Type',
      cell: ({ getValue }) => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          getValue() === 'LOAN'
            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        }`}>{getValue<string>()}</span>
      ),
    },
    { accessorKey: 'total_amount', header: 'Total', cell: ({ getValue }) => formatCurrency(Number(getValue()), 'IQD') },
    {
      accessorKey: 'total_remaining', header: 'Remaining',
      cell: ({ getValue }) => {
        const v = Number(getValue())
        return (
          <span className={v > 0 ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-green-600 dark:text-green-400'}>
            {formatCurrency(v, 'IQD')}
          </span>
        )
      },
    },
    {
      accessorKey: 'is_finished', header: 'Status',
      cell: ({ getValue }) => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          getValue()
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-muted text-muted-foreground'
        }`}>{getValue() ? 'Paid' : 'Pending'}</span>
      ),
    },
    {
      id: 'actions', header: '', size: 100,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          {canCollect && row.original.sale_type === 'LOAN' && row.original.total_remaining > 0 && (
            <Button size="sm" variant="ghost" title="Collect payment" onClick={() => setCollecting(row.original)}>
              <Wallet className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
              onClick={async () => {
                if (!confirm(`Delete sale ${row.original.sale_number}?`)) return
                try {
                  await softDelete({ data: { id: row.original.id } })
                  toast.success('Sale removed')
                  qc.invalidateQueries({ queryKey: ['sales'] })
                } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
              }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {sales.data?.length ?? 0} sale{sales.data?.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New sale
          </Button>
        )}
      </div>

      <DataTable data={sales.data ?? []} columns={columns} searchKey="sale_number" emptyMessage="No sales found" />

      {creating && (
        <SaleDialog
          onClose={() => setCreating(false)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['sales'] }); setCreating(false) }}
        />
      )}
      {collecting && <CollectDialog sale={collecting} onClose={() => setCollecting(null)} />}
    </div>
  )
}

function SaleDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const customers = useQuery({ queryKey: ['customers-mini'], queryFn: listCustomers })
  const products  = useQuery({ queryKey: ['products-mini'],  queryFn: listProducts })
  const dollarQ   = useQuery({ queryKey: ['dollar-rate'],    queryFn: getCurrentDollar })
  const [items, setItems] = useState<Item[]>([{ product_id: null, name: '', price: 0, quantity: 1 }])

  const form = useForm({
    defaultValues: {
      customer_id: null as number | null,
      sale_number: `S-${Date.now()}`,
      sale_type: 'CASH' as 'CASH' | 'LOAN',
      discount: 0,
      dollar: dollarQ.data ?? 1500,
      note: '',
    },
    onSubmit: async ({ value }) => {
      if (items.some((i) => !i.name || i.quantity < 1)) {
        toast.error('Each item needs a name and quantity ≥ 1')
        return
      }
      try {
        await createSale({ data: { ...value, items } })
        toast.success('Sale created')
        onSaved()
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    },
  })

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0) - form.state.values.discount
  const updateItem = (i: number, patch: Partial<Item>) =>
    setItems((xs) => xs.map((x, idx) => idx === i ? { ...x, ...patch } : x))

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>New sale</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
          <div className="grid grid-cols-3 gap-3">
            <form.Field name="customer_id">{(f) => (
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Customer</label>
                <Select value={f.state.value ? String(f.state.value) : ''} onValueChange={(v) => f.handleChange(v ? Number(v) : null)}>
                  <SelectTrigger><SelectValue placeholder="(walk-in)" /></SelectTrigger>
                  <SelectContent>
                    {customers.data?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}</form.Field>
            <TextField form={form} name="sale_number" label="Sale number" required />
            <SelectField form={form} name="sale_type" label="Type" options={[
              { value: 'CASH' as const, label: 'Cash' },
              { value: 'LOAN' as const, label: 'Loan' },
            ]} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Items</p>
            <div className="grid grid-cols-[1fr_120px_80px_120px_40px] gap-2 text-xs text-muted-foreground px-1">
              <span>Product / Name</span><span>Name override</span><span>Qty</span><span>Price (IQD)</span><span />
            </div>
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_80px_120px_40px] gap-2 items-center">
                <Select value={it.product_id ? String(it.product_id) : ''}
                  onValueChange={(v) => {
                    const p = products.data?.find((p) => String(p.id) === v)
                    if (p) updateItem(i, { product_id: p.id, name: p.name, price: p.price })
                  }}>
                  <SelectTrigger><SelectValue placeholder="Pick product…" /></SelectTrigger>
                  <SelectContent>
                    {products.data?.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input value={it.name} onChange={(e) => updateItem(i, { name: e.target.value })} placeholder="Name" />
                <Input type="number" min={1} value={it.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} />
                <Input type="number" min={0} value={it.price} onChange={(e) => updateItem(i, { price: Number(e.target.value) })} />
                <Button type="button" size="icon" variant="ghost"
                  onClick={() => setItems((xs) => xs.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm"
              onClick={() => setItems((xs) => [...xs, { product_id: null, name: '', price: 0, quantity: 1 }])}>
              <Plus className="h-3 w-3" /> Add line
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <TextField form={form} name="discount" label="Discount (IQD)" type="number" />
            <TextField form={form} name="dollar"   label="USD rate"        type="number" required />
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Total</label>
              <Input value={formatCurrency(Math.max(0, total), 'IQD')} disabled className="font-mono bg-muted" />
            </div>
          </div>

          <TextAreaField form={form} name="note" label="Note" />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={form.state.isSubmitting}>Create sale</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CollectDialog({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const qc = useQueryClient()
  const form = useForm({
    defaultValues: { amount: 0, note: '' },
    onSubmit: async ({ value }) => {
      try {
        await collectPayment({ data: { sale_id: sale.id, amount: value.amount, note: value.note } })
        toast.success('Payment recorded')
        qc.invalidateQueries({ queryKey: ['sales'] })
        onClose()
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    },
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Collect payment — {sale.sale_number}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Remaining: <span className="font-medium text-foreground">{formatCurrency(sale.total_remaining, 'IQD')}</span>
        </p>
        <form className="space-y-4 mt-2" onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
          <TextField form={form} name="amount" label="Amount paid (IQD)" type="number" required />
          <TextAreaField form={form} name="note" label="Note" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={form.state.isSubmitting}>Record payment</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
