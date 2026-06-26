'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Tag, Plus, TrendingUp, Users, Percent, Calendar,
  X, Search, ToggleLeft, ToggleRight, Edit2,
} from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';
import { Spinner } from '@/components/ui/spinner';
import { PaginationBar } from '@/components/ui/pagination-bar';

// Matches backend AdminPromotionDto exactly
type Promotion = {
  promotionId: string;
  branchId: string;
  branchName: string | null;
  merchantName: string | null;
  code: string;
  name: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: string;
  minimumSubtotalAmount: string;
  maximumDiscountAmount: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deriveStatus(p: Promotion): 'ACTIVE' | 'EXPIRED' | 'SCHEDULED' | 'INACTIVE' {
  if (!p.isActive) return 'INACTIVE';
  const now = Date.now();
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return 'SCHEDULED';
  if (p.endsAt && new Date(p.endsAt).getTime() < now) return 'EXPIRED';
  return 'ACTIVE';
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE:    { bg: 'var(--success-bg)',  color: 'var(--success)', label: 'Active' },
  EXPIRED:   { bg: 'var(--bg-subtle)',   color: 'var(--text-muted)', label: 'Expired' },
  SCHEDULED: { bg: 'var(--brand-muted)', color: 'var(--brand)', label: 'Scheduled' },
  INACTIVE:  { bg: 'var(--danger-bg)',   color: 'var(--danger)', label: 'Inactive' },
};

const ICON_BG = ['var(--brand-muted)', 'var(--success-bg)', 'var(--warning-bg)', 'var(--bg-subtle)', 'var(--danger-bg)'];
const ICON_FG = ['var(--brand)', 'var(--success)', 'var(--warning)', 'var(--text-muted)', 'var(--danger)'];

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDiscount(p: Promotion) {
  return p.discountType === 'PERCENTAGE'
    ? `${Number(p.discountValue)}%`
    : `${Number(p.discountValue).toLocaleString()} MMK`;
}

// ─── Promo Card ───────────────────────────────────────────────────────────────

function PromoCard({
  p, idx, onToggle, onEdit,
}: {
  p: Promotion;
  idx: number;
  onToggle: (p: Promotion) => void;
  onEdit: (p: Promotion) => void;
}) {
  const status = deriveStatus(p);
  const ss = STATUS_STYLE[status];
  const iconBg = ICON_BG[idx % 5];
  const iconFg = ICON_FG[idx % 5];

  return (
    <div className="rounded-card p-4 flex flex-col gap-3 relative"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ width: 32, height: 32, background: iconBg }}>
            <Tag size={14} style={{ color: iconFg }} />
          </div>
          <div className="min-w-0">
            <code className="font-mono font-extrabold block truncate" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{p.code}</code>
            <div className="truncate" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="rounded-pill px-2 py-0.5 font-semibold"
            style={{ fontSize: 9, background: ss.bg, color: ss.color }}>{ss.label}</span>
          <button onClick={() => onEdit(p)} title="Edit"
            className="rounded-lg p-1" style={{ background: 'var(--bg-subtle)' }}>
            <Edit2 size={11} style={{ color: 'var(--brand)' }} />
          </button>
        </div>
      </div>

      {/* Discount + min order */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Percent size={11} style={{ color: 'var(--brand)' }} />
          <span className="font-extrabold" style={{ fontSize: 15, color: 'var(--brand)' }}>{fmtDiscount(p)}</span>
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          off · min {Number(p.minimumSubtotalAmount).toLocaleString()} MMK
        </span>
      </div>

      {/* Branch / merchant */}
      {(p.merchantName || p.branchName) && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {p.merchantName}{p.branchName ? ` — ${p.branchName}` : ''}
        </div>
      )}

      {/* Usage bar */}
      <div>
        <div className="flex justify-between mb-1">
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Redemptions</span>
          <span className="font-semibold" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{p.usageCount.toLocaleString()}</span>
        </div>
        <div className="rounded-full overflow-hidden" style={{ height: 5, background: 'var(--bg-subtle)' }}>
          <div className="rounded-full h-full"
            style={{ width: p.usageCount > 0 ? '100%' : '0%', background: 'var(--brand)', opacity: 0.5 + Math.min(p.usageCount / 100, 0.5) }} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1">
          <Calendar size={10} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {p.endsAt ? `Expires ${fmtDate(p.endsAt)}` : 'No expiry'}
          </span>
        </div>
        <button
          onClick={() => onToggle(p)}
          className="flex items-center gap-1"
          style={{ fontSize: 10, color: p.isActive ? 'var(--success)' : 'var(--danger)' }}
          title={p.isActive ? 'Deactivate' : 'Activate'}
        >
          {p.isActive
            ? <ToggleRight size={16} style={{ color: 'var(--success)' }} />
            : <ToggleLeft  size={16} style={{ color: 'var(--danger)' }} />}
          <span>{p.isActive ? 'Active' : 'Inactive'}</span>
        </button>
      </div>
    </div>
  );
}

