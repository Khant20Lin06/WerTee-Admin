'use client';

import {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';
import type { OrderStub, MerchantStub, CustomerStub, RiderStub } from '@/types/models';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SearchResultKind = 'order' | 'merchant' | 'customer' | 'rider';

export type SearchResult = {
  kind: SearchResultKind;
  id: string;
  primary: string;
  secondary: string;
  badge?: string;
  href: string;
};

type GlobalSearchState = {
  query: string;
  results: SearchResult[];
  loading: boolean;
  isOpen: boolean;
};

type GlobalSearchCtx = GlobalSearchState & {
  setQuery: (q: string) => void;
  close: () => void;
  open: () => void;
};

const Ctx = createContext<GlobalSearchCtx | null>(null);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function matchesQ(q: string, ...fields: (string | undefined | null)[]): boolean {
  const lower = q.toLowerCase();
  return fields.some(f => f && f.toLowerCase().includes(lower));
}

async function runSearch(q: string): Promise<SearchResult[]> {
  if (!q.trim() || q.trim().length < 2) return [];

  const [ordersR, merchantsR, customersR, ridersR] = await Promise.allSettled([
    apiGet<OrderStub[]>(ep.orders),
    apiGet<MerchantStub[]>(ep.merchants),
    apiGet<CustomerStub[]>(ep.customers),
    apiGet<RiderStub[]>(ep.riders),
  ]);

  const results: SearchResult[] = [];

  // Orders
  if (ordersR.status === 'fulfilled' && Array.isArray(ordersR.value)) {
    const matched = ordersR.value
      .filter(o => matchesQ(q, o.orderCode, o.customer?.fullName, o.customer?.phone, o.branch?.branchName))
      .slice(0, 4);
    for (const o of matched) {
      results.push({
        kind: 'order',
        id: o.orderId,
        primary: `#${o.orderCode}`,
        secondary: [o.customer?.fullName ?? o.customer?.phone, o.branch?.branchName].filter(Boolean).join(' · '),
        badge: o.status,
        href: `/orders?highlight=${o.orderId}`,
      });
    }
  }

  // Merchants
  if (merchantsR.status === 'fulfilled' && Array.isArray(merchantsR.value)) {
    const matched = merchantsR.value
      .filter(m => matchesQ(q, m.name, m.phone))
      .slice(0, 3);
    for (const m of matched) {
      results.push({
        kind: 'merchant',
        id: m.id,
        primary: m.name,
        secondary: m.phone,
        badge: m.status,
        href: `/merchants`,
      });
    }
  }

  // Customers
  if (customersR.status === 'fulfilled' && Array.isArray(customersR.value)) {
    const matched = customersR.value
      .filter(c => matchesQ(q, c.fullName, c.phone))
      .slice(0, 3);
    for (const c of matched) {
      results.push({
        kind: 'customer',
        id: c.id,
        primary: c.fullName ?? c.phone,
        secondary: c.phone,
        badge: c.status,
        href: `/customers`,
      });
    }
  }

  // Riders
  if (ridersR.status === 'fulfilled' && Array.isArray(ridersR.value)) {
    const matched = ridersR.value
      .filter(r => matchesQ(q, r.displayName, r.phone))
      .slice(0, 2);
    for (const r of matched) {
      results.push({
        kind: 'rider',
        id: r.id,
        primary: r.displayName ?? r.phone,
        secondary: r.phone,
        badge: r.isOnline ? 'ONLINE' : 'OFFLINE',
        href: `/riders`,
      });
    }
  }

  return results;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<GlobalSearchState>({
    query: '', results: [], loading: false, isOpen: false,
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setQuery = useCallback((q: string) => {
    setState(s => ({ ...s, query: q, isOpen: true }));

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q.trim() || q.trim().length < 2) {
      setState(s => ({ ...s, results: [], loading: false }));
      return;
    }

    setState(s => ({ ...s, loading: true }));
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await runSearch(q);
        setState(s => ({ ...s, results, loading: false }));
      } catch {
        setState(s => ({ ...s, results: [], loading: false }));
      }
    }, 280);
  }, []);

  const close  = useCallback(() => setState(s => ({ ...s, isOpen: false, query: '', results: [] })), []);
  const openFn = useCallback(() => setState(s => ({ ...s, isOpen: true })), []);

  // Keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setState(s => ({ ...s, isOpen: !s.isOpen }));
      }
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, router]);

  return (
    <Ctx.Provider value={{ ...state, setQuery, close, open: openFn }}>
      {children}
    </Ctx.Provider>
  );
}

export function useGlobalSearch() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useGlobalSearch must be inside GlobalSearchProvider');
  return ctx;
}
