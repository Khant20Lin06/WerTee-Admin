'use client';

import { ReactNode, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { ThemeProvider } from '@/lib/context/theme-context';
import { SidebarCountsProvider } from '@/lib/context/sidebar-counts-context';
import { GlobalSearchProvider } from '@/lib/context/global-search-context';
import { GlobalSearchOverlay } from './global-search-overlay';

import { SidebarNav } from './sidebar-nav';
import { Topbar } from './topbar';

export function AdminShell({ children }: Readonly<{ children: ReactNode }>) {
  const [collapsed, setCollapsed] = useState(false);
  const W = collapsed ? 56 : 188;
  const TRANS = 'width 0.22s cubic-bezier(0.4,0,0.2,1)';

  return (
    <ThemeProvider>
    <SidebarCountsProvider>
    <GlobalSearchProvider>
      <GlobalSearchOverlay />
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-page)' }}>

        {/* Sidebar wrapper */}
        <div
          className="relative flex-shrink-0 h-full"
          style={{ width: W, minWidth: W, transition: TRANS }}
        >
          <SidebarNav collapsed={collapsed} />

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="absolute flex items-center justify-center rounded-full"
            style={{
              top: 52,
              right: -11,
              width: 22,
              height: 22,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-card)',
              zIndex: 20,
              color: 'var(--brand)',
              cursor: 'pointer',
            }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <ChevronRight size={12} strokeWidth={2.5} />
              : <ChevronLeft  size={12} strokeWidth={2.5} />
            }
          </button>
        </div>

        {/* Main area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-5">{children}</main>
        </div>

      </div>
    </GlobalSearchProvider>
    </SidebarCountsProvider>
    </ThemeProvider>
  );
}
