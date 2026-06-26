'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Plus } from 'lucide-react';
import { apiGet, apiPatch } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';
import { StatusBadge } from '@/components/ui/status-badge';
import { Spinner } from '@/components/ui/spinner';
import { PaginationBar } from '@/components/ui/pagination-bar';
import type { Rider } from '@/types/models';
import { initials } from '@/lib/utils/formatters';

export default function RidersPage() {
  const [riders, setRiders]     = useState<Rider[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [status, setStatus]     = useState('all');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const p = new URLSearchParams();
    if (status !== 'all') p.set('status', status);
    try {
      const data = await apiGet<Rider[]>(`${ep.riders}?${p}`);
      setRiders(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load riders.');
      setRiders([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  async function changeStatus(id: string, s: string) {
    try {
      await apiPatch(ep.riderStatus(id), { status: s });
      setRiders(prev => prev.map(r => r.id === id ? { ...r, status: s } : r));
    } catch { }
  }

  const display = riders.filter(r =>
    (status === 'all' || r.status === status) &&
    (!search || r.displayName.toLowerCase().includes(search.toLowerCase()) ||
     r.phone.includes(search) ||
     (r.currentTownship ?? '').toLowerCase().includes(search.toLowerCase()))
  );

  const total      = display.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage   = Math.min(page, totalPages);
  const from       = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to         = Math.min(safePage * pageSize, total);
  const pageRows   = display.slice((safePage - 1) * pageSize, safePage * pageSize);

  const counts = {
    active:    display.filter(r => r.status === 'ACTIVE').length,
    pending:   display.filter(r => r.status === 'PENDING').length,
    suspended: display.filter(r => r.status === 'SUSPENDED').length,
  };

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2 rounded-card px-3 py-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1.5 flex-1 rounded-lg px-2.5 py-1.5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          <Search size={12} style={{ color: 'var(--text-muted)' }} />
          <input placeholder="Search riders, zone..." className="bg-transparent outline-none flex-1" style={{ fontSize: 11 }}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="rounded-lg px-2 py-1.5 outline-none" style={{ fontSize: 11, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="all">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <button className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-semibold" style={{ fontSize: 11, background: 'var(--brand)', color: '#fff' }}>
          <Plus size={12} /> Add rider
        </button>
      </div>

      {/* Summary chips */}
      {!loading && !error && (
        <div className="flex gap-2">
          {[
            { label: 'Active',    count: counts.active,    color: 'var(--success)', bg: 'var(--success-bg)' },
            { label: 'Pending',   count: counts.pending,   color: 'var(--warning)', bg: 'var(--warning-bg)' },
            { label: 'Suspended', count: counts.suspended, color: 'var(--danger)',  bg: 'var(--danger-bg)' },
          ].map(c => (
            <span key={c.label} className="rounded-pill px-3 py-1 font-bold"
              style={{ fontSize: 11, background: c.bg, color: c.color, border: `1px solid ${c.color}30` }}>
              {c.label} <span className="ml-1">{c.count}</span>
            </span>
          ))}
        </div>
      )}

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
                {['Rider', 'Status', 'Zone', 'Vehicle', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center" style={{ fontSize: 12, color: 'var(--text-muted)' }}>No riders found</td></tr>
              ) : pageRows.map((r, i) => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 1 ? 'var(--bg-subtle)' : 'var(--bg-card)' }}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
                        style={{ width: 28, height: 28, background: 'var(--brand-muted)', color: 'var(--brand)', fontSize: 10 }}>
                        {initials(r.displayName)}
                      </div>
                      <div>
                        <div className="font-semibold" style={{ fontSize: 11, color: 'var(--text-primary)' }}>{r.displayName}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge status={r.status.toLowerCase()} /></td>
                  <td className="px-3 py-2.5">
                    {r.currentTownship
                      ? <span className="rounded-pill px-2 py-0.5 font-semibold" style={{ fontSize: 10, background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{r.currentTownship}</span>
                      : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                  </td>
                  <td className="px-3 py-2.5 capitalize" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.vehicleType}</td>
                  <td className="px-3 py-2.5" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {r.status === 'PENDING' && (
                        <button onClick={() => changeStatus(r.id, 'ACTIVE')}
                          className="rounded px-2 py-0.5 font-semibold" style={{ fontSize: 10, background: 'var(--brand)', color: '#fff' }}>
                          Approve
                        </button>
                      )}
                      {r.status === 'ACTIVE' && (
                        <button onClick={() => changeStatus(r.id, 'SUSPENDED')}
                          className="rounded px-2 py-0.5 font-semibold" style={{ fontSize: 10, border: '1px solid var(--danger)', color: 'var(--danger)', background: 'transparent' }}>
                          Suspend
                        </button>
                      )}
                      {r.status === 'SUSPENDED' && (
                        <button onClick={() => changeStatus(r.id, 'ACTIVE')}
                          className="rounded px-2 py-0.5 font-semibold" style={{ fontSize: 10, background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid #16A66040' }}>
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
    </div>
  );
}
