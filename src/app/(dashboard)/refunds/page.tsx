'use client';

import { useEffect, useState, useCallback } from 'react';
import { RotateCcw, Clock, CheckCircle, XCircle, Search } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';
import { Spinner } from '@/components/ui/spinner';
import { PaginationBar } from '@/components/ui/pagination-bar';
import type { Refund, RefundWithOrder, OrderSummary } from '@/types/models';
import { timeAgo } from '@/lib/utils/formatters';

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:   { bg: 'var(--warning-bg)', color: 'var(--warning)', label: 'Pending' },
  SUCCEEDED: { bg: 'var(--success-bg)', color: 'var(--success)', label: 'Approved' },
  FAILED:    { bg: 'var(--danger-bg)',  color: 'var(--danger)',  label: 'Rejected' },
  CANCELLED: { bg: 'var(--bg-subtle)',  color: 'var(--text-muted)', label: 'Cancelled' },
};

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<RefundWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [acting, setActing]   = useState<Record<string, boolean>>({});
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('all');
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const orders = await apiGet<OrderSummary[]>(`${ep.orders}?limit=50`);
      const orderList = Array.isArray(orders) ? orders : [];

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

  const total      = display.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage   = Math.min(page, totalPages);
  const from       = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to         = Math.min(safePage * pageSize, total);
  const pageRows   = display.slice((safePage - 1) * pageSize, safePage * pageSize);

  const pending   = refunds.filter(r => r.status === 'PENDING').length;
  const succeeded = refunds.filter(r => r.status === 'SUCCEEDED').length;
  const failed    = refunds.filter(r => r.status === 'FAILED').length;
  const totalPendingAmt = refunds.filter(r => r.status === 'PENDING').reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-3">
      {/* KPI tiles */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: Clock,       label: 'Pending review',  val: pending,                                              color: 'var(--warning)' },
          { icon: RotateCcw,   label: 'Pending amount',  val: (totalPendingAmt / 1000).toFixed(0) + 'K MMK',        color: 'var(--brand)' },
          { icon: CheckCircle, label: 'Approved',        val: succeeded,                                            color: 'var(--success)' },
          { icon: XCircle,     label: 'Rejected',        val: failed,                                               color: 'var(--danger)' },
        ].map(k => (
          <div key={k.label} className="card rounded-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <k.icon size={14} style={{ color: k.color }} />
              <span className="font-semibold uppercase tracking-wider" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{k.label}</span>
            </div>
            <div className="font-extrabold" style={{ fontSize: 20, color: 'var(--text-primary)' }}>{loading ? '…' : k.val}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 rounded-card px-3 py-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1.5 flex-1 rounded-lg px-2.5 py-1.5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          <Search size={12} style={{ color: 'var(--text-muted)' }} />
          <input placeholder="Search order, customer, merchant…" className="bg-transparent outline-none flex-1" style={{ fontSize: 11 }}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="rounded-lg px-2 py-1.5 outline-none" style={{ fontSize: 11, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
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
        <div className="rounded-card px-4 py-3 text-center" style={{ background: 'var(--danger-bg)', border: '1px solid #FFD0D0' }}>
          <div style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</div>
          <button onClick={load} className="mt-2 font-semibold" style={{ fontSize: 11, color: 'var(--brand)' }}>Retry</button>
        </div>
      )}

      {!loading && !error && display.length === 0 && (
        <div className="rounded-card px-4 py-10 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No refunds found</div>
        </div>
      )}

      {/* Refund rows */}
      {!loading && !error && display.length > 0 && (
        <div className="rounded-card overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="space-y-2 p-2">
            {pageRows.map(r => {
              const ss = STATUS_STYLE[r.status] ?? { bg: 'var(--bg-subtle)', color: 'var(--text-muted)', label: r.status };
              return (
                <div key={r.refundId} className="card rounded-card px-4 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-bold" style={{ fontSize: 12, color: 'var(--brand)' }}>#{r.orderCode}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>· {r.refundId.slice(0, 8)}…</span>
                      <span className="rounded-pill px-2 py-0.5 font-bold" style={{ fontSize: 9, background: ss.bg, color: ss.color }}>{ss.label}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-primary)' }}>{r.customerName} → {r.merchantName}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {r.reasonCode ?? 'No reason'} · {timeAgo(r.requestedAt)}
                      {r.paymentMethod && ` · ${r.paymentMethod}`}
                    </div>
                  </div>
                  <div className="font-extrabold flex-shrink-0" style={{ fontSize: 14, color: 'var(--text-primary)', minWidth: 120, textAlign: 'right' }}>
                    {Number(r.amount).toLocaleString()} {r.currencyCode}
                  </div>
                  {r.status === 'PENDING' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => handle(r.refundId, 'succeed')} disabled={acting[r.refundId]}
                        className="rounded-lg px-3 py-1.5 font-semibold flex items-center gap-1"
                        style={{ fontSize: 11, background: 'var(--brand)', color: '#fff' }}>
                        {acting[r.refundId] ? <Spinner size={10} /> : 'Approve'}
                      </button>
                      <button onClick={() => handle(r.refundId, 'fail')} disabled={acting[r.refundId]}
                        className="rounded-lg px-3 py-1.5 font-semibold"
                        style={{ fontSize: 11, border: '1px solid var(--danger)', color: 'var(--danger)', background: 'transparent' }}>
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <PaginationBar
            page={safePage} totalPages={totalPages} total={total}
            pageSize={pageSize} from={from} to={to}
            onPage={setPage}
            onPageSize={(v) => { setPageSize(v); setPage(1); }}
          />
        </div>
      )}
    </div>
  );
}
