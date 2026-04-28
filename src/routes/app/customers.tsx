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
import { TextField, SelectField } from '~/components/form-fields'

interface Customer {
  id: number; name: string; phone: string; address: string
  is_salaried_employee: boolean; created_at: string
}

// ─── server fns ──────────────────────────────────────────────────────────────

const list = createServerFn({ method: 'GET' }).handler(async (): Promise<Customer[]> => {
  const sb = getSupabaseServer()
  const { data, error } = await sb.from('customers').select('*').is('deleted_at', null).order('name')
  if (error) throw new Error(error.message)
  return data as Customer[]
})

const Schema = z.object({
  id: z.number().optional(),
  name: z.string().min(2),
  phone: z.string().min(1),
  address: z.string().min(1),
  is_salaried_employee: z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')]),
})

const upsert = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => Schema.parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer()
    const { data: ok } = await sb.rpc('has_permission', { p_resource: 'customers', p_action: 'write' })
    if (!ok) throw new Error('You do not have permission to manage customers')
    const payload = { name: data.name, phone: data.phone, address: data.address, is_salaried_employee: data.is_salaried_employee }
    if (data.id) {
      const { error } = await sb.from('customers').update(payload).eq('id', data.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await sb.from('customers').insert(payload)
      if (error) throw new Error(error.message)
    }
  })

const softDelete = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer()
    const { data: ok } = await sb.rpc('has_permission', { p_resource: 'customers', p_action: 'delete' })
    if (!ok) throw new Error('You do not have permission to delete customers')
    const { error } = await sb.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', data.id)
    if (error) throw new Error(error.message)
  })

// ─── route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/app/customers')({ component: CustomersPage })

function CustomersPage() {
  const { permissions = [] } = Route.useRouteContext()
  const qc = useQueryClient()
  const customers = useQuery({ queryKey: ['customers'], queryFn: list })
  const [editing, setEditing] = useState<Customer | null>(null)
  const [creating, setCreating] = useState(false)

  const canWrite  = can(permissions, 'customers', 'write')
  const canDelete = can(permissions, 'customers', 'delete')

  const columns: ColumnDef<Customer>[] = [
    { accessorKey: 'name',    header: 'Name' },
    { accessorKey: 'phone',   header: 'Phone', cell: ({ getValue }) => getValue<string>() || '—' },
    { accessorKey: 'address', header: 'Address', cell: ({ getValue }) => getValue<string>() || '—' },
    {
      accessorKey: 'is_salaried_employee', header: 'Salaried',
      cell: ({ getValue }) => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getValue() ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>
          {getValue() ? 'Yes' : 'No'}
        </span>
      ),
    },
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
                if (!confirm(`Remove ${row.original.name}?`)) return
                try {
                  await softDelete({ data: { id: row.original.id } })
                  toast.success('Customer removed')
                  qc.invalidateQueries({ queryKey: ['customers'] })
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
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {customers.data?.length ?? 0} active customer{customers.data?.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Add customer
          </Button>
        )}
      </div>

      <DataTable data={customers.data ?? []} columns={columns} searchKey="name" emptyMessage="No customers found" />

      {(creating || editing) && (
        <CustomerDialog
          customer={editing}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['customers'] }); setCreating(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function CustomerDialog({ customer, onClose, onSaved }: {
  customer: Customer | null; onClose: () => void; onSaved: () => void
}) {
  const form = useForm({
    defaultValues: {
      id: customer?.id,
      name: customer?.name ?? '',
      phone: customer?.phone ?? '',
      address: customer?.address ?? '',
      is_salaried_employee: customer ? (customer.is_salaried_employee ? 'true' : 'false') : 'false',
    },
    onSubmit: async ({ value }) => {
      try {
        await upsert({ data: value })
        toast.success(customer ? 'Customer updated' : 'Customer created')
        onSaved()
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    },
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{customer ? 'Edit customer' : 'New customer'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
          <TextField form={form} name="name" label="Full name" required />
          <div className="grid grid-cols-2 gap-3">
            <TextField form={form} name="phone" label="Phone" required />
            <TextField form={form} name="address" label="Address" required />
          </div>
          <SelectField form={form} name="is_salaried_employee" label="Salaried employee" options={[
            { value: 'false', label: 'No' },
            { value: 'true', label: 'Yes' },
          ]} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={form.state.isSubmitting}>Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
