'use client';

import { ReactNode, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { SidebarCountsProvider } from '@/lib/context/sidebar-counts-context';

import { SidebarNav } from './sidebar-nav';
import { Topbar } from './topbar';

export function AdminShell({ children }: Readonly<{ children: ReactNode }>) {
  const [collapsed, setCollapsed] = useState(false);
  const W = collapsed ? 56 : 188;
  const TRANS = 'width 0.22s cubic-bezier(0.4,0,0.2,1)';

  return (
    <SidebarCountsProvider>
      <div className="flex h-screen overflow-hidden" style={{ background: '#F0EFFB' }}>

        {/* Sidebar wrapper — controls width, toggle button lives here so it never clips */}
        <div
          className="relative flex-shrink-0 h-full"
          style={{ width: W, minWidth: W, transition: TRANS }}
        >
          <SidebarNav collapsed={collapsed} />

          {/* Toggle button — on the right edge of the wrapper, always visible */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="absolute flex items-center justify-center rounded-full"
            style={{
              top: 52,
              right: -11,
              width: 22,
              height: 22,
              background: '#fff',
              border: '1px solid #E8E6F8',
              boxShadow: '0 1px 6px rgba(91,79,233,0.13)',
              zIndex: 20,
              color: '#5B4FE9',
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
    </SidebarCountsProvider>
  );
}
