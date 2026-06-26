'use client';

import { useEffect, useState, useCallback } from 'react';
import { CreditCard, TrendingUp, CheckCircle, AlertCircle, Search, X, ChevronDown } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';
import { StatusBadge } from '@/components/ui/status-badge';
import { Spinner } from '@/components/ui/spinner';
import { PaginationBar } from '@/components/ui/pagination-bar';
import type { Payment, PaymentWithOrder, OrderSummary } from '@/types/models';
import { timeAgo } from '@/lib/utils/formatters';

const METHOD_COLOR: Record<string, { bg: string; color: string }> = {
  KBZPAY:  { bg: 'var(--brand-muted)', color: 'var(--brand)' },
  WAVEPAY: { bg: 'var(--warning-bg)',  color: 'var(--warning)' },
  CBPAY:   { bg: 'var(--success-bg)',  color: 'var(--success)' },
  AYAPAY:  { bg: 'var(--danger-bg)',   color: 'var(--danger)' },
  CASH:    { bg: 'var(--bg-subtle)',   color: 'var(--text-muted)' },
  STRIPE:  { bg: 'var(--brand-muted)', color: 'var(--brand)' },
  MANUAL:  { bg: 'var(--bg-subtle)',   color: 'var(--text-muted)' },
};

function methodStyle(method: string) {
  return METHOD_COLOR[method?.toUpperCase()] ?? { bg: 'var(--bg-subtle)', color: 'var(--text-secondary)' };
}

// ─── Payment Detail Panel ─────────────────────────────────────────────────────

