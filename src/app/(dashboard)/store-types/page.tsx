'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Store, Plus, Pencil, Archive, RotateCcw,
  Search, RefreshCw, CheckCircle2, AlertTriangle,
  ChevronUp, ChevronDown, GripVertical,
} from 'lucide-react';

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

const EMPTY_FORM: FormData = {
  code: '',
  name: '',
  description: '',
  iconUrl: '',
  isActive: true,
  sortOrder: '0',
};

// ─── Form Modal ───────────────────────────────────────────────────────────────

function StoreTypeModal({
  mode,
  initial,
  onSave,
  onClose,
  saving,
  saveError,
}: {
  mode: 'create' | 'edit';
  initial: FormData;
  onSave: (data: FormData) => void;
  onClose: () => void;
  saving: boolean;
  saveError: string | null;
}) {
  const [form, setForm] = useState<FormData>(initial);

  function set(key: keyof FormData, val: string | boolean) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  const codeError =
    form.code && !/^[a-z0-9][a-z0-9_-]*$/.test(form.code)
      ? 'lowercase letters, digits, _ or - only; must start with letter/digit'
      : null;

  const canSave =
    (mode === 'edit' || (form.code.trim().length > 0 && !codeError)) &&
    form.name.trim().length > 0 &&
    !saving;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(27,23,48,0.45)' }}
    >
      <div
        className="rounded-2xl shadow-2xl flex flex-col"
        style={{ width: 480, maxHeight: '90vh', background: '#fff', border: '1px solid #E8E6F8' }}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b" style={{ borderColor: '#E8E6F8' }}>
          <div className="font-extrabold" style={{ fontSize: 15, color: '#1A1730' }}>
            {mode === 'create' ? 'Create store type' : `Edit "${initial.name}"`}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {/* Code (create only) */}
          {mode === 'create' && (
            <div>
              <label className="block font-semibold mb-1" style={{ fontSize: 11, color: '#4A4770' }}>
                Code <span style={{ color: '#D84040' }}>*</span>
              </label>
              <input
                placeholder="e.g. pharmacy"
                value={form.code}
                onChange={e => set('code', e.target.value.toLowerCase())}
                maxLength={80}
                className="w-full rounded-xl outline-none px-3 py-2"
                style={{
                  fontSize: 12, color: '#1A1730',
                  background: '#F6F5FF', border: `1px solid ${codeError ? '#D84040' : '#E8E6F8'}`,
                }}
              />
              {codeError && (
                <p style={{ fontSize: 10, color: '#D84040', marginTop: 3 }}>{codeError}</p>
              )}
              <p style={{ fontSize: 10, color: '#8A88A8', marginTop: 3 }}>
                Unique identifier — cannot be changed after creation.
              </p>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block font-semibold mb-1" style={{ fontSize: 11, color: '#4A4770' }}>
              Name <span style={{ color: '#D84040' }}>*</span>
            </label>
            <input
              placeholder="e.g. Pharmacy"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              maxLength={120}
              className="w-full rounded-xl outline-none px-3 py-2"
              style={{ fontSize: 12, color: '#1A1730', background: '#F6F5FF', border: '1px solid #E8E6F8' }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold mb-1" style={{ fontSize: 11, color: '#4A4770' }}>
              Description
            </label>
            <textarea
              placeholder="Short description shown to merchants…"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              maxLength={255}
              rows={2}
              className="w-full rounded-xl outline-none resize-none px-3 py-2"
              style={{ fontSize: 12, color: '#1A1730', background: '#F6F5FF', border: '1px solid #E8E6F8' }}
            />
          </div>

          {/* Icon URL */}
          <div>
            <label className="block font-semibold mb-1" style={{ fontSize: 11, color: '#4A4770' }}>
              Icon URL
            </label>
            <input
              placeholder="https://cdn.example.com/icons/pharmacy.svg"
              value={form.iconUrl}
              onChange={e => set('iconUrl', e.target.value)}
              maxLength={500}
              className="w-full rounded-xl outline-none px-3 py-2"
              style={{ fontSize: 12, color: '#1A1730', background: '#F6F5FF', border: '1px solid #E8E6F8' }}
            />
          </div>

          {/* Sort order + Active row */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block font-semibold mb-1" style={{ fontSize: 11, color: '#4A4770' }}>
                Sort order
              </label>
              <input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={e => set('sortOrder', e.target.value)}
                className="w-full rounded-xl outline-none px-3 py-2"
                style={{ fontSize: 12, color: '#1A1730', background: '#F6F5FF', border: '1px solid #E8E6F8' }}
              />
            </div>
            <div className="flex flex-col justify-end pb-1 gap-1">
              <label className="font-semibold" style={{ fontSize: 11, color: '#4A4770' }}>
                Active
              </label>
              <button
                type="button"
                onClick={() => set('isActive', !form.isActive)}
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{
                  fontSize: 11, fontWeight: 600,
                  background: form.isActive ? '#EDFBF4' : '#F6F5FF',
                  color: form.isActive ? '#1A8C52' : '#8A88A8',
                  border: `1px solid ${form.isActive ? '#A8E6C4' : '#E8E6F8'}`,
                }}
              >
                <span
                  className="rounded-full flex-shrink-0"
                  style={{
                    width: 8, height: 8,
                    background: form.isActive ? '#1A8C52' : '#C0BDE8',
                  }}
                />
                {form.isActive ? 'Active' : 'Inactive'}
              </button>
            </div>
          </div>

          {saveError && (
            <div
              className="rounded-xl px-3 py-2"
              style={{ background: '#FFF0F0', border: '1px solid #F5C6C6', fontSize: 11, color: '#D84040' }}
            >
              {saveError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-2" style={{ borderColor: '#E8E6F8' }}>
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 font-semibold"
            style={{ fontSize: 12, color: '#8A88A8', background: '#F6F5FF', border: '1px solid #E8E6F8' }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!canSave}
            className="rounded-xl px-5 py-2 font-semibold"
            style={{
              fontSize: 12, background: '#5B4FE9', color: '#fff',
              opacity: canSave ? 1 : 0.45,
              cursor: canSave ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Archive Modal ─────────────────────────────────────────────────────

function ConfirmArchiveModal({
  storeType,
  onConfirm,
  onCancel,
  loading,
}: {
  storeType: StoreType;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const hasUsage = storeType.branchAssignmentCount > 0 || storeType.merchantPrimaryCount > 0;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(27,23,48,0.45)' }}
    >
      <div
        className="rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
        style={{ width: 420, background: '#fff', border: '1px solid #E8E6F8' }}
      >
        <div className="font-extrabold" style={{ fontSize: 15, color: '#1A1730' }}>
          Archive &ldquo;{storeType.name}&rdquo;?
        </div>
        {hasUsage ? (
          <div
            className="rounded-xl px-3 py-2.5 flex items-start gap-2"
            style={{ background: '#FFF8E8', border: '1px solid #F5D99B', fontSize: 11, color: '#D4820A' }}
          >
            <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              This store type is assigned to <strong>{storeType.branchAssignmentCount}</strong> branch
              {storeType.branchAssignmentCount !== 1 ? 'es' : ''} and used as primary by{' '}
              <strong>{storeType.merchantPrimaryCount}</strong> merchant
              {storeType.merchantPrimaryCount !== 1 ? 's' : ''}. Archiving will hide it from new assignments
              but existing records are kept.
            </span>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: '#8A88A8' }}>
            This store type has no active assignments and can be safely archived.
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="rounded-xl px-4 py-2 font-semibold"
            style={{ fontSize: 12, color: '#8A88A8', background: '#F6F5FF', border: '1px solid #E8E6F8' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl px-4 py-2 font-semibold"
            style={{
              fontSize: 12, background: '#D84040', color: '#fff',
              opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Archiving…' : 'Archive'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Store Type Card ──────────────────────────────────────────────────────────

function StoreTypeCard({
  st,
  onEdit,
  onArchive,
  onActivate,
  actionLoading,
}: {
  st: StoreType;
  onEdit: (st: StoreType) => void;
  onArchive: (st: StoreType) => void;
  onActivate: (st: StoreType) => void;
  actionLoading: string | null;
}) {
  const isLoading = actionLoading === st.id;
  const archived = !!st.deletedAt;

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3 transition-opacity"
      style={{
        background: '#fff',
        border: '1px solid #E8E6F8',
        opacity: archived ? 0.65 : 1,
      }}
    >
      {/* Top row: icon + name + badges */}
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ width: 40, height: 40, background: '#F0EFFB', border: '1px solid #E8E6F8' }}
        >
          {st.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={st.iconUrl} alt={st.name} width={24} height={24} style={{ objectFit: 'contain' }} />
          ) : (
            <Store size={18} style={{ color: '#5B4FE9' }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold truncate" style={{ fontSize: 13, color: '#1A1730' }}>
              {st.name}
            </span>
            {/* Status */}
            <span
              className="rounded-full px-2 py-0.5 font-bold flex-shrink-0"
              style={{
                fontSize: 9,
                ...(archived
                  ? { background: '#F3F2FB', color: '#8A88A8' }
                  : st.isActive
                  ? { background: '#EDFBF4', color: '#1A8C52' }
                  : { background: '#FFF0F0', color: '#D84040' }),
              }}
            >
              {archived ? 'Archived' : st.isActive ? 'Active' : 'Inactive'}
            </span>
            {st.isSystem && (
              <span
                className="rounded-full px-2 py-0.5 font-bold flex-shrink-0"
                style={{ fontSize: 9, background: '#EEF0FF', color: '#5B4FE9' }}
              >
                System
              </span>
            )}
          </div>
          <code style={{ fontSize: 10, color: '#8A88A8' }}>{st.code}</code>
        </div>

        {/* Sort order pill */}
        <div
          className="flex items-center gap-1 rounded-lg px-2 py-1 flex-shrink-0"
          style={{ background: '#F6F5FF', fontSize: 10, color: '#8A88A8', border: '1px solid #E8E6F8' }}
          title="Sort order"
        >
          <GripVertical size={10} />
          {st.sortOrder}
        </div>
      </div>

      {/* Description */}
      {st.description && (
        <p style={{ fontSize: 11, color: '#8A88A8', lineHeight: 1.4 }}>{st.description}</p>
      )}

      {/* Usage stats */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1">
          <span style={{ fontSize: 10, color: '#8A88A8' }}>Branch assignments:</span>
          <span className="font-bold" style={{ fontSize: 10, color: '#4A4770' }}>
            {st.branchAssignmentCount}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span style={{ fontSize: 10, color: '#8A88A8' }}>Primary branches:</span>
          <span className="font-bold" style={{ fontSize: 10, color: '#4A4770' }}>
            {st.branchPrimaryCount}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span style={{ fontSize: 10, color: '#8A88A8' }}>Merchants:</span>
          <span className="font-bold" style={{ fontSize: 10, color: '#4A4770' }}>
            {st.merchantPrimaryCount}
          </span>
        </div>
        <div style={{ fontSize: 10, color: '#C0BDE8', marginLeft: 'auto' }}>
          Order: <span className="font-medium" style={{ color: '#8A88A8' }}>{st.sortOrder}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: '#F0EFFB' }}>
        {!archived && (
          <button
            onClick={() => onEdit(st)}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold"
            style={{ fontSize: 10, background: '#F6F5FF', color: '#5B4FE9', border: '1px solid #E8E6F8' }}
          >
            <Pencil size={10} />
            Edit
          </button>
        )}

        {!archived ? (
          <button
            onClick={() => onArchive(st)}
            disabled={isLoading || st.isSystem}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold"
            title={st.isSystem ? 'System store types cannot be archived' : 'Archive'}
            style={{
              fontSize: 10,
              background: '#FFF0F0',
              color: st.isSystem ? '#F5C6C6' : '#D84040',
              border: '1px solid #F5C6C6',
              cursor: st.isSystem ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <Archive size={10} />
            Archive
          </button>
        ) : (
          <button
            onClick={() => onActivate(st)}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold"
            style={{
              fontSize: 10, background: '#EDFBF4', color: '#1A8C52',
              border: '1px solid #A8E6C4',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <RotateCcw size={10} />
            Restore
          </button>
        )}

        {isLoading && (
          <span style={{ fontSize: 10, color: '#8A88A8' }}>Saving…</span>
        )}
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

  // Filters
  const [search, setSearch]         = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Sort
  const [sortKey, setSortKey]       = useState<SortKey>('sortOrder');
  const [sortAsc, setSortAsc]       = useState(true);

  // Modal state
  const [modalMode, setModalMode]   = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<StoreType | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<StoreType | null>(null);

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

  const fetchStoreTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<StoreType[]>(ep.storeTypes);
      setStoreTypes(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load store types.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchStoreTypes(); }, [fetchStoreTypes]);

  // ── Filtered + sorted list ─────────────────────────────────────────────────
  const displayed = useMemo(() => {
    const kw = search.toLowerCase();
    return storeTypes
      .filter(st => {
        if (!showArchived && st.deletedAt) return false;
        if (kw &&
          !st.name.toLowerCase().includes(kw) &&
          !st.code.toLowerCase().includes(kw) &&
          !(st.description?.toLowerCase().includes(kw))
        ) return false;
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

  // ── Sort toggle ────────────────────────────────────────────────────────────
  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(p => !p);
    else { setSortKey(key); setSortAsc(true); }
  }

  function SortBtn({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <button
        onClick={() => toggleSort(k)}
        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold"
        style={{
          fontSize: 10,
          background: active ? '#5B4FE9' : '#fff',
          color: active ? '#fff' : '#4A4770',
          border: active ? '1px solid #5B4FE9' : '1px solid #E8E6F8',
        }}
      >
        {label}
        {active
          ? sortAsc
            ? <ChevronUp size={9} />
            : <ChevronDown size={9} />
          : null}
      </button>
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  function openCreate() {
    setEditTarget(null);
    setSaveError(null);
    setModalMode('create');
  }

  function openEdit(st: StoreType) {
    setEditTarget(st);
    setSaveError(null);
    setModalMode('edit');
  }

  async function handleSave(data: FormData) {
    setSaving(true);
    setSaveError(null);
    try {
      if (modalMode === 'create') {
        await apiPost<StoreType>(ep.storeTypes, {
          code: data.code.trim(),
          name: data.name.trim(),
          ...(data.description.trim() ? { description: data.description.trim() } : {}),
          ...(data.iconUrl.trim() ? { iconUrl: data.iconUrl.trim() } : {}),
          isActive: data.isActive,
          sortOrder: parseInt(data.sortOrder, 10) || 0,
        });
      } else if (editTarget) {
        await apiPatch<StoreType>(ep.storeType(editTarget.id), {
          name: data.name.trim(),
          ...(data.description.trim() ? { description: data.description.trim() } : { description: null }),
          ...(data.iconUrl.trim() ? { iconUrl: data.iconUrl.trim() } : { iconUrl: null }),
          isActive: data.isActive,
          sortOrder: parseInt(data.sortOrder, 10) || 0,
        });
      }
      setModalMode(null);
      await fetchStoreTypes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed.';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(st: StoreType) {
    setActionLoading(st.id);
    try {
      await apiPost(ep.storeTypeArchive(st.id), {});
      await fetchStoreTypes();
    } finally {
      setActionLoading(null);
      setArchiveTarget(null);
    }
  }

  async function handleActivate(st: StoreType) {
    setActionLoading(st.id);
    try {
      await apiPost(ep.storeTypeActivate(st.id), {});
      await fetchStoreTypes();
    } finally {
      setActionLoading(null);
    }
  }

  const modalInitial: FormData = editTarget
    ? {
        code: editTarget.code,
        name: editTarget.name,
        description: editTarget.description ?? '',
        iconUrl: editTarget.iconUrl ?? '',
        isActive: editTarget.isActive,
        sortOrder: String(editTarget.sortOrder),
      }
    : EMPTY_FORM;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full" style={{ background: '#F0EFFB', minHeight: '100vh' }}>
      {/* Modals */}
      {modalMode && (
        <StoreTypeModal
          mode={modalMode}
          initial={modalInitial}
          onSave={handleSave}
          onClose={() => setModalMode(null)}
          saving={saving}
          saveError={saveError}
        />
      )}
      {archiveTarget && (
        <ConfirmArchiveModal
          storeType={archiveTarget}
          onConfirm={() => handleArchive(archiveTarget)}
          onCancel={() => setArchiveTarget(null)}
          loading={actionLoading === archiveTarget.id}
        />
      )}

      <div className="flex-1 p-5 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-extrabold" style={{ fontSize: 16, color: '#1A1730' }}>
              Store Types
            </h1>
            <p style={{ fontSize: 11, color: '#8A88A8', marginTop: 2 }}>
              {loading
                ? '…'
                : `${storeTypes.length} total · ${activeCount} active${archivedCount > 0 ? ` · ${archivedCount} archived` : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void fetchStoreTypes()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-semibold"
              style={{ fontSize: 11, background: '#fff', color: '#4A4770', border: '1px solid #E8E6F8' }}
            >
              <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-semibold"
              style={{ fontSize: 11, background: '#5B4FE9', color: '#fff' }}
            >
              <Plus size={13} />
              New store type
            </button>
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { label: 'All', count: storeTypes.length, key: 'all' },
            { label: 'Active', count: activeCount, key: 'active' },
            { label: 'Archived', count: archivedCount, key: 'archived' },
          ].map(chip => (
            <div
              key={chip.key}
              className="rounded-xl px-3 py-1.5"
              style={{
                fontSize: 10, fontWeight: 600,
                background: '#fff',
                color: '#4A4770',
                border: '1px solid #E8E6F8',
              }}
            >
              {chip.label}: <span style={{ color: '#5B4FE9' }}>{loading ? '…' : chip.count}</span>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {/* Search */}
          <div
            className="flex items-center gap-1.5 rounded-xl px-3"
            style={{ height: 34, background: '#fff', border: '1px solid #E8E6F8', flex: '1 1 200px', maxWidth: 280 }}
          >
            <Search size={12} style={{ color: '#8A88A8' }} />
            <input
              placeholder="Search name, code, description…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent outline-none flex-1"
              style={{ fontSize: 11, color: '#1A1730' }}
            />
          </div>

          {/* Show archived toggle */}
          <button
            onClick={() => setShowArchived(p => !p)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-semibold"
            style={{
              fontSize: 10, height: 34,
              background: showArchived ? '#5B4FE9' : '#fff',
              color: showArchived ? '#fff' : '#4A4770',
              border: showArchived ? '1px solid #5B4FE9' : '1px solid #E8E6F8',
            }}
          >
            <Archive size={11} />
            Show archived
          </button>

          {/* Sort */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span style={{ fontSize: 10, color: '#8A88A8' }}>Sort:</span>
            <SortBtn label="Order" k="sortOrder" />
            <SortBtn label="Name" k="name" />
            <SortBtn label="Assignments" k="branchAssignmentCount" />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div
                className="rounded-full border-2"
                style={{ width: 28, height: 28, borderColor: '#5B4FE9', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}
              />
              <span style={{ fontSize: 12, color: '#8A88A8' }}>Loading store types…</span>
            </div>
          </div>
        ) : error ? (
          <div
            className="flex flex-col items-center gap-3 py-20 rounded-2xl"
            style={{ background: '#fff', border: '1px solid #E8E6F8' }}
          >
            <AlertTriangle size={32} style={{ color: '#D84040' }} />
            <span style={{ fontSize: 12, color: '#D84040' }}>{error}</span>
            <button
              onClick={() => void fetchStoreTypes()}
              className="rounded-xl px-4 py-2 font-semibold"
              style={{ fontSize: 11, background: '#5B4FE9', color: '#fff' }}
            >
              Retry
            </button>
          </div>
        ) : displayed.length === 0 ? (
          <div
            className="flex flex-col items-center gap-4 py-20 rounded-2xl"
            style={{ background: '#fff', border: '1px solid #E8E6F8' }}
          >
            <Store size={36} style={{ color: '#C8C4F4' }} />
            <div className="text-center">
              <p className="font-semibold" style={{ fontSize: 13, color: '#8A88A8' }}>
                {search ? 'No store types match your search' : 'No store types yet'}
              </p>
              <p style={{ fontSize: 11, color: '#C0BDE8', marginTop: 4 }}>
                {search ? 'Try clearing the search filter.' : 'Create your first store type to get started.'}
              </p>
            </div>
            {!search && (
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 font-semibold"
                style={{ fontSize: 11, background: '#5B4FE9', color: '#fff' }}
              >
                <Plus size={12} />
                Create store type
              </button>
            )}
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
          >
            {displayed.map(st => (
              <StoreTypeCard
                key={st.id}
                st={st}
                onEdit={openEdit}
                onArchive={st => setArchiveTarget(st)}
                onActivate={handleActivate}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
