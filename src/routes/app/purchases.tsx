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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { DataTable } from '~/components/data-table'
import { TextField, SelectField, TextAreaField } from '~/components/form-fields'
import { formatCurrency } from '~/lib/utils'

interface Purchase {
  id: number; name: string; company_id: number | null; total_amount: number; total_remaining: number
  type: 'CASH' | 'LOAN'; note: string | null; purchase_date: string; dollar: number
}

// ─── server fns ──────────────────────────────────────────────────────────────

const list = createServerFn({ method: 'GET' }).handler(async (): Promise<Purchase[]> => {
  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('company_purchases').select('*').is('deleted_at', null).order('purchase_date', { ascending: false })
  if (error) throw new Error(error.message)
  return data as Purchase[]
})

const listCompanies = createServerFn({ method: 'GET' }).handler(async () => {
  const sb = getSupabaseServer()
  const { data } = await sb.from('companies').select('id, name').is('deleted_at', null).order('name')
  return (data ?? []) as { id: number; name: string }[]
})

const getCurrentDollar = createServerFn({ method: 'GET' }).handler(async () => {
  const sb = getSupabaseServer()
  const { data } = await sb.from('dollar').select('price').eq('id', 1).single<{ price: number }>()
  return data?.price ?? 1500
})

const Schema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  company_id: z.number().nullable(),
  total_amount: z.coerce.number().positive(),
  type: z.enum(['CASH', 'LOAN']),
  note: z.string().nullish().transform((v) => v || null),
  purchase_date: z.string(),
  dollar: z.coerce.number().positive(),
})

const upsert = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => Schema.parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer()
    const { data: ok } = await sb.rpc('has_permission', { p_resource: 'purchases', p_action: 'write' })
    if (!ok) throw new Error('You do not have permission to manage purchases')
    const base = {
      name: data.name, company_id: data.company_id, total_amount: data.total_amount, type: data.type,
      note: data.note, purchase_date: new Date(data.purchase_date).toISOString(), dollar: data.dollar,
    }
    if (data.id) {
      // Don't touch total_remaining on edit — partial payments must be preserved.
      const { error } = await sb.from('company_purchases').update(base).eq('id', data.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await sb.from('company_purchases').insert({
        ...base,
        total_remaining: data.type === 'LOAN' ? data.total_amount : 0,
      })
      if (error) throw new Error(error.message)
    }
  })

const PaySchema = z.object({ purchase_id: z.number(), amount: z.coerce.number().positive(), note: z.string().nullish() })
const recordPayment = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => PaySchema.parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer()
    const { data: ok } = await sb.rpc('has_permission', { p_resource: 'purchases', p_action: 'pay' })
    if (!ok) throw new Error('You do not have permission to record payments')
    const { data: p, error } = await sb.from('company_purchases').select('total_remaining').eq('id', data.purchase_id).single()
    if (error || !p) throw new Error(error?.message ?? 'not found')
    const remaining = Number(p.total_remaining) - data.amount
    if (remaining < 0) throw new Error('Payment exceeds remaining balance')
    const { error: payErr } = await sb.from('purchase_payments').insert({
      company_purchase_id: data.purchase_id, amount: data.amount, paid_at: new Date().toISOString(), note: data.note ?? null,
    })
    if (payErr) throw new Error(payErr.message)
    const { error: updErr } = await sb.from('company_purchases').update({ total_remaining: remaining }).eq('id', data.purchase_id)
    if (updErr) throw new Error(updErr.message)
  })

const softDelete = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer()
    const { data: ok } = await sb.rpc('has_permission', { p_resource: 'purchases', p_action: 'delete' })
    if (!ok) throw new Error('You do not have permission to delete purchases')
    const { error } = await sb.from('company_purchases').update({ deleted_at: new Date().toISOString() }).eq('id', data.id)
    if (error) throw new Error(error.message)
  })

// ─── route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/app/purchases')({ component: PurchasesPage })

