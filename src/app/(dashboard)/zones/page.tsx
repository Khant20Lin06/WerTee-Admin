'use client';

import { useEffect, useState, useCallback } from 'react';
import { MapPin, Plus, Edit2, X, Save } from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';
import { Spinner } from '@/components/ui/spinner';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(26,23,48,0.3)' }}>
      <div className="rounded-card p-6 w-full" style={{ maxWidth: 440, background: '#fff', border: '1px solid #E8E6F8', boxShadow: '0 16px 48px rgba(91,79,233,0.15)' }}>
        <div className="flex items-center justify-between mb-5">
          <span className="font-extrabold" style={{ fontSize: 14, color: '#1A1730' }}>{zone ? 'Edit zone' : 'New zone'}</span>
          <button onClick={onClose}><X size={15} style={{ color: '#8A88A8' }} /></button>
        </div>

        <div className="space-y-3">
          {!zone && (
            <div>
              <label className="block mb-1 font-semibold" style={{ fontSize: 11, color: '#4A4770' }}>Zone code</label>
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. ZONE_A" maxLength={20}
                className="w-full rounded-lg px-3 py-2 outline-none"
                style={{ fontSize: 12, background: '#F6F5FF', border: '1px solid #E8E6F8', color: '#1A1730', fontFamily: 'monospace' }} />
            </div>
          )}
          <div>
            <label className="block mb-1 font-semibold" style={{ fontSize: 11, color: '#4A4770' }}>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Zone A — Central Yangon"
              className="w-full rounded-lg px-3 py-2 outline-none"
              style={{ fontSize: 12, background: '#F6F5FF', border: '1px solid #E8E6F8', color: '#1A1730' }} />
          </div>
          <div>
            <label className="block mb-1 font-semibold" style={{ fontSize: 11, color: '#4A4770' }}>Description</label>
            <textarea value={description} onChange={e => setDesc(e.target.value)} placeholder="Optional description…"
              rows={2} className="w-full rounded-lg px-3 py-2 outline-none resize-none"
              style={{ fontSize: 12, background: '#F6F5FF', border: '1px solid #E8E6F8', color: '#1A1730' }} />
          </div>
          <div>
            <label className="block mb-1 font-semibold" style={{ fontSize: 11, color: '#4A4770' }}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full rounded-lg px-3 py-2 outline-none"
              style={{ fontSize: 12, background: '#F6F5FF', border: '1px solid #E8E6F8', color: '#1A1730' }}>
              {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {error && <div style={{ fontSize: 11, color: '#D84040' }}>{error}</div>}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 rounded-lg py-2 font-semibold"
              style={{ fontSize: 12, border: '1px solid #E8E6F8', color: '#4A4770', background: '#F6F5FF' }}>
              Cancel
            </button>
            <button onClick={submit} disabled={saving}
              className="flex-1 rounded-lg py-2 font-semibold flex items-center justify-center gap-2"
              style={{ fontSize: 12, background: '#5B4FE9', color: '#fff', opacity: saving ? 0.7 : 1 }}>
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

  const dotCount = 160;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setModalZone(null)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-semibold"
          style={{ fontSize: 11, background: '#5B4FE9', color: '#fff' }}>
          <Plus size={12} /> New zone
        </button>
      </div>

      {/* Coverage map visual */}
      <div className="rounded-card p-5" style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={14} style={{ color: '#5B4FE9' }} />
          <span className="font-bold" style={{ fontSize: 13, color: '#1A1730' }}>Coverage map</span>
          {!loading && (
            <span style={{ fontSize: 11, color: '#8A88A8' }}>· {zones.filter(z => z.status === 'ACTIVE').length} active zones</span>
          )}
        </div>
        <div className="rounded-lg p-4" style={{ background: '#F6F5FF', minHeight: 120 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(20, 1fr)', gap: 5 }}>
            {Array.from({ length: dotCount }).map((_, i) => {
              const active = i % 3 !== 0;
              return (
                <div key={i} className="rounded-full" style={{
                  width: 7, height: 7,
                  background: active ? '#5B4FE9' : '#C8C4F8',
                  opacity: active ? (0.3 + (i % 7) * 0.1) : 0.3,
                }} />
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3">
            {[{ label: 'Active zone', color: '#5B4FE9' }, { label: 'Inactive', color: '#C8C4F8' }].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="rounded-full" style={{ width: 8, height: 8, background: l.color }} />
                <span style={{ fontSize: 10, color: '#8A88A8' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* States */}
      {loading && <div className="flex justify-center py-8"><Spinner /></div>}

      {!loading && error && (
        <div className="rounded-card px-4 py-3 text-center" style={{ background: '#FFF0F0', border: '1px solid #FFD0D0' }}>
          <div style={{ fontSize: 12, color: '#D84040' }}>{error}</div>
          <button onClick={load} className="mt-2 font-semibold" style={{ fontSize: 11, color: '#5B4FE9' }}>Retry</button>
        </div>
      )}

      {!loading && !error && zones.length === 0 && (
        <div className="rounded-card px-4 py-10 text-center" style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
          <div style={{ fontSize: 13, color: '#8A88A8' }}>No zones created yet</div>
          <button onClick={() => setModalZone(null)} className="mt-2 font-semibold" style={{ fontSize: 11, color: '#5B4FE9' }}>Create first zone</button>
        </div>
      )}

      {/* Zone rows */}
      {!loading && !error && zones.map(z => (
        <div key={z.id} className="rounded-card px-4 py-3 flex items-center gap-4" style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
          <div className="rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ width: 36, height: 36, background: z.status === 'ACTIVE' ? '#EEF0FF' : '#F6F5FF' }}>
            <MapPin size={16} style={{ color: z.status === 'ACTIVE' ? '#5B4FE9' : '#8A88A8' }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold" style={{ fontSize: 12, color: '#1A1730' }}>{z.name}</span>
              <code className="font-mono rounded px-1.5 py-0.5" style={{ fontSize: 9, background: '#F6F5FF', color: '#8A88A8', border: '1px solid #E8E6F8' }}>{z.code}</code>
              <span className="rounded-pill px-2 py-0.5 font-semibold"
                style={{ fontSize: 9, background: z.status === 'ACTIVE' ? '#E8FAF2' : '#F6F5FF', color: z.status === 'ACTIVE' ? '#16A660' : '#8A88A8' }}>
                {z.status}
              </span>
            </div>
            {z.description && <div style={{ fontSize: 10, color: '#8A88A8', marginTop: 2 }}>{z.description}</div>}
            {z.branchCount !== undefined && (
              <div style={{ fontSize: 10, color: '#8A88A8', marginTop: 1 }}>{z.branchCount} branch{z.branchCount !== 1 ? 'es' : ''}</div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div style={{ fontSize: 10, color: '#8A88A8' }}>
              Updated {new Date(z.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </div>
            <button onClick={() => setModalZone(z)} className="p-1.5 rounded-lg" style={{ background: '#F6F5FF', border: '1px solid #E8E6F8' }}>
              <Edit2 size={11} style={{ color: '#4A4770' }} />
            </button>
            <button onClick={() => toggleStatus(z)} disabled={acting[z.id]}
              className="rounded-lg px-2.5 py-1 font-semibold flex items-center gap-1"
              style={{ fontSize: 10, background: z.status === 'ACTIVE' ? '#FFF0F0' : '#E8FAF2', color: z.status === 'ACTIVE' ? '#D84040' : '#16A660', border: '1px solid', borderColor: z.status === 'ACTIVE' ? '#FFD0D0' : '#C0E8D4' }}>
              {acting[z.id] ? <Spinner size={9} /> : (z.status === 'ACTIVE' ? 'Deactivate' : 'Activate')}
            </button>
          </div>
        </div>
      ))}

      {/* Modal */}
      {modalZone !== undefined && (
        <ZoneModal zone={modalZone} onClose={() => setModalZone(undefined)} onSaved={onSaved} />
      )}
    </div>
  );
}
