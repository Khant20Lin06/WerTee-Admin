'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Plus } from 'lucide-react';
import { apiGet, apiPatch } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';
import { StatusBadge } from '@/components/ui/status-badge';
import { Spinner } from '@/components/ui/spinner';
import { PaginationBar } from '@/components/ui/pagination-bar';
import type { Merchant } from '@/types/models';
import { initials } from '@/lib/utils/formatters';

const AVATAR_BG   = ['var(--brand-muted)', 'var(--success-bg)', 'var(--warning-bg)', 'var(--danger-bg)', 'var(--bg-subtle)'];
const AVATAR_TEXT = ['var(--brand)',        'var(--success)',    'var(--warning)',     'var(--danger)',    'var(--text-muted)'];

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
    <div className="rounded-card p-4 flex flex-col gap-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {/* Top */}
      <div className="flex items-start gap-2.5">
        <div className="rounded-lg flex items-center justify-center font-extrabold flex-shrink-0"
          style={{ width: 36, height: 36, background: AVATAR_BG[idx], color: AVATAR_TEXT[idx], fontSize: 13 }}>
          {initials(m.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate" style={{ fontSize: 12, color: 'var(--text-primary)' }}>{m.name}</div>
          <div className="truncate capitalize" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.storeType}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.phone}</div>
        </div>
        <StatusBadge status={m.status.toLowerCase()} />
      </div>

      {/* Stats */}
      <div className="flex gap-0 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <span className="font-extrabold" style={{ fontSize: 12, color: 'var(--text-primary)' }}>
            {new Date(m.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
          </span>
          <span className="uppercase tracking-wider font-semibold" style={{ fontSize: 9, color: 'var(--text-muted)' }}>Joined</span>
        </div>
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <span className="font-extrabold capitalize" style={{ fontSize: 12, color: 'var(--text-primary)' }}>{m.storeType}</span>
          <span className="uppercase tracking-wider font-semibold" style={{ fontSize: 9, color: 'var(--text-muted)' }}>Type</span>
        </div>
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <span className="font-extrabold" style={{ fontSize: 12, color: 'var(--text-primary)' }}>
            {m.status === 'ACTIVE' ? 'Active' : m.status === 'PENDING' ? 'Pending' : 'Suspended'}
          </span>
          <span className="uppercase tracking-wider font-semibold" style={{ fontSize: 9, color: 'var(--text-muted)' }}>Status</span>
        </div>
      </div>

      {/* Actions */}
      {m.status === 'PENDING' && (
        <button onClick={() => changeStatus('ACTIVE')} disabled={acting}
          className="w-full rounded-lg py-1.5 font-semibold flex justify-center items-center gap-2"
          style={{ background: 'var(--brand)', color: '#fff', fontSize: 11 }}>
          {acting ? <Spinner size={12} /> : 'Approve merchant'}
        </button>
      )}
      {m.status === 'ACTIVE' && (
        <button onClick={() => changeStatus('SUSPENDED')} disabled={acting}
          className="w-full rounded-lg py-1.5 font-semibold"
          style={{ border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 11, background: 'transparent' }}>
          {acting ? '…' : 'Suspend'}
        </button>
      )}
      {m.status === 'SUSPENDED' && (
        <button onClick={() => changeStatus('ACTIVE')} disabled={acting}
          className="w-full rounded-lg py-1.5 font-semibold"
          style={{ background: 'var(--success-bg)', color: 'var(--success)', fontSize: 11, border: '1px solid var(--success)' }}>
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
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const p = new URLSearchParams();
    if (status !== 'all') p.set('status', status);
    try {
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

  const total      = display.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage   = Math.min(page, totalPages);
  const from       = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to         = Math.min(safePage * pageSize, total);
  const pageRows   = display.slice((safePage - 1) * pageSize, safePage * pageSize);

  const counts = {
    active:    display.filter(m => m.status === 'ACTIVE').length,
    pending:   display.filter(m => m.status === 'PENDING').length,
    suspended: display.filter(m => m.status === 'SUSPENDED').length,
  };

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2 rounded-card px-3 py-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1.5 flex-1 rounded-lg px-2.5 py-1.5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          <Search size={12} style={{ color: 'var(--text-muted)' }} />
          <input placeholder="Search merchants..." className="bg-transparent outline-none flex-1"
            style={{ fontSize: 11, color: 'var(--text-primary)' }}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="rounded-lg px-2 py-1.5 outline-none"
          style={{ fontSize: 11, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="all">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <button className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-semibold"
          style={{ fontSize: 11, background: 'var(--brand)', color: '#fff' }}>
          <Plus size={12} /> Add merchant
        </button>
      </div>

      {/* Summary */}
      {!loading && !error && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          <span className="font-bold" style={{ color: 'var(--success)' }}>{counts.active} active</span>
          {' · '}
          <span className="font-bold" style={{ color: 'var(--warning)' }}>{counts.pending} pending</span>
          {' · '}
          <span className="font-bold" style={{ color: 'var(--danger)' }}>{counts.suspended} suspended</span>
        </div>
      )}

      {/* States */}
      {loading && <div className="flex justify-center py-12"><Spinner /></div>}

      {!loading && error && (
        <div className="rounded-card px-4 py-3 text-center" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)' }}>
          <div style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</div>
          <button onClick={load} className="mt-2 font-semibold" style={{ fontSize: 11, color: 'var(--brand)' }}>Retry</button>
        </div>
      )}

      {!loading && !error && display.length === 0 && (
        <div className="rounded-card px-4 py-10 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No merchants found</div>
        </div>
      )}

      {!loading && !error && display.length > 0 && (
        <div className="rounded-card overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="grid gap-3 p-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {pageRows.map(m => <MerchantCard key={m.id} m={m} onStatusChange={onStatusChange} />)}
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