function PaymentPanel({ payment, onClose, onAction }: {
  payment: PaymentWithOrder;
  onClose: () => void;
  onAction: (updated: PaymentWithOrder) => void;
}) {
  const [acting, setActing] = useState<string | null>(null);

  async function doAction(action: 'confirm' | 'fail' | 'cancel') {
    setActing(action);
    try {
      const endpoint = action === 'confirm' ? ep.paymentConfirm(payment.paymentId)
        : action === 'fail' ? ep.paymentFail(payment.paymentId)
        : ep.paymentCancel(payment.paymentId);
      const updated = await apiPost<Payment>(endpoint);
      onAction({ ...payment, ...updated });
    } catch { /* keep state */ }
    finally { setActing(null); }
  }

  const m = methodStyle(payment.method);
  const refundedAmt = Number(payment.refundedAmount);

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex flex-col"
      style={{ width: 420, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="font-extrabold" style={{ fontSize: 14, color: 'var(--text-primary)' }}>Payment #{payment.orderCode}</span>
          <StatusBadge status={payment.status.toLowerCase()} />
        </div>
        <button onClick={onClose}><X size={15} style={{ color: 'var(--text-muted)' }} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Order info */}
        <div className="rounded-card p-3" style={{ background: 'var(--bg-subtle)' }}>
          <div className="uppercase font-semibold mb-2" style={{ fontSize: 9, color: 'var(--text-muted)' }}>Order</div>
          <div className="font-bold" style={{ fontSize: 12, color: 'var(--text-primary)' }}>#{payment.orderCode}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{payment.customerName} → {payment.merchantName}</div>
        </div>

        {/* Payment details */}
        <div className="rounded-card p-3 space-y-2" style={{ background: 'var(--bg-subtle)' }}>
          <div className="uppercase font-semibold mb-1" style={{ fontSize: 9, color: 'var(--text-muted)' }}>Payment details</div>
          {[
            { label: 'Method', val: <span className="rounded-pill px-2 py-0.5 font-semibold" style={{ fontSize: 10, background: m.bg, color: m.color }}>{payment.method}</span> },
            { label: 'Provider', val: payment.provider },
            { label: 'Amount', val: `${Number(payment.amount).toLocaleString()} ${payment.currencyCode}` },
            { label: 'Refunded', val: refundedAmt > 0 ? `${refundedAmt.toLocaleString()} ${payment.currencyCode}` : '—' },
            { label: 'Reference', val: payment.providerReference ?? '—' },
            { label: 'Created', val: timeAgo(payment.createdAt) },
          ].map(row => (
            <div key={row.label} className="flex justify-between items-center">
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{row.label}</span>
              <span style={{ fontSize: 11, color: 'var(--text-primary)' }}>{row.val}</span>
            </div>
          ))}
          {payment.failureMessage && (
            <div className="rounded-lg px-2 py-2 mt-2" style={{ background: 'var(--danger-bg)', border: '1px solid #FFD0D0' }}>
              <div style={{ fontSize: 10, color: 'var(--danger)' }}>{payment.failureCode}: {payment.failureMessage}</div>
            </div>
          )}
        </div>

        {/* Refunds */}
        {payment.refunds.length > 0 && (
          <div>
            <div className="font-bold mb-2" style={{ fontSize: 12, color: 'var(--text-primary)' }}>Refunds ({payment.refunds.length})</div>
            {payment.refunds.map(r => (
              <div key={r.refundId} className="flex items-center justify-between py-1.5" style={{ borderTop: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{r.reasonCode ?? 'No reason'} · {timeAgo(r.requestedAt)}</div>
                  <StatusBadge status={r.status.toLowerCase()} />
                </div>
                <span className="font-bold" style={{ fontSize: 11 }}>{Number(r.amount).toLocaleString()} {r.currencyCode}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {['PENDING', 'REQUIRES_ACTION'].includes(payment.status) && (
        <div className="px-5 py-3.5 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
          <button onClick={() => doAction('confirm')} disabled={!!acting}
            className="flex-1 rounded-card py-2 font-semibold flex justify-center items-center gap-1"
            style={{ background: 'var(--brand)', color: '#fff', fontSize: 12 }}>
            {acting === 'confirm' ? <Spinner size={12} /> : 'Confirm'}
          </button>
          <button onClick={() => doAction('fail')} disabled={!!acting}
            className="flex-1 rounded-card py-2 font-semibold flex justify-center items-center gap-1"
            style={{ border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 12, background: 'transparent' }}>
            {acting === 'fail' ? <Spinner size={12} /> : 'Mark failed'}
          </button>
          <button onClick={() => doAction('cancel')} disabled={!!acting}
            className="rounded-card px-3 py-2 font-semibold flex justify-center items-center"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, background: 'var(--bg-subtle)' }}>
            {acting === 'cancel' ? <Spinner size={12} /> : 'Cancel'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentWithOrder[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all');
  const [selected, setSelected] = useState<PaymentWithOrder | null>(null);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const orders = await apiGet<OrderSummary[]>(`${ep.orders}?limit=50`);
      const orderList = Array.isArray(orders) ? orders : [];

      const results = await Promise.allSettled(
        orderList.slice(0, 25).map(o =>
          apiGet<Payment[]>(ep.orderPayments(o.orderId)).then(pList =>
            (Array.isArray(pList) ? pList : []).map(p => ({
              ...p,
              orderCode: o.orderCode,
              customerName: o.customer.fullName ?? o.customer.phone,
              merchantName: o.branch.merchantName,
            }))
          )
        )
      );

      const all: PaymentWithOrder[] = results
        .filter((r): r is PromiseFulfilledResult<PaymentWithOrder[]> => r.status === 'fulfilled')
        .flatMap(r => r.value);

      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPayments(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payments.');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const display = payments.filter(p =>
    (filter === 'all' || p.status === filter) &&
    (!search || p.orderCode.toLowerCase().includes(search.toLowerCase()) ||
     p.customerName.toLowerCase().includes(search.toLowerCase()) ||
     p.merchantName.toLowerCase().includes(search.toLowerCase()))
  );

  const total      = display.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage   = Math.min(page, totalPages);
  const from       = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to         = Math.min(safePage * pageSize, total);
  const pageRows   = display.slice((safePage - 1) * pageSize, safePage * pageSize);

  const totalRevenue = payments.filter(p => p.status === 'SUCCEEDED').reduce((s, p) => s + Number(p.amount), 0);
  const succeeded = payments.filter(p => p.status === 'SUCCEEDED').length;
  const failed    = payments.filter(p => p.status === 'FAILED').length;
  const refunded  = payments.filter(p => Number(p.refundedAmount) > 0).length;

  return (
    <div className="space-y-3">
      {/* KPI tiles */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: TrendingUp,  label: 'Total revenue', val: loading ? '…' : (totalRevenue / 1000000).toFixed(2) + 'M MMK', color: 'var(--brand)' },
          { icon: CheckCircle, label: 'Succeeded',     val: loading ? '…' : String(succeeded),  color: 'var(--success)' },
          { icon: AlertCircle, label: 'Failed',        val: loading ? '…' : String(failed),      color: 'var(--danger)' },
          { icon: CreditCard,  label: 'Refunded',      val: loading ? '…' : String(refunded),    color: 'var(--warning)' },
        ].map(k => (
          <div key={k.label} className="card rounded-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <k.icon size={14} style={{ color: k.color }} />
              <span className="font-semibold uppercase tracking-wider" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{k.label}</span>
            </div>
            <div className="font-extrabold" style={{ fontSize: 20, color: 'var(--text-primary)' }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 rounded-card px-3 py-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1.5 flex-1 rounded-lg px-2.5 py-1.5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          <Search size={12} style={{ color: 'var(--text-muted)' }} />
          <input placeholder="Search order code, customer, merchant…" className="bg-transparent outline-none flex-1" style={{ fontSize: 11 }}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="rounded-lg px-2 py-1.5 outline-none" style={{ fontSize: 11, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
          <option value="all">All</option>
          <option value="SUCCEEDED">Succeeded</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REQUIRES_ACTION">Requires action</option>
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

      {!loading && !error && (
        <div className="rounded-card overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                {['Order', 'Customer', 'Merchant', 'Method', 'Amount', 'Status', 'Time', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center" style={{ fontSize: 12, color: 'var(--text-muted)' }}>No payments found</td></tr>
              ) : pageRows.map((p, i) => {
                const m = methodStyle(p.method);
                return (
                  <tr key={p.paymentId} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 1 ? 'var(--bg-subtle)' : 'var(--bg-card)' }}>
                    <td className="px-3 py-2.5 font-semibold" style={{ fontSize: 11, color: 'var(--brand)' }}>#{p.orderCode}</td>
                    <td className="px-3 py-2.5" style={{ fontSize: 11, color: 'var(--text-primary)' }}>{p.customerName}</td>
                    <td className="px-3 py-2.5" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p.merchantName}</td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-pill px-2 py-0.5 font-semibold" style={{ fontSize: 10, background: m.bg, color: m.color }}>{p.method}</span>
                    </td>
                    <td className="px-3 py-2.5 font-bold" style={{ fontSize: 11 }}>{Number(p.amount).toLocaleString()} {p.currencyCode}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={p.status.toLowerCase()} /></td>
                    <td className="px-3 py-2.5" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{timeAgo(p.createdAt)}</td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => setSelected(p)}>
                        <ChevronDown size={13} style={{ color: 'var(--brand)' }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <PaginationBar
            page={safePage} totalPages={totalPages} total={total}
            pageSize={pageSize} from={from} to={to}
            onPage={setPage}
            onPageSize={(v) => { setPageSize(v); setPage(1); }}
          />
        </div>
      )}

      {selected && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(21,18,43,0.28)' }} onClick={() => setSelected(null)} />
          <PaymentPanel payment={selected} onClose={() => setSelected(null)}
            onAction={updated => {
              setPayments(prev => prev.map(p => p.paymentId === updated.paymentId ? updated : p));
              setSelected(updated);
            }} />
        </>
      )}
    </div>
  );
}