// ─── Create / Edit Modal ─────────────────────────────────────────────────────

type ModalMode = { type: 'create' } | { type: 'edit'; promo: Promotion };

function PromoModal({
  mode, onClose, onSaved,
}: {
  mode: ModalMode;
  onClose: () => void;
  onSaved: (p: Promotion) => void;
}) {
  const editing = mode.type === 'edit' ? mode.promo : null;

  const [branchId, setBranchId]     = useState(editing?.branchId ?? '');
  const [code, setCode]             = useState(editing?.code ?? '');
  const [name, setName]             = useState(editing?.name ?? '');
  const [description, setDesc]      = useState(editing?.description ?? '');
  const [discountType, setDType]    = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>(editing?.discountType ?? 'PERCENTAGE');
  const [discountValue, setDValue]  = useState(editing ? String(Number(editing.discountValue)) : '');
  const [minOrder, setMinOrder]     = useState(editing ? String(Number(editing.minimumSubtotalAmount)) : '0');
  const [maxDiscount, setMaxDisc]   = useState(editing?.maximumDiscountAmount ? String(Number(editing.maximumDiscountAmount)) : '');
  const [startsAt, setStartsAt]     = useState(editing?.startsAt ? editing.startsAt.slice(0, 10) : '');
  const [endsAt, setEndsAt]         = useState(editing?.endsAt ? editing.endsAt.slice(0, 10) : '');
  const [isActive, setIsActive]     = useState(editing?.isActive ?? true);
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !discountValue) { setErr('Code, name, and discount value are required.'); return; }
    if (!branchId.trim() && mode.type === 'create') { setErr('Branch ID is required.'); return; }

    setSaving(true);
    setErr('');
    try {
      const payload: Record<string, unknown> = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
        discountType,
        discountValue: Number(discountValue),
        minimumSubtotalAmount: Number(minOrder) || 0,
        maximumDiscountAmount: maxDiscount ? Number(maxDiscount) : undefined,
        startsAt: startsAt || undefined,
        endsAt: endsAt || undefined,
        isActive,
      };

      let result: Promotion;
      if (mode.type === 'create') {
        result = await apiPost<Promotion>(ep.promotions, { ...payload, branchId: branchId.trim() });
      } else {
        result = await apiPatch<Promotion>(ep.promotion(editing!.promotionId), payload);
      }
      onSaved(result);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save promotion.');
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 10,
    border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-primary)', outline: 'none',
  };
  const labelStyle = { fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' as const };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="rounded-card w-full flex flex-col" style={{ maxWidth: 520, maxHeight: '90vh', background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="rounded-lg flex items-center justify-center" style={{ width: 30, height: 30, background: 'var(--brand-muted)' }}>
              <Tag size={14} style={{ color: 'var(--brand)' }} />
            </div>
            <span className="font-extrabold" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
              {mode.type === 'create' ? 'Create promotion' : `Edit · ${editing?.code}`}
            </span>
          </div>
          <button onClick={onClose}><X size={15} style={{ color: 'var(--text-muted)' }} /></button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {mode.type === 'create' && (
            <div>
              <label style={labelStyle}>Branch ID *</label>
              <input style={inputStyle} placeholder="branch_xxxxx" value={branchId} onChange={e => setBranchId(e.target.value)} />
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>Find the branch ID from Merchants page</div>
            </div>
          )}

          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label style={labelStyle}>Promo code *</label>
              <input style={inputStyle} placeholder="SAVE20" value={code}
                onChange={e => setCode(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label style={labelStyle}>Display name *</label>
              <input style={inputStyle} placeholder="20% off weekend" value={name} onChange={e => setName(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <input style={inputStyle} placeholder="Optional merchant-facing note" value={description} onChange={e => setDesc(e.target.value)} />
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label style={labelStyle}>Discount type *</label>
              <select style={{ ...inputStyle }} value={discountType} onChange={e => setDType(e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT')}>
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED_AMOUNT">Fixed amount (MMK)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Discount value *</label>
              <input style={inputStyle} type="number" min={0.01} step={0.01}
                placeholder={discountType === 'PERCENTAGE' ? '20' : '500'}
                value={discountValue} onChange={e => setDValue(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label style={labelStyle}>Min order (MMK)</label>
              <input style={inputStyle} type="number" min={0} placeholder="5000" value={minOrder} onChange={e => setMinOrder(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Max discount cap (MMK)</label>
              <input style={inputStyle} type="number" min={0.01} placeholder="Optional cap" value={maxDiscount} onChange={e => setMaxDisc(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label style={labelStyle}>Starts at</label>
              <input style={inputStyle} type="date" value={startsAt} onChange={e => setStartsAt(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Expires at</label>
              <input style={inputStyle} type="date" value={endsAt} onChange={e => setEndsAt(e.target.value)} />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg px-3 py-2.5"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Active</span>
            <button type="button" onClick={() => setIsActive(v => !v)}>
              {isActive
                ? <ToggleRight size={22} style={{ color: 'var(--success)' }} />
                : <ToggleLeft  size={22} style={{ color: 'var(--danger)' }} />}
            </button>
          </div>

          {err && (
            <div className="rounded-lg px-3 py-2" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', fontSize: 11, color: 'var(--danger)' }}>
              {err}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button type="button" onClick={onClose} className="flex-1 rounded-card py-2 font-semibold"
            style={{ fontSize: 12, border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-subtle)' }}>
            Cancel
          </button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={saving}
            className="flex-1 rounded-card py-2 font-bold flex items-center justify-center gap-2"
            style={{ fontSize: 12, background: 'var(--brand)', color: '#fff', opacity: saving ? 0.7 : 1 }}>
            {saving ? <Spinner size={14} /> : (mode.type === 'create' ? 'Create promotion' : 'Save changes')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [filter, setFilter]         = useState('all');
  const [search, setSearch]         = useState('');
  const [modal, setModal]           = useState<ModalMode | null>(null);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<Promotion[]>(ep.promotions);
      setPromotions(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load promotions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleToggle(p: Promotion) {
    try {
      const updated = await apiPatch<Promotion>(ep.promotion(p.promotionId), { isActive: !p.isActive });
      setPromotions(prev => prev.map(x => x.promotionId === p.promotionId ? updated : x));
    } catch { /* silent */ }
  }

  function handleSaved(saved: Promotion) {
    setPromotions(prev => {
      const exists = prev.find(x => x.promotionId === saved.promotionId);
      return exists
        ? prev.map(x => x.promotionId === saved.promotionId ? saved : x)
        : [saved, ...prev];
    });
  }

  // Derived status for each promo
  const withStatus = useMemo(() =>
    promotions.map(p => ({ p, status: deriveStatus(p) })),
    [promotions],
  );

  const counts = {
    all: promotions.length,
    ACTIVE:    withStatus.filter(x => x.status === 'ACTIVE').length,
    EXPIRED:   withStatus.filter(x => x.status === 'EXPIRED').length,
    SCHEDULED: withStatus.filter(x => x.status === 'SCHEDULED').length,
    INACTIVE:  withStatus.filter(x => x.status === 'INACTIVE').length,
  };

  const filtered = withStatus.filter(({ p, status }) => {
    if (filter !== 'all' && status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.code.toLowerCase().includes(q) && !(p.merchantName ?? '').toLowerCase().includes(q) && !(p.name ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const total      = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage   = Math.min(page, totalPages);
  const from       = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to         = Math.min(safePage * pageSize, total);
  const pageRows   = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Performance table: top promos by usage count (active only)
  const topPromos = [...promotions]
    .filter(p => p.usageCount > 0)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 8);
  const maxUsage = topPromos[0]?.usageCount ?? 1;

  const CHIP_STYLES = [
    { val: 'all',       label: 'All',       color: 'var(--brand)',   bg: 'var(--brand-muted)',  count: counts.all },
    { val: 'ACTIVE',    label: 'Active',    color: 'var(--success)', bg: 'var(--success-bg)',   count: counts.ACTIVE },
    { val: 'EXPIRED',   label: 'Expired',   color: 'var(--text-muted)', bg: 'var(--bg-subtle)', count: counts.EXPIRED },
    { val: 'SCHEDULED', label: 'Scheduled', color: 'var(--brand)',   bg: 'var(--brand-muted)',  count: counts.SCHEDULED },
    { val: 'INACTIVE',  label: 'Inactive',  color: 'var(--danger)',  bg: 'var(--danger-bg)',    count: counts.INACTIVE },
  ];

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap">
          {CHIP_STYLES.map(c => (
            <button key={c.val} onClick={() => { setFilter(c.val); setPage(1); }}
              className="rounded-pill px-3 py-1 font-bold"
              style={{
                fontSize: 11,
                background: filter === c.val ? c.color : c.bg,
                color: filter === c.val ? '#fff' : c.color,
                border: `1px solid ${c.color}`,
                opacity: filter === c.val ? 1 : 0.85,
              }}>
              {c.label} <span className="ml-1">{loading ? '…' : c.count}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Search size={11} style={{ color: 'var(--text-muted)' }} />
            <input
              placeholder="Search code or merchant…"
              className="bg-transparent outline-none"
              style={{ fontSize: 11, width: 160, color: 'var(--text-primary)' }}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          {/* Create button */}
          <button
            onClick={() => setModal({ type: 'create' })}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-bold"
            style={{ fontSize: 12, background: 'var(--brand)', color: '#fff' }}>
            <Plus size={13} /> Create promo
          </button>
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
        <div className="rounded-card px-4 py-12 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <Tag size={28} style={{ color: 'var(--brand-border)', margin: '0 auto 8px' }} />
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {promotions.length === 0 ? 'No promotions yet. Create the first one.' : 'No promotions match this filter.'}
          </div>
          {promotions.length === 0 && (
            <button onClick={() => setModal({ type: 'create' })}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 font-bold"
              style={{ fontSize: 12, background: 'var(--brand)', color: '#fff' }}>
              <Plus size={13} /> Create promotion
            </button>
          )}
        </div>
      )}

      {/* Cards grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="rounded-card overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="grid gap-3 p-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {pageRows.map(({ p }, i) => (
              <PromoCard
                key={p.promotionId}
                p={p}
                idx={i}
                onToggle={handleToggle}
                onEdit={p => setModal({ type: 'edit', promo: p })}
              />
            ))}
          </div>
          <PaginationBar
            page={safePage} totalPages={totalPages} total={total}
            pageSize={pageSize} from={from} to={to}
            onPage={setPage}
            onPageSize={(v) => { setPageSize(v); setPage(1); }}
          />
        </div>
      )}

      {/* Performance table */}
      {!loading && topPromos.length > 0 && (
        <div className="rounded-card overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <TrendingUp size={13} style={{ color: 'var(--brand)' }} />
            <span className="font-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>Promo performance</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>by redemptions</span>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                {['Code', 'Merchant', 'Discount', 'Redemptions', 'Usage bar', 'Expires'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider"
                    style={{ fontSize: 9, color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topPromos.map((p, i) => {
                const barW = Math.round((p.usageCount / maxUsage) * 100);
                const status = deriveStatus(p);
                const ss = STATUS_STYLE[status];
                return (
                  <tr key={p.promotionId} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 1 ? 'var(--bg-subtle)' : 'var(--bg-card)' }}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold" style={{ fontSize: 11, color: 'var(--brand)' }}>{p.code}</code>
                        <span className="rounded-pill px-1.5 py-0.5 font-semibold"
                          style={{ fontSize: 8, background: ss.bg, color: ss.color }}>{ss.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {p.merchantName ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 font-semibold" style={{ fontSize: 11, color: 'var(--brand)' }}>
                      {fmtDiscount(p)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Users size={11} style={{ color: 'var(--text-muted)' }} />
                        <span className="font-bold" style={{ fontSize: 11, color: 'var(--text-primary)' }}>{p.usageCount.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5" style={{ width: 120 }}>
                      <div className="flex items-center gap-2">
                        <div className="rounded-full overflow-hidden flex-1" style={{ height: 5, background: 'var(--bg-subtle)' }}>
                          <div className="rounded-full h-full" style={{ width: `${barW}%`, background: 'var(--brand)' }} />
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--brand)', fontWeight: 600, minWidth: 28 }}>{barW}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {fmtDate(p.endsAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <PromoModal
          mode={modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
