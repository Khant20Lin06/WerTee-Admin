'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  TrendingUp, ShoppingBag, AlertTriangle, CheckCircle,
  Clock, XCircle, RefreshCw,
} from 'lucide-react';
import { apiGet } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';
import { Spinner } from '@/components/ui/spinner';

// ─── Types ────────────────────────────────────────────────────────────────────

type TrendBucket = {
  date: string;
  createdAlertsCount: number;
  attentionAlertsCount: number;
  compensationAlertsCount: number;
  unreadMerchantAlertsCount: number;
  acknowledgedCount: number;
  resolvedCount: number;
  dismissedCount: number;
  reminderCount: number;
  escalationCount: number;
};

type TrendsReport = {
  generatedAt: string;
  windowStartedAt: string;
  windowEndedAt: string;
  periodDays: number;
  buckets: TrendBucket[];
};

type InventoryOverview = {
  generatedAt: string;
  windowStartedAt: string;
  windowEndedAt: string;
  periodDays: number;
  totalAlertsCount: number;
  unreadMerchantAlertsCount: number;
  kindCounts: { attentionAlertsCount: number; compensationAlertsCount: number };
  statusCounts: {
    openAlertsCount: number;
    acknowledgedAlertsCount: number;
    resolvedAlertsCount: number;
    dismissedAlertsCount: number;
  };
  attentionLevelCounts: { lowStockAlertsCount: number; outOfStockAlertsCount: number };
  resourceTypeCounts: { menuItemAlertsCount: number; itemOptionAlertsCount: number };
  followUpCounts: { reminderCount: number; escalationCount: number };
  topBranches: {
    branchId: string | null;
    branchName: string | null;
    totalAlertsCount: number;
    openLifecycleAlertsCount: number;
    escalatedAlertsCount: number;
  }[];
};

