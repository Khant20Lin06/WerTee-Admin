'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileText, User, Store, Bike, ShoppingBag, Settings, Shield, Search } from 'lucide-react';
import { apiGet } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';
import { Spinner } from '@/components/ui/spinner';

// Matches backend AuditLogEntity exactly
type AuditLog = {
  auditLogId: string;
  actorType: string;
  actorRole: string | null;
  actionSource: string;
  action: string;
  resourceType: string;
  resourceId: string;
  resourceLabel: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  orderId: string | null;
  orderCode: string | null;
  branchId: string | null;
  branchName: string | null;
  actorUser: { userId: string; role: string; phone: string } | null;
  targetUser: { userId: string; role: string; phone: string } | null;
  createdAt: string;
};

const RESOURCE_ICON: Record<string, React.ElementType> = {
  MERCHANT: Store,
  RIDER: Bike,
  ORDER: ShoppingBag,
  ZONE: FileText,
  SETTINGS: Settings,
  USER: User,
};

const ACTION_COLOR: Record<string, { bg: string; color: string }> = {
  UPDATE: { bg: 'var(--brand-muted)', color: 'var(--brand)' },
  CREATE: { bg: 'var(--success-bg)', color: 'var(--success)' },
  DELETE: { bg: 'var(--danger-bg)',  color: 'var(--danger)' },
  CANCEL: { bg: 'var(--danger-bg)',  color: 'var(--danger)' },
  APPROVE: { bg: 'var(--success-bg)', color: 'var(--success)' },
  REJECT: { bg: 'var(--danger-bg)',  color: 'var(--danger)' },
  SUSPEND: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  ACTIVATE: { bg: 'var(--success-bg)', color: 'var(--success)' },
};

const ROLE_COLOR: Record<string, { bg: string; color: string }> = {
  ADMIN:    { bg: 'var(--brand-muted)', color: 'var(--brand)' },
  MERCHANT: { bg: 'var(--warning-bg)',  color: 'var(--warning)' },
  RIDER:    { bg: 'var(--success-bg)',  color: 'var(--success)' },
  CUSTOMER: { bg: 'var(--bg-subtle)',   color: 'var(--text-muted)' },
  SYSTEM:   { bg: 'var(--bg-subtle)',   color: 'var(--text-muted)' },
};

function getActionColors(action: string) {
  for (const [key, style] of Object.entries(ACTION_COLOR)) {
    if (action.toUpperCase().includes(key)) return style;
  }
  return { bg: 'var(--bg-subtle)', color: 'var(--text-muted)' };
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export default function AuditPage() {
  const [logs, setLogs]         = useState<AuditLog[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<AuditLog[]>(ep.audit);
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit logs.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = logs.filter(l => {
    const actorRole = l.actorRole ?? l.actorType ?? '';
    if (roleFilter !== 'all' && actorRole.toUpperCase() !== roleFilter) return false;
    if (typeFilter !== 'all' && l.resourceType.toUpperCase() !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matches =
        l.action.toLowerCase().includes(q) ||
        (l.actorUser?.phone ?? '').includes(q) ||
        (l.resourceLabel ?? '').toLowerCase().includes(q) ||
        (l.orderCode ?? '').toLowerCase().includes(q) ||
        (l.branchName ?? '').toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  const resourceTypes = [...new Set(logs.map(l => l.resourceType))].filter(Boolean);

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2 rounded-card px-3 py-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1.5 flex-1 rounded-lg px-2.5 py-1.5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          <Search size={12} style={{ color: 'var(--text-muted)' }} />
          <input placeholder="Search action, actor phone, resource…" className="bg-transparent outline-none flex-1" style={{ fontSize: 11, color: 'var(--text-primary)' }}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="rounded-lg px-2 py-1.5 outline-none" style={{ fontSize: 11, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">All roles</option>
          <option value="ADMIN">Admin</option>
          <option value="MERCHANT">Merchant</option>
          <option value="RIDER">Rider</option>
          <option value="CUSTOMER">Customer</option>
          <option value="SYSTEM">System</option>
        </select>
        <select className="rounded-lg px-2 py-1.5 outline-none" style={{ fontSize: 11, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">All resources</option>
          {resourceTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex items-center gap-1.5 px-2" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          <Shield size={12} />
          <span>{loading ? '…' : filtered.length} events</span>
        </div>
      </div>

      {/* States */}
      {loading && <div className="flex justify-center py-12"><Spinner /></div>}

      {!loading && error && (
        <div className="rounded-card px-4 py-3 text-center" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)' }}>
          <div style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</div>
          <button onClick={load} className="mt-2 font-semibold" style={{ fontSize: 11, color: 'var(--brand)' }}>Retry</button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-card px-4 py-10 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No audit events found</div>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="rounded-card overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {filtered.map((l, i) => {
            const ac = getActionColors(l.action);
            const role = l.actorRole ?? l.actorType ?? 'SYSTEM';
            const rc = ROLE_COLOR[role.toUpperCase()] ?? { bg: 'var(--bg-subtle)', color: 'var(--text-muted)' };
            const IconComp = RESOURCE_ICON[l.resourceType?.toUpperCase()] ?? FileText;
            const actorPhone = l.actorUser?.phone ?? '—';
            const target = l.resourceLabel ?? l.orderCode ?? l.branchName ?? l.resourceId?.slice(0, 8) ?? '—';
            const metaStr = l.metadata ? JSON.stringify(l.metadata).slice(0, 60) : null;

            return (
              <div key={l.auditLogId} className="flex items-start gap-3 px-4 py-3"
                style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none', background: i % 2 === 1 ? 'var(--bg-subtle)' : 'var(--bg-card)' }}>
                <div className="rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ width: 30, height: 30, background: ac.bg }}>
                  <IconComp size={13} style={{ color: ac.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold" style={{ fontSize: 10, color: 'var(--text-primary)' }}>{l.action}</span>
                    {metaStr && (
                      <span className="rounded-pill px-2 py-0.5 font-semibold truncate" style={{ fontSize: 9, background: ac.bg, color: ac.color, maxWidth: 200 }}>{metaStr}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <User size={9} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{actorPhone}</span>
                    <span style={{ color: 'var(--brand-border)' }}>·</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>on</span>
                    <span className="font-semibold" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{target}</span>
                    {l.resourceType && (
                      <span className="rounded-pill px-1.5 py-0.5 font-semibold" style={{ fontSize: 8, background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        {l.resourceType}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="rounded-pill px-2 py-0.5 font-semibold uppercase" style={{ fontSize: 9, background: rc.bg, color: rc.color }}>
                    {role.toLowerCase()}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 56, textAlign: 'right' }}>{formatTime(l.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
