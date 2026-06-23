'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Star } from 'lucide-react';
import { apiGet, apiPatch } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';
import { StatusBadge } from '@/components/ui/status-badge';
import { Spinner } from '@/components/ui/spinner';

// Matches backend RiderProfileDto exactly
type Rider = {
  id: string;
  phone: string;
  displayName: string;
  vehicleType: string;
  currentTownship?: string | null;
  status: string;
  accountStatus: string;
  createdAt: string;
  updatedAt: string;
};

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function RidersPage() {
  const [riders, setRiders]     = useState<Rider[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [status, setStatus]     = useState('all');
  const [search, setSearch]     = useState('');

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

  const counts = {
    active:    display.filter(r => r.status === 'ACTIVE').length,
    pending:   display.filter(r => r.status === 'PENDING').length,
    suspended: display.filter(r => r.status === 'SUSPENDED').length,
  };

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2 rounded-card px-3 py-2" style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
        <div className="flex items-center gap-1.5 flex-1 rounded-lg px-2.5 py-1.5" style={{ background: '#F6F5FF', border: '1px solid #E8E6F8' }}>
          <Search size={12} style={{ color: '#8A88A8' }} />
          <input placeholder="Search riders, zone..." className="bg-transparent outline-none flex-1" style={{ fontSize: 11 }}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="rounded-lg px-2 py-1.5 outline-none" style={{ fontSize: 11, background: '#F6F5FF', border: '1px solid #E8E6F8', color: '#4A4770' }}
          value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <button className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-semibold" style={{ fontSize: 11, background: '#5B4FE9', color: '#fff' }}>
          <Plus size={12} /> Add rider
        </button>
      </div>

      {/* Summary chips */}
      {!loading && !error && (
        <div className="flex gap-2">
          {[
            { label: 'Active',    count: counts.active,    color: '#16A660', bg: '#E8FAF2' },
            { label: 'Pending',   count: counts.pending,   color: '#D4820A', bg: '#FFF8E8' },
            { label: 'Suspended', count: counts.suspended, color: '#D84040', bg: '#FFF0F0' },
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
        <div className="rounded-card px-4 py-3 text-center" style={{ background: '#FFF0F0', border: '1px solid #FFD0D0' }}>
          <div style={{ fontSize: 12, color: '#D84040' }}>{error}</div>
          <button onClick={load} className="mt-2 font-semibold" style={{ fontSize: 11, color: '#5B4FE9' }}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        <div className="rounded-card overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: '#F6F5FF' }}>
                {['Rider', 'Status', 'Zone', 'Vehicle', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider" style={{ fontSize: 9, color: '#8A88A8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {display.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center" style={{ fontSize: 12, color: '#8A88A8' }}>No riders found</td></tr>
              ) : display.map((r, i) => (
                <tr key={r.id} style={{ borderTop: '1px solid #E8E6F8', background: i % 2 === 1 ? '#FAFAFA' : '#fff' }}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
                        style={{ width: 28, height: 28, background: '#EEF0FF', color: '#5B4FE9', fontSize: 10 }}>
                        {initials(r.displayName)}
                      </div>
                      <div>
                        <div className="font-semibold" style={{ fontSize: 11, color: '#1A1730' }}>{r.displayName}</div>
                        <div style={{ fontSize: 10, color: '#8A88A8' }}>{r.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge status={r.status.toLowerCase()} /></td>
                  <td className="px-3 py-2.5">
                    {r.currentTownship
                      ? <span className="rounded-pill px-2 py-0.5 font-semibold" style={{ fontSize: 10, background: '#F6F5FF', color: '#4A4770', border: '1px solid #E8E6F8' }}>{r.currentTownship}</span>
                      : <span style={{ color: '#8A88A8', fontSize: 11 }}>—</span>}
                  </td>
                  <td className="px-3 py-2.5 capitalize" style={{ fontSize: 11, color: '#4A4770' }}>{r.vehicleType}</td>
                  <td className="px-3 py-2.5" style={{ fontSize: 10, color: '#8A88A8' }}>
                    {new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {r.status === 'PENDING' && (
                        <button onClick={() => changeStatus(r.id, 'ACTIVE')}
                          className="rounded px-2 py-0.5 font-semibold" style={{ fontSize: 10, background: '#5B4FE9', color: '#fff' }}>
                          Approve
                        </button>
                      )}
                      {r.status === 'ACTIVE' && (
                        <button onClick={() => changeStatus(r.id, 'SUSPENDED')}
                          className="rounded px-2 py-0.5 font-semibold" style={{ fontSize: 10, border: '1px solid #D84040', color: '#D84040', background: 'transparent' }}>
                          Suspend
                        </button>
                      )}
                      {r.status === 'SUSPENDED' && (
                        <button onClick={() => changeStatus(r.id, 'ACTIVE')}
                          className="rounded px-2 py-0.5 font-semibold" style={{ fontSize: 10, background: '#E8FAF2', color: '#16A660', border: '1px solid #16A66040' }}>
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
