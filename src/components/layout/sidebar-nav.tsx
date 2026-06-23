'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ShoppingBag, Store, Bike, Users, CreditCard,
  RotateCcw, Tag, MapPin, FileText, Settings,
  BarChart3, Building2, LogOut, PackageSearch,
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
      { label: 'Audit logs',   href: '/audit',            icon: FileText },
      { label: 'Reports',      href: '/reports',          icon: BarChart3 },
      { label: 'Settings',     href: '/settings',         icon: Settings },
    ],
  },
];

const BADGE_BG: Record<string, string> = {
  '/refunds':           '#FFF8E8',
  '/inventory-alerts':  '#EEF0FF',
};
const BADGE_COLOR: Record<string, string> = {
  '/refunds':           '#D4820A',
  '/inventory-alerts':  '#5B4FE9',
};

export function SidebarNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const router   = useRouter();
  const counts   = useSidebarCounts();

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  const TRANS = 'width 0.22s cubic-bezier(0.4,0,0.2,1)';

  return (
    <aside
      className="flex flex-col h-full w-full border-r"
      style={{
        background: '#FFFFFF',
        borderColor: '#E8E6F8',
        overflow: 'hidden',
      }}
    >
      {/* Brand */}
      <div
        className="border-b flex items-center"
        style={{
          borderColor: '#E8E6F8',
          height: 56,
          padding: collapsed ? '0 13px' : '0 14px',
          gap: 10,
          transition: TRANS,
          flexShrink: 0,
        }}
      >
        <div
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{ width: 30, height: 30, background: '#5B4FE9' }}
        >
          <Building2 size={16} color="#fff" />
        </div>

        {/* Label — fade out when collapsed */}
        <div
          style={{
            overflow: 'hidden',
            opacity: collapsed ? 0 : 1,
            width: collapsed ? 0 : 'auto',
            transition: 'opacity 0.15s, width 0.22s cubic-bezier(0.4,0,0.2,1)',
            whiteSpace: 'nowrap',
          }}
        >
          <div className="font-extrabold leading-none" style={{ fontSize: 13, color: '#1A1730' }}>
            WerTe
          </div>
          <div style={{ fontSize: 9, color: '#8A88A8', marginTop: 1 }}>Admin panel</div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3" style={{ padding: collapsed ? '12px 6px' : '12px 8px', transition: TRANS }}>
        {NAV.map((group) => (
          <div key={group.group} className="mb-3">
            {/* Group label — hidden when collapsed */}
            <div
              style={{
                fontSize: 9,
                color: '#8A88A8',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: 4,
                paddingLeft: collapsed ? 0 : 8,
                height: collapsed ? 0 : 16,
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

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className="flex items-center rounded-lg mb-0.5 relative"
                  style={{
                    height: 34,
                    gap: collapsed ? 0 : 8,
                    padding: collapsed ? '0 10px' : '0 8px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    fontSize: 12,
                    fontWeight: active ? 600 : 500,
                    color: active ? '#5B4FE9' : '#4A4770',
                    background: active ? '#EEF0FF' : 'transparent',
                    borderLeft: active ? '2px solid #5B4FE9' : '2px solid transparent',
                    transition: 'background 0.1s, color 0.1s',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {/* Icon — always visible */}
                  <span className="flex-shrink-0 flex items-center justify-center" style={{ position: 'relative' }}>
                    <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                    {/* Dot badge on icon when collapsed */}
                    {collapsed && showBadge && (
                      <span
                        className="absolute rounded-full"
                        style={{
                          width: 6, height: 6,
                          top: -2, right: -2,
                          background: item.href === '/refunds' ? '#D4820A' : item.href === '/inventory-alerts' ? '#5B4FE9' : '#D84040',
                        }}
                      />
                    )}
                  </span>

                  {/* Label + badge — only when expanded */}
                  <span
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      opacity: collapsed ? 0 : 1,
                      maxWidth: collapsed ? 0 : 200,
                      transition: 'opacity 0.15s, max-width 0.22s cubic-bezier(0.4,0,0.2,1)',
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
                          padding: '1px 5px',
                          background: BADGE_BG[item.href] ?? '#FFF0F0',
                          color: BADGE_COLOR[item.href] ?? '#D84040',
                          minWidth: 18,
                          textAlign: 'center',
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

      {/* Footer */}
      <div
        className="border-t"
        style={{
          borderColor: '#E8E6F8',
          padding: collapsed ? '10px 6px' : '10px 12px',
          transition: TRANS,
          flexShrink: 0,
        }}
      >
        {/* Avatar row */}
        <div className="flex items-center" style={{ gap: collapsed ? 0 : 8, marginBottom: 6, overflow: 'hidden' }}>
          <div
            className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
            style={{ width: 28, height: 28, background: '#EEF0FF', color: '#5B4FE9', fontSize: 11 }}
          >
            SA
          </div>
          <div
            style={{
              overflow: 'hidden',
              opacity: collapsed ? 0 : 1,
              maxWidth: collapsed ? 0 : 120,
              transition: 'opacity 0.15s, max-width 0.22s cubic-bezier(0.4,0,0.2,1)',
              whiteSpace: 'nowrap',
            }}
          >
            <div className="truncate font-semibold" style={{ fontSize: 11, color: '#1A1730' }}>Super Admin</div>
            <div className="truncate" style={{ fontSize: 9, color: '#8A88A8' }}>admin@werte.mm</div>
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
            color: '#D84040',
            background: '#FFF0F0',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            transition: TRANS,
          }}
        >
          <LogOut size={13} style={{ flexShrink: 0 }} />
          <span
            style={{
              opacity: collapsed ? 0 : 1,
              maxWidth: collapsed ? 0 : 100,
              overflow: 'hidden',
              transition: 'opacity 0.15s, max-width 0.22s cubic-bezier(0.4,0,0.2,1)',
            }}
          >
            Sign out
          </span>
        </button>
      </div>

    </aside>
  );
}
