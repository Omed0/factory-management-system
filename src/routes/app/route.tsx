import { createFileRoute, Link, Outlet, redirect, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import {
  BarChart3, Building2, ChevronLeft, DollarSign, FileText,
  LayoutDashboard, LogOut, Menu, Moon, Package, Receipt,
  Settings, ShoppingCart, Sun, UserRound, Users, Warehouse, X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getSupabaseServer } from '~/lib/supabase.server'
import { can } from '~/lib/auth'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip'
import type { RouterProfile } from '~/router'

// ─── server fns ──────────────────────────────────────────────────────────────

const bootstrap = createServerFn({ method: 'GET' }).handler(async () => {
  const sb = getSupabaseServer()
  const { data: { user }, error } = await sb.auth.getUser()
  if (error || !user) throw new Error('not authenticated')

  const { data: profile, error: pErr } = await sb
    .from('profiles')
    .select('id, name, role')
    .eq('id', user.id)
    .is('deleted_at', null)
    .single<RouterProfile>()

  if (pErr || !profile) throw new Error('profile not found')

  const { data: catalog } = await sb.from('permission_catalog').select('resource, action')
  const allPerms = (catalog ?? []).map((c) => `${c.resource}:${c.action}`)

  let permissions: string[]
  if (profile.role === 'OWNER') {
    permissions = allPerms
  } else if (profile.role === 'ADMIN') {
    permissions = allPerms.filter((p) => p !== 'backups:config')
  } else {
    const { data: grants } = await sb
      .from('user_permissions').select('resource, action').eq('profile_id', user.id)
    permissions = (grants ?? []).map((g) => `${g.resource}:${g.action}`)
  }

  return { profile, permissions }
})

const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const sb = getSupabaseServer()
  await sb.auth.signOut()
})

// ─── route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/app')({
  beforeLoad: async () => {
    try {
      return await bootstrap()
    } catch {
      throw redirect({ to: '/login' })
    }
  },
  loader: ({ context }) => ({
    profile: context.profile!,
    permissions: context.permissions ?? [],
    settings: context.settings,
  }),
  component: AppLayout,
})

// ─── nav definition ───────────────────────────────────────────────────────────

const NAV = [
  { icon: LayoutDashboard, key: 'dashboard', to: '/app/dashboard',  perm: null },
  { icon: ShoppingCart,    key: 'sales',     to: '/app/sales',      perm: 'sales:view' },
  { icon: Users,           key: 'customers', to: '/app/customers',  perm: 'customers:view' },
  { icon: Package,         key: 'products',  to: '/app/products',   perm: 'products:view' },
  { icon: UserRound,       key: 'employees', to: '/app/employees',  perm: 'employees:view' },
  { icon: Building2,       key: 'companies', to: '/app/companies',  perm: 'companies:view' },
  { icon: Receipt,         key: 'purchases', to: '/app/purchases',  perm: 'purchases:view' },
  { icon: FileText,        key: 'expenses',  to: '/app/expenses',   perm: 'expenses:view' },
  { icon: DollarSign,      key: 'exchange',  to: '/app/dollar',     perm: 'dollar:view' },
  { icon: BarChart3,       key: 'reports',    to: '/app/reports',     perm: 'reports:view' },
  { icon: Warehouse,       key: 'warehouses', to: '/app/warehouses',  perm: 'warehouses:view' },
] as const

// ─── dark-mode toggle ─────────────────────────────────────────────────────────

function useDarkMode() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch {}
  }

  return { dark, toggle }
}

// ─── nav item ────────────────────────────────────────────────────────────────

function NavItem({
  icon: Icon, label, to, collapsed, onClick,
}: { icon: React.ElementType; label: string; to: string; collapsed?: boolean; onClick?: () => void }) {
  const link = (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
        'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
        '[&.active]:bg-primary/10 [&.active]:text-primary [&.active]:font-semibold',
      )}
      activeProps={{ className: 'active' }}
    >
      <Icon className="h-4.5 w-4.5 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  )

  if (!collapsed) return link
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>{label}</TooltipContent>
    </Tooltip>
  )
}

