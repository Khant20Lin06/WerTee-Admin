'use client';

import { RefreshCw, Search, Sun, Moon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/context/theme-context';
import { useAdminStats } from '@/lib/context/sidebar-counts-context';
import { useGlobalSearch } from '@/lib/context/global-search-context';
import { NotificationPanel } from './notification-panel';

const PAGE_TITLE: Record<string, string> = {
  '/dashboard':         'Dashboard',
  '/orders':            'Orders',
  '/merchants':         'Merchants',
  '/riders':            'Riders',
  '/customers':         'Customers',
  '/payments':          'Payments',
  '/refunds':           'Refunds',
  '/promotions':        'Promotions',
  '/zones':             'Delivery zones',
  '/inventory-alerts':  'Inventory alerts',
  '/store-types':       'Store types',
  '/audit':             'Audit logs',
  '/reports':           'Reports & analytics',
  '/settings':          'Settings',
};

function n(val: number, loaded: boolean) {
  return loaded ? val.toLocaleString() : '…';
}

function usePageSubtitle(base: string, stats: ReturnType<typeof useAdminStats>): string {
  const { loaded } = stats;
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  switch (base) {
    case '/dashboard':      return today;
    case '/orders':         return loaded ? `${n(stats.totalOrders, loaded)} total · ${n(stats.pendingOrders, loaded)} active` : '…';
    case '/merchants':      return loaded ? `${n(stats.activeMerchants, loaded)} active${stats.pendingMerchants > 0 ? ` · ${stats.pendingMerchants} pending` : ''}` : '…';
    case '/riders':         return loaded ? `${n(stats.totalRiders, loaded)} total · ${n(stats.onlineRiders, loaded)} online` : '…';
    case '/customers':      return loaded ? `${n(stats.totalCustomers, loaded)} registered · ${n(stats.activeCustomers, loaded)} active` : '…';
    case '/payments':       return loaded ? `${n(stats.totalOrders, loaded)} orders tracked` : '…';
    case '/refunds':        return loaded ? (stats.pendingRefunds > 0 ? `${stats.pendingRefunds} pending review` : 'No pending refunds') : '…';
    case '/promotions':     return loaded ? `${n(stats.totalPromotions, loaded)} total · ${n(stats.activePromotions, loaded)} active` : '…';
    case '/zones':          return loaded ? `${n(stats.totalZones, loaded)} zones · ${n(stats.activeZones, loaded)} active` : '…';
    case '/store-types':    return 'Manage merchant store categories';
    case '/inventory-alerts': return loaded ? (stats.openAlerts > 0 ? `${stats.openAlerts} open · needs attention` : 'All alerts resolved') : '…';
    case '/audit':          return 'Live activity log';
    case '/reports':        return today;
    case '/settings':       return 'Platform configuration';
    default:                return '';
  }
}

export function Topbar() {
  const pathname = usePathname();
  const stats    = useAdminStats();
  const { open: openSearch } = useGlobalSearch();
  const { theme, toggle } = useTheme();
  const base     = '/' + (pathname.split('/')[1] ?? '');
  const title    = PAGE_TITLE[base] ?? 'Admin';
  const sub      = usePageSubtitle(base, stats);

  return (
    <header
      className="flex items-center justify-between px-5 flex-shrink-0"
      style={{
        height: 52,
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Left: page title + live subtitle */}
      <div className="flex items-baseline gap-2.5 min-w-0">
        <span
          className="font-extrabold flex-shrink-0"
          style={{ fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
        >
          {title}
        </span>
        {sub && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              opacity: stats.loaded ? 1 : 0.45,
              transition: 'opacity 0.2s',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {sub}
          </span>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Search bar */}
        <button
          onClick={openSearch}
          className="flex items-center gap-2 rounded-lg px-3"
          style={{
            width: 192,
            height: 32,
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'border-color 0.15s, background 0.15s',
          }}
          title="Global search (⌘K)"
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand-border)';
            (e.currentTarget as HTMLElement).style.background  = 'var(--bg-card)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
            (e.currentTarget as HTMLElement).style.background  = 'var(--bg-subtle)';
          }}
        >
          <Search size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'var(--text-faint)', flex: 1 }}>Search…</span>
          <span
            className="rounded font-mono"
            style={{
              fontSize: 9,
              color: 'var(--text-muted)',
              background: 'var(--brand-muted)',
              padding: '1px 4px',
              border: '1px solid var(--brand-border)',
              flexShrink: 0,
            }}
          >
            ⌘K
          </span>
        </button>

        {/* Notification bell */}
        <NotificationPanel />

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="flex items-center justify-center rounded-lg"
          style={{
            width: 32, height: 32,
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'border-color 0.15s, background 0.15s',
          }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand-border)';
            (e.currentTarget as HTMLElement).style.background  = 'var(--brand-muted)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
            (e.currentTarget as HTMLElement).style.background  = 'var(--bg-subtle)';
          }}
        >
          {theme === 'dark'
            ? <Sun  size={13} style={{ color: 'var(--text-secondary)' }} />
            : <Moon size={13} style={{ color: 'var(--text-secondary)' }} />
          }
        </button>

        {/* Refresh */}
        <button
          onClick={() => window.location.reload()}
          className="flex items-center justify-center rounded-lg"
          style={{
            width: 32, height: 32,
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'border-color 0.15s, background 0.15s',
          }}
          title="Refresh page"
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand-border)';
            (e.currentTarget as HTMLElement).style.background  = 'var(--brand-muted)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
            (e.currentTarget as HTMLElement).style.background  = 'var(--bg-subtle)';
          }}
        >
          <RefreshCw size={13} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>
    </header>
  );
}
