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
  OPEN:         { bg: 'var(--danger-bg)',  color: 'var(--danger)' },
  ACKNOWLEDGED: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  RESOLVED:     { bg: 'var(--success-bg)', color: 'var(--success)' },
  DISMISSED:    { bg: 'var(--bg-subtle)',  color: 'var(--text-muted)' },
};

const ATTENTION_COLORS: Record<AttentionLevel, { bg: string; color: string }> = {
  LOW_STOCK:    { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  OUT_OF_STOCK: { bg: 'var(--danger-bg)',  color: 'var(--danger)' },
};

// ─── Note Modal ───────────────────────────────────────────────────────────────

function NoteModal({
  title, action, onConfirm, onCancel, loading,
}: {
  title: string; action: string;
  onConfirm: (note: string) => void; onCancel: () => void; loading: boolean;
}) {
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
        style={{ width: 400, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="font-extrabold" style={{ fontSize: 15, color: 'var(--text-primary)' }}>{title}</div>
        <textarea placeholder="Optional note (max 500 chars)…" maxLength={500} rows={3}
          value={note} onChange={e => setNote(e.target.value)}
          className="w-full rounded-xl outline-none resize-none px-3 py-2"
          style={{ fontSize: 12, color: 'var(--text-primary)', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }} />
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="rounded-xl px-4 py-2 font-semibold"
            style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(note)} disabled={loading} className="rounded-xl px-4 py-2 font-semibold"
            style={{ fontSize: 12, background: 'var(--brand)', color: '#fff', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Saving…' : action}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Note Modal ──────────────────────────────────────────────────────────

function BulkModal({
  count, action, actionLabel, onConfirm, onCancel, loading,
}: {
  count: number; action: 'acknowledge' | 'dismiss'; actionLabel: string;
  onConfirm: (note: string) => void; onCancel: () => void; loading: boolean;
}) {
  const [note, setNote] = useState('');
  const btnBg = action === 'acknowledge' ? 'var(--brand)' : 'var(--danger)';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
        style={{ width: 420, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="font-extrabold" style={{ fontSize: 15, color: 'var(--text-primary)' }}>
          {actionLabel} {count} alert{count !== 1 ? 's' : ''}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          This will {action} all {count} selected alert{count !== 1 ? 's' : ''} at once.
        </p>
        <textarea placeholder="Optional note (max 500 chars)…" maxLength={500} rows={3}
          value={note} onChange={e => setNote(e.target.value)}
          className="w-full rounded-xl outline-none resize-none px-3 py-2"
          style={{ fontSize: 12, color: 'var(--text-primary)', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }} />
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="rounded-xl px-4 py-2 font-semibold"
            style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(note)} disabled={loading} className="rounded-xl px-4 py-2 font-semibold"
            style={{ fontSize: 12, background: btnBg, color: '#fff', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Saving…' : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Alert Row ────────────────────────────────────────────────────────────────

function AlertRow({
  alert, selected, onSelect, onAcknowledge, onResolve, actionLoading,
}: {
  alert: InventoryAlert; selected: boolean;
  onSelect: (id: string) => void;
  onAcknowledge: (alert: InventoryAlert) => void;
  onResolve: (alert: InventoryAlert) => void;
  actionLoading: string | null;
}) {
  const statusStyle    = STATUS_COLORS[alert.status];
  const attentionStyle = alert.attentionLevel ? ATTENTION_COLORS[alert.attentionLevel] : null;
  const isLoading      = actionLoading === alert.notificationId;

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl border mb-2 transition-colors"
      style={{
        background:   selected ? 'var(--brand-muted)' : 'var(--bg-card)',
        borderColor:  selected ? 'var(--brand)'       : 'var(--border)',
      }}>
      {/* Checkbox */}
      <input type="checkbox" checked={selected} onChange={() => onSelect(alert.notificationId)}
        className="mt-1 flex-shrink-0 cursor-pointer"
        style={{ accentColor: 'var(--brand)', width: 14, height: 14 }} />

      {/* Icon */}
      <div className="flex-shrink-0 flex items-center justify-center rounded-lg mt-0.5"
        style={{ width: 32, height: 32, background: alert.alertKind === 'ATTENTION' ? 'var(--danger-bg)' : 'var(--brand-muted)' }}>
        {alert.alertKind === 'ATTENTION'
          ? <AlertTriangle size={15} style={{ color: 'var(--danger)' }} />
          : <PackageSearch  size={15} style={{ color: 'var(--brand)' }} />}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold truncate" style={{ fontSize: 12, color: 'var(--text-primary)' }}>
            {alert.title}
          </span>
          <span className="rounded-full px-2 py-0.5 font-bold flex-shrink-0"
            style={{ fontSize: 9, ...statusStyle }}>
            {STATUS_LABELS[alert.status]}
          </span>
          {attentionStyle && alert.attentionLevel && (
            <span className="rounded-full px-2 py-0.5 font-bold flex-shrink-0"
              style={{ fontSize: 9, ...attentionStyle }}>
              {alert.attentionLevel.replace('_', ' ')}
            </span>
          )}
          <span className="rounded-full px-2 py-0.5 font-bold flex-shrink-0"
            style={{
              fontSize: 9,
              background: alert.alertKind === 'ATTENTION' ? 'var(--danger-bg)' : 'var(--brand-muted)',
              color:      alert.alertKind === 'ATTENTION' ? 'var(--danger)'    : 'var(--brand)',
            }}>
            {alert.alertKind}
          </span>
        </div>

        <p className="mt-0.5" style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{alert.body}</p>

        <div className="flex items-center gap-4 mt-1 flex-wrap">
          {alert.branchName && (
            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
              Branch: <span className="font-medium">{alert.branchName}</span>
            </span>
          )}
          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            Merchant: <span className="font-medium">{alert.merchantPhone}</span>
          </span>
          {alert.stockQuantity !== null && (
            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
              Stock: <span className="font-medium">{alert.stockQuantity}</span>
              {alert.lowStockThreshold !== null && (
                <span style={{ color: 'var(--text-muted)' }}> / threshold {alert.lowStockThreshold}</span>
              )}
            </span>
          )}
          {alert.restoredQuantity !== null && (
            <span style={{ fontSize: 10, color: 'var(--success)' }}>
              Restored: <span className="font-medium">+{alert.restoredQuantity}</span>
            </span>
          )}
          {alert.orderCode && (
            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
              Order: <span className="font-medium">{alert.orderCode}</span>
            </span>
          )}
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {new Date(alert.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {alert.acknowledgedAt && alert.acknowledgedBy && (
          <div className="mt-1.5 rounded-lg px-2 py-1"
            style={{ background: 'var(--warning-bg)', fontSize: 10, color: 'var(--warning)' }}>
            Acknowledged by {alert.acknowledgedBy.phone} on{' '}
            {new Date(alert.acknowledgedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            {alert.acknowledgementNote && ` — "${alert.acknowledgementNote}"`}
          </div>
        )}

        {alert.statusChangedAt && alert.statusChangedBy && alert.status !== 'ACKNOWLEDGED' && (
          <div className="mt-1.5 rounded-lg px-2 py-1"
            style={{
              background: alert.status === 'RESOLVED' ? 'var(--success-bg)' : 'var(--bg-subtle)',
              fontSize: 10,
              color: alert.status === 'RESOLVED' ? 'var(--success)' : 'var(--text-muted)',
            }}>
            {STATUS_LABELS[alert.status]} by {alert.statusChangedBy.phone} on{' '}
            {new Date(alert.statusChangedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            {alert.statusNote && ` — "${alert.statusNote}"`}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
        {(alert.status === 'OPEN' || alert.status === 'ACKNOWLEDGED') && (
          <>
            {alert.status === 'OPEN' && (
              <button onClick={() => onAcknowledge(alert)} disabled={isLoading}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold"
                style={{ fontSize: 10, background: 'var(--brand-muted)', color: 'var(--brand)', border: '1px solid var(--brand-border)', opacity: isLoading ? 0.5 : 1 }}
                title="Acknowledge this alert">
                <CheckCircle2 size={11} /> Acknowledge
              </button>
            )}
            <button onClick={() => onResolve(alert)} disabled={isLoading}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold"
              style={{ fontSize: 10, background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)', opacity: isLoading ? 0.5 : 1 }}
              title="Resolve this alert">
              <CheckCircle2 size={11} /> Resolve
            </button>
          </>
        )}
        {(alert.status === 'OPEN' || alert.status === 'ACKNOWLEDGED') && (
          <button disabled className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold"
            style={{ fontSize: 10, background: 'var(--bg-subtle)', color: 'var(--text-faint)', border: '1px solid var(--border)', cursor: 'not-allowed' }}
            title="Select and use bulk dismiss">
            <XCircle size={11} /> Dismiss
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
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [filterKind, setFilterKind]     = useState<FilterKind>('ALL');
  const [search, setSearch]             = useState('');
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading]     = useState(false);
  const [ackTarget, setAckTarget]    = useState<InventoryAlert | null>(null);
  const [resolveTarget, setResolveTarget] = useState<InventoryAlert | null>(null);
  const [bulkAction, setBulkAction]  = useState<'acknowledge' | 'dismiss' | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await apiGet<InventoryAlert[]>(ep.inventoryAlerts + '?limit=100');
      setAlerts(Array.isArray(data) ? data : []);
    } catch { setError('Failed to load inventory alerts.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchAlerts(); }, [fetchAlerts]);

  const filtered = useMemo(() => {
    const kw = search.toLowerCase();
    return alerts.filter(a => {
      if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;
      if (filterKind   !== 'ALL' && a.alertKind !== filterKind) return false;
      if (kw && !a.title.toLowerCase().includes(kw) && !a.body.toLowerCase().includes(kw) &&
               !(a.branchName?.toLowerCase().includes(kw)) && !(a.resourceLabel.toLowerCase().includes(kw)) &&
               !(a.merchantPhone.includes(kw)) && !(a.orderCode?.toLowerCase().includes(kw))) return false;
      return true;
    });
  }, [alerts, filterStatus, filterKind, search]);

  const openCount = useMemo(() => alerts.filter(a => a.status === 'OPEN').length, [alerts]);
  const ackCount  = useMemo(() => alerts.filter(a => a.status === 'ACKNOWLEDGED').length, [alerts]);

  const toggleSelect    = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAllFiltered = () => setSelected(new Set(filtered.map(a => a.notificationId)));
  const clearSelection  = () => setSelected(new Set());

  async function handleAcknowledge(alert: InventoryAlert, note: string) {
    setActionLoading(alert.notificationId);
    try {
      await apiPost(ep.inventoryAlertAcknowledge(alert.notificationId), note ? { note } : {});
      await fetchAlerts();
      setSelected(prev => { const n = new Set(prev); n.delete(alert.notificationId); return n; });
    } finally { setActionLoading(null); setAckTarget(null); }
  }

  async function handleResolve(alert: InventoryAlert, note: string) {
    setActionLoading(alert.notificationId);
    try {
      await apiPost(ep.inventoryAlertResolve(alert.notificationId), note ? { note } : {});
      await fetchAlerts();
      setSelected(prev => { const n = new Set(prev); n.delete(alert.notificationId); return n; });
    } finally { setActionLoading(null); setResolveTarget(null); }
  }

  async function handleBulkAcknowledge(note: string) {
    setBulkLoading(true);
    try {
      await apiPost(ep.inventoryAlertsBulkAcknowledge, { notificationIds: [...selected], ...(note ? { note } : {}) });
      await fetchAlerts(); clearSelection();
    } finally { setBulkLoading(false); setBulkAction(null); }
  }

  async function handleBulkDismiss(note: string) {
    setBulkLoading(true);
    try {
      await apiPost(ep.inventoryAlertsBulkDismiss, { notificationIds: [...selected], ...(note ? { note } : {}) });
      await fetchAlerts(); clearSelection();
    } finally { setBulkLoading(false); setBulkAction(null); }
  }

  return (
    <div className="flex flex-col h-full" style={{ minHeight: '100vh' }}>
      {/* Modals */}
      {ackTarget && (
        <NoteModal title={`Acknowledge: "${ackTarget.title}"`} action="Acknowledge"
          onConfirm={note => handleAcknowledge(ackTarget, note)} onCancel={() => setAckTarget(null)} loading={!!actionLoading} />
      )}
      {resolveTarget && (
        <NoteModal title={`Resolve: "${resolveTarget.title}"`} action="Resolve"
          onConfirm={note => handleResolve(resolveTarget, note)} onCancel={() => setResolveTarget(null)} loading={!!actionLoading} />
      )}
      {bulkAction && (
        <BulkModal count={selected.size} action={bulkAction}
          actionLabel={bulkAction === 'acknowledge' ? 'Bulk acknowledge' : 'Bulk dismiss'}
          onConfirm={note => bulkAction === 'acknowledge' ? handleBulkAcknowledge(note) : handleBulkDismiss(note)}
          onCancel={() => setBulkAction(null)} loading={bulkLoading} />
      )}

      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-extrabold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Inventory Alerts</h1>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {loading ? '…' : `${alerts.length} total · ${openCount} open · ${ackCount} acknowledged`}
            </p>
          </div>
          <button onClick={() => void fetchAlerts()} disabled={loading}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-semibold"
            style={{ fontSize: 11, background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
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
              <button key={s} onClick={() => { setFilterStatus(s); clearSelection(); }}
                className="rounded-xl px-3 py-1.5 font-semibold transition-colors"
                style={{
                  fontSize: 10,
                  background: active ? 'var(--brand)' : 'var(--bg-card)',
                  color:      active ? '#fff'         : 'var(--text-secondary)',
                  border:     active ? '1px solid var(--brand)' : '1px solid var(--border)',
                }}>
                {s === 'ALL' ? 'All' : STATUS_LABELS[s as AlertStatus]} ({count})
              </button>
            );
          })}
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 rounded-xl px-3"
            style={{ height: 34, background: 'var(--bg-card)', border: '1px solid var(--border)', flex: '1 1 200px', maxWidth: 300 }}>
            <Search size={12} style={{ color: 'var(--text-muted)' }} />
            <input placeholder="Search title, branch, merchant…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent outline-none flex-1"
              style={{ fontSize: 11, color: 'var(--text-primary)' }} />
          </div>

          <div className="relative">
            <select value={filterKind} onChange={e => { setFilterKind(e.target.value as FilterKind); clearSelection(); }}
              className="appearance-none rounded-xl px-3 pr-7 outline-none font-semibold cursor-pointer"
              style={{ height: 34, fontSize: 11, background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              <option value="ALL">All kinds</option>
              <option value="ATTENTION">Attention (shortage)</option>
              <option value="COMPENSATION">Compensation (restock)</option>
            </select>
            <ChevronDown size={10} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          </div>

          <div className="flex items-center gap-1" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            <Filter size={10} />
            {filtered.length} shown
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 mb-4"
            style={{ background: 'var(--brand-muted)', border: '1px solid var(--brand-border)' }}>
            <span className="font-semibold" style={{ fontSize: 11, color: 'var(--brand)' }}>{selected.size} selected</span>
            <div className="flex-1" />
            <button onClick={selectAllFiltered} className="rounded-lg px-2.5 py-1.5 font-semibold"
              style={{ fontSize: 10, background: 'var(--bg-card)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>
              Select all {filtered.length}
            </button>
            <button onClick={() => setBulkAction('acknowledge')}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold"
              style={{ fontSize: 10, background: 'var(--brand)', color: '#fff' }}>
              <CheckCircle2 size={11} /> Bulk acknowledge
            </button>
            <button onClick={() => setBulkAction('dismiss')}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold"
              style={{ fontSize: 10, background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
              <XCircle size={11} /> Bulk dismiss
            </button>
            <button onClick={clearSelection} className="rounded-lg px-2 py-1.5 font-semibold"
              style={{ fontSize: 10, color: 'var(--text-muted)' }}>Clear</button>
          </div>
        )}

        {/* Alerts list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full border-2 border-t-transparent"
                style={{ width: 28, height: 28, borderColor: 'var(--brand)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading alerts…</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-20 rounded-2xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <AlertTriangle size={32} style={{ color: 'var(--danger)' }} />
            <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>
            <button onClick={() => void fetchAlerts()} className="rounded-xl px-4 py-2 font-semibold"
              style={{ fontSize: 11, background: 'var(--brand)', color: '#fff' }}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 rounded-2xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <PackageSearch size={32} style={{ color: 'var(--brand-border)' }} />
            <span className="font-semibold" style={{ fontSize: 13, color: 'var(--text-muted)' }}>No alerts matching your filters</span>
            <button onClick={() => { setFilterStatus('ALL'); setFilterKind('ALL'); setSearch(''); }}
              className="rounded-xl px-4 py-2 font-semibold"
              style={{ fontSize: 11, background: 'var(--bg-subtle)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div>
            {filtered.map(alert => (
              <AlertRow key={alert.notificationId} alert={alert}
                selected={selected.has(alert.notificationId)}
                onSelect={toggleSelect}
                onAcknowledge={a => setAckTarget(a)}
                onResolve={a => setResolveTarget(a)}
                actionLoading={actionLoading} />
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