// ─── role badge ───────────────────────────────────────────────────────────────

const roleBadgeClass: Record<string, string> = {
  OWNER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ADMIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  USER:  'bg-muted text-muted-foreground',
}

// ─── layout ──────────────────────────────────────────────────────────────────

function AppLayout() {
  const router = useRouter()
  const { profile, permissions, settings } = Route.useLoaderData()
  const { dark, toggle: toggleDark } = useDarkMode()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { t } = useTranslation()

  const handleLogout = async () => {
    await logout({})
    router.navigate({ to: '/login' })
  }

  const initials = profile?.name
    ? profile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  const factoryName = settings?.factory_name ?? 'Factory'

  const visibleNav = NAV.filter((item) =>
    item.perm === null || can(permissions, ...((item.perm as string).split(':') as [string, string]))
  )

  const canAccessSettings = profile?.role === 'OWNER' || profile?.role === 'ADMIN'

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        'flex flex-col h-full border-e border-sidebar-border bg-sidebar transition-all duration-200',
        collapsed && !isMobile ? 'w-15' : 'w-60',
      )}>
        {/* Header */}
        <div className={cn(
          'flex h-14 shrink-0 items-center border-b border-sidebar-border px-3 gap-2',
          collapsed && !isMobile ? 'justify-center' : 'justify-between',
        )}>
          {(!collapsed || isMobile) && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground text-xs font-bold">
                  {factoryName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="font-semibold text-sidebar-foreground text-sm truncate">{factoryName}</span>
            </div>
          )}
          {collapsed && !isMobile && (
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground text-xs font-bold">
                {factoryName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {isMobile ? (
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-1.5 hover:bg-sidebar-accent text-sidebar-foreground/70"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="hidden md:flex rounded-lg p-1.5 hover:bg-sidebar-accent text-sidebar-foreground/70 shrink-0"
              aria-label={t('nav.toggleSidebar')}
            >
              <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed ? 'rotate-180' : '')} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {visibleNav.map((item) => (
            <NavItem
              key={item.to}
              icon={item.icon}
              label={t(`nav.${item.key}`)}
              to={item.to}
              collapsed={collapsed && !isMobile}
              onClick={() => setMobileOpen(false)}
            />
          ))}

          {canAccessSettings && (
            <>
              <Separator className="my-2 bg-sidebar-border" />
              <NavItem
                icon={Settings}
                label={t('nav.settings')}
                to="/app/settings"
                collapsed={collapsed && !isMobile}
                onClick={() => setMobileOpen(false)}
              />
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-sidebar-border p-2">
          {collapsed && !isMobile ? (
            <div className="flex flex-col items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleDark}
                    className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/70"
                    aria-label={t('nav.toggleSidebar')}
                  >
                    {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{dark ? t('nav.lightMode') : t('nav.darkMode')}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/70"
                    aria-label={t('nav.signOut')}
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs bg-primary/15 text-primary font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{t('nav.signOutUser', { name: profile?.name })}</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs bg-primary/15 text-primary font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-sidebar-foreground truncate">{profile?.name}</p>
                  <span className={cn(
                    'inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5',
                    roleBadgeClass[profile?.role ?? 'USER'],
                  )}>
                    {profile?.role}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={toggleDark}
                    className="rounded-md p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    aria-label={dark ? t('nav.lightMode') : t('nav.darkMode')}
                  >
                    {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="rounded-md p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    aria-label={t('nav.signOut')}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={cn(
        'fixed inset-y-0 inset-s-0 z-50 md:hidden transition-transform duration-200',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <SidebarContent isMobile />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">
        <SidebarContent />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Mobile topbar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1.5 hover:bg-muted text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">
                {factoryName.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="font-semibold text-sm">{factoryName}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-350 mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