function PurchasesPage() {
  const { permissions = [] } = Route.useRouteContext()
  const qc = useQueryClient()
  const purchases = useQuery({ queryKey: ['purchases'], queryFn: list })
  const [creating, setCreating] = useState(false)
  const [paying, setPaying] = useState<Purchase | null>(null)

  const canWrite  = can(permissions, 'purchases', 'write')
  const canDelete = can(permissions, 'purchases', 'delete')
  const canPay    = can(permissions, 'purchases', 'pay')

  const columns: ColumnDef<Purchase>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'purchase_date', header: 'Date', cell: ({ getValue }) => new Date(String(getValue())).toLocaleDateString() },
    {
      accessorKey: 'type', header: 'Type',
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
      id: 'actions', header: '', size: 100,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          {canPay && row.original.type === 'LOAN' && row.original.total_remaining > 0 && (
            <Button size="sm" variant="ghost" title="Record payment" onClick={() => setPaying(row.original)}>
              <Wallet className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
              onClick={async () => {
                if (!confirm(`Delete "${row.original.name}"?`)) return
                try {
                  await softDelete({ data: { id: row.original.id } })
                  toast.success('Purchase removed')
                  qc.invalidateQueries({ queryKey: ['purchases'] })
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
          <h1 className="text-2xl font-bold tracking-tight">Purchases</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {purchases.data?.length ?? 0} purchase{purchases.data?.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New purchase
          </Button>
        )}
      </div>

      <DataTable data={purchases.data ?? []} columns={columns} searchKey="name" emptyMessage="No purchases found" />

      {creating && (
        <PurchaseDialog
          onClose={() => setCreating(false)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['purchases'] }); setCreating(false) }}
        />
      )}
      {paying && <PayDialog purchase={paying} onClose={() => setPaying(null)} />}
    </div>
  )
}

function PurchaseDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const companies = useQuery({ queryKey: ['companies-mini'], queryFn: listCompanies })
  const dollarQ   = useQuery({ queryKey: ['dollar-rate'],    queryFn: getCurrentDollar })

  const form = useForm({
    defaultValues: {
      name: '', company_id: null as number | null, total_amount: 0,
      type: 'CASH' as 'CASH' | 'LOAN', note: '',
      purchase_date: new Date().toISOString().slice(0, 10),
      dollar: dollarQ.data ?? 1500,
    },
    onSubmit: async ({ value }) => {
      try { await upsert({ data: value }); toast.success('Purchase created'); onSaved() }
      catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    },
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New purchase</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
          <TextField form={form} name="name" label="Description" required />
          <form.Field name="company_id">{(f) => (
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Company</label>
              <Select value={f.state.value ? String(f.state.value) : ''} onValueChange={(v) => f.handleChange(v ? Number(v) : null)}>
                <SelectTrigger><SelectValue placeholder="(none)" /></SelectTrigger>
                <SelectContent>
                  {companies.data?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}</form.Field>
          <div className="grid grid-cols-2 gap-3">
            <TextField form={form} name="total_amount"  label="Total (IQD)" type="number" required />
            <SelectField form={form} name="type" label="Type" options={[
              { value: 'CASH' as const, label: 'Cash' },
              { value: 'LOAN' as const, label: 'Loan' },
            ]} />
            <TextField form={form} name="purchase_date" label="Date" type="date" required />
            <TextField form={form} name="dollar" label="USD rate" type="number" required />
          </div>
          <TextAreaField form={form} name="note" label="Note" />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={form.state.isSubmitting}>Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PayDialog({ purchase, onClose }: { purchase: Purchase; onClose: () => void }) {
  const qc = useQueryClient()
  const form = useForm({
    defaultValues: { amount: 0, note: '' },
    onSubmit: async ({ value }) => {
      try {
        await recordPayment({ data: { purchase_id: purchase.id, amount: value.amount, note: value.note } })
        toast.success('Payment recorded')
        qc.invalidateQueries({ queryKey: ['purchases'] })
        onClose()
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    },
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Pay supplier — {purchase.name}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Remaining: <span className="font-medium text-foreground">{formatCurrency(purchase.total_remaining, 'IQD')}</span>
        </p>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
          <TextField form={form} name="amount" label="Amount (IQD)" type="number" required />
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
