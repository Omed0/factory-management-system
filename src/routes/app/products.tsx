import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import { type ColumnDef } from '@tanstack/react-table'
import { z } from 'zod'
import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { getSupabaseServer } from '~/lib/supabase.server'
import { getSupabaseBrowser } from '~/lib/supabase.browser'
import { can } from '~/lib/auth'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { DataTable } from '~/components/data-table'
import { TextField, SelectField } from '~/components/form-fields'
import { formatCurrency } from '~/lib/utils'

interface Product {
  id: number; name: string; price: number; dollar: number
  image_url: string | null; unit_type: 'METER' | 'PIECE'
  grains_per_carton: number | null
}

// ─── server fns ──────────────────────────────────────────────────────────────

const list = createServerFn({ method: 'GET' }).handler(async (): Promise<Product[]> => {
  const sb = getSupabaseServer()
  const { data, error } = await sb.from('products').select('*').is('deleted_at', null).order('name')
  if (error) throw new Error(error.message)
  return data as Product[]
})

const getCurrentDollar = createServerFn({ method: 'GET' }).handler(async () => {
  const sb = getSupabaseServer()
  const { data } = await sb.from('dollar').select('price').eq('id', 1).single<{ price: number }>()
  return data?.price ?? 1500
})

const Schema = z.object({
  id: z.number().optional(),
  name: z.string().min(2),
  price: z.coerce.number().nonnegative(),
  dollar: z.coerce.number().positive(),
  image_url: z.string().nullish().transform((v) => v || null),
  unit_type: z.enum(['METER', 'PIECE']),
  grains_per_carton: z.coerce.number().int().positive().nullish().transform((v) => v || null),
})

const upsert = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => Schema.parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer()
    const { data: ok } = await sb.rpc('has_permission', { p_resource: 'products', p_action: 'write' })
    if (!ok) throw new Error('You do not have permission to manage products')
    const payload = { name: data.name, price: data.price, dollar: data.dollar, image_url: data.image_url, unit_type: data.unit_type, grains_per_carton: data.grains_per_carton }
    if (data.id) {
      const { error } = await sb.from('products').update(payload).eq('id', data.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await sb.from('products').insert(payload)
      if (error) throw new Error(error.message)
    }
  })

const softDelete = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer()
    const { data: ok } = await sb.rpc('has_permission', { p_resource: 'products', p_action: 'delete' })
    if (!ok) throw new Error('You do not have permission to delete products')
    const { error } = await sb.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', data.id)
    if (error) throw new Error(error.message)
  })

// ─── route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/app/products')({ component: ProductsPage })

function ProductsPage() {
  const { permissions = [] } = Route.useRouteContext()
  const qc = useQueryClient()
  const products = useQuery({ queryKey: ['products'], queryFn: list })
  const [editing, setEditing] = useState<Product | null>(null)
  const [creating, setCreating] = useState(false)
  const { t } = useTranslation()

  const canWrite  = can(permissions, 'products', 'write')
  const canDelete = can(permissions, 'products', 'delete')

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: 'image_url', header: '', size: 56,
      cell: ({ getValue }) => {
        const u = getValue<string | null>()
        return u
          ? <img src={u} alt="" className="h-10 w-10 rounded-lg object-cover" />
          : <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs">—</div>
      },
    },
    { accessorKey: 'name', header: t('products.name') },
    { accessorKey: 'price', header: `${t('products.price')} (IQD)`, cell: ({ getValue }) => formatCurrency(Number(getValue()), 'IQD') },
    { accessorKey: 'dollar', header: `${t('common.dollar')} (USD)`, cell: ({ getValue }) => <span className="font-mono text-sm">{Number(getValue()).toLocaleString()}</span> },
    { accessorKey: 'unit_type', header: t('products.unitType'), cell: ({ getValue }) => (
      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{getValue<string>()}</span>
    )},
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
                if (!confirm(t('products.confirmRemove', { name: row.original.name }))) return
                try {
                  await softDelete({ data: { id: row.original.id } })
                  toast.success(t('products.productRemoved'))
                  qc.invalidateQueries({ queryKey: ['products'] })
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
          <h1 className="text-2xl font-bold tracking-tight">{t('products.title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('products.subtitle', { count: products.data?.length ?? 0 })}
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> {t('products.addProduct')}
          </Button>
        )}
      </div>

      <DataTable data={products.data ?? []} columns={columns} searchKey="name" emptyMessage={t('products.noProducts')} />

      {(creating || editing) && (
        <ProductDialog
          product={editing}
          onClose={() => { setEditing(null); setCreating(false) }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['products'] }); setEditing(null); setCreating(false) }}
        />
      )}
    </div>
  )
}

function ProductDialog({ product, onClose, onSaved }: {
  product: Product | null; onClose: () => void; onSaved: () => void
}) {
  const dollarQ = useQuery({ queryKey: ['dollar-rate'], queryFn: getCurrentDollar })
  const { t } = useTranslation()
  const form = useForm({
    defaultValues: {
      id: product?.id,
      name: product?.name ?? '',
      price: product?.price ?? 0,
      dollar: product?.dollar ?? dollarQ.data ?? 1500,
      image_url: product?.image_url ?? '',
      unit_type: product?.unit_type ?? 'PIECE' as const,
      grains_per_carton: product?.grains_per_carton ?? ('' as unknown as number),
    },
    onSubmit: async ({ value }) => {
      try {
        await upsert({ data: value })
        toast.success(product ? t('products.productUpdated') : t('products.productCreated'))
        onSaved()
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    },
  })

  const onUpload = async (file: File) => {
    const sb = getSupabaseBrowser()
    const path = `prod-${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await sb.storage.from('products').upload(path, file, { upsert: true })
    if (error) { toast.error(error.message); return }
    const { data } = sb.storage.from('products').getPublicUrl(path)
    form.setFieldValue('image_url', data.publicUrl)
    toast.success(t('products.uploadImage'))
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{product ? t('products.editProduct') : t('products.newProduct')}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
          <TextField form={form} name="name" label={t('products.name')} required />
          <div className="grid grid-cols-2 gap-3">
            <TextField form={form} name="price"  label={`${t('products.price')} (IQD)`} type="number" required />
            <TextField form={form} name="dollar" label={`${t('common.dollar')} (USD)`} type="number" required />
          </div>
          <SelectField form={form} name="unit_type" label={t('products.unitType')} options={[
            { value: 'PIECE' as const, label: t('products.piece') },
            { value: 'METER' as const, label: t('products.meter') },
          ]} />
          <TextField form={form} name="grains_per_carton" label={t('products.grainsPerCarton')} type="number" />
          <label className="flex items-center gap-2 text-sm cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
            <Upload className="h-4 w-4" />
            {form.getFieldValue('image_url') ? t('products.currentImage') : t('products.uploadImage')}
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f) }} />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={form.state.isSubmitting}>{t('common.save')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
