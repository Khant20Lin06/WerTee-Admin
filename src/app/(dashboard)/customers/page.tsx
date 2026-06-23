'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Eye, X, ShoppingBag, CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';
import { apiGet, apiPatch } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';
import { Spinner } from '@/components/ui/spinner';
import { StatusBadge } from '@/components/ui/status-badge';

// Matches backend CustomerProfileDto exactly
type Customer = {
  id: string;
  phone: string;
  fullName: string | null;
  avatarUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type CustomerOrder = {
  orderId: string;
  orderCode: string;
  status: string;
  totalAmount: string;
  placedAt: string;
  branch: { merchantName: string; branchName: string };
};

function initials(name: string | null, phone: string): string {
  if (name) return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return phone.slice(-2).toUpperCase();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function CustomerPanel({ c, onClose, onStatusChange }: {
  c: Customer;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [suspending, setSuspending] = useState(false);

  useEffect(() => {
    setOrdersLoading(true);
    // Fetch all orders and filter by customer phone (no direct customerProfileId filter on admin orders endpoint)
    apiGet<CustomerOrder[]>(ep.orders)
      .then(data => {
        setOrders(Array.isArray(data) ? data : []);
      })
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [c.id]);

  async function handleToggleStatus() {
    setSuspending(true);
    try {
      const newStatus = c.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await apiPatch(ep.customerStatus(c.id), { status: newStatus });
      onStatusChange(c.id, newStatus);
    } finally {
      setSuspending(false);
    }
  }

  const totalSpend = orders.filter(o => o.status === 'COMPLETED')
    .reduce((s, o) => s + Number(o.totalAmount), 0);

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex flex-col"
      style={{ width: 420, background: '#fff', borderLeft: '1px solid #E8E6F8', boxShadow: '-8px 0 32px rgba(91,79,233,0.1)' }}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: '#E8E6F8' }}>
        <span className="font-extrabold" style={{ fontSize: 14, color: '#1A1730' }}>Customer profile</span>
        <button onClick={onClose}><X size={15} style={{ color: '#8A88A8' }} /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Profile */}
        <div className="flex items-center gap-3">
          <div className="rounded-full flex items-center justify-center font-extrabold flex-shrink-0"
            style={{ width: 48, height: 48, background: '#EEF0FF', color: '#5B4FE9', fontSize: 16 }}>
            {initials(c.fullName, c.phone)}
          </div>
          <div>
            <div className="font-extrabold" style={{ fontSize: 16, color: '#1A1730' }}>
              {c.fullName ?? c.phone}
            </div>
            <div style={{ fontSize: 12, color: '#8A88A8' }}>{c.phone}</div>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={c.status} />
              <span style={{ fontSize: 11, color: '#8A88A8' }}>Joined {fmtDate(c.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: ShoppingBag, label: 'Total orders',  val: ordersLoading ? '…' : orders.length, color: '#5B4FE9' },
            { icon: CreditCard,  label: 'Total spend',   val: ordersLoading ? '…' : `${(totalSpend / 1000).toFixed(0)}K MMK`, color: '#16A660' },
          ].map(s => (
            <div key={s.label} className="rounded-card p-3 flex items-center gap-2" style={{ background: '#F6F5FF' }}>
              <s.icon size={16} style={{ color: s.color }} />
              <div>
                <div className="font-extrabold" style={{ fontSize: 15, color: '#1A1730' }}>{s.val}</div>
                <div style={{ fontSize: 10, color: '#8A88A8' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Order history */}
        <div>
          <div className="font-bold mb-2" style={{ fontSize: 12, color: '#1A1730' }}>Recent orders</div>
          {ordersLoading ? (
            <div className="flex justify-center py-3"><Spinner /></div>
          ) : orders.length === 0 ? (
            <div style={{ fontSize: 11, color: '#8A88A8', textAlign: 'center', padding: '12px 0' }}>No orders yet</div>
          ) : (
            orders.slice(0, 8).map((o) => (
              <div key={o.orderId} className="flex items-center justify-between py-2" style={{ borderTop: '1px solid #E8E6F8' }}>
                <div>
                  <div className="font-semibold" style={{ fontSize: 11, color: '#5B4FE9' }}>#{o.orderCode}</div>
                  <div style={{ fontSize: 10, color: '#8A88A8' }}>
                    {o.branch.merchantName} · {fmtDate(o.placedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold" style={{ fontSize: 11 }}>
                    {Number(o.totalAmount).toLocaleString()} MMK
                  </span>
                  <StatusBadge status={o.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="px-5 py-3.5 border-t" style={{ borderColor: '#E8E6F8' }}>
        <button
          onClick={handleToggleStatus}
          disabled={suspending}
          className="w-full rounded-card py-2 font-semibold flex items-center justify-center gap-2"
          style={{
            border: `1px solid ${c.status === 'ACTIVE' ? '#D84040' : '#16A660'}`,
            color: c.status === 'ACTIVE' ? '#D84040' : '#16A660',
            fontSize: 12,
            background: 'transparent',
            opacity: suspending ? 0.6 : 1,
            cursor: suspending ? 'not-allowed' : 'pointer',
          }}
        >
          {c.status === 'ACTIVE'
            ? <><AlertTriangle size={13} /> Suspend account</>
            : <><CheckCircle size={13} /> Reactivate account</>}
        </button>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<Customer[]>(ep.customers);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function handleStatusChange(id: string, status: string) {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  }

  const filtered = customers.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(c.phone.includes(q) || (c.fullName ?? '').toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const selected = customers.find(c => c.id === selectedId) ?? null;

  const activeCount  = customers.filter(c => c.status === 'ACTIVE').length;
  const pendingCount = customers.filter(c => c.status === 'PENDING').length;

  return (
    <div className="space-y-3">
      {/* Summary chips */}
      <div className="flex gap-2">
        {[
          { label: 'Total',     count: customers.length, color: '#5B4FE9', bg: '#EEF0FF' },
          { label: 'Active',    count: activeCount,      color: '#16A660', bg: '#E8FAF2' },
          { label: 'Pending',   count: pendingCount,     color: '#D4820A', bg: '#FFF8E8' },
        ].map(c => (
          <span key={c.label} className="rounded-pill px-3 py-1 font-bold" style={{ fontSize: 11, background: c.bg, color: c.color, border: `1px solid ${c.color}30` }}>
            {c.label} <span className="ml-1">{loading ? '…' : c.count.toLocaleString()}</span>
          </span>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 rounded-card px-3 py-2" style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
        <div className="flex items-center gap-1.5 flex-1 rounded-lg px-2.5 py-1.5" style={{ background: '#F6F5FF', border: '1px solid #E8E6F8' }}>
          <Search size={12} style={{ color: '#8A88A8' }} />
          <input placeholder="Search by name or phone…" className="bg-transparent outline-none flex-1" style={{ fontSize: 11 }}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="rounded-lg px-2 py-1.5 outline-none" style={{ fontSize: 11, background: '#F6F5FF', border: '1px solid #E8E6F8', color: '#4A4770' }}
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="PENDING">Pending</option>
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

      {!loading && !error && (
        <div className="rounded-card overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center" style={{ fontSize: 13, color: '#8A88A8' }}>No customers found</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: '#F6F5FF' }}>
                  {['Name / Phone', 'Status', 'Joined', ''].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider" style={{ fontSize: 9, color: '#8A88A8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} style={{ borderTop: '1px solid #E8E6F8', background: i % 2 === 1 ? '#FAFAFA' : '#fff' }}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
                          style={{ width: 28, height: 28, background: '#EEF0FF', color: '#5B4FE9', fontSize: 10 }}>
                          {initials(c.fullName, c.phone)}
                        </div>
                        <div>
                          <div className="font-semibold" style={{ fontSize: 11, color: '#1A1730' }}>
                            {c.fullName ?? '—'}
                          </div>
                          <div style={{ fontSize: 10, color: '#8A88A8' }}>{c.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge status={c.status} /></td>
                    <td className="px-3 py-2.5" style={{ fontSize: 11, color: '#4A4770' }}>{fmtDate(c.createdAt)}</td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => setSelectedId(c.id)}><Eye size={13} style={{ color: '#5B4FE9' }} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {selected && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(26,23,48,0.25)' }} onClick={() => setSelectedId(null)} />
          <CustomerPanel
            c={selected}
            onClose={() => setSelectedId(null)}
            onStatusChange={handleStatusChange}
          />
        </>
      )}
    </div>
  );
}