type OrderSummary = {
  orderId: string;
  status: string;
  totalAmount: string;
  placedAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMMK(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toString();
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// ─── Dual-series bar chart ────────────────────────────────────────────────────
// series: [{color, label, values[]}]

type ChartSeries = { color: string; label: string; values: number[] };

function BarChart({
  labels,
  series,
  height = 140,
  yUnit = '',
}: {
  labels: string[];
  series: ChartSeries[];
  height?: number;
  yUnit?: string;
}) {
  const allVals = series.flatMap(s => s.values);
  const maxVal  = Math.max(...allVals, 1);

  // Y-axis ticks — 4 steps
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(t * maxVal));

  const BAR_AREA = height - 28; // reserve bottom for labels

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <div className="flex" style={{ gap: 0 }}>
        {/* Y-axis */}
        <div
          className="flex flex-col justify-between items-end flex-shrink-0 pr-2"
          style={{ height: BAR_AREA + 4, paddingTop: 2 }}
        >
          {[...ticks].reverse().map((t, i) => (
            <span key={i} style={{ fontSize: 8, color: '#C0BDE8', lineHeight: 1 }}>
              {t}{yUnit}
            </span>
          ))}
        </div>

        {/* Chart area */}
        <div className="flex-1 relative">
          {/* Horizontal grid lines */}
          <div
            className="absolute inset-0 flex flex-col justify-between pointer-events-none"
            style={{ height: BAR_AREA }}
          >
            {ticks.map((_, i) => (
              <div key={i} style={{ borderTop: '1px dashed #F0EFFB', width: '100%' }} />
            ))}
          </div>

          {/* Bars */}
          <div className="flex items-end gap-0.5" style={{ height: BAR_AREA }}>
            {labels.map((label, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5" style={{ height: BAR_AREA }}>
                {/* stacked bars per series */}
                <div className="w-full flex gap-px items-end" style={{ height: BAR_AREA - 4 }}>
                  {series.map((s, si) => {
                    const pct = maxVal > 0 ? (s.values[i] ?? 0) / maxVal : 0;
                    const barH = Math.max(pct * (BAR_AREA - 4), s.values[i] > 0 ? 2 : 0);
                    return (
                      <div
                        key={si}
                        className="flex-1 rounded-sm transition-all"
                        style={{ height: barH, background: s.color, opacity: 0.85 }}
                        title={`${s.label}: ${s.values[i] ?? 0}${yUnit}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* X labels */}
          <div className="flex gap-0.5 mt-1">
            {labels.map((label, i) => (
              <div key={i} className="flex-1 text-center" style={{ fontSize: 8, color: '#8A88A8' }}>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 flex-wrap">
        {series.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="rounded-sm flex-shrink-0" style={{ width: 10, height: 10, background: s.color, opacity: 0.85 }} />
            <span style={{ fontSize: 9, color: '#8A88A8' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Line chart ───────────────────────────────────────────────────────────────

function LineChart({
  labels,
  series,
  height = 130,
  yUnit = '',
}: {
  labels: string[];
  series: { color: string; label: string; values: number[] }[];
  height?: number;
  yUnit?: string;
}) {
  const allVals = series.flatMap(s => s.values);
  const maxVal  = Math.max(...allVals, 1);
  const ticks   = [0, 0.5, 1].map(t => Math.round(t * maxVal));
  const PLOT_H  = height - 28;
  const n       = labels.length;

  function polyline(values: number[]) {
    if (n < 2) return '';
    const step = 100 / (n - 1);
    return values
      .map((v, i) => {
        const x = i * step;
        const y = PLOT_H - (v / maxVal) * (PLOT_H - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  return (
    <div style={{ width: '100%' }}>
      <div className="flex" style={{ gap: 0 }}>
        {/* Y-axis */}
        <div
          className="flex flex-col justify-between items-end flex-shrink-0 pr-2"
          style={{ height: PLOT_H + 4, paddingTop: 2 }}
        >
          {[...ticks].reverse().map((t, i) => (
            <span key={i} style={{ fontSize: 8, color: '#C0BDE8', lineHeight: 1 }}>
              {t}{yUnit}
            </span>
          ))}
        </div>

        {/* Plot area */}
        <div className="flex-1 relative" style={{ height: PLOT_H }}>
          {/* Grid */}
          {ticks.map((_, i) => (
            <div
              key={i}
              className="absolute w-full"
              style={{
                top: `${(1 - _ / maxVal) * 100}%`,
                borderTop: '1px dashed #F0EFFB',
              }}
            />
          ))}

          {/* SVG lines — viewBox preserves aspect ratio */}
          <svg
            viewBox={`0 0 100 ${PLOT_H}`}
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: PLOT_H, overflow: 'visible' }}
          >
            {series.map(s => (
              <polyline
                key={s.label}
                points={polyline(s.values)}
                fill="none"
                stroke={s.color}
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={0.85}
              />
            ))}
            {/* Dots on last point */}
            {series.map(s => {
              if (n === 0) return null;
              const x = 100;
              const v = s.values[n - 1] ?? 0;
              const y = PLOT_H - (v / maxVal) * (PLOT_H - 4) - 2;
              return (
                <circle key={s.label} cx={x} cy={y} r="2.5" fill={s.color} opacity={0.9} />
              );
            })}
          </svg>
        </div>
      </div>

      {/* X labels */}
      <div className="flex gap-0.5 mt-1 pl-8">
        {labels.map((label, i) => (
          <div key={i} className="flex-1 text-center" style={{ fontSize: 8, color: '#8A88A8' }}>
            {i % Math.ceil(n / 7) === 0 || i === n - 1 ? label : ''}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 pl-8 flex-wrap">
        {series.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, background: s.color, opacity: 0.85 }} />
            <span style={{ fontSize: 9, color: '#8A88A8' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Period selector ──────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [7, 14, 30] as const;
type Period = typeof PERIOD_OPTIONS[number];

function PeriodSelector({ value, onChange }: { value: Period; onChange: (v: Period) => void }) {
  return (
    <div className="flex items-center gap-1">
      {PERIOD_OPTIONS.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className="rounded-lg px-2.5 py-1 font-semibold"
          style={{
            fontSize: 10,
            background: value === p ? '#5B4FE9' : '#F6F5FF',
            color: value === p ? '#fff' : '#4A4770',
            border: value === p ? '1px solid #5B4FE9' : '1px solid #E8E6F8',
          }}
        >
          {p}d
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [period, setPeriod]       = useState<Period>(14);
  const [overview, setOverview]   = useState<InventoryOverview | null>(null);
  const [trends, setTrends]       = useState<TrendsReport | null>(null);
  const [orders, setOrders]       = useState<OrderSummary[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (days: Period, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const qs = `?days=${days}`;
      const [ovRes, trendRes, ordRes] = await Promise.allSettled([
        apiGet<InventoryOverview>(ep.reportInventoryOverview + qs),
        apiGet<TrendsReport>(ep.reportInventoryTrends + qs),
        apiGet<OrderSummary[]>('/admin/orders?limit=500'),
      ]);
      if (ovRes.status === 'fulfilled')    setOverview(ovRes.value);
      if (trendRes.status === 'fulfilled') setTrends(trendRes.value);
      if (ordRes.status === 'fulfilled')   setOrders(Array.isArray(ordRes.value) ? ordRes.value : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(period); }, [load, period]);

  // ── Derived order stats ────────────────────────────────────────────────────
  const completed   = orders.filter(o => o.status === 'COMPLETED').length;
  const cancelled   = orders.filter(o => o.status === 'CANCELLED').length;
  const inProgress  = orders.filter(o => ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERING'].includes(o.status)).length;
  const totalRevenue = orders.filter(o => o.status === 'COMPLETED').reduce((s, o) => s + Number(o.totalAmount), 0);
  const totalOrders = orders.length;

  const orderStatusBars = [
    { label: 'Completed',   val: totalOrders > 0 ? Math.round((completed / totalOrders) * 100) : 0, color: '#16A660' },
    { label: 'Cancelled',   val: totalOrders > 0 ? Math.round((cancelled / totalOrders) * 100) : 0, color: '#D84040' },
    { label: 'In progress', val: totalOrders > 0 ? Math.round((inProgress / totalOrders) * 100) : 0, color: '#5B4FE9' },
  ];

  // ── Revenue by date (from real orders) ────────────────────────────────────
  const revenueByDate = useMemo<{ date: string; revenue: number; count: number }[]>(() => {
    if (!trends) return [];
    const map = new Map<string, { revenue: number; count: number }>();
    // Seed with all trend bucket dates so chart has same X-axis
    trends.buckets.forEach(b => map.set(b.date, { revenue: 0, count: 0 }));
    orders
      .filter(o => o.status === 'COMPLETED' && o.placedAt)
      .forEach(o => {
        const day = o.placedAt.slice(0, 10);
        if (map.has(day)) {
          const entry = map.get(day)!;
          entry.revenue += Number(o.totalAmount);
          entry.count   += 1;
        }
      });
    return trends.buckets.map(b => ({ date: b.date, ...( map.get(b.date) ?? { revenue: 0, count: 0 }) }));
  }, [trends, orders]);

  // ── Chart data from trends ─────────────────────────────────────────────────
  const trendLabels = trends?.buckets.map(b => fmtDate(b.date)) ?? [];

  const alertTrendSeries: ChartSeries[] = trends
    ? [
        { color: '#D84040', label: 'Created',  values: trends.buckets.map(b => b.createdAlertsCount) },
        { color: '#5B4FE9', label: 'Ack\'d',   values: trends.buckets.map(b => b.acknowledgedCount) },
        { color: '#16A660', label: 'Resolved', values: trends.buckets.map(b => b.resolvedCount) },
        { color: '#8A88A8', label: 'Dismissed',values: trends.buckets.map(b => b.dismissedCount) },
      ]
    : [];

  const alertKindSeries: ChartSeries[] = trends
    ? [
        { color: '#D84040', label: 'Shortage (attention)',     values: trends.buckets.map(b => b.attentionAlertsCount) },
        { color: '#5B4FE9', label: 'Restock (compensation)',   values: trends.buckets.map(b => b.compensationAlertsCount) },
      ]
    : [];

  const revenueSeries = revenueByDate.length > 0
    ? [{ color: '#5B4FE9', label: 'Revenue (MMK)', values: revenueByDate.map(d => d.revenue) }]
    : [];

  const orderCountSeries = revenueByDate.length > 0
    ? [{ color: '#16A660', label: 'Orders completed', values: revenueByDate.map(d => d.count) }]
    : [];

  const followUpSeries: ChartSeries[] = trends
    ? [
        { color: '#D4820A', label: 'Reminders',   values: trends.buckets.map(b => b.reminderCount) },
        { color: '#D84040', label: 'Escalations', values: trends.buckets.map(b => b.escalationCount) },
      ]
    : [];

  const isRefreshActive = loading || refreshing;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3 p-5" style={{ background: '#F0EFFB', minHeight: '100vh' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-extrabold" style={{ fontSize: 16, color: '#1A1730' }}>Reports &amp; Analytics</h1>
          <p style={{ fontSize: 11, color: '#8A88A8', marginTop: 2 }}>
            {trends
              ? `${fmtDate(trends.windowStartedAt)} — ${fmtDate(trends.windowEndedAt)}`
              : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector value={period} onChange={p => { setPeriod(p); }} />
          <button
            onClick={() => void load(period, true)}
            disabled={isRefreshActive}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-semibold"
            style={{ fontSize: 11, background: '#fff', color: '#4A4770', border: '1px solid #E8E6F8' }}
          >
            <RefreshCw size={12} style={{ animation: isRefreshActive ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI tiles ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            icon: TrendingUp,
            label: `Revenue (${period}d completed)`,
            val: loading ? '…' : `${fmtMMK(totalRevenue)} MMK`,
            color: '#5B4FE9',
          },
          {
            icon: ShoppingBag,
            label: 'Orders loaded',
            val: loading ? '…' : totalOrders.toLocaleString(),
            color: '#16A660',
          },
          {
            icon: AlertTriangle,
            label: `Alerts (${period}d)`,
            val: loading ? '…' : String(overview?.totalAlertsCount ?? 0),
            color: '#D4820A',
          },
          {
            icon: AlertTriangle,
            label: 'Out of stock',
            val: loading ? '…' : String(overview?.attentionLevelCounts?.outOfStockAlertsCount ?? 0),
            color: '#D84040',
          },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
            <div className="flex items-center gap-2 mb-2">
              <k.icon size={14} style={{ color: k.color }} />
              <span className="font-semibold uppercase tracking-wider" style={{ fontSize: 9, color: '#8A88A8' }}>{k.label}</span>
            </div>
            <div className="font-extrabold" style={{ fontSize: 20, color: '#1A1730' }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* ── Row 1: Revenue trend + Order status ────────────────────────────── */}
      <div className="flex gap-3">
        {/* Revenue line chart (real order data) */}
        <div className="flex-1 rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #E8E6F8', minWidth: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold" style={{ fontSize: 13, color: '#1A1730' }}>Revenue trend</span>
            <span style={{ fontSize: 10, color: '#8A88A8' }}>
              {loading ? '…' : `${period}d · completed orders`}
            </span>
          </div>
          {loading
            ? <div className="flex justify-center py-8"><Spinner /></div>
            : revenueSeries.length > 0 && trendLabels.length > 0
              ? <LineChart labels={trendLabels} series={revenueSeries} yUnit="" />
              : <div className="flex items-center justify-center py-8" style={{ fontSize: 11, color: '#C0BDE8' }}>No revenue data for this period</div>
          }
        </div>

        {/* Order status breakdown */}
        <div className="rounded-2xl p-4" style={{ width: 200, flexShrink: 0, background: '#fff', border: '1px solid #E8E6F8' }}>
          <div className="font-bold mb-4" style={{ fontSize: 13, color: '#1A1730' }}>Order status</div>
          {loading
            ? <div className="flex justify-center py-4"><Spinner /></div>
            : (
              <div className="space-y-3">
                {orderStatusBars.map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between mb-1">
                      <span style={{ fontSize: 10, color: '#4A4770' }}>{s.label}</span>
                      <span className="font-bold" style={{ fontSize: 10, color: s.color }}>{s.val}%</span>
                    </div>
                    <div className="rounded-full overflow-hidden" style={{ height: 5, background: '#F6F5FF' }}>
                      <div className="rounded-full h-full transition-all" style={{ width: `${s.val}%`, background: s.color }} />
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t space-y-1" style={{ borderColor: '#F0EFFB' }}>
                  {[
                    { label: 'Completed', val: completed, color: '#16A660' },
                    { label: 'Cancelled', val: cancelled, color: '#D84040' },
                    { label: 'In progress', val: inProgress, color: '#5B4FE9' },
                  ].map(s => (
                    <div key={s.label} className="flex justify-between">
                      <span style={{ fontSize: 10, color: '#8A88A8' }}>{s.label}</span>
                      <span className="font-bold" style={{ fontSize: 10, color: s.color }}>{s.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
        </div>
      </div>

      {/* ── Row 2: Completed orders per day ────────────────────────────────── */}
      {!loading && orderCountSeries.length > 0 && trendLabels.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold" style={{ fontSize: 13, color: '#1A1730' }}>Orders completed per day</span>
            <span style={{ fontSize: 10, color: '#8A88A8' }}>{period}d window</span>
          </div>
          <BarChart labels={trendLabels} series={orderCountSeries} height={120} />
        </div>
      )}

      {/* ── Row 3: Alert lifecycle trend ───────────────────────────────────── */}
      {!loading && trends && (
        <div className="flex gap-3">
          {/* Alert lifecycle bar chart */}
          <div className="flex-1 rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #E8E6F8', minWidth: 0 }}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold" style={{ fontSize: 13, color: '#1A1730' }}>Alert lifecycle trend</span>
              <span style={{ fontSize: 10, color: '#8A88A8' }}>{period}d · daily counts</span>
            </div>
            <BarChart labels={trendLabels} series={alertTrendSeries} />
          </div>

          {/* Alert kind split */}
          <div className="rounded-2xl p-4" style={{ width: 240, flexShrink: 0, background: '#fff', border: '1px solid #E8E6F8' }}>
            <div className="font-bold mb-4" style={{ fontSize: 13, color: '#1A1730' }}>Alert kind split</div>
            <BarChart labels={trendLabels} series={alertKindSeries} height={120} />
          </div>
        </div>
      )}

      {/* ── Row 4: Follow-up actions trend ─────────────────────────────────── */}
      {!loading && trends && (
        <div className="flex gap-3">
          {/* Follow-up line chart */}
          <div className="flex-1 rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #E8E6F8', minWidth: 0 }}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold" style={{ fontSize: 13, color: '#1A1730' }}>Follow-up actions</span>
              <span style={{ fontSize: 10, color: '#8A88A8' }}>Reminders &amp; escalations per day</span>
            </div>
            <LineChart labels={trendLabels} series={followUpSeries} height={120} />
          </div>

          {/* Inventory alert overview counts */}
          {overview && (
            <div className="rounded-2xl p-4" style={{ width: 260, flexShrink: 0, background: '#fff', border: '1px solid #E8E6F8' }}>
              <div className="font-bold mb-3" style={{ fontSize: 13, color: '#1A1730' }}>
                Alert totals
                <span style={{ fontSize: 10, color: '#8A88A8', fontWeight: 400, marginLeft: 6 }}>
                  {period}d
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Clock,        label: 'Open',         val: overview.statusCounts.openAlertsCount,         color: '#D4820A' },
                  { icon: CheckCircle,  label: 'Acknowledged', val: overview.statusCounts.acknowledgedAlertsCount, color: '#5B4FE9' },
                  { icon: CheckCircle,  label: 'Resolved',     val: overview.statusCounts.resolvedAlertsCount,     color: '#16A660' },
                  { icon: XCircle,      label: 'Dismissed',    val: overview.statusCounts.dismissedAlertsCount,    color: '#8A88A8' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-2.5 flex items-center gap-2" style={{ background: '#F6F5FF' }}>
                    <s.icon size={13} style={{ color: s.color, flexShrink: 0 }} />
                    <div>
                      <div className="font-extrabold" style={{ fontSize: 15, color: '#1A1730', lineHeight: 1 }}>{s.val}</div>
                      <div style={{ fontSize: 9, color: '#8A88A8', marginTop: 1 }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 space-y-1" style={{ borderTop: '1px solid #E8E6F8' }}>
                {[
                  { label: 'Low stock',          val: overview.attentionLevelCounts.lowStockAlertsCount,   color: '#D4820A' },
                  { label: 'Out of stock',        val: overview.attentionLevelCounts.outOfStockAlertsCount, color: '#D84040' },
                  { label: 'Unread by merchant',  val: overview.unreadMerchantAlertsCount,                  color: '#8A88A8' },
                  { label: 'Reminders sent',      val: overview.followUpCounts?.reminderCount ?? 0,         color: '#D4820A' },
                  { label: 'Escalations',         val: overview.followUpCounts?.escalationCount ?? 0,       color: '#D84040' },
                ].map(s => (
                  <div key={s.label} className="flex justify-between items-center">
                    <span style={{ fontSize: 10, color: '#8A88A8' }}>{s.label}</span>
                    <span className="font-bold" style={{ fontSize: 10, color: s.color }}>{s.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Top branches table ──────────────────────────────────────────────── */}
      {!loading && overview?.topBranches && overview.topBranches.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
          <div className="px-4 py-3 font-bold flex items-center justify-between" style={{ fontSize: 13, color: '#1A1730', borderBottom: '1px solid #E8E6F8' }}>
            Top branches by alerts
            <span style={{ fontSize: 10, color: '#8A88A8', fontWeight: 400 }}>{period}d window</span>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ background: '#F6F5FF' }}>
                {['#', 'Branch', 'Total', 'Open', 'Escalated', 'Heat'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-semibold uppercase tracking-wider" style={{ fontSize: 9, color: '#8A88A8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {overview.topBranches.slice(0, 8).map((b, i) => {
                const maxTotal = overview.topBranches[0]?.totalAlertsCount ?? 1;
                const pct = Math.round((b.totalAlertsCount / maxTotal) * 100);
                return (
                  <tr key={b.branchId ?? i} style={{ borderTop: '1px solid #F0EFFB', background: i % 2 === 1 ? '#FAFAFA' : '#fff' }}>
                    <td className="px-4 py-2.5" style={{ fontSize: 10, color: '#C0BDE8', width: 32 }}>{i + 1}</td>
                    <td className="px-4 py-2.5 font-semibold" style={{ fontSize: 11, color: '#1A1730', maxWidth: 180 }}>
                      <div className="truncate">{b.branchName ?? '—'}</div>
                    </td>
                    <td className="px-4 py-2.5 font-bold" style={{ fontSize: 11, color: '#D4820A' }}>{b.totalAlertsCount}</td>
                    <td className="px-4 py-2.5" style={{ fontSize: 11, color: '#4A4770' }}>{b.openLifecycleAlertsCount}</td>
                    <td className="px-4 py-2.5 font-semibold" style={{ fontSize: 11, color: b.escalatedAlertsCount > 0 ? '#D84040' : '#8A88A8' }}>
                      {b.escalatedAlertsCount > 0 ? `⚠ ${b.escalatedAlertsCount}` : '—'}
                    </td>
                    <td className="px-4 py-2.5" style={{ width: 120 }}>
                      <div className="rounded-full overflow-hidden" style={{ height: 5, background: '#F6F5FF' }}>
                        <div
                          className="rounded-full h-full transition-all"
                          style={{ width: `${pct}%`, background: b.escalatedAlertsCount > 0 ? '#D84040' : '#5B4FE9' }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8"><Spinner /></div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
