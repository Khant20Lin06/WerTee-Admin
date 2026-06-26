'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  TrendingUp, ShoppingBag, Bike, Clock,
  ArrowRight, Star, Users, CheckCircle, AlertTriangle, Package,
} from 'lucide-react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';
import { StatusBadge } from '@/components/ui/status-badge';
import { Spinner } from '@/components/ui/spinner';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import type { OrderSummary, Rider, Merchant, RatingsStats } from '@/types/models';
import { fmtMMK, timeAgo } from '@/lib/utils/formatters';

const DONE_STATUSES  = ['COMPLETED', 'DELIVERED'];
const ACTIVE_STATUSES = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING'];

function buildRevDays(orders: OrderSummary[], nDays: number) {
  const map = new Map<string, number>();
  for (let i = nDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  orders
    .filter(o => DONE_STATUSES.includes(o.status))
    .forEach(o => {
      const day = o.placedAt?.slice(0, 10);
      if (day && map.has(day)) map.set(day, (map.get(day) ?? 0) + Number(o.totalAmount));
    });
  return [...map.entries()].map(([date, value]) => ({
    label: new Date(date).toLocaleDateString('en-GB', { weekday: 'narrow' }),
    date,
    value,
  }));
}

function RevenueChart({ days, loading }: { days: { label: string; value: number }[]; loading: boolean }) {
  const max   = Math.max(...days.map(d => d.value), 1);
  const total = days.reduce((s, d) => s + d.value, 0);

  if (loading) return (
    <div className="flex items-end gap-1.5" style={{ height: 88 }}>
      {[60, 40, 70, 55, 80, 65, 90].map((h, i) => (
        <div key={i} className="flex-1 rounded-lg"
          style={{ height: `${h}%`, background: '#F0EFFB', animation: 'pulse 1.5s ease infinite' }} />
      ))}
    </div>
  );

  if (total === 0) return (
    <div className="flex items-center justify-center" style={{ height: 88 }}>
      <span style={{ fontSize: 11, color: '#C4C2DC' }}>No revenue data for this period</span>
    </div>
  );

  return (
    <div className="flex items-end gap-1.5" style={{ height: 88 }}>
      {days.map((d, i) => {
        const isLast = i === days.length - 1;
        const h = Math.max(6, (d.value / max) * 80);
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1"
            title={`${d.label}: ${fmtMMK(d.value)}`}>
            {d.value > 0 && (
              <span style={{ fontSize: 7, color: '#8A88A8' }}>
                {d.value >= 1000 ? `${Math.round(d.value / 1000)}K` : d.value}
              </span>
            )}
            <div className="w-full rounded-lg flex-1 flex items-end">
              <div className="w-full rounded-lg"
                style={{ height: `${h}px`, background: isLast ? '#5B4FE9' : '#EEF0FF', transition: 'height 0.4s ease' }} />
            </div>
            <span style={{ fontSize: 8, color: isLast ? '#5B4FE9' : '#8A88A8', fontWeight: isLast ? 700 : 400 }}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const [orders,    setOrders]    = useState<OrderSummary[]>([]);
  const [riders,    setRiders]    = useState<Rider[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [ratings,   setRatings]   = useState<RatingsStats | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshAt, setRefreshAt] = useState(Date.now());
  const [revPeriod, setRevPeriod] = useState<7 | 30>(7);

  const load = useCallback(async () => {
    setLoading(true);
    const [ordRes, riderRes, merchRes, ratRes] = await Promise.allSettled([
      apiGet<OrderSummary[]>(ep.orders),
      apiGet<Rider[]>(ep.riders),
      apiGet<Merchant[]>(ep.merchants),
      apiGet<RatingsStats>(ep.ratingsStats),
    ]);
    if (ordRes.status   === 'fulfilled') setOrders(Array.isArray(ordRes.value)    ? ordRes.value    : []);
    if (riderRes.status === 'fulfilled') setRiders(Array.isArray(riderRes.value)  ? riderRes.value  : []);
    if (merchRes.status === 'fulfilled') setMerchants(Array.isArray(merchRes.value) ? merchRes.value : []);
    if (ratRes.status   === 'fulfilled' && ratRes.value?.totalCount !== undefined) setRatings(ratRes.value);
    setLoading(false);
    setRefreshAt(Date.now());
  }, []);

  useEffect(() => { void load(); }, [load]);

  const todayStr    = useMemo(() => new Date().toISOString().slice(0, 10), [refreshAt]);
  const todayOrders = useMemo(() => orders.filter(o => o.placedAt?.startsWith(todayStr)), [orders, todayStr]);
  const gmvToday    = useMemo(() => todayOrders.filter(o => DONE_STATUSES.includes(o.status)).reduce((s, o) => s + Number(o.totalAmount), 0), [todayOrders]);
  const activeOrders  = useMemo(() => orders.filter(o => ACTIVE_STATUSES.includes(o.status)), [orders]);
  const onlineRiders  = useMemo(() => riders.filter(r => r.isOnline), [riders]);
  const pendingMerch  = useMemo(() => merchants.filter(m => m.status === 'PENDING'), [merchants]);
  const recentOrders  = useMemo(() => [...orders].sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()).slice(0, 8), [orders]);
  const revDays       = useMemo(() => buildRevDays(orders, revPeriod), [orders, revPeriod]);
  const successRate   = useMemo(() => orders.length > 0 ? Math.round((orders.filter(o => DONE_STATUSES.includes(o.status)).length / orders.length) * 100) : 0, [orders]);
  const avgRating     = ratings?.branch.average ?? 0;
  const lastRefreshed = useMemo(() => new Date(refreshAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), [refreshAt]);

  return (
    <div className="flex flex-col gap-4 fade-in">

      <PageHeader onRefresh={() => void load()} refreshing={loading}>
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Last updated {lastRefreshed}</span>
      </PageHeader>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard
          label="GMV Today" loading={loading}
          value={fmtMMK(gmvToday)}
          sub={gmvToday > 0 ? `${todayOrders.filter(o => DONE_STATUSES.includes(o.status)).length} completed today` : 'No completed orders today'}
          subColor={gmvToday > 0 ? 'var(--success)' : 'var(--text-faint)'}
          icon={TrendingUp} iconBg="var(--brand-muted)" iconColor="var(--brand)"
        />
        <KpiCard
          label="Active Orders" loading={loading}
          value={String(activeOrders.length)}
          sub={activeOrders.length > 0 ? `${activeOrders.filter(o => o.status === 'PLACED').length} placed · ${activeOrders.filter(o => o.status === 'PREPARING').length} preparing` : 'No active orders'}
          subColor={activeOrders.length > 0 ? 'var(--warning)' : 'var(--text-faint)'}
          icon={ShoppingBag} iconBg="var(--warning-bg)" iconColor="var(--warning)"
        />
        <KpiCard
          label="Riders Online" loading={loading}
          value={`${onlineRiders.length} / ${riders.length}`}
          sub={onlineRiders.length > 0 ? `${onlineRiders.filter(r => r.isAvailable).length} available` : 'No riders online'}
          subColor={onlineRiders.length > 0 ? 'var(--success)' : 'var(--danger)'}
          icon={Bike} iconBg="var(--success-bg)" iconColor="var(--success)"
        />
        <KpiCard
          label="Pending Approvals" loading={loading}
          value={String(pendingMerch.length)}
          sub={pendingMerch.length > 0 ? 'Merchants awaiting review' : 'All merchants reviewed'}
          subColor={pendingMerch.length > 0 ? 'var(--danger)' : 'var(--success)'}
          icon={AlertTriangle}
          iconBg={pendingMerch.length > 0 ? 'var(--danger-bg)' : 'var(--success-bg)'}
          iconColor={pendingMerch.length > 0 ? 'var(--danger)' : 'var(--success)'}
        />
      </div>

      {/* Main content */}
      <div className="flex gap-3" style={{ alignItems: 'flex-start' }}>

        {/* Left: chart + table */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">

          {/* Revenue chart */}
          <div className="card rounded-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-extrabold" style={{ fontSize: 13, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Revenue overview</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                  {loading ? '…' : `${fmtMMK(revDays.reduce((s, d) => s + d.value, 0))} total`}
                </div>
              </div>
              <div className="flex gap-1">
                {([7, 30] as const).map(p => (
                  <button key={p} onClick={() => setRevPeriod(p)}
                    className="rounded-lg px-2.5 py-1 font-semibold"
                    style={{
                      fontSize: 10, cursor: 'pointer',
                      background: revPeriod === p ? 'var(--brand)' : 'var(--bg-subtle)',
                      color: revPeriod === p ? '#fff' : 'var(--text-muted)',
                      border: `1px solid ${revPeriod === p ? 'var(--brand)' : 'var(--border)'}`,
                      transition: 'all 0.15s',
                    }}>
                    {p}d
                  </button>
                ))}
              </div>
            </div>
            <RevenueChart days={revDays} loading={loading} />
          </div>

          {/* Recent orders */}
          <div className="card rounded-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="font-extrabold" style={{ fontSize: 13, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Recent orders</span>
              <Link href="/orders" className="flex items-center gap-1 font-semibold" style={{ fontSize: 11, color: 'var(--brand)' }}>
                View all <ArrowRight size={11} />
              </Link>
            </div>

            {loading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : recentOrders.length === 0 ? (
              <div className="py-10 text-center" style={{ fontSize: 12, color: 'var(--text-muted)' }}>No orders yet</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)' }}>
                    {['Order', 'Customer', 'Merchant', 'Type', 'Amount', 'Status', 'Time'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider"
                        style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o, i) => (
                    <tr key={o.orderId}
                      style={{ borderTop: '1px solid var(--border)', background: i % 2 === 1 ? 'var(--bg-subtle)' : 'var(--bg-card)' }}>
                      <td className="px-3 py-2.5 font-semibold" style={{ fontSize: 11, color: 'var(--brand)' }}>#{o.orderCode}</td>
                      <td className="px-3 py-2.5" style={{ fontSize: 11, color: 'var(--text-primary)' }}>
                        {o.customer.fullName ?? o.customer.phone}
                      </td>
                      <td className="px-3 py-2.5" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{o.branch.merchantName}</td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-pill font-semibold" style={{
                          fontSize: 9.5, padding: '2px 7px',
                          background: o.deliveryType === 'PICKUP' ? 'var(--warning-bg)' : 'var(--brand-muted)',
                          color:      o.deliveryType === 'PICKUP' ? 'var(--warning)'    : 'var(--brand)',
                        }}>
                          {o.deliveryType === 'PICKUP' ? 'Pickup' : 'Delivery'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold" style={{ fontSize: 11, color: 'var(--text-primary)' }}>
                        {Number(o.totalAmount).toLocaleString()} MMK
                      </td>
                      <td className="px-3 py-2.5"><StatusBadge status={o.status} /></td>
                      <td className="px-3 py-2.5" style={{ fontSize: 10, color: 'var(--text-faint)' }}>{timeAgo(o.placedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-3 flex-shrink-0" style={{ width: 272 }}>

          {/* Quick actions */}
          <div className="card rounded-card p-4">
            <div className="font-extrabold mb-3" style={{ fontSize: 12, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Quick actions</div>
            <div className="flex flex-col gap-1.5">
              {([
                { label: 'Review merchants', count: pendingMerch.length,  href: '/merchants', color: 'var(--warning)', bg: 'var(--warning-bg)', icon: Package },
                { label: 'Active orders',    count: activeOrders.length,  href: '/orders',    color: 'var(--brand)',   bg: 'var(--brand-muted)', icon: ShoppingBag },
                { label: 'Online riders',    count: onlineRiders.length,  href: '/riders',    color: 'var(--success)', bg: 'var(--success-bg)', icon: Bike },
                { label: 'All customers',    count: null,                 href: '/customers', color: 'var(--info)',    bg: 'var(--info-bg)', icon: Users },
              ] as const).map(a => (
                <Link key={a.href} href={a.href}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', transition: 'background 0.13s, border-color 0.13s' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand-border)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  }}
                >
                  <div className="flex items-center justify-center rounded-lg flex-shrink-0"
                    style={{ width: 28, height: 28, background: a.bg }}>
                    <a.icon size={13} style={{ color: a.color }} />
                  </div>
                  <span className="flex-1 font-semibold" style={{ fontSize: 11, color: 'var(--text-primary)' }}>{a.label}</span>
                  {a.count !== null && a.count > 0 && (
                    <span className="rounded-pill font-bold flex-shrink-0"
                      style={{ fontSize: 9, padding: '2px 7px', background: a.bg, color: a.color }}>
                      {a.count}
                    </span>
                  )}
                  <ArrowRight size={10} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                </Link>
              ))}
            </div>
          </div>

          {/* Platform health */}
          <div className="card rounded-card p-4">
            <div className="font-extrabold mb-3" style={{ fontSize: 12, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Platform health</div>
            {loading ? <div className="flex justify-center py-4"><Spinner /></div> : (
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Order success rate', value: successRate, display: `${successRate}%`, color: successRate >= 80 ? 'var(--success)' : successRate >= 60 ? 'var(--warning)' : 'var(--danger)' },
                  { label: 'Avg branch rating',  value: Math.round((avgRating / 5) * 100), display: avgRating > 0 ? `${avgRating.toFixed(1)} / 5` : 'No data', color: avgRating >= 4 ? 'var(--success)' : avgRating >= 3 ? 'var(--warning)' : 'var(--danger)' },
                  { label: 'Rider availability',  value: riders.length > 0 ? Math.round((onlineRiders.length / riders.length) * 100) : 0, display: riders.length > 0 ? `${onlineRiders.length}/${riders.length} online` : 'No riders', color: 'var(--brand)' },
                ].map(h => (
                  <div key={h.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{h.label}</span>
                      <span className="font-bold" style={{ fontSize: 10, color: h.color }}>{h.display}</span>
                    </div>
                    <div className="rounded-full overflow-hidden" style={{ height: 5, background: 'var(--bg-page)' }}>
                      <div className="rounded-full h-full" style={{ width: `${h.value}%`, background: h.color, transition: 'width 0.6s var(--ease-out)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ratings snapshot */}
          {ratings && ratings.totalCount > 0 && (
            <div className="card rounded-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-extrabold" style={{ fontSize: 12, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Ratings</span>
                <Link href="/ratings" style={{ fontSize: 10, color: 'var(--brand)', fontWeight: 600 }}>View all</Link>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center rounded-2xl flex-shrink-0"
                  style={{ width: 44, height: 44, background: '#FFF9E5' }}>
                  <Star size={20} style={{ color: '#F59E0B' }} fill="#F59E0B" />
                </div>
                <div>
                  <div className="font-extrabold" style={{ fontSize: 20, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                    {ratings.branch.average.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{ratings.totalCount} reviews total</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--success-bg)' }}>
                <CheckCircle size={12} style={{ color: 'var(--success)', flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: 'var(--success)', fontWeight: 600 }}>
                  {ratings.branch.count} branch reviews collected
                </span>
              </div>
            </div>
          )}

          {/* Order breakdown */}
          <div className="card rounded-card p-4">
            <div className="font-extrabold mb-3" style={{ fontSize: 12, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Order breakdown</div>
            {loading ? <div className="flex justify-center py-2"><Spinner /></div> : (
              <div className="flex flex-col gap-2">
                {([
                  { label: 'Completed', statuses: ['COMPLETED', 'DELIVERED'], color: 'var(--success)', bg: 'var(--success-bg)' },
                  { label: 'Active',    statuses: ACTIVE_STATUSES,            color: 'var(--brand)',   bg: 'var(--brand-muted)' },
                  { label: 'Cancelled', statuses: ['CANCELLED'],              color: 'var(--danger)',  bg: 'var(--danger-bg)' },
                ] as const).map(b => {
                  const count = orders.filter(o => (b.statuses as readonly string[]).includes(o.status)).length;
                  const pct   = orders.length > 0 ? Math.round((count / orders.length) * 100) : 0;
                  return (
                    <div key={b.label} className="flex items-center gap-2.5">
                      <div className="rounded-full flex-shrink-0" style={{ width: 7, height: 7, background: b.color }} />
                      <span className="flex-1" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{b.label}</span>
                      <span className="font-bold" style={{ fontSize: 11, color: 'var(--text-primary)' }}>{count}</span>
                      <span className="rounded-pill font-semibold"
                        style={{ fontSize: 9, padding: '1.5px 6px', background: b.bg, color: b.color }}>{pct}%</span>
                    </div>
                  );
                })}
                <div className="mt-2 rounded-full overflow-hidden flex" style={{ height: 5, background: 'var(--bg-page)' }}>
                  {([
                    { statuses: ['COMPLETED', 'DELIVERED'], color: 'var(--success)' },
                    { statuses: ACTIVE_STATUSES,            color: 'var(--brand)' },
                    { statuses: ['CANCELLED'],              color: 'var(--danger)' },
                  ] as const).map((b, i) => {
                    const pct = orders.length > 0 ? (orders.filter(o => (b.statuses as readonly string[]).includes(o.status)).length / orders.length) * 100 : 0;
                    return <div key={i} style={{ width: `${pct}%`, background: b.color, transition: 'width 0.6s var(--ease-out)' }} />;
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 justify-center" style={{ fontSize: 9, color: 'var(--text-faint)' }}>
            <Clock size={9} />
            <span>Auto-refreshes on page reload</span>
          </div>
        </div>
      </div>
    </div>
  );
}
