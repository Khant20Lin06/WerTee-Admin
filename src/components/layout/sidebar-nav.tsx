'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ShoppingBag, Store, Bike, Users, CreditCard,
  RotateCcw, Tag, MapPin, FileText, Settings,
  BarChart3, Building2, LogOut, PackageSearch, Star,
} from 'lucide-react';
import { clearToken } from '@/lib/api/client';
import { useSidebarCounts } from '@/lib/context/sidebar-counts-context';

type NavItem = { label: string; href: string; icon: React.ElementType; badgeKey?: 'pendingOrders' | 'pendingRefunds' | 'openAlerts' };
type NavGroup = { group: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard',  href: '/dashboard',  icon: LayoutDashboard },
      { label: 'Orders',     href: '/orders',     icon: ShoppingBag,    badgeKey: 'pendingOrders' },
    ],
  },
  {
    group: 'Manage',
    items: [
      { label: 'Merchants',  href: '/merchants',  icon: Store },
      { label: 'Riders',     href: '/riders',     icon: Bike },
      { label: 'Customers',  href: '/customers',  icon: Users },
    ],
  },
  {
    group: 'Finance',
    items: [
      { label: 'Payments',   href: '/payments',   icon: CreditCard },
      { label: 'Refunds',    href: '/refunds',    icon: RotateCcw,      badgeKey: 'pendingRefunds' },
      { label: 'Promotions', href: '/promotions', icon: Tag },
    ],
  },
  {
    group: 'System',
    items: [
      { label: 'Zones',        href: '/zones',            icon: MapPin },
      { label: 'Store types',  href: '/store-types',      icon: Store },
      { label: 'Inv. alerts',  href: '/inventory-alerts', icon: PackageSearch, badgeKey: 'openAlerts' },
      { label: 'Ratings',      href: '/ratings',          icon: Star },
      { label: 'Audit logs',   href: '/audit',            icon: FileText },
      { label: 'Reports',      href: '/reports',          icon: BarChart3 },
      { label: 'Settings',     href: '/settings',         icon: Settings },
    ],
  },
];

