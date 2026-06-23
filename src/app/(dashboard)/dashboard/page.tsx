'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, ShoppingBag, Bike, AlertCircle,
  ArrowRight, CircleDot,
} from 'lucide-react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';
import { StatusBadge } from '@/components/ui/status-badge';
import { Spinner } from '@/components/ui/spinner';

type OrderSummary = {
  orderId: string;
  orderCode: string;
  status: string;
  totalAmount: string;
  placedAt: string;
  customer: { phone: string; fullName: string | null };
  branch: { branchName: string; merchantName: string };
};

type RiderSummary = {
  riderId: string;
  status: string;        // RiderStatus: ACTIVE | PENDING | SUSPENDED
  isOnline: boolean;
  isAvailable: boolean;
};

// ─── Sparkline ───────────────────────────────────────────────────────────────

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5" style={{ height: 24 }}>
      {values.map((v, i) => (
        <div key={i} className="rounded-sm flex-1"
          style={{ height: `${Math.max(3, (v / max) * 24)}px`, background: i === values.length - 1 ? color : '#EEF0FF', minWidth: 4 }} />
      ))}
    </div>
  );
}

// ─── KPI Tile ─────────────────────────────────────────────────────────────────

type KpiTileProps = {
  label: string; icon: React.ElementType; value: string;
  change: string; changeType: 'up' | 'down' | 'warn'; sparkValues: number[];
};

function KpiTile({ label, icon: Icon, value, change, changeType, sparkValues }: KpiTileProps) {
  const changeColor = changeType === 'up' ? '#16A660' : changeType === 'down' ? '#D84040' : '#D4820A';
  const ChangeIcon = changeType === 'up' ? TrendingUp : changeType === 'down' ? TrendingDown : AlertCircle;
  return (
    <div className="rounded-card p-4 flex flex-col gap-3" style={{ background: '#F6F5FF', border: '1px solid #E8E6F8' }}>
      <div className="flex items-center gap-1 uppercase tracking-wider font-semibold" style={{ fontSize: 9, color: '#8A88A8' }}>
        <Icon size={11} />{label}
      </div>
      <div className="font-extrabold" style={{ fontSize: 21, color: '#1A1730', lineHeight: 1 }}>{value}</div>
      <div className="flex items-center gap-1">
        <ChangeIcon size={10} style={{ color: changeColor }} />
        <span style={{ fontSize: 10, color: changeColor }}>{change}</span>
      </div>
      <Sparkline values={sparkValues} color="#5B4FE9" />
    </div>
  );
}

// ─── Revenue bar chart (real data — last N days from orders) ──────────────────

type RevDay = { label: string; value: number };

