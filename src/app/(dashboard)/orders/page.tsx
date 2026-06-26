'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Eye, X, Search, Download } from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';
import { StatusBadge } from '@/components/ui/status-badge';
import { Spinner } from '@/components/ui/spinner';
import { PaginationBar } from '@/components/ui/pagination-bar';
import type { OrderSummary, OrderDetail } from '@/types/models';
import { timeAgo } from '@/lib/utils/formatters';

const STATUS_CHIPS = [
  { label: 'Confirmed',  value: 'CONFIRMED',  color: 'var(--brand)',   bg: 'var(--brand-muted)' },
  { label: 'Preparing',  value: 'PREPARING',  color: 'var(--warning)', bg: 'var(--warning-bg)' },
  { label: 'Ready',      value: 'READY',      color: 'var(--warning)', bg: 'var(--warning-bg)' },
  { label: 'Delivering', value: 'DELIVERING', color: 'var(--info)',    bg: 'var(--info-bg)' },
  { label: 'Completed',  value: 'COMPLETED',  color: 'var(--success)', bg: 'var(--success-bg)' },
  { label: 'Cancelled',  value: 'CANCELLED',  color: 'var(--danger)',  bg: 'var(--danger-bg)' },
];

const PAGE_SIZE_OPTIONS = [50, 100, 200] as const;
type PageSize = typeof PAGE_SIZE_OPTIONS[number];

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

  const isPickup = order?.deliveryType === 'PICKUP';
  const STEPS       = isPickup
    ? ['Confirmed', 'Preparing', 'Ready', 'Done']
    : ['Confirmed', 'Preparing', 'Ready', 'Delivering', 'Done'];
  const statusOrder = isPickup
    ? ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED']
    : ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED'];
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
      style={{ width: 440, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="font-extrabold" style={{ fontSize: 14, color: 'var(--text-primary)' }}>Order #{order?.orderCode ?? '…'}</span>
          {order && <StatusBadge status={order.status} />}
        </div>
        <button onClick={onClose}><X size={15} style={{ color: 'var(--text-muted)' }} /></button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Spinner /></div>
      ) : !order ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)', fontSize: 13 }}>Order not found</div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Timeline */}
          <div className="flex items-start justify-between gap-1">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-col items-center gap-1 flex-1 relative">
                {i > 0 && (
                  <div className="absolute top-3.5 right-1/2 w-full h-0.5"
                    style={{ background: i <= step ? 'var(--brand)' : 'var(--border)', zIndex: 0 }} />
                )}
                <div className="relative z-10 rounded-full flex items-center justify-center font-bold"
                  style={{
                    width: 28, height: 28,
                    background: i <= step ? 'var(--brand)' : 'var(--bg-subtle)',
                    color: i <= step ? '#fff' : 'var(--text-faint)',
                    fontSize: 11,
                    border: i === step ? '2px solid var(--brand)' : '2px solid transparent',
                  }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 9, color: i <= step ? 'var(--brand)' : 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>{s}</span>
              </div>
            ))}
          </div>

          {/* Delivery type badge */}
          <div className="flex items-center gap-2">
            <span
              className="rounded-full font-bold"
              style={{
                fontSize: 10, padding: '3px 10px',
                background: isPickup ? 'var(--warning-bg)' : 'var(--info-bg)',
                color:      isPickup ? 'var(--warning)'    : 'var(--info)',
                border: `1px solid ${isPickup ? 'var(--warning)' : 'var(--info)'}`,
              }}
            >
              {isPickup ? '🛍 Pickup' : '🛵 Delivery'}
            </span>
            {isPickup && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Customer will pick up from store</span>
            )}
          </div>

          {/* Customer */}
          <div className="rounded-card p-3" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
            <div className="uppercase font-semibold mb-1" style={{ fontSize: 9, color: 'var(--text-muted)' }}>Customer</div>
            <div className="font-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{order.customer.fullName ?? 'Unknown'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{order.customer.phone}</div>
            {!isPickup && addrText && (
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{addrText}</div>
            )}
            {!isPickup && order.deliveryAddress?.deliveryInstructions && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Note: {order.deliveryAddress.deliveryInstructions}</div>
            )}
          </div>

          {/* Merchant + Rider */}
          <div className="flex gap-2">
            <div className="flex-1 rounded-card p-3" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <div className="uppercase font-semibold mb-1" style={{ fontSize: 9, color: 'var(--text-muted)' }}>Merchant</div>
              <div className="font-bold" style={{ fontSize: 12, color: 'var(--text-primary)' }}>{order.branch.merchantName}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{order.branch.branchName}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{order.branch.township}</div>
            </div>
            {!isPickup && (
              <div className="flex-1 rounded-card p-3" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                <div className="uppercase font-semibold mb-1" style={{ fontSize: 9, color: 'var(--text-muted)' }}>Rider</div>
                {order.delivery?.rider ? (
                  <>
                    <div className="font-bold" style={{ fontSize: 12, color: 'var(--text-primary)' }}>{order.delivery.rider.displayName}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{order.delivery.rider.phone}</div>
                    {order.delivery.etaMinutes && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>ETA {order.delivery.etaMinutes} min</div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>Not assigned yet</div>
                )}
              </div>
            )}
          </div>

          {/* Items */}
          {order.items.length > 0 && (
            <div>
              <div className="font-bold mb-1" style={{ fontSize: 12, color: 'var(--text-primary)' }}>Items</div>
              {order.items.map(item => (
                <div key={item.orderItemId} className="flex justify-between py-1.5" style={{ borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.nameSnapshot} × {item.quantity}</span>
                  <span className="font-semibold" style={{ fontSize: 11, color: 'var(--text-primary)' }}>{Number(item.lineTotal).toLocaleString()} MMK</span>
                </div>
              ))}
              <div className="pt-2 mt-1 space-y-1" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="flex justify-between">
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Subtotal</span>
                  <span style={{ fontSize: 11, color: 'var(--text-primary)' }}>{Number(order.subtotalAmount).toLocaleString()} MMK</span>
                </div>
                {Number(order.discountAmount) > 0 && (
                  <div className="flex justify-between">
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Discount</span>
                    <span style={{ fontSize: 11, color: 'var(--success)' }}>−{Number(order.discountAmount).toLocaleString()} MMK</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Delivery fee</span>
                  <span style={{ fontSize: 11, color: 'var(--text-primary)' }}>{Number(order.deliveryFee).toLocaleString()} MMK</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-extrabold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>Total</span>
                  <span className="font-extrabold" style={{ fontSize: 13, color: 'var(--brand)' }}>{Number(order.totalAmount).toLocaleString()} MMK</span>
                </div>
              </div>
            </div>
          )}

          {/* Timeline history */}
          {order.timeline.length > 0 && (
            <div>
              <div className="font-bold mb-2" style={{ fontSize: 12, color: 'var(--text-primary)' }}>Status history</div>
              {order.timeline.map(t => (
                <div key={t.orderStatusHistoryId} className="flex items-center gap-2 py-1.5" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="rounded-full flex-shrink-0" style={{ width: 6, height: 6, background: 'var(--brand)' }} />
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                    {t.fromStatus ? `${t.fromStatus} → ` : ''}{t.toStatus}
                  </span>
                  <span className="ml-auto" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
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
        <div className="px-5 py-3.5 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
          {order.status === 'PREPARING' && (
            <button
              onClick={() => act(() => apiPatch(ep.orderStatus(order.orderId), { status: 'READY', reasonCode: 'ADMIN_UPDATE' }).then(() => setOrder({ ...order, status: 'READY' })))}
              className="flex-1 rounded-card py-2 font-semibold flex justify-center items-center gap-2"
              style={{ background: 'var(--brand)', color: '#fff', fontSize: 12 }}>
              {acting ? <Spinner size={14} /> : 'Mark as ready'}
            </button>
          )}
          <button
            onClick={() => act(() => apiPost(ep.orderCancel(order.orderId), { reasonCode: 'ADMIN_CANCEL' }).then(() => setOrder({ ...order, status: 'CANCELLED' })))}
            className="flex-1 rounded-card py-2 font-semibold"
            style={{ border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 12, background: 'transparent' }}>
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

  const handleStatus  = (v: string) => { setStatus(v);  setPage(1); };
  const handleSearch  = (v: string) => { setSearch(v);  setPage(1); };
  const handlePageSize = (v: number) => { setPageSize(v as PageSize); setPage(1); };

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
      <div className="flex items-center gap-2 rounded-card px-3 py-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1.5 flex-1 rounded-lg px-2.5 py-1.5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          <Search size={12} style={{ color: 'var(--text-muted)' }} />
          <input
            placeholder="Search order code, customer, merchant…"
            className="bg-transparent outline-none flex-1"
            style={{ fontSize: 11, color: 'var(--text-primary)' }}
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-lg px-2 py-1.5 outline-none"
          style={{ fontSize: 11, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          value={status}
          onChange={e => handleStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          {STATUS_CHIPS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <button
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold"
          style={{ fontSize: 11, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
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
              background: status === c.value ? c.bg : 'var(--bg-subtle)',
              color: status === c.value ? c.color : 'var(--text-muted)',
              border: `1px solid ${status === c.value ? c.color : 'var(--border)'}`,
            }}
          >
            {c.label} <span className="ml-1">{counts[c.value] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-card px-4 py-3 text-center" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)' }}>
          <div style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</div>
          <button onClick={load} className="mt-2 font-semibold" style={{ fontSize: 11, color: 'var(--brand)' }}>Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-card overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--bg-subtle)' }}>
              {['Order ID', 'Customer', 'Merchant', 'Type / Rider', 'Amount', 'Status', 'Time', ''].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-10 text-center"><Spinner /></td></tr>
            ) : pageRows.length === 0 && !error ? (
              <tr>
                <td colSpan={8} className="py-10 text-center" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {allOrders.length === 0 ? 'No orders yet' : 'No orders match this filter'}
                </td>
              </tr>
            ) : pageRows.map((o, i) => (
              <tr
                key={o.orderId}
                style={{ borderTop: '1px solid var(--border)', background: i % 2 === 1 ? 'var(--bg-subtle)' : 'var(--bg-card)' }}
              >
                <td className="px-3 py-2.5 font-semibold" style={{ fontSize: 11, color: 'var(--brand)' }}>#{o.orderCode}</td>
                <td className="px-3 py-2.5">
                  <div style={{ fontSize: 11, color: 'var(--text-primary)' }}>{o.customer.fullName ?? '—'}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{o.customer.phone}</div>
                </td>
                <td className="px-3 py-2.5">
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{o.branch.merchantName}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{o.branch.branchName}</div>
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className="rounded-full font-bold"
                    style={{
                      fontSize: 9, padding: '2px 6px', display: 'inline-block', marginBottom: 2,
                      background: o.deliveryType === 'PICKUP' ? 'var(--warning-bg)' : 'var(--info-bg)',
                      color:      o.deliveryType === 'PICKUP' ? 'var(--warning)'    : 'var(--info)',
                    }}
                  >
                    {o.deliveryType === 'PICKUP' ? 'Pickup' : 'Delivery'}
                  </span>
                  {o.deliveryType === 'DELIVERY' && (
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                      {o.delivery?.rider?.displayName ?? <span style={{ color: 'var(--text-faint)' }}>No rider</span>}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 font-semibold" style={{ fontSize: 11, color: 'var(--text-primary)' }}>
                  {Number(o.totalAmount).toLocaleString()} MMK
                </td>
                <td className="px-3 py-2.5"><StatusBadge status={o.status} /></td>
                <td className="px-3 py-2.5" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{timeAgo(o.placedAt)}</td>
                <td className="px-3 py-2.5">
                  <button onClick={() => setPanelId(o.orderId)}>
                    <Eye size={14} style={{ color: 'var(--brand)' }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

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
            pageSizeOptions={PAGE_SIZE_OPTIONS}
          />
        )}
      </div>

      {panelId && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setPanelId(null)} />
          <OrderPanel orderId={panelId} onClose={() => setPanelId(null)} />
        </>
      )}
    </div>
  );
}
