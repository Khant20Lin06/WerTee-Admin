'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Store, Plus, Pencil, Archive, RotateCcw,
  Search, RefreshCw, AlertTriangle,
  ChevronUp, ChevronDown, GripVertical,
} from 'lucide-react';
import { PaginationBar } from '@/components/ui/pagination-bar';

import { apiGet, apiPost, apiPatch } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoreType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
  branchAssignmentCount: number;
  branchPrimaryCount: number;
  merchantPrimaryCount: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type FormData = {
  code: string;
  name: string;
  description: string;
  iconUrl: string;
  isActive: boolean;
  sortOrder: string;
};

const EMPTY_FORM: FormData = { code: '', name: '', description: '', iconUrl: '', isActive: true, sortOrder: '0' };

// ─── Form Modal ───────────────────────────────────────────────────────────────

function StoreTypeModal({
  mode, initial, onSave, onClose, saving, saveError,
}: {
  mode: 'create' | 'edit'; initial: FormData;
  onSave: (data: FormData) => void; onClose: () => void;
  saving: boolean; saveError: string | null;
}) {
  const [form, setForm] = useState<FormData>(initial);
  function set(key: keyof FormData, val: string | boolean) { setForm(prev => ({ ...prev, [key]: val })); }

  const codeError = form.code && !/^[a-z0-9][a-z0-9_-]*$/.test(form.code)
    ? 'lowercase letters, digits, _ or - only; must start with letter/digit' : null;
  const canSave = (mode === 'edit' || (form.code.trim().length > 0 && !codeError)) && form.name.trim().length > 0 && !saving;

  const inputStyle = { fontSize: 12, color: 'var(--text-primary)', background: 'var(--bg-subtle)', border: '1px solid var(--border)', outline: 'none' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="rounded-2xl shadow-2xl flex flex-col"
        style={{ width: 480, maxHeight: '90vh', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="px-6 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="font-extrabold" style={{ fontSize: 15, color: 'var(--text-primary)' }}>
            {mode === 'create' ? 'Create store type' : `Edit "${initial.name}"`}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {mode === 'create' && (
            <div>
              <label className="block font-semibold mb-1" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                Code <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input placeholder="e.g. pharmacy" value={form.code}
                onChange={e => set('code', e.target.value.toLowerCase())} maxLength={80}
                className="w-full rounded-xl px-3 py-2"
                style={{ ...inputStyle, border: `1px solid ${codeError ? 'var(--danger)' : 'var(--border)'}` }} />
              {codeError && <p style={{ fontSize: 10, color: 'var(--danger)', marginTop: 3 }}>{codeError}</p>}
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>Unique identifier — cannot be changed after creation.</p>
            </div>
          )}

          <div>
            <label className="block font-semibold mb-1" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Name <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input placeholder="e.g. Pharmacy" value={form.name} onChange={e => set('name', e.target.value)} maxLength={120}
              className="w-full rounded-xl px-3 py-2" style={inputStyle} />
          </div>

          <div>
            <label className="block font-semibold mb-1" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Description</label>
            <textarea placeholder="Short description shown to merchants…" value={form.description}
              onChange={e => set('description', e.target.value)} maxLength={255} rows={2}
              className="w-full rounded-xl outline-none resize-none px-3 py-2" style={inputStyle} />
          </div>

          <div>
            <label className="block font-semibold mb-1" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Icon URL</label>
            <input placeholder="https://cdn.example.com/icons/pharmacy.svg" value={form.iconUrl}
              onChange={e => set('iconUrl', e.target.value)} maxLength={500}
              className="w-full rounded-xl px-3 py-2" style={inputStyle} />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block font-semibold mb-1" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Sort order</label>
              <input type="number" min={0} value={form.sortOrder} onChange={e => set('sortOrder', e.target.value)}
                className="w-full rounded-xl px-3 py-2" style={inputStyle} />
            </div>
            <div className="flex flex-col justify-end pb-1 gap-1">
              <label className="font-semibold" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Active</label>
              <button type="button" onClick={() => set('isActive', !form.isActive)}
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{
                  fontSize: 11, fontWeight: 600,
                  background: form.isActive ? 'var(--success-bg)' : 'var(--bg-subtle)',
                  color: form.isActive ? 'var(--success)' : 'var(--text-muted)',
                  border: `1px solid ${form.isActive ? 'var(--success)' : 'var(--border)'}`,
                }}>
                <span className="rounded-full flex-shrink-0"
                  style={{ width: 8, height: 8, background: form.isActive ? 'var(--success)' : 'var(--border-strong)' }} />
                {form.isActive ? 'Active' : 'Inactive'}
              </button>
            </div>
          </div>

          {saveError && (
            <div className="rounded-xl px-3 py-2"
              style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', fontSize: 11, color: 'var(--danger)' }}>
              {saveError}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-2" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="rounded-xl px-4 py-2 font-semibold"
            style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
            Cancel
          </button>
          <button onClick={() => onSave(form)} disabled={!canSave} className="rounded-xl px-5 py-2 font-semibold"
            style={{ fontSize: 12, background: 'var(--brand)', color: '#fff', opacity: canSave ? 1 : 0.45, cursor: canSave ? 'pointer' : 'not-allowed' }}>
            {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Archive Modal ────────────────────────────────────────────────────

function ConfirmArchiveModal({
  storeType, onConfirm, onCancel, loading,
}: {
  storeType: StoreType; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  const hasUsage = storeType.branchAssignmentCount > 0 || storeType.merchantPrimaryCount > 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
        style={{ width: 420, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="font-extrabold" style={{ fontSize: 15, color: 'var(--text-primary)' }}>
          Archive &ldquo;{storeType.name}&rdquo;?
        </div>
        {hasUsage ? (
          <div className="rounded-xl px-3 py-2.5 flex items-start gap-2"
            style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning)', fontSize: 11, color: 'var(--warning)' }}>
            <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              This store type is assigned to <strong>{storeType.branchAssignmentCount}</strong> branch
              {storeType.branchAssignmentCount !== 1 ? 'es' : ''} and used as primary by{' '}
              <strong>{storeType.merchantPrimaryCount}</strong> merchant
              {storeType.merchantPrimaryCount !== 1 ? 's' : ''}. Archiving will hide it from new assignments but existing records are kept.
            </span>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>This store type has no active assignments and can be safely archived.</p>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="rounded-xl px-4 py-2 font-semibold"
            style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="rounded-xl px-4 py-2 font-semibold"
            style={{ fontSize: 12, background: 'var(--danger)', color: '#fff', opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Archiving…' : 'Archive'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Store Type Card ──────────────────────────────────────────────────────────

function StoreTypeCard({
  st, onEdit, onArchive, onActivate, actionLoading,
}: {
  st: StoreType;
  onEdit: (st: StoreType) => void;
  onArchive: (st: StoreType) => void;
  onActivate: (st: StoreType) => void;
  actionLoading: string | null;
}) {
  const isLoading = actionLoading === st.id;
  const archived  = !!st.deletedAt;

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3 transition-opacity"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', opacity: archived ? 0.65 : 1 }}>
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ width: 40, height: 40, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          {st.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={st.iconUrl} alt={st.name} width={24} height={24} style={{ objectFit: 'contain' }} />
          ) : (
            <Store size={18} style={{ color: 'var(--brand)' }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold truncate" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{st.name}</span>
            <span className="rounded-full px-2 py-0.5 font-bold flex-shrink-0"
              style={{
                fontSize: 9,
                ...(archived
                  ? { background: 'var(--bg-subtle)', color: 'var(--text-muted)' }
                  : st.isActive
                  ? { background: 'var(--success-bg)', color: 'var(--success)' }
                  : { background: 'var(--danger-bg)', color: 'var(--danger)' }),
              }}>
              {archived ? 'Archived' : st.isActive ? 'Active' : 'Inactive'}
            </span>
            {st.isSystem && (
              <span className="rounded-full px-2 py-0.5 font-bold flex-shrink-0"
                style={{ fontSize: 9, background: 'var(--brand-muted)', color: 'var(--brand)' }}>System</span>
            )}
          </div>
          <code style={{ fontSize: 10, color: 'var(--text-muted)' }}>{st.code}</code>
        </div>

        <div className="flex items-center gap-1 rounded-lg px-2 py-1 flex-shrink-0"
          style={{ background: 'var(--bg-subtle)', fontSize: 10, color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          title="Sort order">
          <GripVertical size={10} />
          {st.sortOrder}
        </div>
      </div>

      {st.description && <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{st.description}</p>}

      <div className="flex items-center gap-4 flex-wrap">
        {[
          { label: 'Branch assignments:', val: st.branchAssignmentCount },
          { label: 'Primary branches:', val: st.branchPrimaryCount },
          { label: 'Merchants:', val: st.merchantPrimaryCount },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-1">
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</span>
            <span className="font-bold" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{s.val}</span>
          </div>
        ))}
        <div style={{ fontSize: 10, color: 'var(--text-faint)', marginLeft: 'auto' }}>
          Order: <span className="font-medium" style={{ color: 'var(--text-muted)' }}>{st.sortOrder}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
        {!archived && (
          <button onClick={() => onEdit(st)} disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold"
            style={{ fontSize: 10, background: 'var(--bg-subtle)', color: 'var(--brand)', border: '1px solid var(--border)' }}>
            <Pencil size={10} /> Edit
          </button>
        )}

        {!archived ? (
          <button onClick={() => onArchive(st)} disabled={isLoading || st.isSystem}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold"
            title={st.isSystem ? 'System store types cannot be archived' : 'Archive'}
            style={{
              fontSize: 10, background: 'var(--danger-bg)',
              color: st.isSystem ? 'var(--text-faint)' : 'var(--danger)',
              border: '1px solid var(--danger)',
              cursor: st.isSystem ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
            }}>
            <Archive size={10} /> Archive
          </button>
        ) : (
          <button onClick={() => onActivate(st)} disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold"
            style={{ fontSize: 10, background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)', opacity: isLoading ? 0.5 : 1 }}>
            <RotateCcw size={10} /> Restore
          </button>
        )}

        {isLoading && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Saving…</span>}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type SortKey = 'sortOrder' | 'name' | 'branchAssignmentCount';

export default function StoreTypesPage() {
  const [storeTypes, setStoreTypes] = useState<StoreType[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortKey, setSortKey]       = useState<SortKey>('sortOrder');
  const [sortAsc, setSortAsc]       = useState(true);
  const [modalMode, setModalMode]   = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<StoreType | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<StoreType | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchStoreTypes = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await apiGet<StoreType[]>(ep.storeTypes);
      setStoreTypes(Array.isArray(data) ? data : []);
    } catch { setError('Failed to load store types.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchStoreTypes(); }, [fetchStoreTypes]);

  const displayed = useMemo(() => {
    const kw = search.toLowerCase();
    return storeTypes
      .filter(st => {
        if (!showArchived && st.deletedAt) return false;
        if (kw && !st.name.toLowerCase().includes(kw) && !st.code.toLowerCase().includes(kw) && !(st.description?.toLowerCase().includes(kw))) return false;
        return true;
      })
      .slice()
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'sortOrder') cmp = a.sortOrder - b.sortOrder;
        else if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
        else if (sortKey === 'branchAssignmentCount') cmp = a.branchAssignmentCount - b.branchAssignmentCount;
        return sortAsc ? cmp : -cmp;
      });
  }, [storeTypes, search, showArchived, sortKey, sortAsc]);

  const activeCount   = storeTypes.filter(s => s.isActive && !s.deletedAt).length;
  const archivedCount = storeTypes.filter(s => !!s.deletedAt).length;
  const total      = displayed.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage   = Math.min(page, totalPages);
  const from       = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to         = Math.min(safePage * pageSize, total);
  const pageRows   = displayed.slice((safePage - 1) * pageSize, safePage * pageSize);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(p => !p); else { setSortKey(key); setSortAsc(true); }
    setPage(1);
  }

  function SortBtn({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <button onClick={() => toggleSort(k)}
        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold"
        style={{
          fontSize: 10,
          background: active ? 'var(--brand)' : 'var(--bg-card)',
          color: active ? '#fff' : 'var(--text-secondary)',
          border: active ? '1px solid var(--brand)' : '1px solid var(--border)',
        }}>
        {label}
        {active ? sortAsc ? <ChevronUp size={9} /> : <ChevronDown size={9} /> : null}
      </button>
    );
  }

  function openCreate() { setEditTarget(null); setSaveError(null); setModalMode('create'); }
  function openEdit(st: StoreType) { setEditTarget(st); setSaveError(null); setModalMode('edit'); }

  async function handleSave(data: FormData) {
    setSaving(true); setSaveError(null);
    try {
      if (modalMode === 'create') {
        await apiPost<StoreType>(ep.storeTypes, {
          code: data.code.trim(), name: data.name.trim(),
          ...(data.description.trim() ? { description: data.description.trim() } : {}),
          ...(data.iconUrl.trim() ? { iconUrl: data.iconUrl.trim() } : {}),
          isActive: data.isActive, sortOrder: parseInt(data.sortOrder, 10) || 0,
        });
      } else if (editTarget) {
        await apiPatch<StoreType>(ep.storeType(editTarget.id), {
          name: data.name.trim(),
          ...(data.description.trim() ? { description: data.description.trim() } : { description: null }),
          ...(data.iconUrl.trim() ? { iconUrl: data.iconUrl.trim() } : { iconUrl: null }),
          isActive: data.isActive, sortOrder: parseInt(data.sortOrder, 10) || 0,
        });
      }
      setModalMode(null);
      await fetchStoreTypes();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Save failed.');
    } finally { setSaving(false); }
  }

  async function handleArchive(st: StoreType) {
    setActionLoading(st.id);
    try { await apiPost(ep.storeTypeArchive(st.id), {}); await fetchStoreTypes(); }
    finally { setActionLoading(null); setArchiveTarget(null); }
  }

  async function handleActivate(st: StoreType) {
    setActionLoading(st.id);
    try { await apiPost(ep.storeTypeActivate(st.id), {}); await fetchStoreTypes(); }
    finally { setActionLoading(null); }
  }

  const modalInitial: FormData = editTarget
    ? { code: editTarget.code, name: editTarget.name, description: editTarget.description ?? '', iconUrl: editTarget.iconUrl ?? '', isActive: editTarget.isActive, sortOrder: String(editTarget.sortOrder) }
    : EMPTY_FORM;

  return (
    <div className="flex flex-col h-full" style={{ minHeight: '100vh' }}>
      {/* Modals */}
      {modalMode && (
        <StoreTypeModal mode={modalMode} initial={modalInitial} onSave={handleSave}
          onClose={() => setModalMode(null)} saving={saving} saveError={saveError} />
      )}
      {archiveTarget && (
        <ConfirmArchiveModal storeType={archiveTarget}
          onConfirm={() => handleArchive(archiveTarget)} onCancel={() => setArchiveTarget(null)}
          loading={actionLoading === archiveTarget.id} />
      )}

      <div className="flex-1 p-5 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-extrabold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Store Types</h1>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {loading ? '…' : `${storeTypes.length} total · ${activeCount} active${archivedCount > 0 ? ` · ${archivedCount} archived` : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void fetchStoreTypes()} disabled={loading}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-semibold"
              style={{ fontSize: 11, background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-semibold"
              style={{ fontSize: 11, background: 'var(--brand)', color: '#fff' }}>
              <Plus size={13} /> New store type
            </button>
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { label: 'All', count: storeTypes.length },
            { label: 'Active', count: activeCount },
            { label: 'Archived', count: archivedCount },
          ].map(chip => (
            <div key={chip.label} className="rounded-xl px-3 py-1.5"
              style={{ fontSize: 10, fontWeight: 600, background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              {chip.label}: <span style={{ color: 'var(--brand)' }}>{loading ? '…' : chip.count}</span>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 rounded-xl px-3"
            style={{ height: 34, background: 'var(--bg-card)', border: '1px solid var(--border)', flex: '1 1 200px', maxWidth: 280 }}>
            <Search size={12} style={{ color: 'var(--text-muted)' }} />
            <input placeholder="Search name, code, description…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="bg-transparent outline-none flex-1"
              style={{ fontSize: 11, color: 'var(--text-primary)' }} />
          </div>

          <button onClick={() => { setShowArchived(p => !p); setPage(1); }}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-semibold"
            style={{
              fontSize: 10, height: 34,
              background: showArchived ? 'var(--brand)' : 'var(--bg-card)',
              color: showArchived ? '#fff' : 'var(--text-secondary)',
              border: showArchived ? '1px solid var(--brand)' : '1px solid var(--border)',
            }}>
            <Archive size={11} /> Show archived
          </button>

          <div className="flex items-center gap-1.5 ml-auto">
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Sort:</span>
            <SortBtn label="Order" k="sortOrder" />
            <SortBtn label="Name" k="name" />
            <SortBtn label="Assignments" k="branchAssignmentCount" />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full border-2"
                style={{ width: 28, height: 28, borderColor: 'var(--brand)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading store types…</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-20 rounded-2xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <AlertTriangle size={32} style={{ color: 'var(--danger)' }} />
            <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>
            <button onClick={() => void fetchStoreTypes()} className="rounded-xl px-4 py-2 font-semibold"
              style={{ fontSize: 11, background: 'var(--brand)', color: '#fff' }}>Retry</button>
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 rounded-2xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Store size={36} style={{ color: 'var(--brand-border)' }} />
            <div className="text-center">
              <p className="font-semibold" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {search ? 'No store types match your search' : 'No store types yet'}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>
                {search ? 'Try clearing the search filter.' : 'Create your first store type to get started.'}
              </p>
            </div>
            {!search && (
              <button onClick={openCreate} className="flex items-center gap-1.5 rounded-xl px-4 py-2 font-semibold"
                style={{ fontSize: 11, background: 'var(--brand)', color: '#fff' }}>
                <Plus size={12} /> Create store type
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="grid gap-3 p-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
              {pageRows.map(st => (
                <StoreTypeCard key={st.id} st={st} onEdit={openEdit}
                  onArchive={st => setArchiveTarget(st)} onActivate={handleActivate}
                  actionLoading={actionLoading} />
              ))}
            </div>
            <PaginationBar page={safePage} totalPages={totalPages} total={total}
              pageSize={pageSize} from={from} to={to}
              onPage={setPage} onPageSize={(v) => { setPageSize(v); setPage(1); }} />
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
