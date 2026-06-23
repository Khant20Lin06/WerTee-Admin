'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  PackageSearch, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, ChevronDown, Search, Filter,
} from 'lucide-react';

import { apiGet, apiPost } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertStatus   = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
type AlertKind     = 'ATTENTION' | 'COMPENSATION';
type AttentionLevel = 'LOW_STOCK' | 'OUT_OF_STOCK';

interface InventoryAlert {
  notificationId: string;
  type: string;
  title: string;
  body: string;
  navigationPath: string | null;
  merchantUserId: string;
  merchantRole: string;
  merchantPhone: string;
  branchId: string | null;
  branchName: string | null;
  alertKind: AlertKind;
  resourceType: 'MENU_ITEM' | 'ITEM_OPTION';
  resourceId: string;
  resourceLabel: string;
  menuItemName: string | null;
  attentionLevel: AttentionLevel | null;
  stockQuantity: number | null;
  lowStockThreshold: number | null;
  restoredQuantity: number | null;
  orderId: string | null;
  orderCode: string | null;
  reasonCode: string | null;
  merchantReadAt: string | null;
  status: AlertStatus;
  acknowledgementNote: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: { userId: string; role: string; phone: string } | null;
  statusNote: string | null;
  statusChangedAt: string | null;
  statusChangedBy: { userId: string; role: string; phone: string } | null;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<AlertStatus, string> = {
  OPEN: 'Open',
  ACKNOWLEDGED: 'Acknowledged',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
};

const STATUS_COLORS: Record<AlertStatus, { bg: string; color: string }> = {
  OPEN: { bg: '#FFF0F0', color: '#D84040' },
  ACKNOWLEDGED: { bg: '#FFF8E8', color: '#D4820A' },
  RESOLVED: { bg: '#EDFBF4', color: '#1A8C52' },
  DISMISSED: { bg: '#F3F2FB', color: '#8A88A8' },
};

const ATTENTION_COLORS: Record<AttentionLevel, { bg: string; color: string }> = {
  LOW_STOCK: { bg: '#FFF8E8', color: '#D4820A' },
  OUT_OF_STOCK: { bg: '#FFF0F0', color: '#D84040' },
};

// ─── Note Modal ───────────────────────────────────────────────────────────────

function NoteModal({
  title,
  action,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  action: string;
  onConfirm: (note: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [note, setNote] = useState('');
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(27,23,48,0.45)' }}
    >
      <div
        className="rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
        style={{ width: 400, background: '#fff', border: '1px solid #E8E6F8' }}
      >
        <div className="font-extrabold" style={{ fontSize: 15, color: '#1A1730' }}>{title}</div>
        <textarea
          placeholder="Optional note (max 500 chars)…"
          maxLength={500}
          rows={3}
          value={note}
          onChange={e => setNote(e.target.value)}
          className="w-full rounded-xl outline-none resize-none px-3 py-2"
          style={{ fontSize: 12, color: '#1A1730', background: '#F6F5FF', border: '1px solid #E8E6F8' }}
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="rounded-xl px-4 py-2 font-semibold"
            style={{ fontSize: 12, color: '#8A88A8', background: '#F6F5FF', border: '1px solid #E8E6F8' }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(note)}
            disabled={loading}
            className="rounded-xl px-4 py-2 font-semibold"
            style={{
              fontSize: 12,
              background: '#5B4FE9',
              color: '#fff',
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Saving…' : action}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Note Modal ───────────────────────────────────────────────────────────

function BulkModal({
  count,
  action,
  actionLabel,
  onConfirm,
  onCancel,
  loading,
}: {
  count: number;
  action: 'acknowledge' | 'dismiss';
  actionLabel: string;
  onConfirm: (note: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [note, setNote] = useState('');
  const color = action === 'acknowledge' ? '#5B4FE9' : '#D84040';
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
          {actionLabel} {count} alert{count !== 1 ? 's' : ''}
        </div>
        <p style={{ fontSize: 12, color: '#8A88A8' }}>
          This will {action} all {count} selected alert{count !== 1 ? 's' : ''} at once.
        </p>
        <textarea
          placeholder="Optional note (max 500 chars)…"
          maxLength={500}
          rows={3}
          value={note}
          onChange={e => setNote(e.target.value)}
          className="w-full rounded-xl outline-none resize-none px-3 py-2"
          style={{ fontSize: 12, color: '#1A1730', background: '#F6F5FF', border: '1px solid #E8E6F8' }}
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="rounded-xl px-4 py-2 font-semibold"
            style={{ fontSize: 12, color: '#8A88A8', background: '#F6F5FF', border: '1px solid #E8E6F8' }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(note)}
            disabled={loading}
            className="rounded-xl px-4 py-2 font-semibold"
            style={{
              fontSize: 12,
              background: color,
              color: '#fff',
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Saving…' : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Alert Row ────────────────────────────────────────────────────────────────

function AlertRow({
  alert,
  selected,
  onSelect,
  onAcknowledge,
  onResolve,
  actionLoading,
}: {
  alert: InventoryAlert;
  selected: boolean;
  onSelect: (id: string) => void;
  onAcknowledge: (alert: InventoryAlert) => void;
  onResolve: (alert: InventoryAlert) => void;
  actionLoading: string | null;
}) {
  const statusStyle = STATUS_COLORS[alert.status];
  const attentionStyle = alert.attentionLevel ? ATTENTION_COLORS[alert.attentionLevel] : null;
  const isLoading = actionLoading === alert.notificationId;

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl border mb-2 transition-colors"
      style={{
        background: selected ? '#F0EFFB' : '#fff',
        borderColor: selected ? '#5B4FE9' : '#E8E6F8',
      }}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onSelect(alert.notificationId)}
        className="mt-1 flex-shrink-0 cursor-pointer"
        style={{ accentColor: '#5B4FE9', width: 14, height: 14 }}
      />

      {/* Icon */}
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-lg mt-0.5"
        style={{ width: 32, height: 32, background: alert.alertKind === 'ATTENTION' ? '#FFF0F0' : '#F0EFFB' }}
      >
        {alert.alertKind === 'ATTENTION' ? (
          <AlertTriangle size={15} style={{ color: '#D84040' }} />
        ) : (
          <PackageSearch size={15} style={{ color: '#5B4FE9' }} />
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold truncate" style={{ fontSize: 12, color: '#1A1730' }}>
            {alert.title}
          </span>
          {/* Status badge */}
          <span
            className="rounded-full px-2 py-0.5 font-bold flex-shrink-0"
            style={{ fontSize: 9, ...statusStyle }}
          >
            {STATUS_LABELS[alert.status]}
          </span>
          {/* Attention level badge */}
          {attentionStyle && alert.attentionLevel && (
            <span
              className="rounded-full px-2 py-0.5 font-bold flex-shrink-0"
              style={{ fontSize: 9, ...attentionStyle }}
            >
              {alert.attentionLevel.replace('_', ' ')}
            </span>
          )}
          {/* Kind badge */}
          <span
            className="rounded-full px-2 py-0.5 font-bold flex-shrink-0"
            style={{
              fontSize: 9,
              background: alert.alertKind === 'ATTENTION' ? '#FFF0F0' : '#EEF0FF',
              color: alert.alertKind === 'ATTENTION' ? '#D84040' : '#5B4FE9',
            }}
          >
            {alert.alertKind}
          </span>
        </div>

        <p className="mt-0.5" style={{ fontSize: 11, color: '#8A88A8', lineHeight: 1.4 }}>
          {alert.body}
        </p>

        <div className="flex items-center gap-4 mt-1 flex-wrap">
          {alert.branchName && (
            <span style={{ fontSize: 10, color: '#4A4770' }}>
              Branch: <span className="font-medium">{alert.branchName}</span>
            </span>
          )}
          <span style={{ fontSize: 10, color: '#4A4770' }}>
            Merchant: <span className="font-medium">{alert.merchantPhone}</span>
          </span>
          {alert.stockQuantity !== null && (
            <span style={{ fontSize: 10, color: '#4A4770' }}>
              Stock: <span className="font-medium">{alert.stockQuantity}</span>
              {alert.lowStockThreshold !== null && (
                <span style={{ color: '#8A88A8' }}> / threshold {alert.lowStockThreshold}</span>
              )}
            </span>
          )}
          {alert.restoredQuantity !== null && (
            <span style={{ fontSize: 10, color: '#1A8C52' }}>
              Restored: <span className="font-medium">+{alert.restoredQuantity}</span>
            </span>
          )}
          {alert.orderCode && (
            <span style={{ fontSize: 10, color: '#4A4770' }}>
              Order: <span className="font-medium">{alert.orderCode}</span>
            </span>
          )}
          <span style={{ fontSize: 10, color: '#8A88A8' }}>
            {new Date(alert.createdAt).toLocaleString('en-GB', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </span>
        </div>

        {/* Acknowledgement info */}
        {alert.acknowledgedAt && alert.acknowledgedBy && (
          <div
            className="mt-1.5 rounded-lg px-2 py-1"
            style={{ background: '#FFF8E8', fontSize: 10, color: '#D4820A' }}
          >
            Acknowledged by {alert.acknowledgedBy.phone} on{' '}
            {new Date(alert.acknowledgedAt).toLocaleString('en-GB', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
            {alert.acknowledgementNote && ` — "${alert.acknowledgementNote}"`}
          </div>
        )}

        {/* Status change info (resolve/dismiss) */}
        {alert.statusChangedAt && alert.statusChangedBy && alert.status !== 'ACKNOWLEDGED' && (
          <div
            className="mt-1.5 rounded-lg px-2 py-1"
            style={{
              background: alert.status === 'RESOLVED' ? '#EDFBF4' : '#F6F5FF',
              fontSize: 10,
              color: alert.status === 'RESOLVED' ? '#1A8C52' : '#8A88A8',
            }}
          >
            {STATUS_LABELS[alert.status]} by {alert.statusChangedBy.phone} on{' '}
            {new Date(alert.statusChangedAt).toLocaleString('en-GB', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
            {alert.statusNote && ` — "${alert.statusNote}"`}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
        {(alert.status === 'OPEN' || alert.status === 'ACKNOWLEDGED') && (
          <>
            {alert.status === 'OPEN' && (
              <button
                onClick={() => onAcknowledge(alert)}
                disabled={isLoading}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold"
                style={{
                  fontSize: 10,
                  background: '#EEF0FF',
                  color: '#5B4FE9',
                  border: '1px solid #C8C4F4',
                  opacity: isLoading ? 0.5 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
                title="Acknowledge this alert"
              >
                <CheckCircle2 size={11} />
                Acknowledge
              </button>
            )}
            <button
              onClick={() => onResolve(alert)}
              disabled={isLoading}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold"
              style={{
                fontSize: 10,
                background: '#EDFBF4',
                color: '#1A8C52',
                border: '1px solid #A8E6C4',
                opacity: isLoading ? 0.5 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
              title="Resolve this alert"
            >
              <CheckCircle2 size={11} />
              Resolve
            </button>
          </>
        )}
        {(alert.status === 'OPEN' || alert.status === 'ACKNOWLEDGED') && (
          <button
            onClick={() => {/* dismiss handled via bulk flow from action toolbar */}}
            disabled
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold"
            style={{
              fontSize: 10,
              background: '#F6F5FF',
              color: '#C0BDE8',
              border: '1px solid #E8E6F8',
              cursor: 'not-allowed',
            }}
            title="Select and use bulk dismiss"
          >
            <XCircle size={11} />
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type FilterStatus = AlertStatus | 'ALL';
type FilterKind   = AlertKind | 'ALL';

export default function InventoryAlertsPage() {
  const [alerts, setAlerts]             = useState<InventoryAlert[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [filterKind, setFilterKind]     = useState<FilterKind>('ALL');
  const [search, setSearch]             = useState('');

  // Selection
  const [selected, setSelected]         = useState<Set<string>>(new Set());

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading]     = useState(false);

  // Modals
  const [ackTarget, setAckTarget]    = useState<InventoryAlert | null>(null);
  const [resolveTarget, setResolveTarget] = useState<InventoryAlert | null>(null);
  const [bulkAction, setBulkAction]  = useState<'acknowledge' | 'dismiss' | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<InventoryAlert[]>(ep.inventoryAlerts + '?limit=100');
      setAlerts(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load inventory alerts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchAlerts(); }, [fetchAlerts]);

  // ── Filtered view ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const kw = search.toLowerCase();
    return alerts.filter(a => {
      if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;
      if (filterKind   !== 'ALL' && a.alertKind !== filterKind) return false;
      if (kw && !a.title.toLowerCase().includes(kw) &&
               !a.body.toLowerCase().includes(kw) &&
               !(a.branchName?.toLowerCase().includes(kw)) &&
               !(a.resourceLabel.toLowerCase().includes(kw)) &&
               !(a.merchantPhone.includes(kw)) &&
               !(a.orderCode?.toLowerCase().includes(kw))) return false;
      return true;
    });
  }, [alerts, filterStatus, filterKind, search]);

  const openCount = useMemo(() => alerts.filter(a => a.status === 'OPEN').length, [alerts]);
  const ackCount  = useMemo(() => alerts.filter(a => a.status === 'ACKNOWLEDGED').length, [alerts]);

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelected(new Set(filtered.map(a => a.notificationId)));
  };

  const clearSelection = () => setSelected(new Set());

  // ── Single actions ─────────────────────────────────────────────────────────
  async function handleAcknowledge(alert: InventoryAlert, note: string) {
    setActionLoading(alert.notificationId);
    try {
      await apiPost(ep.inventoryAlertAcknowledge(alert.notificationId), note ? { note } : {});
      await fetchAlerts();
      setSelected(prev => { const n = new Set(prev); n.delete(alert.notificationId); return n; });
    } finally {
      setActionLoading(null);
      setAckTarget(null);
    }
  }

  async function handleResolve(alert: InventoryAlert, note: string) {
    setActionLoading(alert.notificationId);
    try {
      await apiPost(ep.inventoryAlertResolve(alert.notificationId), note ? { note } : {});
      await fetchAlerts();
      setSelected(prev => { const n = new Set(prev); n.delete(alert.notificationId); return n; });
    } finally {
      setActionLoading(null);
      setResolveTarget(null);
    }
  }

  // ── Bulk actions ───────────────────────────────────────────────────────────
  async function handleBulkAcknowledge(note: string) {
    setBulkLoading(true);
    try {
      const ids = [...selected];
      await apiPost(ep.inventoryAlertsBulkAcknowledge, { notificationIds: ids, ...(note ? { note } : {}) });
      await fetchAlerts();
      clearSelection();
    } finally {
      setBulkLoading(false);
      setBulkAction(null);
    }
  }

  async function handleBulkDismiss(note: string) {
    setBulkLoading(true);
    try {
      const ids = [...selected];
      await apiPost(ep.inventoryAlertsBulkDismiss, { notificationIds: ids, ...(note ? { note } : {}) });
      await fetchAlerts();
      clearSelection();
    } finally {
      setBulkLoading(false);
      setBulkAction(null);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full" style={{ background: '#F0EFFB', minHeight: '100vh' }}>
      {/* Modals */}
      {ackTarget && (
        <NoteModal
          title={`Acknowledge: "${ackTarget.title}"`}
          action="Acknowledge"
          onConfirm={note => handleAcknowledge(ackTarget, note)}
          onCancel={() => setAckTarget(null)}
          loading={!!actionLoading}
        />
      )}
      {resolveTarget && (
        <NoteModal
          title={`Resolve: "${resolveTarget.title}"`}
          action="Resolve"
          onConfirm={note => handleResolve(resolveTarget, note)}
          onCancel={() => setResolveTarget(null)}
          loading={!!actionLoading}
        />
      )}
      {bulkAction && (
        <BulkModal
          count={selected.size}
          action={bulkAction}
          actionLabel={bulkAction === 'acknowledge' ? 'Bulk acknowledge' : 'Bulk dismiss'}
          onConfirm={note => bulkAction === 'acknowledge' ? handleBulkAcknowledge(note) : handleBulkDismiss(note)}
          onCancel={() => setBulkAction(null)}
          loading={bulkLoading}
        />
      )}

      <div className="flex-1 p-5 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-extrabold" style={{ fontSize: 16, color: '#1A1730' }}>
              Inventory Alerts
            </h1>
            <p style={{ fontSize: 11, color: '#8A88A8', marginTop: 2 }}>
              {loading ? '…' : `${alerts.length} total · ${openCount} open · ${ackCount} acknowledged`}
            </p>
          </div>
          <button
            onClick={() => void fetchAlerts()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-semibold"
            style={{ fontSize: 11, background: '#fff', color: '#4A4770', border: '1px solid #E8E6F8' }}
          >
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Summary chips */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(['ALL', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'] as const).map(s => {
            const count = s === 'ALL' ? alerts.length : alerts.filter(a => a.status === s).length;
            const active = filterStatus === s;
            return (
              <button
                key={s}
                onClick={() => { setFilterStatus(s); clearSelection(); }}
                className="rounded-xl px-3 py-1.5 font-semibold transition-colors"
                style={{
                  fontSize: 10,
                  background: active ? '#5B4FE9' : '#fff',
                  color: active ? '#fff' : '#4A4770',
                  border: active ? '1px solid #5B4FE9' : '1px solid #E8E6F8',
                }}
              >
                {s === 'ALL' ? 'All' : STATUS_LABELS[s as AlertStatus]} ({count})
              </button>
            );
          })}
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {/* Search */}
          <div
            className="flex items-center gap-1.5 rounded-xl px-3"
            style={{ height: 34, background: '#fff', border: '1px solid #E8E6F8', flex: '1 1 200px', maxWidth: 300 }}
          >
            <Search size={12} style={{ color: '#8A88A8' }} />
            <input
              placeholder="Search title, branch, merchant…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent outline-none flex-1"
              style={{ fontSize: 11, color: '#1A1730' }}
            />
          </div>

          {/* Kind filter */}
          <div className="relative">
            <select
              value={filterKind}
              onChange={e => { setFilterKind(e.target.value as FilterKind); clearSelection(); }}
              className="appearance-none rounded-xl px-3 pr-7 outline-none font-semibold cursor-pointer"
              style={{ height: 34, fontSize: 11, background: '#fff', color: '#4A4770', border: '1px solid #E8E6F8' }}
            >
              <option value="ALL">All kinds</option>
              <option value="ATTENTION">Attention (shortage)</option>
              <option value="COMPENSATION">Compensation (restock)</option>
            </select>
            <ChevronDown size={10} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#8A88A8', pointerEvents: 'none' }} />
          </div>

          {/* Filter icon label */}
          <div className="flex items-center gap-1" style={{ fontSize: 10, color: '#8A88A8' }}>
            <Filter size={10} />
            {filtered.length} shown
          </div>
        </div>

        {/* Bulk action bar — appears when items selected */}
        {selected.size > 0 && (
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-2.5 mb-4"
            style={{ background: '#EEF0FF', border: '1px solid #C8C4F4' }}
          >
            <span className="font-semibold" style={{ fontSize: 11, color: '#5B4FE9' }}>
              {selected.size} selected
            </span>
            <div className="flex-1" />
            <button
              onClick={selectAllFiltered}
              className="rounded-lg px-2.5 py-1.5 font-semibold"
              style={{ fontSize: 10, background: '#fff', color: '#5B4FE9', border: '1px solid #C8C4F4' }}
            >
              Select all {filtered.length}
            </button>
            <button
              onClick={() => setBulkAction('acknowledge')}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold"
              style={{ fontSize: 10, background: '#5B4FE9', color: '#fff' }}
            >
              <CheckCircle2 size={11} />
              Bulk acknowledge
            </button>
            <button
              onClick={() => setBulkAction('dismiss')}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold"
              style={{ fontSize: 10, background: '#FFF0F0', color: '#D84040', border: '1px solid #F5C6C6' }}
            >
              <XCircle size={11} />
              Bulk dismiss
            </button>
            <button
              onClick={clearSelection}
              className="rounded-lg px-2 py-1.5 font-semibold"
              style={{ fontSize: 10, color: '#8A88A8' }}
            >
              Clear
            </button>
          </div>
        )}

        {/* Alerts list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div
                className="rounded-full border-2 border-t-transparent"
                style={{ width: 28, height: 28, borderColor: '#5B4FE9', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}
              />
              <span style={{ fontSize: 12, color: '#8A88A8' }}>Loading alerts…</span>
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
              onClick={() => void fetchAlerts()}
              className="rounded-xl px-4 py-2 font-semibold"
              style={{ fontSize: 11, background: '#5B4FE9', color: '#fff' }}
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="flex flex-col items-center gap-3 py-20 rounded-2xl"
            style={{ background: '#fff', border: '1px solid #E8E6F8' }}
          >
            <PackageSearch size={32} style={{ color: '#C8C4F4' }} />
            <span className="font-semibold" style={{ fontSize: 13, color: '#8A88A8' }}>
              No alerts matching your filters
            </span>
            <button
              onClick={() => { setFilterStatus('ALL'); setFilterKind('ALL'); setSearch(''); }}
              className="rounded-xl px-4 py-2 font-semibold"
              style={{ fontSize: 11, background: '#F6F5FF', color: '#5B4FE9', border: '1px solid #C8C4F4' }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div>
            {filtered.map(alert => (
              <AlertRow
                key={alert.notificationId}
                alert={alert}
                selected={selected.has(alert.notificationId)}
                onSelect={toggleSelect}
                onAcknowledge={a => setAckTarget(a)}
                onResolve={a => setResolveTarget(a)}
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
