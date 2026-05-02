import { createFileRoute, Link, useRouteContext } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import { type ColumnDef } from '@tanstack/react-table'
import { z } from 'zod'
import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Plus, Receipt, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { getSupabaseServer } from '~/lib/supabase.server'
import { can } from '~/lib/auth'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { DataTable } from '~/components/data-table'
import { TextField } from '~/components/form-fields'

interface Company { id: number; name: string; phone: string; address: string }

// ─── server fns ──────────────────────────────────────────────────────────────

const list = createServerFn({ method: 'GET' }).handler(async (): Promise<Company[]> => {
  const sb = getSupabaseServer()
  const { data, error } = await sb.from('companies').select('*').is('deleted_at', null).order('name')
  if (error) throw new Error(error.message)
  return data as Company[]
})

const Schema = z.object({
  id: z.number().optional(),
  name: z.string().min(2),
  phone: z.string().min(1),
  address: z.string().min(1),
})

const upsert = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => Schema.parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer()
    const { data: ok } = await sb.rpc('has_permission', { p_resource: 'companies', p_action: 'write' })
    if (!ok) throw new Error('You do not have permission to manage companies')
    const payload = { name: data.name, phone: data.phone, address: data.address }
    if (data.id) {
      const { error } = await sb.from('companies').update(payload).eq('id', data.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await sb.from('companies').insert(payload)
      if (error) throw new Error(error.message)
    }
  })

const softDelete = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer()
    const { data: ok } = await sb.rpc('has_permission', { p_resource: 'companies', p_action: 'delete' })
    if (!ok) throw new Error('You do not have permission to delete companies')
    const { error } = await sb.from('companies').update({ deleted_at: new Date().toISOString() }).eq('id', data.id)
    if (error) throw new Error(error.message)
  })

// ─── route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/app/companies')({ component: CompaniesPage })

function CompaniesPage() {
  const { permissions = [] } = Route.useRouteContext()
  const qc = useQueryClient()
  const companies = useQuery({ queryKey: ['companies'], queryFn: list })
  const [editing, setEditing] = useState<Company | null>(null)
  const [creating, setCreating] = useState(false)
  const { t } = useTranslation()

  const canWrite   = can(permissions, 'companies', 'write')
  const canDelete  = can(permissions, 'companies', 'delete')
  const canViewPurchases = can(permissions, 'purchases', 'view')

  const columns: ColumnDef<Company>[] = [
    { accessorKey: 'name',    header: t('companies.name') },
    { accessorKey: 'phone',   header: t('companies.phone'), cell: ({ getValue }) => getValue<string>() || '—' },
    { accessorKey: 'address', header: t('companies.address'), cell: ({ getValue }) => getValue<string>() || '—' },
    {
      id: 'actions', header: '', size: 120,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          {canViewPurchases && (
            <Button size="sm" variant="ghost" title={t('purchases.title')} asChild>
              <Link to="/app/purchases" search={{ company: row.original.id } as any}>
                <Receipt className="h-4 w-4" />
              </Link>
            </Button>
          )}
          {canWrite && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(row.original)}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
              onClick={async () => {
                if (!confirm(t('companies.confirmRemove', { name: row.original.name }))) return
                try {
                  await softDelete({ data: { id: row.original.id } })
                  toast.success(t('companies.companyRemoved'))
                  qc.invalidateQueries({ queryKey: ['companies'] })
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
          <h1 className="text-2xl font-bold tracking-tight">{t('companies.title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('companies.subtitle', { count: companies.data?.length ?? 0 })}
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> {t('companies.addCompany')}
          </Button>
        )}
      </div>

      <DataTable data={companies.data ?? []} columns={columns} searchKey="name" emptyMessage={t('companies.noCompanies')} />

      {(creating || editing) && (
        <Dialog open onOpenChange={(o) => !o && (setCreating(false), setEditing(null))}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? t('companies.editCompany') : t('companies.newCompany')}</DialogTitle>
            </DialogHeader>
            <CompanyForm
              company={editing}
              onClose={() => { setCreating(false); setEditing(null) }}
              onSaved={() => { qc.invalidateQueries({ queryKey: ['companies'] }); setEditing(null); setCreating(false) }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function CompanyForm({ company, onClose, onSaved }: { company: Company | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation()
  const form = useForm({
    defaultValues: { id: company?.id, name: company?.name ?? '', phone: company?.phone ?? '', address: company?.address ?? '' },
    onSubmit: async ({ value }) => {
      try {
        await upsert({ data: value })
        toast.success(company ? t('companies.companyUpdated') : t('companies.companyCreated'))
        onSaved()
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    },
  })
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
      <TextField form={form} name="name"    label={t('companies.name')} required />
      <TextField form={form} name="phone"   label={t('companies.phone')} required />
      <TextField form={form} name="address" label={t('companies.address')} required />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button type="submit" disabled={form.state.isSubmitting}>{t('common.save')}</Button>
      </div>
    </form>
  )
}
