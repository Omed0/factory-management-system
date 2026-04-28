import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import { type ColumnDef } from '@tanstack/react-table'
import { z } from 'zod'
import { useState } from 'react'
import { toast } from 'sonner'
import { CalendarPlus, Pencil, Plus, Trash2 } from 'lucide-react'

import { getSupabaseServer } from '~/lib/supabase.server'
import { can } from '~/lib/auth'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { DataTable } from '~/components/data-table'
import { TextField, SelectField, TextAreaField } from '~/components/form-fields'
import { formatCurrency } from '~/lib/utils'
import { Badge } from '~/components/ui/badge'

interface Employee {
  id: number; name: string; phone: string | null; address: string | null
  image_url: string | null; month_salary: number; dollar: number
}
interface EmployeeAction {
  id: number; employee_id: number; type: 'PUNISHMENT' | 'BONUS' | 'ABSENT' | 'OVERTIME'
  amount: number; dollar: number; note: string | null; action_date: string
}

// ─── server fns ──────────────────────────────────────────────────────────────

const list = createServerFn({ method: 'GET' }).handler(async (): Promise<Employee[]> => {
  const sb = getSupabaseServer()
  const { data, error } = await sb.from('employees').select('*').is('deleted_at', null).order('name')
  if (error) throw new Error(error.message)
  return data as Employee[]
})

const getCurrentDollar = createServerFn({ method: 'GET' }).handler(async () => {
  const sb = getSupabaseServer()
  const { data } = await sb.from('dollar').select('price').eq('id', 1).single<{ price: number }>()
  return data?.price ?? 1500
})

const listActions = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => z.object({ employee_id: z.number() }).parse(d))
  .handler(async ({ data }): Promise<EmployeeAction[]> => {
    const sb = getSupabaseServer()
    const { data: rows, error } = await sb
      .from('employee_actions').select('*')
      .eq('employee_id', data.employee_id).order('action_date', { ascending: false })
    if (error) throw new Error(error.message)
    return rows as EmployeeAction[]
  })

const Schema = z.object({
  id: z.number().optional(),
  name: z.string().min(2),
  phone: z.string().nullish().transform((v) => v || null),
  address: z.string().nullish().transform((v) => v || null),
  month_salary: z.coerce.number().positive(),
  dollar: z.coerce.number().positive(),
})

const upsert = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => Schema.parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer()
    const { data: ok } = await sb.rpc('has_permission', { p_resource: 'employees', p_action: 'write' })
    if (!ok) throw new Error('You do not have permission to manage employees')
    const payload = { name: data.name, phone: data.phone, address: data.address, month_salary: data.month_salary, dollar: data.dollar }
    if (data.id) {
      const { error } = await sb.from('employees').update(payload).eq('id', data.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await sb.from('employees').insert(payload)
      if (error) throw new Error(error.message)
    }
  })

const softDelete = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer()
    const { data: ok } = await sb.rpc('has_permission', { p_resource: 'employees', p_action: 'delete' })
    if (!ok) throw new Error('You do not have permission to delete employees')
    const { error } = await sb.from('employees').update({ deleted_at: new Date().toISOString() }).eq('id', data.id)
    if (error) throw new Error(error.message)
  })

const ActionSchema = z.object({
  employee_id: z.number(),
  type: z.enum(['PUNISHMENT', 'BONUS', 'ABSENT', 'OVERTIME']),
  amount: z.coerce.number().nonnegative(),
  dollar: z.coerce.number().positive(),
  note: z.string().nullish().transform((v) => v || null),
  action_date: z.string(),
})

const recordAction = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => ActionSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer()
    const { data: ok } = await sb.rpc('has_permission', { p_resource: 'employees', p_action: 'actions' })
    if (!ok) throw new Error('You do not have permission to record employee actions')
    const { error } = await sb.from('employee_actions').insert(data)
    if (error) throw new Error(error.message)
  })

// ─── route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/app/employees')({ component: EmployeesPage })

