'use client';

import { useEffect, useState, useCallback } from 'react';
import { Star, TrendingUp, Store, Bike, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiGet } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';
import { Spinner } from '@/components/ui/spinner';

// ── Types ─────────────────────────────────────────────────────────────────────

type RatingsStats = {
  totalCount: number;
  branch:   { count: number; average: number };
  rider:    { count: number; average: number };
  customer: { count: number; average: number };
  scoreDistribution: { score: number; count: number }[];
};

type RatingItem = {
  id: string;
  orderId: string;
  raterType: string;
  raterId: string;
  targetType: string;
  targetId: string;
  score: number;
  comment: string | null;
  createdAt: string;
};

type RatingsListResponse = { items: RatingItem[]; total: number };

type TopBranch = { branchId: string; average: number; count: number };
type TopRider  = { riderId:  string; average: number; count: number };

// ── Helpers ───────────────────────────────────────────────────────────────────

const TARGET_TABS = [
  { label: 'All',      value: '' },
  { label: 'Branch',   value: 'BRANCH' },
  { label: 'Rider',    value: 'RIDER' },
  { label: 'Customer', value: 'CUSTOMER' },
] as const;

const STAR_COLOR = '#FBBC04';
const PAGE_SIZE  = 50;

function Stars({ score, size = 12 }: { score: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star
          key={i}
          size={size}
          fill={i <= score ? STAR_COLOR : 'none'}
          stroke={i <= score ? STAR_COLOR : 'var(--brand-border)'}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  average,
  count,
  color,
  bg,
}: {
  icon: React.ElementType;
  label: string;
  average: number;
  count: number;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-card p-4 flex gap-3 items-start" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ width: 36, height: 36, background: bg }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
            {average > 0 ? average.toFixed(1) : '—'}
          </span>
          {average > 0 && <Stars score={Math.round(average)} size={11} />}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{count.toLocaleString()} ratings</div>
      </div>
    </div>
  );
}