function RevenueChart({ days, loading }: { days: RevDay[]; loading: boolean }) {
  if (loading) return <div className="flex justify-center items-center" style={{ height: 100 }}><span style={{ fontSize: 11, color: '#C0BDE8' }}>Loading…</span></div>;
  if (days.length === 0) return <div className="flex justify-center items-center" style={{ height: 100 }}><span style={{ fontSize: 11, color: '#C0BDE8' }}>No revenue data</span></div>;
  const max = Math.max(...days.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1" style={{ height: 100 }}>
      {days.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 gap-1">
          <span style={{ fontSize: 8, color: '#8A88A8' }}>
            {d.value >= 1_000_000 ? `${(d.value/1_000_000).toFixed(1)}M` : d.value >= 1_000 ? `${Math.round(d.value/1_000)}K` : d.value > 0 ? d.value : ''}
          </span>
          <div className="w-full rounded-sm"
            style={{ height: `${Math.max(4, (d.value / max) * 76)}px`, background: i === days.length - 1 ? '#5B4FE9' : '#EEF0FF', minWidth: 4 }} />
          <span style={{ fontSize: 8, color: '#8A88A8' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Platform health (visual only) ────────────────────────────────────────────

const HEALTH = [
  { label: 'Order success rate', value: 97, color: '#16A660' },
  { label: 'Avg delivery (min)',  value: 81, color: '#5B4FE9' },
  { label: 'Rider utilisation',  value: 81, color: '#D4820A' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

// Build last-N-days revenue buckets from order list
function buildRevenueDays(orders: OrderSummary[], nDays: number): RevDay[] {
  const map = new Map<string, number>();
  // Seed all days with 0
  for (let i = nDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  orders
    .filter(o => o.status === 'COMPLETED' && o.placedAt)
    .forEach(o => {
      const day = o.placedAt.slice(0, 10);
      if (map.has(day)) map.set(day, (map.get(day) ?? 0) + Number(o.totalAmount));
    });
  return [...map.entries()].map(([date, value]) => {
    const d = new Date(date);
    const label = d.toLocaleDateString('en-GB', { weekday: 'narrow' });
    return { label, value };
  });
}

export default function DashboardPage() {
  const [orders, setOrders]       = useState<OrderSummary[]>([]);
  const [riders, setRiders]       = useState<RiderSummary[]>([]);
  const [loading, setLoading]     = useState(true);
  const [revPeriod, setRevPeriod] = useState<7 | 30>(7);

  useEffect(() => {
    Promise.allSettled([
      apiGet<OrderSummary[]>(ep.orders),
      apiGet<RiderSummary[]>(ep.riders),
    ]).then(([ordRes, riderRes]) => {
      if (ordRes.status === 'fulfilled')   setOrders(Array.isArray(ordRes.value) ? ordRes.value : []);
      if (riderRes.status === 'fulfilled') setRiders(Array.isArray(riderRes.value) ? riderRes.value : []);
    }).finally(() => setLoading(false));
  }, []);

  // Derived stats
  const totalOrders  = orders.length;
  const pendingCount = orders.filter(o => ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERING'].includes(o.status)).length;
  const activeRiders = riders.filter(r => r.isOnline).length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const gmvRaw   = orders
    .filter(o => o.status === 'COMPLETED' && o.placedAt?.startsWith(todayStr))
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const gmvToday = gmvRaw >= 1_000_000
    ? `${(gmvRaw / 1_000_000).toFixed(2)}M`
    : gmvRaw >= 1_000
    ? `${Math.round(gmvRaw / 1_000)}K`
    : String(gmvRaw);

  const revenueDays = buildRevenueDays(orders, revPeriod);

  const notifs = [
    { id: 1, title: 'New order surge detected', sub: 'Zone 1 — high activity', unread: true },
    { id: 2, title: 'Refund request pending',   sub: 'Check refunds queue',   unread: true },
    { id: 3, title: 'Rider offline',            sub: 'Zone B coverage low',   unread: false },
    { id: 4, title: 'New merchant registered',  sub: 'Pending review',        unread: false },
  ];

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        <KpiTile label="GMV Today" icon={TrendingUp}
          value={loading ? '…' : `${gmvToday} MMK`}
          change="Completed orders today" changeType="up"
          sparkValues={revenueDays.map(d => d.value)} />
        <KpiTile label="Total Orders" icon={ShoppingBag}
          value={loading ? '…' : totalOrders.toLocaleString()}
          change="Live from API" changeType="up"
          sparkValues={[60, 55, 70, 85, 72, 90, 88]} />
        <KpiTile label="Active Riders" icon={Bike}
          value={loading ? '…' : String(activeRiders)}
          change="Online right now" changeType={activeRiders > 0 ? 'up' : 'down'}
          sparkValues={[90, 88, 92, 87, 84, 85, activeRiders]} />
        <KpiTile label="Pending Orders" icon={AlertCircle}
          value={loading ? '…' : String(pendingCount)}
          change="Preparing + confirmed" changeType="warn"
          sparkValues={[5, 8, 6, 10, 9, 12, pendingCount]} />
      </div>

      {/* Lower: chart + sidebar */}
      <div className="flex gap-3" style={{ alignItems: 'flex-start' }}>
        {/* Left: Revenue + Recent orders */}
        <div className="flex-1 rounded-card p-4 flex flex-col gap-4" style={{ background: '#FFFFFF', border: '1px solid #E8E6F8' }}>
          {/* Revenue chart */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold" style={{ fontSize: 13, color: '#1A1730' }}>Revenue overview</span>
              <div className="flex gap-1">
                {([7, 30] as const).map(p => (
                  <button key={p} onClick={() => setRevPeriod(p)}
                    className="rounded-pill px-2 py-0.5"
                    style={{ fontSize: 10, background: revPeriod === p ? '#5B4FE9' : '#F6F5FF', color: revPeriod === p ? '#fff' : '#4A4770', border: '1px solid', borderColor: revPeriod === p ? '#5B4FE9' : '#E8E6F8' }}>
                    {p}d
                  </button>
                ))}
              </div>
            </div>
            <RevenueChart days={revenueDays} loading={loading} />
          </div>

          <div style={{ borderTop: '1px solid #E8E6F8', paddingTop: 12 }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold" style={{ fontSize: 13, color: '#1A1730' }}>Recent orders</span>
              <Link href="/orders" className="flex items-center gap-1" style={{ fontSize: 11, color: '#5B4FE9' }}>
                View all <ArrowRight size={11} />
              </Link>
            </div>

            {loading ? (
              <div className="flex justify-center py-4"><Spinner /></div>
            ) : orders.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#F6F5FF' }}>
                    {['Order ID', 'Customer', 'Merchant', 'Amount', 'Status'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wider" style={{ fontSize: 9, color: '#8A88A8' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.orderId} style={{ borderTop: '1px solid #E8E6F8' }}>
                      <td className="px-3 py-2 font-semibold" style={{ fontSize: 11, color: '#5B4FE9' }}>#{o.orderCode}</td>
                      <td className="px-3 py-2" style={{ fontSize: 11, color: '#1A1730' }}>{o.customer.fullName ?? o.customer.phone}</td>
                      <td className="px-3 py-2" style={{ fontSize: 11, color: '#4A4770' }}>{o.branch.merchantName}</td>
                      <td className="px-3 py-2 font-semibold" style={{ fontSize: 11, color: '#1A1730' }}>
                        {Number(o.totalAmount).toLocaleString()} MMK
                      </td>
                      <td className="px-3 py-2"><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-6 text-center" style={{ fontSize: 12, color: '#8A88A8' }}>No recent orders</div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3" style={{ width: 280 }}>
          {/* Notifications */}
          <div className="rounded-card p-4" style={{ background: '#FFFFFF', border: '1px solid #E8E6F8' }}>
            <div className="font-bold mb-3" style={{ fontSize: 13, color: '#1A1730' }}>Notifications</div>
            <div className="flex flex-col gap-2">
              {notifs.map(n => (
                <div key={n.id} className="flex items-start gap-2 rounded-lg px-2 py-2"
                  style={{ background: n.unread ? '#EEF0FF' : 'transparent' }}>
                  {n.unread
                    ? <CircleDot size={8} style={{ color: '#5B4FE9', marginTop: 3, flexShrink: 0 }} />
                    : <div style={{ width: 8, flexShrink: 0 }} />}
                  <div>
                    <div className="font-semibold" style={{ fontSize: 11, color: '#1A1730' }}>{n.title}</div>
                    <div style={{ fontSize: 10, color: '#8A88A8' }}>{n.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Platform health */}
          <div className="rounded-card p-4" style={{ background: '#FFFFFF', border: '1px solid #E8E6F8' }}>
            <div className="font-bold mb-3" style={{ fontSize: 13, color: '#1A1730' }}>Platform health</div>
            <div className="flex flex-col gap-3">
              {HEALTH.map(h => (
                <div key={h.label}>
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: 10, color: '#4A4770' }}>{h.label}</span>
                    <span className="font-bold" style={{ fontSize: 10, color: h.color }}>{h.value}%</span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 5, background: '#F6F5FF' }}>
                    <div className="rounded-full h-full" style={{ width: `${h.value}%`, background: h.color, transition: 'width 0.6s' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
