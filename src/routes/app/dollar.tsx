import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { getSupabaseServer } from '~/lib/supabase.server'
import { can } from '~/lib/auth'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { TextField } from '~/components/form-fields'
import { formatCurrency } from '~/lib/utils'

// ─── server fns ──────────────────────────────────────────────────────────────

const getCurrent = createServerFn({ method: 'GET' }).handler(async () => {
  const sb = getSupabaseServer()
  const { data, error } = await sb.from('dollar').select('price, updated_at').eq('id', 1).single()
  if (error) throw new Error(error.message)
  return data as { price: number; updated_at: string }
})

const getHistory = createServerFn({ method: 'GET' }).handler(async () => {
  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('dollar_history').select('id, price, changed_at')
    .order('changed_at', { ascending: false }).limit(30)
  if (error) throw new Error(error.message)
  return (data ?? []) as { id: number; price: number; changed_at: string }[]
})

const update = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ price: z.coerce.number().positive() }).parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer()
    const { data: ok } = await sb.rpc('has_permission', { p_resource: 'dollar', p_action: 'write' })
    if (!ok) throw new Error('You do not have permission to update the exchange rate')
    const { error } = await sb.from('dollar').update({ price: data.price }).eq('id', 1)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

// ─── route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/app/dollar')({ component: DollarPage })

function DollarPage() {
  const { permissions = [] } = Route.useRouteContext()
  const qc = useQueryClient()
  const current = useQuery({ queryKey: ['dollar'], queryFn: getCurrent })
  const history = useQuery({ queryKey: ['dollar-history'], queryFn: getHistory })

  const canWrite = can(permissions, 'dollar', 'write')
  const { t } = useTranslation()

  useEffect(() => {
    if (current.data?.price !== undefined) {
      form.setFieldValue('price', current.data.price)
    }
  }, [current.data?.price])

  const form = useForm({
    defaultValues: { price: 1500 },
    onSubmit: async ({ value }) => {
      try {
        await update({ data: value })
        toast.success(t('dollar.rateUpdated'))
        qc.invalidateQueries({ queryKey: ['dollar'] })
        qc.invalidateQueries({ queryKey: ['dollar-history'] })
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    },
  })

  const historyData = history.data ?? []
  const prevPrice = historyData[0]?.price
  const currentPrice = current.data?.price
  const diff = currentPrice && prevPrice ? currentPrice - prevPrice : null

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('dollar.title')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('dollar.perUsd')}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('dollar.currentRate')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-3">
            <p className="text-4xl font-bold font-mono">
              {currentPrice ? formatCurrency(currentPrice, 'IQD') : '—'}
            </p>
            {diff !== null && (
              <span className={`flex items-center gap-0.5 text-sm font-medium ${diff >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {diff >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {Math.abs(diff).toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {current.data?.updated_at ? new Date(current.data.updated_at).toLocaleString() : '—'}
          </p>

          {canWrite && (
            <form className="flex gap-2 items-end pt-2" onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
              <div className="flex-1">
                <TextField form={form} name="price" label={`${t('dollar.updateRate')} (IQD)`} type="number" required />
              </div>
              <Button type="submit" disabled={form.state.isSubmitting}>{t('common.save')}</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('dollar.rateHistory')}</CardTitle></CardHeader>
        <CardContent>
          {historyData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{t('dollar.noDollarHistory')}</p>
          ) : (
            <div className="divide-y divide-border">
              {historyData.map((h, i) => {
                const next = historyData[i + 1]
                const delta = next ? h.price - next.price : null
                return (
                  <div key={h.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-muted-foreground">{new Date(h.changed_at).toLocaleString()}</span>
                    <div className="flex items-center gap-2">
                      {delta !== null && (
                        <span className={`text-xs ${delta >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {delta >= 0 ? '+' : ''}{delta.toLocaleString()}
                        </span>
                      )}
                      <span className="font-mono font-medium">{h.price.toLocaleString()}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