const actionTypeColors: Record<string, string> = {
  BONUS:      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PUNISHMENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ABSENT:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  OVERTIME:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

function EmployeesPage() {
  const { permissions = [] } = Route.useRouteContext()
  const qc = useQueryClient()
  const employees = useQuery({ queryKey: ['employees'], queryFn: list })
  const [editing, setEditing] = useState<Employee | null>(null)
  const [creating, setCreating] = useState(false)
  const [actionFor, setActionFor] = useState<Employee | null>(null)

  const canWrite   = can(permissions, 'employees', 'write')
  const canDelete  = can(permissions, 'employees', 'delete')
  const canActions = can(permissions, 'employees', 'actions')

  const columns: ColumnDef<Employee>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'phone', header: 'Phone', cell: ({ getValue }) => getValue<string>() || '—' },
    { accessorKey: 'month_salary', header: 'Monthly Salary',
      cell: ({ getValue }) => formatCurrency(Number(getValue()), 'IQD') },
    { accessorKey: 'dollar', header: 'Rate (USD)',
      cell: ({ getValue }) => <span className="font-mono text-sm">{Number(getValue()).toLocaleString()}</span> },
    {
      id: 'actions', header: '', size: 120,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          {canActions && (
            <Button size="sm" variant="ghost" title="Record action" onClick={() => setActionFor(row.original)}>
              <CalendarPlus className="h-4 w-4" />
            </Button>
          )}
          {canWrite && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(row.original)}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={async () => {
              if (!confirm(`Remove ${row.original.name}?`)) return
              try {
                await softDelete({ data: { id: row.original.id } })
                toast.success('Employee removed')
                qc.invalidateQueries({ queryKey: ['employees'] })
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
          <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {employees.data?.length ?? 0} active employee{employees.data?.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Add employee
          </Button>
        )}
      </div>

      <DataTable
        data={employees.data ?? []}
        columns={columns}
        searchKey="name"
        emptyMessage="No employees found"
      />

      {(creating || editing) && (
        <EmployeeDialog
          employee={editing}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['employees'] }); setCreating(false); setEditing(null) }}
        />
      )}
      {actionFor && (
        <ActionDialog
          employee={actionFor}
          onClose={() => setActionFor(null)}
          actionTypeColors={actionTypeColors}
        />
      )}
    </div>
  )
}

function EmployeeDialog({ employee, onClose, onSaved }: {
  employee: Employee | null; onClose: () => void; onSaved: () => void
}) {
  const dollarQ = useQuery({ queryKey: ['dollar-rate'], queryFn: getCurrentDollar })
  const form = useForm({
    defaultValues: {
      id: employee?.id,
      name: employee?.name ?? '',
      phone: employee?.phone ?? '',
      address: employee?.address ?? '',
      month_salary: employee?.month_salary ?? 0,
      dollar: employee?.dollar ?? dollarQ.data ?? 1500,
    },
    onSubmit: async ({ value }) => {
      try {
        await upsert({ data: value })
        toast.success(employee ? 'Employee updated' : 'Employee created')
        onSaved()
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    },
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{employee ? 'Edit employee' : 'New employee'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
          <TextField form={form} name="name" label="Full name" required />
          <div className="grid grid-cols-2 gap-3">
            <TextField form={form} name="phone" label="Phone" />
            <TextField form={form} name="address" label="Address" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField form={form} name="month_salary" label="Monthly salary (IQD)" type="number" required />
            <TextField form={form} name="dollar" label="USD rate" type="number" required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={form.state.isSubmitting}>Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ActionDialog({ employee, onClose, actionTypeColors }: {
  employee: Employee; onClose: () => void; actionTypeColors: Record<string, string>
}) {
  const qc = useQueryClient()
  const actions = useQuery({
    queryKey: ['employee-actions', employee.id],
    queryFn: () => listActions({ data: { employee_id: employee.id } }),
  })

  const form = useForm({
    defaultValues: {
      employee_id: employee.id,
      type: 'BONUS' as 'BONUS' | 'PUNISHMENT' | 'ABSENT' | 'OVERTIME',
      amount: 0,
      dollar: employee.dollar,
      note: '',
      action_date: new Date().toISOString().slice(0, 10),
    },
    onSubmit: async ({ value }) => {
      try {
        await recordAction({ data: { ...value, action_date: new Date(value.action_date).toISOString() } })
        toast.success('Action recorded')
        qc.invalidateQueries({ queryKey: ['employee-actions', employee.id] })
        form.reset()
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    },
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{employee.name} — Actions</DialogTitle>
        </DialogHeader>

        <form className="grid grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
          <SelectField form={form} name="type" label="Type" options={[
            { value: 'BONUS' as const, label: 'Bonus' },
            { value: 'PUNISHMENT' as const, label: 'Punishment' },
            { value: 'ABSENT' as const, label: 'Absent' },
            { value: 'OVERTIME' as const, label: 'Overtime' },
          ]} />
          <TextField form={form} name="action_date" label="Date" type="date" required />
          <TextField form={form} name="amount" label="Amount (IQD)" type="number" required />
          <TextField form={form} name="dollar" label="USD rate" type="number" required />
          <div className="col-span-2"><TextAreaField form={form} name="note" label="Note" /></div>
          <div className="col-span-2 flex justify-end">
            <Button type="submit" disabled={form.state.isSubmitting}>Record action</Button>
          </div>
        </form>

        {(actions.data?.length ?? 0) > 0 && (
          <>
            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium mb-3">History</p>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {actions.data?.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 rounded-lg bg-muted/50 p-3 text-sm">
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${actionTypeColors[a.type]}`}>
                      {a.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{formatCurrency(a.amount, 'IQD')}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(a.action_date).toLocaleDateString()}
                        </span>
                      </div>
                      {a.note && <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
