'use client';

import { Bell, RefreshCw, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAdminStats } from '@/lib/context/sidebar-counts-context';

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
    case '/dashboard':
      return today;

    case '/orders':
      return loaded
        ? `${n(stats.totalOrders, loaded)} total · ${n(stats.pendingOrders, loaded)} active`
        : '…';

    case '/merchants':
      return loaded
        ? `${n(stats.activeMerchants, loaded)} active${stats.pendingMerchants > 0 ? ` · ${stats.pendingMerchants} pending` : ''}`
        : '…';

    case '/riders':
      return loaded
        ? `${n(stats.totalRiders, loaded)} total · ${n(stats.onlineRiders, loaded)} online`
        : '…';

    case '/customers':
      return loaded
        ? `${n(stats.totalCustomers, loaded)} registered · ${n(stats.activeCustomers, loaded)} active`
        : '…';

    case '/payments':
      return loaded
        ? `${n(stats.totalOrders, loaded)} orders tracked`
        : '…';

    case '/refunds':
      return loaded
        ? stats.pendingRefunds > 0
          ? `${stats.pendingRefunds} pending review`
          : 'No pending refunds'
        : '…';

    case '/promotions':
      return loaded
        ? `${n(stats.totalPromotions, loaded)} total · ${n(stats.activePromotions, loaded)} active`
        : '…';

    case '/zones':
      return loaded
        ? `${n(stats.totalZones, loaded)} zones · ${n(stats.activeZones, loaded)} active`
        : '…';

    case '/store-types':
      return 'Manage merchant store categories';

    case '/inventory-alerts':
      return loaded
        ? stats.openAlerts > 0
          ? `${stats.openAlerts} open · needs attention`
          : 'All alerts resolved'
        : '…';

    case '/audit':
      return 'Live activity log';

    case '/reports':
      return today;

    case '/settings':
      return 'Platform configuration';

    default:
      return '';
  }
}

export function Topbar() {
  const pathname = usePathname();
  const stats    = useAdminStats();
  const base     = '/' + (pathname.split('/')[1] ?? '');
  const title    = PAGE_TITLE[base] ?? 'Admin';
  const sub      = usePageSubtitle(base, stats);

  // Pending badge: orders + refunds combined for bell icon
  const alertCount = stats.pendingOrders + stats.pendingRefunds;

  return (
    <header
      className="flex items-center justify-between px-5 border-b flex-shrink-0"
      style={{ height: 48, background: '#FFFFFF', borderColor: '#E8E6F8' }}
    >
      {/* Left: title + live subtitle */}
      <div className="flex items-baseline gap-3">
        <span className="font-extrabold" style={{ fontSize: 14, color: '#1A1730' }}>
          {title}
        </span>
        {sub && (
          <span
            className="transition-opacity"
            style={{ fontSize: 10, color: '#8A88A8', opacity: stats.loaded ? 1 : 0.5 }}
          >
            {sub}
          </span>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div
          className="flex items-center gap-1.5 rounded-lg px-2.5"
          style={{ width: 160, height: 30, background: '#F6F5FF', border: '1px solid #E8E6F8' }}
        >
          <Search size={12} style={{ color: '#8A88A8' }} />
          <input
            placeholder="Search…"
            className="bg-transparent outline-none flex-1"
            style={{ fontSize: 11, color: '#4A4770' }}
          />
        </div>

        {/* Bell — badge shows real pending count */}
        <button
          className="relative flex items-center justify-center rounded-lg"
          style={{ width: 30, height: 30, background: '#F6F5FF', border: '1px solid #E8E6F8' }}
          title={alertCount > 0 ? `${alertCount} items need attention` : 'No alerts'}
        >
          <Bell size={14} style={{ color: '#4A4770' }} />
          {alertCount > 0 && (
            <span
              className="absolute flex items-center justify-center rounded-full font-bold"
              style={{
                top: -4, right: -4,
                minWidth: 16, height: 16,
                padding: '0 3px',
                background: '#D84040',
                color: '#fff',
                fontSize: 8,
                lineHeight: 1,
              }}
            >
              {alertCount > 99 ? '99+' : alertCount}
            </span>
          )}
        </button>

        {/* Refresh — reloads page data */}
        <button
          onClick={() => window.location.reload()}
          className="flex items-center justify-center rounded-lg"
          style={{ width: 30, height: 30, background: '#F6F5FF', border: '1px solid #E8E6F8' }}
          title="Refresh"
        >
          <RefreshCw size={13} style={{ color: '#4A4770' }} />
        </button>
      </div>
    </header>
  );
}
