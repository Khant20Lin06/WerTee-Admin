'use client';

import { useEffect, useState, useCallback } from 'react';
import { MapPin, Plus, Edit2, X, Save, Search } from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';
import { Spinner } from '@/components/ui/spinner';
import { PaginationBar } from '@/components/ui/pagination-bar';

// Matches backend ZoneDto exactly
type Zone = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  branchCount?: number;
  createdAt: string;
  updatedAt: string;
};

const STATUS_OPTS = ['ACTIVE', 'INACTIVE'];

// ─── Zone Form Modal ──────────────────────────────────────────────────────────

function ZoneModal({
  zone,
  onClose,
  onSaved,
}: {
  zone: Zone | null;
  onClose: () => void;
  onSaved: (z: Zone) => void;
}) {
  const [code, setCode]         = useState(zone?.code ?? '');
  const [name, setName]         = useState(zone?.name ?? '');
  const [description, setDesc]  = useState(zone?.description ?? '');
  const [status, setStatus]     = useState(zone?.status ?? 'ACTIVE');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  async function submit() {
    if (!code.trim() || !name.trim()) { setError('Code and name are required.'); return; }
    setSaving(true);
    setError('');
    try {
      let saved: Zone;
      if (zone) {
        saved = await apiPatch<Zone>(ep.zone(zone.id), { name, description: description || null, status });
      } else {
        saved = await apiPost<Zone>(ep.zones, { code, name, description: description || null, status });
      }
      onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save zone.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="rounded-card p-6 w-full" style={{ maxWidth: 440, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between mb-5">
          <span className="font-extrabold" style={{ fontSize: 14, color: 'var(--text-primary)' }}>{zone ? 'Edit zone' : 'New zone'}</span>
          <button onClick={onClose}><X size={15} style={{ color: 'var(--text-muted)' }} /></button>
        </div>

        <div className="space-y-3">
          {!zone && (
            <div>
              <label className="block mb-1 font-semibold" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Zone code</label>
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. ZONE_A" maxLength={20}
                className="w-full rounded-lg px-3 py-2 outline-none"
                style={{ fontSize: 12, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'monospace' }} />
            </div>
          )}
          <div>
            <label className="block mb-1 font-semibold" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Zone A — Central Yangon"
              className="w-full rounded-lg px-3 py-2 outline-none"
              style={{ fontSize: 12, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="block mb-1 font-semibold" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Description</label>
            <textarea value={description} onChange={e => setDesc(e.target.value)} placeholder="Optional description…"
              rows={2} className="w-full rounded-lg px-3 py-2 outline-none resize-none"
              style={{ fontSize: 12, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="block mb-1 font-semibold" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full rounded-lg px-3 py-2 outline-none"
              style={{ fontSize: 12, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {error && <div style={{ fontSize: 11, color: 'var(--danger)' }}>{error}</div>}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 rounded-lg py-2 font-semibold"
              style={{ fontSize: 12, border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-subtle)' }}>
              Cancel
            </button>
            <button onClick={submit} disabled={saving}
              className="flex-1 rounded-lg py-2 font-semibold flex items-center justify-center gap-2"
              style={{ fontSize: 12, background: 'var(--brand)', color: '#fff', opacity: saving ? 0.7 : 1 }}>
              {saving ? <Spinner size={12} /> : <Save size={12} />}
              {zone ? 'Save changes' : 'Create zone'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ZonesPage() {
  const [zones, setZones]       = useState<Zone[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [modalZone, setModalZone] = useState<Zone | null | undefined>(undefined);
  const [acting, setActing]     = useState<Record<string, boolean>>({});
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<Zone[]>(ep.zones);
      setZones(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load zones.');
      setZones([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function onSaved(z: Zone) {
    setZones(prev => {
      const idx = prev.findIndex(x => x.id === z.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = z; return next; }
      return [z, ...prev];
    });
    setModalZone(undefined);
  }

  async function toggleStatus(zone: Zone) {
    const newStatus = zone.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setActing(a => ({ ...a, [zone.id]: true }));
    try {
      const updated = await apiPatch<Zone>(ep.zone(zone.id), { status: newStatus });
      setZones(prev => prev.map(z => z.id === updated.id ? updated : z));
    } catch { /* keep state */ }
    finally {
      setActing(a => ({ ...a, [zone.id]: false }));
    }
  }

  const filtered   = zones.filter(z =>
    !search || z.name.toLowerCase().includes(search.toLowerCase()) || z.code.toLowerCase().includes(search.toLowerCase()),
  );
  const total      = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage   = Math.min(page, totalPages);
  const from       = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to         = Math.min(safePage * pageSize, total);
  const pageRows   = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const dotCount = 160;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <Search size={12} style={{ color: 'var(--text-muted)' }} />
          <input placeholder="Search zones…" className="bg-transparent outline-none" style={{ fontSize: 11, width: 160, color: 'var(--text-primary)' }}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <button onClick={() => setModalZone(null)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-semibold"
          style={{ fontSize: 11, background: 'var(--brand)', color: '#fff' }}>
          <Plus size={12} /> New zone
        </button>
      </div>

      {/* Coverage map visual */}
      <div className="rounded-card p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={14} style={{ color: 'var(--brand)' }} />
          <span className="font-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>Coverage map</span>
          {!loading && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {zones.filter(z => z.status === 'ACTIVE').length} active zones</span>
          )}
        </div>
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-subtle)', minHeight: 120 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(20, 1fr)', gap: 5 }}>
            {Array.from({ length: dotCount }).map((_, i) => {
              const active = i % 3 !== 0;
              return (
                <div key={i} className="rounded-full" style={{
                  width: 7, height: 7,
                  background: active ? 'var(--brand)' : 'var(--brand-border)',
                  opacity: active ? (0.3 + (i % 7) * 0.1) : 0.3,
                }} />
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3">
            {[{ label: 'Active zone', color: 'var(--brand)' }, { label: 'Inactive', color: 'var(--brand-border)' }].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="rounded-full" style={{ width: 8, height: 8, background: l.color }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* States */}
      {loading && <div className="flex justify-center py-8"><Spinner /></div>}

      {!loading && error && (
        <div className="rounded-card px-4 py-3 text-center" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)' }}>
          <div style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</div>
          <button onClick={load} className="mt-2 font-semibold" style={{ fontSize: 11, color: 'var(--brand)' }}>Retry</button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-card px-4 py-10 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No zones created yet</div>
          <button onClick={() => setModalZone(null)} className="mt-2 font-semibold" style={{ fontSize: 11, color: 'var(--brand)' }}>Create first zone</button>
        </div>
      )}

      {/* Zone rows */}
      {!loading && !error && pageRows.length > 0 && (
        <div className="rounded-card overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {pageRows.map(z => (
          <div key={z.id} className="px-4 py-3 flex items-center gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ width: 36, height: 36, background: z.status === 'ACTIVE' ? 'var(--brand-muted)' : 'var(--bg-subtle)' }}>
            <MapPin size={16} style={{ color: z.status === 'ACTIVE' ? 'var(--brand)' : 'var(--text-muted)' }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold" style={{ fontSize: 12, color: 'var(--text-primary)' }}>{z.name}</span>
              <code className="font-mono rounded px-1.5 py-0.5" style={{ fontSize: 9, background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{z.code}</code>
              <span className="rounded-pill px-2 py-0.5 font-semibold"
                style={{ fontSize: 9, background: z.status === 'ACTIVE' ? 'var(--success-bg)' : 'var(--bg-subtle)', color: z.status === 'ACTIVE' ? 'var(--success)' : 'var(--text-muted)' }}>
                {z.status}
              </span>
            </div>
            {z.description && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{z.description}</div>}
            {z.branchCount !== undefined && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{z.branchCount} branch{z.branchCount !== 1 ? 'es' : ''}</div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Updated {new Date(z.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </div>
            <button onClick={() => setModalZone(z)} className="p-1.5 rounded-lg" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <Edit2 size={11} style={{ color: 'var(--text-secondary)' }} />
            </button>
            <button onClick={() => toggleStatus(z)} disabled={acting[z.id]}
              className="rounded-lg px-2.5 py-1 font-semibold flex items-center gap-1"
              style={{ fontSize: 10, background: z.status === 'ACTIVE' ? 'var(--danger-bg)' : 'var(--success-bg)', color: z.status === 'ACTIVE' ? 'var(--danger)' : 'var(--success)', border: '1px solid', borderColor: z.status === 'ACTIVE' ? 'var(--danger)' : 'var(--success)' }}>
              {acting[z.id] ? <Spinner size={9} /> : (z.status === 'ACTIVE' ? 'Deactivate' : 'Activate')}
            </button>
          </div>
          </div>
        ))}
        <PaginationBar
          page={safePage} totalPages={totalPages} total={total}
          pageSize={pageSize} from={from} to={to}
          onPage={setPage}
          onPageSize={(v) => { setPageSize(v); setPage(1); }}
        />
        </div>
      )}

      {/* Modal */}
      {modalZone !== undefined && (
        <ZoneModal zone={modalZone} onClose={() => setModalZone(undefined)} onSaved={onSaved} />
      )}
    </div>
  );
}