function ScoreBar({ score, count, max }: { score: number; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="flex-shrink-0 font-semibold" style={{ fontSize: 11, width: 8, color: 'var(--text-secondary)' }}>{score}</span>
      <Star size={10} fill={STAR_COLOR} stroke={STAR_COLOR} strokeWidth={1.5} className="flex-shrink-0" />
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: 'var(--bg-subtle)' }}>
        <div
          className="rounded-full"
          style={{ width: `${pct}%`, height: '100%', background: 'var(--brand)', transition: 'width 0.4s ease' }}
        />
      </div>
      <span className="flex-shrink-0" style={{ fontSize: 10, color: 'var(--text-muted)', width: 28, textAlign: 'right' }}>{count}</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RatingsPage() {
  const [stats,       setStats]       = useState<RatingsStats | null>(null);
  const [list,        setList]        = useState<RatingItem[]>([]);
  const [total,       setTotal]       = useState(0);
  const [topBranches, setTopBranches] = useState<TopBranch[]>([]);
  const [topRiders,   setTopRiders]   = useState<TopRider[]>([]);

  const [tab,      setTab]      = useState<string>('');
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [listLoad, setListLoad] = useState(false);
  const [error,    setError]    = useState('');

  // Load stats + leaderboards once
  useEffect(() => {
    Promise.all([
      apiGet<RatingsStats>(ep.ratingsStats),
      apiGet<TopBranch[]>(ep.ratingsTopBranches + '?limit=5'),
      apiGet<TopRider[]>(ep.ratingsTopRiders   + '?limit=5'),
    ])
      .then(([s, b, r]) => { setStats(s); setTopBranches(b); setTopRiders(r); })
      .catch(() => setError('Failed to load rating statistics.'))
      .finally(() => setLoading(false));
  }, []);

  // Load list whenever tab or page changes
  const loadList = useCallback(async () => {
    setListLoad(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (tab) params.set('targetType', tab);
    try {
      const data = await apiGet<RatingsListResponse>(`${ep.ratingsList}?${params}`);
      setList(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setList([]);
    } finally {
      setListLoad(false);
    }
  }, [tab, page]);

  useEffect(() => { void loadList(); }, [loadList]);

  const handleTab = (v: string) => { setTab(v); setPage(1); };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const maxDistCount = stats
    ? Math.max(...stats.scoreDistribution.map(d => d.count), 1)
    : 1;

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-extrabold" style={{ fontSize: 18, color: 'var(--text-primary)' }}>Ratings</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Platform-wide rating analytics</p>
        </div>
      </div>

      {error && (
        <div className="rounded-card px-4 py-3 text-center" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)' }}>
          <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>
        </div>
      )}

      {/* ── Stat cards ── */}
      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : stats && (
        <>
          <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="rounded-card p-4 flex gap-3 items-center" style={{ background: 'var(--brand-muted)', border: '1px solid var(--brand-border)' }}>
              <div className="rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ width: 36, height: 36, background: 'var(--brand)' }}>
                <TrendingUp size={16} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--brand)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Ratings</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                  {stats.totalCount.toLocaleString()}
                </div>
              </div>
            </div>
            <StatCard icon={Store} label="Branch" average={stats.branch.average} count={stats.branch.count} color="var(--warning)" bg="var(--warning-bg)" />
            <StatCard icon={Bike}  label="Rider"  average={stats.rider.average}  count={stats.rider.count}  color="var(--brand)"   bg="var(--brand-muted)" />
            <StatCard icon={Users} label="Customer" average={stats.customer.average} count={stats.customer.count} color="var(--success)" bg="var(--success-bg)" />
          </div>

          {/* ── Score distribution + Leaderboards ── */}
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>

            {/* Score distribution */}
            <div className="rounded-card p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="font-bold mb-3" style={{ fontSize: 12, color: 'var(--text-primary)' }}>Score distribution</div>
              <div className="space-y-2">
                {[5,4,3,2,1].map(score => {
                  const entry = stats.scoreDistribution.find(d => d.score === score);
                  return (
                    <ScoreBar key={score} score={score} count={entry?.count ?? 0} max={maxDistCount} />
                  );
                })}
              </div>
            </div>

            {/* Top branches */}
            <div className="rounded-card p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="font-bold mb-3" style={{ fontSize: 12, color: 'var(--text-primary)' }}>Top rated branches</div>
              {topBranches.length === 0 ? (
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No data yet</p>
              ) : (
                <div className="space-y-2">
                  {topBranches.map((b, i) => (
                    <div key={b.branchId} className="flex items-center gap-2">
                      <span className="font-bold flex-shrink-0" style={{ fontSize: 10, color: 'var(--brand-border)', width: 14 }}>#{i+1}</span>
                      <span className="flex-1 truncate" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{b.branchId}</span>
                      <Stars score={Math.round(b.average)} size={10} />
                      <span className="font-semibold flex-shrink-0" style={{ fontSize: 11, color: 'var(--warning)' }}>{b.average.toFixed(1)}</span>
                      <span className="flex-shrink-0" style={{ fontSize: 9, color: 'var(--text-muted)' }}>({b.count})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top riders */}
            <div className="rounded-card p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="font-bold mb-3" style={{ fontSize: 12, color: 'var(--text-primary)' }}>Top rated riders</div>
              {topRiders.length === 0 ? (
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No data yet</p>
              ) : (
                <div className="space-y-2">
                  {topRiders.map((r, i) => (
                    <div key={r.riderId} className="flex items-center gap-2">
                      <span className="font-bold flex-shrink-0" style={{ fontSize: 10, color: 'var(--brand-border)', width: 14 }}>#{i+1}</span>
                      <span className="flex-1 truncate" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.riderId}</span>
                      <Stars score={Math.round(r.average)} size={10} />
                      <span className="font-semibold flex-shrink-0" style={{ fontSize: 11, color: 'var(--brand)' }}>{r.average.toFixed(1)}</span>
                      <span className="flex-shrink-0" style={{ fontSize: 9, color: 'var(--text-muted)' }}>({r.count})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Ratings table ── */}
      <div className="rounded-card overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

        {/* Tab filter */}
        <div className="flex items-center gap-1 px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
          {TARGET_TABS.map(t => (
            <button
              key={t.value}
              onClick={() => handleTab(t.value)}
              className="rounded-pill px-3 py-1 font-semibold"
              style={{
                fontSize: 11,
                background: tab === t.value ? 'var(--brand)' : 'var(--bg-subtle)',
                color:      tab === t.value ? '#fff'         : 'var(--text-secondary)',
                border:     `1px solid ${tab === t.value ? 'var(--brand)' : 'var(--border)'}`,
              }}
            >
              {t.label}
            </button>
          ))}
          <span className="ml-auto" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {total.toLocaleString()} rating{total !== 1 ? 's' : ''}
          </span>
        </div>

        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--bg-subtle)' }}>
              {['Order ID', 'Rater', 'Target', 'Score', 'Comment', 'Date'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider"
                  style={{ fontSize: 9, color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listLoad ? (
              <tr><td colSpan={6} className="py-8 text-center"><Spinner /></td></tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  No ratings yet
                </td>
              </tr>
            ) : list.map((r, i) => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 1 ? 'var(--bg-subtle)' : 'var(--bg-card)' }}>
                <td className="px-3 py-2.5 font-semibold" style={{ fontSize: 11, color: 'var(--brand)' }}>
                  {r.orderId.slice(0, 8)}…
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className="rounded-pill px-2 py-0.5 font-semibold"
                    style={{
                      fontSize: 9,
                      background: r.raterType === 'CUSTOMER' ? 'var(--brand-muted)' : 'var(--success-bg)',
                      color:      r.raterType === 'CUSTOMER' ? 'var(--brand)'        : 'var(--success)',
                    }}
                  >
                    {r.raterType}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className="rounded-pill px-2 py-0.5 font-semibold"
                    style={{
                      fontSize: 9,
                      background: r.targetType === 'BRANCH' ? 'var(--warning-bg)' : r.targetType === 'RIDER' ? 'var(--brand-muted)' : 'var(--success-bg)',
                      color:      r.targetType === 'BRANCH' ? 'var(--warning)'    : r.targetType === 'RIDER' ? 'var(--brand)'        : 'var(--success)',
                    }}
                  >
                    {r.targetType}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <Stars score={r.score} size={11} />
                    <span className="font-bold" style={{ fontSize: 11, color: 'var(--text-primary)' }}>{r.score}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5" style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 240 }}>
                  <span className="block truncate">{r.comment ?? '—'}</span>
                </td>
                <td className="px-3 py-2.5" style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {!listLoad && total > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {((page-1)*PAGE_SIZE+1).toLocaleString()}–{Math.min(page*PAGE_SIZE,total).toLocaleString()} of {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="rounded-lg p-1.5"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', opacity: page === 1 ? 0.35 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
              >
                <ChevronLeft size={12} style={{ color: 'var(--text-secondary)' }} />
              </button>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '0 8px' }}>
                {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="rounded-lg p-1.5"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', opacity: page === totalPages ? 0.35 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
              >
                <ChevronRight size={12} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
