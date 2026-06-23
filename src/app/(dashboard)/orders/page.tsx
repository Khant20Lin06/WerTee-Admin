'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Eye, X, ChevronLeft, ChevronRight, Search, Download, ChevronDown } from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';
import { StatusBadge } from '@/components/ui/status-badge';
import { Spinner } from '@/components/ui/spinner';

// Matches backend OrderSummaryDto exactly
type OrderSummary = {
  orderId: string;
  orderCode: string;
  status: string;
  subtotalAmount: string;
  discountAmount: string;
  deliveryFee: string;
  totalAmount: string;
  placedAt: string;
  updatedAt: string;
  availableActions: string[];
  customer: {
    customerProfileId: string;
    userId: string;
    phone: string;
    userStatus: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
  branch: {
    branchId: string;
    branchName: string;
    branchStatus: string;
    township: string;
    merchantId: string;
    merchantUserId: string;
    merchantName: string;
    merchantStatus: string;
  };
  delivery: {
    deliveryId: string;
    riderId: string | null;
    etaMinutes: number | null;
    rider: {
      riderId: string;
      userId: string;
      phone: string;
      userStatus: string;
      displayName: string;
      vehicleType: string;
      currentTownship: string | null;
      status: string;
    } | null;
  } | null;
};

// Matches backend OrderDetailDto (extends OrderSummaryDto)
type OrderDetail = OrderSummary & {
  deliveryAddress: {
    label: string | null;
    line1: string | null;
    line2: string | null;
    landmark: string | null;
    township: string | null;
    city: string | null;
    deliveryInstructions: string | null;
  } | null;
  items: {
    orderItemId: string;
    nameSnapshot: string;
    quantity: number;
    unitPriceSnapshot: string;
    lineTotal: string;
  }[];
  timeline: {
    orderStatusHistoryId: string;
    fromStatus: string | null;
    toStatus: string;
    createdAt: string;
  }[];
};

const STATUS_CHIPS = [
  { label: 'Confirmed',  value: 'CONFIRMED',  color: '#5B4FE9', bg: '#EEF0FF' },
  { label: 'Preparing',  value: 'PREPARING',  color: '#E06520', bg: '#FFF3EC' },
  { label: 'Ready',      value: 'READY',      color: '#D4820A', bg: '#FFF8E8' },
  { label: 'Delivering', value: 'DELIVERING', color: '#0A8AD4', bg: '#E8F5FF' },
  { label: 'Completed',  value: 'COMPLETED',  color: '#16A660', bg: '#E8FAF2' },
  { label: 'Cancelled',  value: 'CANCELLED',  color: '#D84040', bg: '#FFF0F0' },
];

const PAGE_SIZE_OPTIONS = [50, 100, 200] as const;
type PageSize = typeof PAGE_SIZE_OPTIONS[number];

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`;
}

// ─── Per-page selector ────────────────────────────────────────────────────────

function PageSizeSelector({ value, onChange }: { value: PageSize; onChange: (v: PageSize) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold"
        style={{ fontSize: 11, background: '#F6F5FF', border: '1px solid #E8E6F8', color: '#4A4770', userSelect: 'none' }}
      >
        <span>{value} / page</span>
        <ChevronDown size={10} style={{ color: '#8A88A8', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 rounded-xl overflow-hidden"
            style={{ background: '#fff', border: '1px solid #E8E6F8', boxShadow: '0 4px 20px rgba(91,79,233,0.12)', minWidth: 130 }}>
            {PAGE_SIZE_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2.5"
                style={{
                  fontSize: 12,
                  color: opt === value ? '#5B4FE9' : '#4A4770',
                  background: opt === value ? '#EEF0FF' : 'transparent',
                  fontWeight: opt === value ? 700 : 500,
                }}
              >
                <span>{opt} rows</span>
                {opt === value && (
                  <span style={{ fontSize: 10, background: '#5B4FE9', color: '#fff', borderRadius: 999, padding: '1px 6px' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Pagination bar ───────────────────────────────────────────────────────────

function PaginationBar({
  page, totalPages, total, pageSize, from, to,
  onPage, onPageSize,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: PageSize;
  from: number;
  to: number;
  onPage: (n: number) => void;
  onPageSize: (v: PageSize) => void;
}) {
  // Build page number windows: always show first, last, and neighbours of current
  const pages = useMemo(() => {
    const set = new Set<number>();
    [1, totalPages].forEach(n => { if (n >= 1) set.add(n); });
    for (let n = page - 2; n <= page + 2; n++) {
      if (n >= 1 && n <= totalPages) set.add(n);
    }
    return [...set].sort((a, b) => a - b);
  }, [page, totalPages]);

  if (totalPages <= 1 && total === 0) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t" style={{ borderColor: '#E8E6F8' }}>
      {/* Left: count info + page size */}
      <div className="flex items-center gap-3">
        <span style={{ fontSize: 10, color: '#8A88A8' }}>
          {total === 0 ? 'No results' : `${from}–${to} of ${total.toLocaleString()} orders`}
        </span>
        <PageSizeSelector value={pageSize} onChange={onPageSize} />
      </div>

      {/* Right: navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            disabled={page === 1}
            onClick={() => onPage(page - 1)}
            className="rounded-lg p-1.5"
            style={{ background: '#F6F5FF', border: '1px solid #E8E6F8', opacity: page === 1 ? 0.35 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >
            <ChevronLeft size={12} style={{ color: '#4A4770' }} />
          </button>

          {pages.map((n, i) => {
            const gap = i > 0 && n - pages[i - 1] > 1;
            return (
              <span key={n} className="flex items-center gap-1">
                {gap && (
                  <span style={{ fontSize: 11, color: '#C8C4F8', padding: '0 2px' }}>…</span>
                )}
                <button
                  onClick={() => onPage(n)}
                  className="rounded-lg font-semibold"
                  style={{
                    fontSize: 11,
                    minWidth: 30,
                    height: 28,
                    padding: '0 6px',
                    background: page === n ? '#5B4FE9' : '#F6F5FF',
                    border: '1px solid',
                    borderColor: page === n ? '#5B4FE9' : '#E8E6F8',
                    color: page === n ? '#fff' : '#4A4770',
                  }}
                >
                  {n}
                </button>
              </span>
            );
          })}

          <button
            disabled={page === totalPages}
            onClick={() => onPage(page + 1)}
            className="rounded-lg p-1.5"
            style={{ background: '#F6F5FF', border: '1px solid #E8E6F8', opacity: page === totalPages ? 0.35 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
          >
            <ChevronRight size={12} style={{ color: '#4A4770' }} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Order Detail Panel ───────────────────────────────────────────────────────

function OrderPanel({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiGet<OrderDetail>(ep.order(orderId))
      .then(setOrder).catch(() => setOrder(null)).finally(() => setLoading(false));
  }, [orderId]);

  const STEPS = ['Confirmed', 'Preparing', 'Ready', 'Delivering', 'Done'];
  const statusOrder = ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED'];
  const step = order ? Math.max(0, statusOrder.indexOf(order.status)) : 0;

  async function act(fn: () => Promise<unknown>) {
    if (acting) return;
    setActing(true);
    try { await fn(); } finally { setActing(false); }
  }

  const addr = order?.deliveryAddress;
  const addrText = addr
    ? [addr.line1, addr.line2, addr.landmark, addr.township, addr.city].filter(Boolean).join(', ')
    : null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex flex-col"
      style={{ width: 440, background: '#fff', borderLeft: '1px solid #E8E6F8', boxShadow: '-8px 0 32px rgba(91,79,233,0.1)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: '#E8E6F8' }}>
        <div className="flex items-center gap-2">
          <span className="font-extrabold" style={{ fontSize: 14, color: '#1A1730' }}>Order #{order?.orderCode ?? '…'}</span>
          {order && <StatusBadge status={order.status} />}
        </div>
        <button onClick={onClose}><X size={15} style={{ color: '#8A88A8' }} /></button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Spinner /></div>
      ) : !order ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: '#8A88A8', fontSize: 13 }}>Order not found</div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Timeline */}
          <div className="flex items-start justify-between gap-1">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-col items-center gap-1 flex-1 relative">
                {i > 0 && (
                  <div className="absolute top-3.5 right-1/2 w-full h-0.5"
                    style={{ background: i <= step ? '#5B4FE9' : '#E8E6F8', zIndex: 0 }} />
                )}
                <div className="relative z-10 rounded-full flex items-center justify-center font-bold"
                  style={{ width: 28, height: 28, background: i <= step ? '#5B4FE9' : '#F6F5FF', color: i <= step ? '#fff' : '#C8C4F8', fontSize: 11, border: i === step ? '2px solid #5B4FE9' : '2px solid transparent' }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 9, color: i <= step ? '#5B4FE9' : '#8A88A8', fontWeight: 600, textAlign: 'center' }}>{s}</span>
              </div>
            ))}
          </div>

          {/* Customer */}
          <div className="rounded-card p-3" style={{ background: '#F6F5FF' }}>
            <div className="uppercase font-semibold mb-1" style={{ fontSize: 9, color: '#8A88A8' }}>Customer</div>
            <div className="font-bold" style={{ fontSize: 13, color: '#1A1730' }}>{order.customer.fullName ?? 'Unknown'}</div>
            <div style={{ fontSize: 11, color: '#4A4770' }}>{order.customer.phone}</div>
            {addrText && <div style={{ fontSize: 11, color: '#4A4770', marginTop: 2 }}>{addrText}</div>}
            {order.deliveryAddress?.deliveryInstructions && (
              <div style={{ fontSize: 10, color: '#8A88A8', marginTop: 2 }}>Note: {order.deliveryAddress.deliveryInstructions}</div>
            )}
          </div>

          {/* Merchant + Rider */}
          <div className="flex gap-2">
            <div className="flex-1 rounded-card p-3" style={{ background: '#F6F5FF' }}>
              <div className="uppercase font-semibold mb-1" style={{ fontSize: 9, color: '#8A88A8' }}>Merchant</div>
              <div className="font-bold" style={{ fontSize: 12, color: '#1A1730' }}>{order.branch.merchantName}</div>
              <div style={{ fontSize: 10, color: '#4A4770' }}>{order.branch.branchName}</div>
              <div style={{ fontSize: 10, color: '#8A88A8' }}>{order.branch.township}</div>
            </div>
            <div className="flex-1 rounded-card p-3" style={{ background: '#F6F5FF' }}>
              <div className="uppercase font-semibold mb-1" style={{ fontSize: 9, color: '#8A88A8' }}>Rider</div>
              {order.delivery?.rider ? (
                <>
                  <div className="font-bold" style={{ fontSize: 12, color: '#1A1730' }}>{order.delivery.rider.displayName}</div>
                  <div style={{ fontSize: 10, color: '#4A4770' }}>{order.delivery.rider.phone}</div>
                  {order.delivery.etaMinutes && (
                    <div style={{ fontSize: 10, color: '#8A88A8' }}>ETA {order.delivery.etaMinutes} min</div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 12, color: '#8A88A8' }}>Not assigned</div>
              )}
            </div>
          </div>

          {/* Items */}
          {order.items.length > 0 && (
            <div>
              <div className="font-bold mb-1" style={{ fontSize: 12, color: '#1A1730' }}>Items</div>
              {order.items.map(item => (
                <div key={item.orderItemId} className="flex justify-between py-1.5" style={{ borderTop: '1px solid #E8E6F8' }}>
                  <span style={{ fontSize: 11, color: '#4A4770' }}>{item.nameSnapshot} × {item.quantity}</span>
                  <span className="font-semibold" style={{ fontSize: 11 }}>{Number(item.lineTotal).toLocaleString()} MMK</span>
                </div>
              ))}
              <div className="pt-2 mt-1 space-y-1" style={{ borderTop: '1px solid #E8E6F8' }}>
                <div className="flex justify-between">
                  <span style={{ fontSize: 11, color: '#8A88A8' }}>Subtotal</span>
                  <span style={{ fontSize: 11 }}>{Number(order.subtotalAmount).toLocaleString()} MMK</span>
                </div>
                {Number(order.discountAmount) > 0 && (
                  <div className="flex justify-between">
                    <span style={{ fontSize: 11, color: '#8A88A8' }}>Discount</span>
                    <span style={{ fontSize: 11, color: '#16A660' }}>−{Number(order.discountAmount).toLocaleString()} MMK</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span style={{ fontSize: 11, color: '#8A88A8' }}>Delivery fee</span>
                  <span style={{ fontSize: 11 }}>{Number(order.deliveryFee).toLocaleString()} MMK</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-extrabold" style={{ fontSize: 13 }}>Total</span>
                  <span className="font-extrabold" style={{ fontSize: 13, color: '#5B4FE9' }}>{Number(order.totalAmount).toLocaleString()} MMK</span>
                </div>
              </div>
            </div>
          )}

          {/* Timeline history */}
          {order.timeline.length > 0 && (
            <div>
              <div className="font-bold mb-2" style={{ fontSize: 12, color: '#1A1730' }}>Status history</div>
              {order.timeline.map(t => (
                <div key={t.orderStatusHistoryId} className="flex items-center gap-2 py-1.5" style={{ borderTop: '1px solid #E8E6F8' }}>
                  <div className="rounded-full flex-shrink-0" style={{ width: 6, height: 6, background: '#5B4FE9' }} />
                  <span style={{ fontSize: 10, color: '#4A4770' }}>
                    {t.fromStatus ? `${t.fromStatus} → ` : ''}{t.toStatus}
                  </span>
                  <span className="ml-auto" style={{ fontSize: 10, color: '#8A88A8' }}>
                    {new Date(t.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {order && !['COMPLETED', 'CANCELLED'].includes(order.status) && (
        <div className="px-5 py-3.5 border-t flex gap-2" style={{ borderColor: '#E8E6F8' }}>
          {order.status === 'PREPARING' && (
            <button
              onClick={() => act(() => apiPatch(ep.orderStatus(order.orderId), { status: 'READY', reasonCode: 'ADMIN_UPDATE' }).then(() => setOrder({ ...order, status: 'READY' })))}
              className="flex-1 rounded-card py-2 font-semibold flex justify-center items-center gap-2"
              style={{ background: '#5B4FE9', color: '#fff', fontSize: 12 }}>
              {acting ? <Spinner size={14} /> : 'Mark as ready'}
            </button>
          )}
          <button
            onClick={() => act(() => apiPost(ep.orderCancel(order.orderId), { reasonCode: 'ADMIN_CANCEL' }).then(() => setOrder({ ...order, status: 'CANCELLED' })))}
            className="flex-1 rounded-card py-2 font-semibold"
            style={{ border: '1px solid #D84040', color: '#D84040', fontSize: 12, background: 'transparent' }}>
            Cancel order
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [allOrders, setAllOrders] = useState<OrderSummary[]>([]);
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState<PageSize>(50);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [status, setStatus]       = useState('all');
  const [search, setSearch]       = useState('');
  const [panelId, setPanelId]     = useState<string | null>(null);

  // Fetch all orders once; filtering + pagination done client-side
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<OrderSummary[]>(ep.orders);
      setAllOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load orders.');
      setAllOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Reset to page 1 whenever filter/search/pageSize changes
  const handleStatus = (v: string) => { setStatus(v); setPage(1); };
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handlePageSize = (v: PageSize) => { setPageSize(v); setPage(1); };

  // Client-side filter
  const filtered = useMemo(() => {
    return allOrders.filter(o => {
      if (status !== 'all' && o.status !== status) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !o.orderCode.toLowerCase().includes(q) &&
          !(o.customer.fullName ?? '').toLowerCase().includes(q) &&
          !o.customer.phone.includes(q) &&
          !o.branch.merchantName.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [allOrders, status, search]);

  // Pagination math
  const total      = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage   = Math.min(page, totalPages);
  const from       = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to         = Math.min(safePage * pageSize, total);
  const pageRows   = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const counts = STATUS_CHIPS.reduce((acc, c) => {
    acc[c.value] = allOrders.filter(o => o.status === c.value).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2 rounded-card px-3 py-2" style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
        <div className="flex items-center gap-1.5 flex-1 rounded-lg px-2.5 py-1.5" style={{ background: '#F6F5FF', border: '1px solid #E8E6F8' }}>
          <Search size={12} style={{ color: '#8A88A8' }} />
          <input
            placeholder="Search order code, customer, merchant…"
            className="bg-transparent outline-none flex-1"
            style={{ fontSize: 11 }}
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-lg px-2 py-1.5 outline-none"
          style={{ fontSize: 11, background: '#F6F5FF', border: '1px solid #E8E6F8', color: '#4A4770' }}
          value={status}
          onChange={e => handleStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          {STATUS_CHIPS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <button
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold"
          style={{ fontSize: 11, background: '#F6F5FF', border: '1px solid #E8E6F8', color: '#4A4770' }}
        >
          <Download size={11} /> Export CSV
        </button>
      </div>

      {/* Status chips */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_CHIPS.map(c => (
          <button
            key={c.value}
            onClick={() => handleStatus(status === c.value ? 'all' : c.value)}
            className="rounded-pill px-3 py-1 font-bold"
            style={{
              fontSize: 11,
              background: status === c.value ? c.bg : '#F6F5FF',
              color: status === c.value ? c.color : '#8A88A8',
              border: `1px solid ${status === c.value ? c.color + '40' : '#E8E6F8'}`,
            }}
          >
            {c.label} <span className="ml-1">{counts[c.value] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-card px-4 py-3 text-center" style={{ background: '#FFF0F0', border: '1px solid #FFD0D0' }}>
          <div style={{ fontSize: 12, color: '#D84040' }}>{error}</div>
          <button onClick={load} className="mt-2 font-semibold" style={{ fontSize: 11, color: '#5B4FE9' }}>Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-card overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: '#F6F5FF' }}>
              {['Order ID', 'Customer', 'Merchant', 'Rider', 'Amount', 'Status', 'Time', ''].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider" style={{ fontSize: 9, color: '#8A88A8' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-10 text-center"><Spinner /></td></tr>
            ) : pageRows.length === 0 && !error ? (
              <tr>
                <td colSpan={8} className="py-10 text-center" style={{ fontSize: 12, color: '#8A88A8' }}>
                  {allOrders.length === 0 ? 'No orders yet' : 'No orders match this filter'}
                </td>
              </tr>
            ) : pageRows.map((o, i) => (
              <tr
                key={o.orderId}
                style={{ borderTop: '1px solid #E8E6F8', background: i % 2 === 1 ? '#FAFAFA' : '#fff' }}
              >
                <td className="px-3 py-2.5 font-semibold" style={{ fontSize: 11, color: '#5B4FE9' }}>#{o.orderCode}</td>
                <td className="px-3 py-2.5">
                  <div style={{ fontSize: 11, color: '#1A1730' }}>{o.customer.fullName ?? '—'}</div>
                  <div style={{ fontSize: 10, color: '#8A88A8' }}>{o.customer.phone}</div>
                </td>
                <td className="px-3 py-2.5">
                  <div style={{ fontSize: 11, color: '#4A4770' }}>{o.branch.merchantName}</div>
                  <div style={{ fontSize: 10, color: '#8A88A8' }}>{o.branch.branchName}</div>
                </td>
                <td className="px-3 py-2.5" style={{ fontSize: 11, color: '#4A4770' }}>
                  {o.delivery?.rider?.displayName ?? '—'}
                </td>
                <td className="px-3 py-2.5 font-semibold" style={{ fontSize: 11 }}>
                  {Number(o.totalAmount).toLocaleString()} MMK
                </td>
                <td className="px-3 py-2.5"><StatusBadge status={o.status} /></td>
                <td className="px-3 py-2.5" style={{ fontSize: 10, color: '#8A88A8' }}>{timeAgo(o.placedAt)}</td>
                <td className="px-3 py-2.5">
                  <button onClick={() => setPanelId(o.orderId)}>
                    <Eye size={14} style={{ color: '#5B4FE9' }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {!loading && !error && (
          <PaginationBar
            page={safePage}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            from={from}
            to={to}
            onPage={setPage}
            onPageSize={handlePageSize}
          />
        )}
      </div>

      {panelId && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(26,23,48,0.25)' }} onClick={() => setPanelId(null)} />
          <OrderPanel orderId={panelId} onClose={() => setPanelId(null)} />
        </>
      )}
    </div>
  );
}
