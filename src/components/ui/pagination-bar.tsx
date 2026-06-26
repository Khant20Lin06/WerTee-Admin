'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Per-page selector ────────────────────────────────────────────────────────

function PageSizeSelector<T extends number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold"
        style={{ fontSize: 11, background: '#F6F5FF', border: '1px solid #E8E6F8', color: '#4A4770', userSelect: 'none' }}
      >
        <span>{value} / page</span>
        <ChevronDown size={10} style={{ color: '#8A88A8', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 z-20 rounded-xl overflow-hidden"
            style={{ bottom: 'calc(100% + 6px)', background: '#fff', border: '1px solid #E8E6F8', boxShadow: '0 -4px 20px rgba(91,79,233,0.12)', minWidth: 130 }}
          >
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2.5"
                style={{
                  fontSize: 12,
                  color: opt === value ? '#5B4FE9' : '#4A4770',
                  background: opt === value ? '#EEF0FF' : 'transparent',
                  fontWeight: opt === value ? 700 : 500,
                }}
              >
                <span>{opt} rows</span>
                {opt === value && (
                  <span style={{ fontSize: 10, background: '#5B4FE9', color: '#fff', borderRadius: 999, padding: '1px 6px' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Pagination bar ───────────────────────────────────────────────────────────

export function PaginationBar({
  page,
  totalPages,
  total,
  pageSize,
  from,
  to,
  onPage,
  onPageSize,
  pageSizeOptions = [20, 50, 100],
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  from: number;
  to: number;
  onPage: (n: number) => void;
  onPageSize: (v: number) => void;
  pageSizeOptions?: readonly number[];
}) {
  // Build page number windows: always show first, last, and neighbours of current
  const pages = useMemo(() => {
    const set = new Set<number>();
    [1, totalPages].forEach(n => { if (n >= 1) set.add(n); });
    for (let n = page - 2; n <= page + 2; n++) {
      if (n >= 1 && n <= totalPages) set.add(n);
    }
    return [...set].sort((a, b) => a - b);
  }, [page, totalPages]);

  if (totalPages <= 1 && total === 0) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t" style={{ borderColor: '#E8E6F8' }}>
      {/* Left: count info + page size */}
      <div className="flex items-center gap-3">
        <span style={{ fontSize: 10, color: '#8A88A8' }}>
          {total === 0 ? 'No results' : `${from}–${to} of ${total.toLocaleString()}`}
        </span>
        <PageSizeSelector
          value={pageSize}
          onChange={onPageSize}
          options={pageSizeOptions}
        />
      </div>

      {/* Right: navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            disabled={page === 1}
            onClick={() => onPage(page - 1)}
            className="rounded-lg p-1.5"
            style={{ background: '#F6F5FF', border: '1px solid #E8E6F8', opacity: page === 1 ? 0.35 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >
            <ChevronLeft size={12} style={{ color: '#4A4770' }} />
          </button>

          {pages.map((n, i) => {
            const gap = i > 0 && n - pages[i - 1] > 1;
            return (
              <span key={n} className="flex items-center gap-1">
                {gap && (
                  <span style={{ fontSize: 11, color: '#C8C4F8', padding: '0 2px' }}>…</span>
                )}
                <button
                  onClick={() => onPage(n)}
                  className="rounded-lg font-semibold"
                  style={{
                    fontSize: 11,
                    minWidth: 30,
                    height: 28,
                    padding: '0 6px',
                    background: page === n ? '#5B4FE9' : '#F6F5FF',
                    border: '1px solid',
                    borderColor: page === n ? '#5B4FE9' : '#E8E6F8',
                    color: page === n ? '#fff' : '#4A4770',
                  }}
                >
                  {n}
                </button>
              </span>
            );
          })}

          <button
            disabled={page === totalPages}
            onClick={() => onPage(page + 1)}
            className="rounded-lg p-1.5"
            style={{ background: '#F6F5FF', border: '1px solid #E8E6F8', opacity: page === totalPages ? 0.35 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
          >
            <ChevronRight size={12} style={{ color: '#4A4770' }} />
          </button>
        </div>
      )}
    </div>
  );
}