const BADGE_COLOR: Record<string, { bg: string; color: string }> = {
  '/orders':           { bg: '#FFF0F0', color: '#D84040' },
  '/refunds':          { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  '/inventory-alerts': { bg: 'var(--brand-muted)', color: 'var(--brand)' },
};

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const TRANS = `width 0.22s ${EASE}`;

export function SidebarNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const router   = useRouter();
  const counts   = useSidebarCounts();

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  return (
    <aside
      className="flex flex-col h-full w-full"
      style={{
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      {/* ── Brand ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center flex-shrink-0"
        style={{
          height: 56,
          padding: collapsed ? '0 13px' : '0 14px',
          gap: 10,
          transition: TRANS,
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Logo mark */}
        <div
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{
            width: 30, height: 30,
            background: 'var(--brand)',
            boxShadow: '0 2px 8px rgba(91,79,233,0.35)',
          }}
        >
          <Building2 size={15} color="#fff" strokeWidth={2} />
        </div>

        {/* Brand name */}
        <div
          style={{
            overflow: 'hidden',
            opacity: collapsed ? 0 : 1,
            width: collapsed ? 0 : 'auto',
            transition: 'opacity 0.15s, width 0.22s cubic-bezier(0.16,1,0.3,1)',
            whiteSpace: 'nowrap',
          }}
        >
          <div className="font-extrabold leading-none" style={{ fontSize: 13.5, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            WerTee
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, letterSpacing: '0.03em' }}>
            Admin panel
          </div>
        </div>
      </div>

      {/* ── Nav ────────────────────────────────────────────────────────── */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ padding: collapsed ? '10px 6px' : '10px 8px', transition: TRANS }}
      >
        {NAV.map((group) => (
          <div key={group.group} style={{ marginBottom: 4 }}>
            {/* Group label */}
            <div
              style={{
                fontSize: 9,
                color: 'var(--text-faint)',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 2,
                paddingLeft: collapsed ? 0 : 8,
                height: collapsed ? 0 : 18,
                overflow: 'hidden',
                opacity: collapsed ? 0 : 1,
                transition: 'all 0.18s',
                whiteSpace: 'nowrap',
              }}
            >
              {group.group}
            </div>

            {group.items.map((item) => {
              const active     = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon       = item.icon;
              const badgeCount = item.badgeKey ? counts[item.badgeKey] : 0;
              const showBadge  = badgeCount > 0;
              const bc         = BADGE_COLOR[item.href] ?? { bg: 'var(--danger-bg)', color: 'var(--danger)' };

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className="flex items-center relative"
                  style={{
                    height: 34,
                    gap: collapsed ? 0 : 8,
                    padding: collapsed ? '0 9px' : '0 8px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    fontSize: 12,
                    fontWeight: active ? 600 : 450,
                    color: active ? 'var(--brand)' : 'var(--text-secondary)',
                    background: active ? 'var(--brand-muted)' : 'transparent',
                    borderRadius: 8,
                    marginBottom: 1,
                    // Left accent bar via box-shadow (no layout shift)
                    boxShadow: active ? 'inset 2px 0 0 var(--brand)' : 'none',
                    transition: 'background 0.13s, color 0.13s, box-shadow 0.13s',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  {/* Icon */}
                  <span className="flex items-center justify-center flex-shrink-0" style={{ position: 'relative' }}>
                    <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                    {/* Dot badge on icon when collapsed */}
                    {collapsed && showBadge && (
                      <span
                        className="absolute rounded-full"
                        style={{ width: 6, height: 6, top: -2, right: -2, background: bc.color }}
                      />
                    )}
                  </span>

                  {/* Label + pill badge */}
                  <span
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      opacity: collapsed ? 0 : 1,
                      maxWidth: collapsed ? 0 : 200,
                      transition: 'opacity 0.13s, max-width 0.22s cubic-bezier(0.16,1,0.3,1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span className="flex-1 truncate">{item.label}</span>
                    {showBadge && (
                      <span
                        className="rounded-pill font-bold flex-shrink-0"
                        style={{
                          fontSize: 9,
                          padding: '1.5px 5px',
                          background: bc.bg,
                          color: bc.color,
                          minWidth: 18,
                          textAlign: 'center',
                          lineHeight: 1.4,
                        }}
                      >
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          padding: collapsed ? '10px 6px' : '10px 12px',
          transition: TRANS,
          flexShrink: 0,
        }}
      >
        {/* Avatar row */}
        <div className="flex items-center" style={{ gap: collapsed ? 0 : 8, marginBottom: 6, overflow: 'hidden' }}>
          <div
            className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
            style={{
              width: 28, height: 28,
              background: 'var(--brand-muted)',
              color: 'var(--brand)',
              fontSize: 10,
              border: '1.5px solid var(--brand-border)',
            }}
          >
            SA
          </div>
          <div
            style={{
              overflow: 'hidden',
              opacity: collapsed ? 0 : 1,
              maxWidth: collapsed ? 0 : 130,
              transition: 'opacity 0.13s, max-width 0.22s cubic-bezier(0.16,1,0.3,1)',
              whiteSpace: 'nowrap',
            }}
          >
            <div className="truncate font-semibold" style={{ fontSize: 11, color: 'var(--text-primary)' }}>Super Admin</div>
            <div className="truncate" style={{ fontSize: 9, color: 'var(--text-muted)' }}>admin@werte.mm</div>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sign out' : undefined}
          className="w-full flex items-center rounded-lg"
          style={{
            height: 30,
            gap: collapsed ? 0 : 6,
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0 6px' : '0 8px',
            fontSize: 11,
            color: 'var(--danger)',
            background: 'var(--danger-bg)',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            transition: `background 0.13s, ${TRANS}`,
            cursor: 'pointer',
            border: 'none',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FFE0E0'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--danger-bg)'; }}
        >
          <LogOut size={13} style={{ flexShrink: 0 }} />
          <span
            style={{
              opacity: collapsed ? 0 : 1,
              maxWidth: collapsed ? 0 : 100,
              overflow: 'hidden',
              transition: 'opacity 0.13s, max-width 0.22s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            Sign out
          </span>
        </button>
      </div>
    </aside>
  );
}
