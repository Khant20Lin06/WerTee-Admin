'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Tag, Plus, TrendingUp, Users, Percent, Calendar,
  X, Search, ToggleLeft, ToggleRight, Edit2,
} from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';
import { Spinner } from '@/components/ui/spinner';

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
  ACTIVE:    { bg: '#E8FAF2', color: '#16A660', label: 'Active' },
  EXPIRED:   { bg: '#F6F5FF', color: '#8A88A8', label: 'Expired' },
  SCHEDULED: { bg: '#EEF0FF', color: '#5B4FE9', label: 'Scheduled' },
  INACTIVE:  { bg: '#FFF0F0', color: '#D84040', label: 'Inactive' },
};

const ICON_BG = ['#EEF0FF', '#E8FAF2', '#FFF8E8', '#F6F5FF', '#FFF0F0'];
const ICON_FG = ['#5B4FE9', '#16A660', '#D4820A', '#8A88A8', '#D84040'];

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
      style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ width: 32, height: 32, background: iconBg }}>
            <Tag size={14} style={{ color: iconFg }} />
          </div>
          <div className="min-w-0">
            <code className="font-mono font-extrabold block truncate" style={{ fontSize: 13, color: '#1A1730' }}>{p.code}</code>
            <div className="truncate" style={{ fontSize: 10, color: '#8A88A8' }}>{p.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="rounded-pill px-2 py-0.5 font-semibold"
            style={{ fontSize: 9, background: ss.bg, color: ss.color }}>{ss.label}</span>
          <button onClick={() => onEdit(p)} title="Edit"
            className="rounded-lg p-1" style={{ background: '#F6F5FF' }}>
            <Edit2 size={11} style={{ color: '#5B4FE9' }} />
          </button>
        </div>
      </div>

      {/* Discount + min order */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Percent size={11} style={{ color: '#5B4FE9' }} />
          <span className="font-extrabold" style={{ fontSize: 15, color: '#5B4FE9' }}>{fmtDiscount(p)}</span>
        </div>
        <span style={{ fontSize: 10, color: '#8A88A8' }}>
          off · min {Number(p.minimumSubtotalAmount).toLocaleString()} MMK
        </span>
      </div>

      {/* Branch / merchant */}
      {(p.merchantName || p.branchName) && (
        <div style={{ fontSize: 10, color: '#8A88A8' }}>
          {p.merchantName}{p.branchName ? ` — ${p.branchName}` : ''}
        </div>
      )}

      {/* Usage bar — no usageLimit in schema so show count only */}
      <div>
        <div className="flex justify-between mb-1">
          <span style={{ fontSize: 10, color: '#8A88A8' }}>Redemptions</span>
          <span className="font-semibold" style={{ fontSize: 10, color: '#4A4770' }}>{p.usageCount.toLocaleString()}</span>
        </div>
        <div className="rounded-full overflow-hidden" style={{ height: 5, background: '#F6F5FF' }}>
          <div className="rounded-full h-full"
            style={{ width: p.usageCount > 0 ? '100%' : '0%', background: '#5B4FE9', opacity: 0.5 + Math.min(p.usageCount / 100, 0.5) }} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid #E8E6F8' }}>
        <div className="flex items-center gap-1">
          <Calendar size={10} style={{ color: '#8A88A8' }} />
          <span style={{ fontSize: 10, color: '#8A88A8' }}>
            {p.endsAt ? `Expires ${fmtDate(p.endsAt)}` : 'No expiry'}
          </span>
        </div>
        <button
          onClick={() => onToggle(p)}
          className="flex items-center gap-1"
          style={{ fontSize: 10, color: p.isActive ? '#16A660' : '#D84040' }}
          title={p.isActive ? 'Deactivate' : 'Activate'}
        >
          {p.isActive
            ? <ToggleRight size={16} style={{ color: '#16A660' }} />
            : <ToggleLeft  size={16} style={{ color: '#D84040' }} />}
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
    border: '1.5px solid #E8E6F8', background: '#F6F5FF', color: '#1A1730', outline: 'none',
  };
  const labelStyle = { fontSize: 10, fontWeight: 600, color: '#4A4770', marginBottom: 4, display: 'block' as const };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(26,23,48,0.35)' }}>
      <div className="rounded-card w-full flex flex-col" style={{ maxWidth: 520, maxHeight: '90vh', background: '#fff', boxShadow: '0 8px 40px rgba(91,79,233,0.18)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#E8E6F8' }}>
          <div className="flex items-center gap-2">
            <div className="rounded-lg flex items-center justify-center" style={{ width: 30, height: 30, background: '#EEF0FF' }}>
              <Tag size={14} style={{ color: '#5B4FE9' }} />
            </div>
            <span className="font-extrabold" style={{ fontSize: 14, color: '#1A1730' }}>
              {mode.type === 'create' ? 'Create promotion' : `Edit · ${editing?.code}`}
            </span>
          </div>
          <button onClick={onClose}><X size={15} style={{ color: '#8A88A8' }} /></button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {mode.type === 'create' && (
            <div>
              <label style={labelStyle}>Branch ID *</label>
              <input style={inputStyle} placeholder="branch_xxxxx" value={branchId} onChange={e => setBranchId(e.target.value)} />
              <div style={{ fontSize: 9, color: '#8A88A8', marginTop: 3 }}>Find the branch ID from Merchants page</div>
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
            style={{ background: '#F6F5FF', border: '1px solid #E8E6F8' }}>
            <span style={{ fontSize: 12, color: '#4A4770', fontWeight: 600 }}>Active</span>
            <button type="button" onClick={() => setIsActive(v => !v)}>
              {isActive
                ? <ToggleRight size={22} style={{ color: '#16A660' }} />
                : <ToggleLeft  size={22} style={{ color: '#D84040' }} />}
            </button>
          </div>

          {err && (
            <div className="rounded-lg px-3 py-2" style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', fontSize: 11, color: '#D84040' }}>
              {err}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t" style={{ borderColor: '#E8E6F8' }}>
          <button type="button" onClick={onClose} className="flex-1 rounded-card py-2 font-semibold"
            style={{ fontSize: 12, border: '1px solid #E8E6F8', color: '#4A4770', background: '#F6F5FF' }}>
            Cancel
          </button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={saving}
            className="flex-1 rounded-card py-2 font-bold flex items-center justify-center gap-2"
            style={{ fontSize: 12, background: '#5B4FE9', color: '#fff', opacity: saving ? 0.7 : 1 }}>
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

  // Performance table: top promos by usage count (active only)
  const topPromos = [...promotions]
    .filter(p => p.usageCount > 0)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 8);
  const maxUsage = topPromos[0]?.usageCount ?? 1;

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'All',       val: 'all',       count: counts.all,       color: '#5B4FE9', bg: '#EEF0FF' },
            { label: 'Active',    val: 'ACTIVE',    count: counts.ACTIVE,    color: '#16A660', bg: '#E8FAF2' },
            { label: 'Expired',   val: 'EXPIRED',   count: counts.EXPIRED,   color: '#8A88A8', bg: '#F6F5FF' },
            { label: 'Scheduled', val: 'SCHEDULED', count: counts.SCHEDULED, color: '#5B4FE9', bg: '#EEF0FF' },
            { label: 'Inactive',  val: 'INACTIVE',  count: counts.INACTIVE,  color: '#D84040', bg: '#FFF0F0' },
          ].map(c => (
            <button key={c.val} onClick={() => setFilter(c.val)}
              className="rounded-pill px-3 py-1 font-bold"
              style={{
                fontSize: 11,
                background: filter === c.val ? c.color : c.bg,
                color: filter === c.val ? '#fff' : c.color,
                border: `1px solid ${c.color}30`,
              }}>
              {c.label} <span className="ml-1">{loading ? '…' : c.count}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
            style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
            <Search size={11} style={{ color: '#8A88A8' }} />
            <input
              placeholder="Search code or merchant…"
              className="bg-transparent outline-none"
              style={{ fontSize: 11, width: 160 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* Create button */}
          <button
            onClick={() => setModal({ type: 'create' })}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-bold"
            style={{ fontSize: 12, background: '#5B4FE9', color: '#fff' }}>
            <Plus size={13} /> Create promo
          </button>
        </div>
      </div>

      {/* States */}
      {loading && <div className="flex justify-center py-12"><Spinner /></div>}

      {!loading && error && (
        <div className="rounded-card px-4 py-3 text-center" style={{ background: '#FFF0F0', border: '1px solid #FFD0D0' }}>
          <div style={{ fontSize: 12, color: '#D84040' }}>{error}</div>
          <button onClick={load} className="mt-2 font-semibold" style={{ fontSize: 11, color: '#5B4FE9' }}>Retry</button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-card px-4 py-12 text-center" style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
          <Tag size={28} style={{ color: '#C8C4F8', margin: '0 auto 8px' }} />
          <div style={{ fontSize: 13, color: '#8A88A8' }}>
            {promotions.length === 0 ? 'No promotions yet. Create the first one.' : 'No promotions match this filter.'}
          </div>
          {promotions.length === 0 && (
            <button onClick={() => setModal({ type: 'create' })}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 font-bold"
              style={{ fontSize: 12, background: '#5B4FE9', color: '#fff' }}>
              <Plus size={13} /> Create promotion
            </button>
          )}
        </div>
      )}

      {/* Cards grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {filtered.map(({ p }, i) => (
            <PromoCard
              key={p.promotionId}
              p={p}
              idx={i}
              onToggle={handleToggle}
              onEdit={p => setModal({ type: 'edit', promo: p })}
            />
          ))}
        </div>
      )}

      {/* Performance table */}
      {!loading && topPromos.length > 0 && (
        <div className="rounded-card overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #E8E6F8' }}>
            <TrendingUp size={13} style={{ color: '#5B4FE9' }} />
            <span className="font-bold" style={{ fontSize: 13, color: '#1A1730' }}>Promo performance</span>
            <span style={{ fontSize: 10, color: '#8A88A8', marginLeft: 4 }}>by redemptions</span>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ background: '#F6F5FF' }}>
                {['Code', 'Merchant', 'Discount', 'Redemptions', 'Usage bar', 'Expires'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider"
                    style={{ fontSize: 9, color: '#8A88A8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topPromos.map((p, i) => {
                const barW = Math.round((p.usageCount / maxUsage) * 100);
                const status = deriveStatus(p);
                const ss = STATUS_STYLE[status];
                return (
                  <tr key={p.promotionId} style={{ borderTop: '1px solid #E8E6F8', background: i % 2 === 1 ? '#FAFAFA' : '#fff' }}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold" style={{ fontSize: 11, color: '#5B4FE9' }}>{p.code}</code>
                        <span className="rounded-pill px-1.5 py-0.5 font-semibold"
                          style={{ fontSize: 8, background: ss.bg, color: ss.color }}>{ss.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5" style={{ fontSize: 11, color: '#4A4770' }}>
                      {p.merchantName ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 font-semibold" style={{ fontSize: 11, color: '#5B4FE9' }}>
                      {fmtDiscount(p)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Users size={11} style={{ color: '#8A88A8' }} />
                        <span className="font-bold" style={{ fontSize: 11 }}>{p.usageCount.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5" style={{ width: 120 }}>
                      <div className="flex items-center gap-2">
                        <div className="rounded-full overflow-hidden flex-1" style={{ height: 5, background: '#F6F5FF' }}>
                          <div className="rounded-full h-full" style={{ width: `${barW}%`, background: '#5B4FE9' }} />
                        </div>
                        <span style={{ fontSize: 10, color: '#5B4FE9', fontWeight: 600, minWidth: 28 }}>{barW}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5" style={{ fontSize: 10, color: '#8A88A8' }}>
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
