import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import { type ColumnDef } from '@tanstack/react-table'
import { z } from 'zod'
import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import { getSupabaseServer } from '~/lib/supabase.server'
import { can } from '~/lib/auth'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { DataTable } from '~/components/data-table'
import { TextField, TextAreaField } from '~/components/form-fields'
import { formatCurrency } from '~/lib/utils'

interface Expense { id: number; title: string; note: string | null; amount: number; dollar: number; created_at: string }

// ─── server fns ──────────────────────────────────────────────────────────────

const list = createServerFn({ method: 'GET' }).handler(async (): Promise<Expense[]> => {
  const sb = getSupabaseServer()
  const { data, error } = await sb.from('expenses').select('*').is('deleted_at', null).order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as Expense[]
})

const getCurrentDollar = createServerFn({ method: 'GET' }).handler(async () => {
  const sb = getSupabaseServer()
  const { data } = await sb.from('dollar').select('price').eq('id', 1).single<{ price: number }>()
  return data?.price ?? 1500
})

const Schema = z.object({
  id: z.number().optional(),
  title: z.string().min(2),
  note: z.string().nullish().transform((v) => v || null),
  amount: z.coerce.number().positive(),
  dollar: z.coerce.number().positive(),
})

const upsert = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => Schema.parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer()
    const { data: ok } = await sb.rpc('has_permission', { p_resource: 'expenses', p_action: 'write' })
    if (!ok) throw new Error('You do not have permission to manage expenses')
    const payload = { title: data.title, note: data.note, amount: data.amount, dollar: data.dollar }
    if (data.id) {
      const { error } = await sb.from('expenses').update(payload).eq('id', data.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await sb.from('expenses').insert(payload)
      if (error) throw new Error(error.message)
    }
  })

const softDelete = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer()
    const { data: ok } = await sb.rpc('has_permission', { p_resource: 'expenses', p_action: 'delete' })
    if (!ok) throw new Error('You do not have permission to delete expenses')
    const { error } = await sb.from('expenses').update({ deleted_at: new Date().toISOString() }).eq('id', data.id)
    if (error) throw new Error(error.message)
  })

// ─── route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/app/expenses')({ component: ExpensesPage })

function ExpensesPage() {
  const { permissions = [] } = Route.useRouteContext()
  const qc = useQueryClient()
  const expenses = useQuery({ queryKey: ['expenses'], queryFn: list })
  const [editing, setEditing] = useState<Expense | null>(null)
  const [creating, setCreating] = useState(false)

  const canWrite  = can(permissions, 'expenses', 'write')
  const canDelete = can(permissions, 'expenses', 'delete')

  const columns: ColumnDef<Expense>[] = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'amount', header: 'Amount', cell: ({ getValue }) => formatCurrency(Number(getValue()), 'IQD') },
    { accessorKey: 'dollar', header: 'Rate (USD)', cell: ({ getValue }) => <span className="font-mono text-sm">{Number(getValue()).toLocaleString()}</span> },
    { accessorKey: 'created_at', header: 'Date', cell: ({ getValue }) => new Date(String(getValue())).toLocaleDateString() },
    {
      id: 'actions', header: '', size: 100,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          {canWrite && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(row.original)}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
              onClick={async () => {
                if (!confirm(`Delete "${row.original.title}"?`)) return
                try {
                  await softDelete({ data: { id: row.original.id } })
                  toast.success('Expense removed')
                  qc.invalidateQueries({ queryKey: ['expenses'] })
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
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {expenses.data?.length ?? 0} record{expenses.data?.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Add expense
          </Button>
        )}
      </div>
      <DataTable data={expenses.data ?? []} columns={columns} searchKey="title" emptyMessage="No expenses found" />
      {(creating || editing) && (
        <ExpenseDialog
          expense={editing}
          onClose={() => { setEditing(null); setCreating(false) }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['expenses'] }); setEditing(null); setCreating(false) }}
        />
      )}
    </div>
  )
}

function ExpenseDialog({ expense, onClose, onSaved }: {
  expense: Expense | null; onClose: () => void; onSaved: () => void
}) {
  const dollarQ = useQuery({ queryKey: ['dollar-rate'], queryFn: getCurrentDollar })
  const form = useForm({
    defaultValues: {
      id: expense?.id,
      title: expense?.title ?? '',
      note: expense?.note ?? '',
      amount: expense?.amount ?? 0,
      dollar: expense?.dollar ?? dollarQ.data ?? 1500,
    },
    onSubmit: async ({ value }) => {
      try {
        await upsert({ data: value })
        toast.success(expense ? 'Expense updated' : 'Expense recorded')
        onSaved()
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    },
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{expense ? 'Edit expense' : 'New expense'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
          <TextField form={form} name="title" label="Title" required />
          <div className="grid grid-cols-2 gap-3">
            <TextField form={form} name="amount" label="Amount (IQD)" type="number" required />
            <TextField form={form} name="dollar" label="USD rate" type="number" required />
          </div>
          <TextAreaField form={form} name="note" label="Note" />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={form.state.isSubmitting}>Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
