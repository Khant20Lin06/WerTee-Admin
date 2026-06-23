'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, TrendingUp, ShoppingBag, Star } from 'lucide-react';
import { apiGet, apiPatch } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';
import { StatusBadge } from '@/components/ui/status-badge';
import { Spinner } from '@/components/ui/spinner';

// Matches backend MerchantProfileDto exactly
type Merchant = {
  id: string;
  name: string;
  phone: string;
  supportPhone?: string | null;
  storeType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

const BG_COLORS  = ['#EEF0FF', '#E8FAF2', '#FFF8E8', '#FFF0F0', '#F6F5FF'];
const TEXT_COLORS = ['#5B4FE9', '#16A660', '#D4820A', '#D84040', '#8A88A8'];

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function MerchantCard({ m, onStatusChange }: { m: Merchant; onStatusChange: (id: string, s: string) => void }) {
  const idx = (m.id.charCodeAt(m.id.length - 1) % 5);
  const [acting, setActing] = useState(false);

  async function changeStatus(status: string) {
    setActing(true);
    try {
      await apiPatch(ep.merchantStatus(m.id), { status });
      onStatusChange(m.id, status);
    } catch { } finally { setActing(false); }
  }

  return (
    <div className="rounded-card p-4 flex flex-col gap-3" style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
      {/* Top */}
      <div className="flex items-start gap-2.5">
        <div className="rounded-lg flex items-center justify-center font-extrabold flex-shrink-0"
          style={{ width: 36, height: 36, background: BG_COLORS[idx], color: TEXT_COLORS[idx], fontSize: 13 }}>
          {initials(m.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate" style={{ fontSize: 12, color: '#1A1730' }}>{m.name}</div>
          <div className="truncate capitalize" style={{ fontSize: 10, color: '#8A88A8' }}>{m.storeType}</div>
          <div style={{ fontSize: 10, color: '#8A88A8' }}>{m.phone}</div>
        </div>
        <StatusBadge status={m.status.toLowerCase()} />
      </div>

      {/* Stats — backend doesn't return live stats yet, show joined date */}
      <div className="flex gap-0 border-t pt-3" style={{ borderColor: '#E8E6F8' }}>
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <span className="font-extrabold" style={{ fontSize: 12, color: '#1A1730' }}>
            {new Date(m.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
          </span>
          <span className="uppercase tracking-wider font-semibold" style={{ fontSize: 9, color: '#8A88A8' }}>Joined</span>
        </div>
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <span className="font-extrabold capitalize" style={{ fontSize: 12, color: '#1A1730' }}>{m.storeType}</span>
          <span className="uppercase tracking-wider font-semibold" style={{ fontSize: 9, color: '#8A88A8' }}>Type</span>
        </div>
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <span className="font-extrabold" style={{ fontSize: 12, color: '#1A1730' }}>
            {m.status === 'ACTIVE' ? 'Active' : m.status === 'PENDING' ? 'Pending' : 'Suspended'}
          </span>
          <span className="uppercase tracking-wider font-semibold" style={{ fontSize: 9, color: '#8A88A8' }}>Status</span>
        </div>
      </div>

      {/* Actions */}
      {m.status === 'PENDING' && (
        <button onClick={() => changeStatus('ACTIVE')} disabled={acting}
          className="w-full rounded-lg py-1.5 font-semibold flex justify-center items-center gap-2"
          style={{ background: '#5B4FE9', color: '#fff', fontSize: 11 }}>
          {acting ? <Spinner size={12} /> : 'Approve merchant'}
        </button>
      )}
      {m.status === 'ACTIVE' && (
        <button onClick={() => changeStatus('SUSPENDED')} disabled={acting}
          className="w-full rounded-lg py-1.5 font-semibold"
          style={{ border: '1px solid #D84040', color: '#D84040', fontSize: 11, background: 'transparent' }}>
          {acting ? '…' : 'Suspend'}
        </button>
      )}
      {m.status === 'SUSPENDED' && (
        <button onClick={() => changeStatus('ACTIVE')} disabled={acting}
          className="w-full rounded-lg py-1.5 font-semibold"
          style={{ background: '#E8FAF2', color: '#16A660', fontSize: 11, border: '1px solid #16A66040' }}>
          {acting ? '…' : 'Reactivate'}
        </button>
      )}
    </div>
  );
}

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [status, setStatus]       = useState('all');
  const [search, setSearch]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const p = new URLSearchParams();
    if (status !== 'all') p.set('status', status);
    try {
      // apiClient auto-unwraps envelope → returns Merchant[] directly
      const data = await apiGet<Merchant[]>(`${ep.merchants}?${p}`);
      setMerchants(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load merchants.');
      setMerchants([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  function onStatusChange(id: string, s: string) {
    setMerchants(prev => prev.map(m => m.id === id ? { ...m, status: s } : m));
  }

  const display = merchants.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search)
  );

  const counts = {
    active:    display.filter(m => m.status === 'ACTIVE').length,
    pending:   display.filter(m => m.status === 'PENDING').length,
    suspended: display.filter(m => m.status === 'SUSPENDED').length,
  };

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2 rounded-card px-3 py-2" style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
        <div className="flex items-center gap-1.5 flex-1 rounded-lg px-2.5 py-1.5" style={{ background: '#F6F5FF', border: '1px solid #E8E6F8' }}>
          <Search size={12} style={{ color: '#8A88A8' }} />
          <input placeholder="Search merchants..." className="bg-transparent outline-none flex-1" style={{ fontSize: 11 }}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="rounded-lg px-2 py-1.5 outline-none" style={{ fontSize: 11, background: '#F6F5FF', border: '1px solid #E8E6F8', color: '#4A4770' }}
          value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <button className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-semibold"
          style={{ fontSize: 11, background: '#5B4FE9', color: '#fff' }}>
          <Plus size={12} /> Add merchant
        </button>
      </div>

      {/* Summary */}
      {!loading && !error && (
        <div style={{ fontSize: 12, color: '#4A4770' }}>
          <span className="font-bold" style={{ color: '#16A660' }}>{counts.active} active</span>
          {' · '}
          <span className="font-bold" style={{ color: '#D4820A' }}>{counts.pending} pending</span>
          {' · '}
          <span className="font-bold" style={{ color: '#D84040' }}>{counts.suspended} suspended</span>
        </div>
      )}

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
          <div style={{ fontSize: 13, color: '#8A88A8' }}>No merchants found</div>
        </div>
      )}

      {!loading && !error && display.length > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {display.map(m => <MerchantCard key={m.id} m={m} onStatusChange={onStatusChange} />)}
        </div>
      )}
    </div>
  );
}
