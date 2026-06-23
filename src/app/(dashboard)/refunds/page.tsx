'use client';

import { useEffect, useState, useCallback } from 'react';
import { RotateCcw, Clock, CheckCircle, XCircle, Search } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';
import { Spinner } from '@/components/ui/spinner';

// Matches backend RefundSummaryDto exactly
type Refund = {
  refundId: string;
  paymentId: string;
  orderId: string;
  status: string;
  amount: string;
  currencyCode: string;
  reasonCode: string | null;
  note: string | null;
  paymentMethod: string;
  paymentProvider: string;
  createdByUserRole: string | null;
  createdByUserPhone: string | null;
  requestedAt: string;
  succeededAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// We fetch refunds per order — need orders list first
type OrderSummary = {
  orderId: string;
  orderCode: string;
  customer: { phone: string; fullName: string | null };
  branch: { merchantName: string };
};

type RefundWithOrder = Refund & { orderCode: string; customerName: string; merchantName: string };

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:   { bg: '#FFF8E8', color: '#D4820A', label: 'Pending' },
  SUCCEEDED: { bg: '#E8FAF2', color: '#16A660', label: 'Approved' },
  FAILED:    { bg: '#FFF0F0', color: '#D84040', label: 'Rejected' },
  CANCELLED: { bg: '#F6F5FF', color: '#8A88A8', label: 'Cancelled' },
};

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<RefundWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [acting, setActing]   = useState<Record<string, boolean>>({});
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch recent orders, then fetch refunds for those that have them
      const orders = await apiGet<OrderSummary[]>(`${ep.orders}?limit=50`);
      const orderList = Array.isArray(orders) ? orders : [];

      // Fetch refunds for each order in parallel (max 20 to avoid hammering)
      const slice = orderList.slice(0, 20);
      const results = await Promise.allSettled(
        slice.map(o =>
          apiGet<Refund[]>(ep.orderRefunds(o.orderId)).then(rList =>
            (Array.isArray(rList) ? rList : []).map(r => ({
              ...r,
              orderCode: o.orderCode,
              customerName: o.customer.fullName ?? o.customer.phone,
              merchantName: o.branch.merchantName,
            }))
          )
        )
      );

      const allRefunds: RefundWithOrder[] = results
        .filter((r): r is PromiseFulfilledResult<RefundWithOrder[]> => r.status === 'fulfilled')
        .flatMap(r => r.value);

      // Sort by requestedAt descending
      allRefunds.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
      setRefunds(allRefunds);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load refunds.');
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handle(refundId: string, action: 'succeed' | 'fail') {
    setActing(a => ({ ...a, [refundId]: true }));
    try {
      const ep_ = action === 'succeed' ? ep.refundSucceed(refundId) : ep.refundFail(refundId);
      const updated = await apiPost<Refund>(ep_);
      setRefunds(prev => prev.map(r => r.refundId === refundId ? { ...r, ...updated } : r));
    } catch { /* keep current state */ }
    finally {
      setActing(a => ({ ...a, [refundId]: false }));
    }
  }

  const display = refunds.filter(r =>
    (filter === 'all' || r.status === filter) &&
    (!search || r.orderCode.toLowerCase().includes(search.toLowerCase()) ||
     r.customerName.toLowerCase().includes(search.toLowerCase()) ||
     r.merchantName.toLowerCase().includes(search.toLowerCase()))
  );

  const pending   = refunds.filter(r => r.status === 'PENDING').length;
  const succeeded = refunds.filter(r => r.status === 'SUCCEEDED').length;
  const failed    = refunds.filter(r => r.status === 'FAILED').length;
  const totalPendingAmt = refunds.filter(r => r.status === 'PENDING').reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-3">
      {/* KPI tiles */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: Clock,       label: 'Pending review',  val: pending,                                              color: '#D4820A' },
          { icon: RotateCcw,   label: 'Pending amount',  val: (totalPendingAmt / 1000).toFixed(0) + 'K MMK',        color: '#5B4FE9' },
          { icon: CheckCircle, label: 'Approved',        val: succeeded,                                            color: '#16A660' },
          { icon: XCircle,     label: 'Rejected',        val: failed,                                               color: '#D84040' },
        ].map(k => (
          <div key={k.label} className="rounded-card p-4" style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
            <div className="flex items-center gap-2 mb-2">
              <k.icon size={14} style={{ color: k.color }} />
              <span className="font-semibold uppercase tracking-wider" style={{ fontSize: 9, color: '#8A88A8' }}>{k.label}</span>
            </div>
            <div className="font-extrabold" style={{ fontSize: 20, color: '#1A1730' }}>{loading ? '…' : k.val}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 rounded-card px-3 py-2" style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
        <div className="flex items-center gap-1.5 flex-1 rounded-lg px-2.5 py-1.5" style={{ background: '#F6F5FF', border: '1px solid #E8E6F8' }}>
          <Search size={12} style={{ color: '#8A88A8' }} />
          <input placeholder="Search order, customer, merchant…" className="bg-transparent outline-none flex-1" style={{ fontSize: 11 }}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="rounded-lg px-2 py-1.5 outline-none" style={{ fontSize: 11, background: '#F6F5FF', border: '1px solid #E8E6F8', color: '#4A4770' }}
          value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="SUCCEEDED">Approved</option>
          <option value="FAILED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* States */}
      {loading && <div className="flex justify-center py-12"><Spinner /></div>}

      {!loading && error && (
        <div className="rounded-card px-4 py-3 text-center" style={{ background: '#FFF0F0', border: '1px solid #FFD0D0' }}>
          <div style={{ fontSize: 12, color: '#D84040' }}>{error}</div>
          <button onClick={load} className="mt-2 font-semibold" style={{ fontSize: 11, color: '#5B4FE9' }}>Retry</button>
        </div>
      )}

      {!loading && !error && display.length === 0 && (
        <div className="rounded-card px-4 py-10 text-center" style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
          <div style={{ fontSize: 13, color: '#8A88A8' }}>No refunds found</div>
        </div>
      )}

      {/* Refund rows */}
      {!loading && !error && display.length > 0 && (
        <div className="space-y-2">
          {display.map(r => {
            const ss = STATUS_STYLE[r.status] ?? { bg: '#F6F5FF', color: '#8A88A8', label: r.status };
            return (
              <div key={r.refundId} className="rounded-card px-4 py-3 flex items-center gap-4" style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-bold" style={{ fontSize: 12, color: '#5B4FE9' }}>#{r.orderCode}</span>
                    <span style={{ fontSize: 10, color: '#8A88A8' }}>· {r.refundId.slice(0, 8)}…</span>
                    <span className="rounded-pill px-2 py-0.5 font-bold" style={{ fontSize: 9, background: ss.bg, color: ss.color }}>{ss.label}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#1A1730' }}>{r.customerName} → {r.merchantName}</div>
                  <div style={{ fontSize: 10, color: '#8A88A8' }}>
                    {r.reasonCode ?? 'No reason'} · {timeAgo(r.requestedAt)}
                    {r.paymentMethod && ` · ${r.paymentMethod}`}
                  </div>
                </div>
                <div className="font-extrabold flex-shrink-0" style={{ fontSize: 14, color: '#1A1730', minWidth: 120, textAlign: 'right' }}>
                  {Number(r.amount).toLocaleString()} {r.currencyCode}
                </div>
                {r.status === 'PENDING' && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handle(r.refundId, 'succeed')} disabled={acting[r.refundId]}
                      className="rounded-lg px-3 py-1.5 font-semibold flex items-center gap-1"
                      style={{ fontSize: 11, background: '#5B4FE9', color: '#fff' }}>
                      {acting[r.refundId] ? <Spinner size={10} /> : 'Approve'}
                    </button>
                    <button onClick={() => handle(r.refundId, 'fail')} disabled={acting[r.refundId]}
                      className="rounded-lg px-3 py-1.5 font-semibold"
                      style={{ fontSize: 11, border: '1px solid #D84040', color: '#D84040', background: 'transparent' }}>
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
