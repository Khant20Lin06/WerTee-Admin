'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, X, Loader2,
  ShoppingBag, Store, Users, Bike, ArrowRight,
} from 'lucide-react';
import { useGlobalSearch, SearchResult, SearchResultKind } from '@/lib/context/global-search-context';

// ─── Icon + color per kind ────────────────────────────────────────────────────

function KindIcon({ kind }: { kind: SearchResultKind }) {
  const map: Record<SearchResultKind, { icon: React.ElementType; bg: string; color: string }> = {
    order:    { icon: ShoppingBag, bg: '#EEF0FF', color: '#5B4FE9' },
    merchant: { icon: Store,       bg: '#FFF3E5', color: '#D97706' },
    customer: { icon: Users,       bg: '#E8FAF0', color: '#16A34A' },
    rider:    { icon: Bike,        bg: '#FEF2F2', color: '#DC2626' },
  };
  const { icon: Icon, bg, color } = map[kind];
  return (
    <div className="flex items-center justify-center rounded-xl flex-shrink-0"
      style={{ width: 34, height: 34, background: bg }}>
      <Icon size={15} style={{ color }} />
    </div>
  );
}

function badgeColor(badge?: string) {
  if (!badge) return { bg: '#F0EFFB', color: '#8A88A8' };
  switch (badge) {
    case 'ACTIVE':   case 'ONLINE':    case 'COMPLETED': return { bg: '#DCFCE7', color: '#16A34A' };
    case 'PENDING':  case 'PLACED':    case 'CONFIRMED': return { bg: '#FEF9C3', color: '#CA8A04' };
    case 'OFFLINE':  case 'SUSPENDED': case 'CANCELLED': return { bg: '#FEE2E2', color: '#DC2626' };
    case 'PREPARING': case 'DELIVERING': return { bg: '#EEF0FF', color: '#5B4FE9' };
    default: return { bg: '#F0EFFB', color: '#8A88A8' };
  }
}

const KIND_LABEL: Record<SearchResultKind, string> = {
  order: 'Order', merchant: 'Merchant', customer: 'Customer', rider: 'Rider',
};

// ─── Result row ───────────────────────────────────────────────────────────────

function ResultRow({ result, onSelect }: { result: SearchResult; onSelect: () => void }) {
  const bc = badgeColor(result.badge);
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
      style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#F6F5FF')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <KindIcon kind={result.kind} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold truncate" style={{ fontSize: 13, color: '#1A1730' }}>
            {result.primary}
          </span>
          {result.badge && (
            <span className="rounded-full px-1.5 py-0.5 font-semibold flex-shrink-0"
              style={{ fontSize: 9, background: bc.bg, color: bc.color }}>
              {result.badge}
            </span>
          )}
        </div>
        {result.secondary && (
          <div className="truncate" style={{ fontSize: 11, color: '#8A88A8' }}>{result.secondary}</div>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span style={{ fontSize: 10, color: '#B0AECC' }}>{KIND_LABEL[result.kind]}</span>
        <ArrowRight size={11} style={{ color: '#C4C2DC' }} />
      </div>
    </button>
  );
}

// ─── Group results by kind ────────────────────────────────────────────────────

function groupResults(results: SearchResult[]) {
  const groups: Partial<Record<SearchResultKind, SearchResult[]>> = {};
  for (const r of results) {
    if (!groups[r.kind]) groups[r.kind] = [];
    groups[r.kind]!.push(r);
  }
  return groups;
}

const KIND_ORDER: SearchResultKind[] = ['order', 'merchant', 'customer', 'rider'];
const KIND_HEADING: Record<SearchResultKind, string> = {
  order: 'Orders', merchant: 'Merchants', customer: 'Customers', rider: 'Riders',
};

// ─── Main overlay ─────────────────────────────────────────────────────────────

export function GlobalSearchOverlay() {
  const router = useRouter();
  const { query, results, loading, isOpen, setQuery, close } = useGlobalSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  if (!isOpen) return null;

  const groups  = groupResults(results);
  const hasAny  = results.length > 0;
  const showHint = !loading && !hasAny && query.trim().length >= 2;
  const showTip  = !loading && query.trim().length < 2;

  function navigate(result: SearchResult) {
    close();
    router.push(result.href);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(15,12,30,0.35)',
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 72,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 560,
          zIndex: 51,
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 8px 40px rgba(91,79,233,0.18), 0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid rgba(91,79,233,0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4"
          style={{ height: 52, borderBottom: '1px solid #F0EFFB' }}>
          {loading
            ? <Loader2 size={16} style={{ color: '#5B4FE9', flexShrink: 0, animation: 'spin 0.8s linear infinite' }} />
            : <Search size={16} style={{ color: '#8A88A8', flexShrink: 0 }} />}
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search orders, merchants, customers, riders…"
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 14, color: '#1A1730', background: 'transparent',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <X size={14} style={{ color: '#B0AECC' }} />
            </button>
          )}
          <div className="rounded-md px-1.5 py-0.5 font-mono"
            style={{ fontSize: 10, background: '#F0EFFB', color: '#8A88A8', border: '1px solid #E8E6F8', flexShrink: 0 }}>
            ESC
          </div>
        </div>

        {/* Body */}
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {showTip && (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Search size={22} style={{ color: '#C4C2DC' }} />
              <span style={{ fontSize: 12, color: '#B0AECC' }}>Type at least 2 characters to search</span>
              <span style={{ fontSize: 10, color: '#C4C2DC' }}>
                Searches orders · merchants · customers · riders
              </span>
            </div>
          )}

          {showHint && (
            <div className="flex flex-col items-center justify-center py-10 gap-1.5">
              <span style={{ fontSize: 13, color: '#4A4770', fontWeight: 600 }}>No results for "{query}"</span>
              <span style={{ fontSize: 11, color: '#B0AECC' }}>Try order code, name, or phone number</span>
            </div>
          )}

          {hasAny && (
            <div className="py-1.5">
              {KIND_ORDER.map(kind => {
                const items = groups[kind];
                if (!items?.length) return null;
                return (
                  <div key={kind}>
                    <div className="px-4 py-1.5"
                      style={{ fontSize: 9, fontWeight: 700, color: '#B0AECC', letterSpacing: '0.08em' }}>
                      {KIND_HEADING[kind].toUpperCase()}
                    </div>
                    {items.map(r => (
                      <ResultRow key={r.id} result={r} onSelect={() => navigate(r)} />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2"
          style={{ borderTop: '1px solid #F0EFFB', background: '#FAFAFE' }}>
          <span style={{ fontSize: 10, color: '#C4C2DC' }}>
            {results.length > 0 ? `${results.length} result${results.length !== 1 ? 's' : ''}` : 'Global search'}
          </span>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 10, color: '#C4C2DC' }}>
              <kbd className="rounded px-1 py-0.5 font-mono"
                style={{ background: '#F0EFFB', border: '1px solid #E8E6F8', fontSize: 9, color: '#8A88A8' }}>
                ⌘K
              </kbd>
              {' '}to toggle
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
