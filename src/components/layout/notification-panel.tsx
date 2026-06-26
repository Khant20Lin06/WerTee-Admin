'use client';

import {
  useState, useEffect, useRef, useCallback, RefObject,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, X, RefreshCw, CheckCheck,
  ShoppingBag, AlertTriangle, Package, Info, Zap,
} from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationItem = {
  notificationId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

type UnreadCountResp = { unreadCount: number };
type NotifListResp   = NotificationItem[];
type PageResp        = {
  notifications: NotificationItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function NotifIcon({ type }: { type: string }) {
  const map: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
    ORDER_PLACED:      { icon: ShoppingBag,   bg: '#EEF0FF', color: '#5B4FE9' },
    ORDER_STATUS:      { icon: ShoppingBag,   bg: '#EEF0FF', color: '#5B4FE9' },
    SYSTEM_ALERT:      { icon: AlertTriangle, bg: '#FFF7ED', color: '#EA580C' },
    INVENTORY_ALERT:   { icon: Package,       bg: '#FEF9C3', color: '#CA8A04' },
    PAYMENT:           { icon: Zap,           bg: '#F0FDF4', color: '#16A34A' },
  };
  const cfg = map[type] ?? { icon: Info, bg: '#F6F5FF', color: '#8A88A8' };
  const Icon = cfg.icon;
  return (
    <div
      className="flex items-center justify-center rounded-xl flex-shrink-0"
      style={{ width: 36, height: 36, background: cfg.bg }}
    >
      <Icon size={16} style={{ color: cfg.color }} />
    </div>
  );
}

// ─── Tab strip ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'all',    label: 'All'    },
  { key: 'unread', label: 'Unread' },
];

// ─── Main component ───────────────────────────────────────────────────────────

export function NotificationPanel() {
  const router = useRouter();
  const [open, setOpen]           = useState(false);
  const [tab, setTab]             = useState<'all' | 'unread'>('all');
  const [items, setItems]         = useState<NotificationItem[]>([]);
  const [unreadCount, setUnread]  = useState(0);
  const [loading, setLoading]     = useState(false);
  const [marking, setMarking]     = useState(false);
  const panelRef                  = useRef<HTMLDivElement>(null);
  const pollRef                   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch unread count (lightweight poll) ──────────────────────────────────
  const fetchUnread = useCallback(async () => {
    try {
      const r = await apiGet<UnreadCountResp>('/notifications/unread-count');
      setUnread(r.unreadCount ?? 0);
    } catch { /* silent */ }
  }, []);

  // ── Fetch notification list ────────────────────────────────────────────────
  const fetchList = useCallback(async (activeTab: 'all' | 'unread') => {
    setLoading(true);
    try {
      // Try cursor-paginated page endpoint first
      const qs = activeTab === 'unread' ? '?unreadOnly=true&limit=20' : '?limit=20';
      try {
        const r = await apiGet<PageResp>(`/notifications/page${qs}`);
        setItems(r.notifications ?? []);
      } catch {
        // Fallback to list endpoint
        const r2 = await apiGet<NotifListResp>(`/notifications${qs}`);
        setItems(Array.isArray(r2) ? r2 : []);
      }
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, []);

  // ── Mark single read ──────────────────────────────────────────────────────
  async function markRead(id: string) {
    try {
      await apiPost(`/notifications/${id}/read`, {});
      setItems(prev => prev.map(n =>
        n.notificationId === id ? { ...n, isRead: true } : n,
      ));
      setUnread(c => Math.max(0, c - 1));
    } catch { /* silent */ }
  }

  // ── Mark all read ─────────────────────────────────────────────────────────
  async function markAllRead() {
    if (marking || unreadCount === 0) return;
    setMarking(true);
    try {
      // Mark each unread item individually (no bulk endpoint for admin)
      const unread = items.filter(n => !n.isRead);
      await Promise.allSettled(
        unread.map(n => apiPost(`/notifications/${n.notificationId}/read`, {})),
      );
      setItems(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch { /* silent */ }
    finally { setMarking(false); }
  }

  // ── Open/close ────────────────────────────────────────────────────────────
  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      setTab('all');
      void fetchList('all');
    }
  }

  // ── Click-outside to close ────────────────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── Poll unread count every 30 s ──────────────────────────────────────────
  useEffect(() => {
    void fetchUnread();
    pollRef.current = setInterval(fetchUnread, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchUnread]);

  // ── Tab change ────────────────────────────────────────────────────────────
  function handleTab(t: 'all' | 'unread') {
    setTab(t);
    void fetchList(t);
  }

  const display = tab === 'unread' ? items.filter(n => !n.isRead) : items;

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={toggleOpen}
        className="relative flex items-center justify-center rounded-lg"
        style={{
          width: 30, height: 30,
          background: open ? '#EEF0FF' : '#F6F5FF',
          border: `1px solid ${open ? '#C8C4F8' : '#E8E6F8'}`,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        <Bell size={14} style={{ color: open ? '#5B4FE9' : '#4A4770' }} />
        {unreadCount > 0 && (
          <span
            className="absolute flex items-center justify-center rounded-full font-bold"
            style={{
              top: -4, right: -4,
              minWidth: 16, height: 16,
              padding: '0 3px',
              background: '#E53E3E',
              color: '#fff',
              fontSize: 8,
              lineHeight: 1,
              boxShadow: '0 0 0 2px #fff',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 38,
            right: 0,
            width: 360,
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(91,79,233,0.14), 0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid rgba(91,79,233,0.08)',
            zIndex: 60,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4"
            style={{ height: 48, borderBottom: '1px solid #F0EFFB' }}
          >
            <div className="flex items-center gap-2">
              <Bell size={14} style={{ color: '#5B4FE9' }} />
              <span className="font-extrabold" style={{ fontSize: 13, color: '#1A1730' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  className="rounded-full font-bold"
                  style={{
                    fontSize: 9, padding: '2px 6px',
                    background: '#EEF0FF', color: '#5B4FE9',
                  }}
                >
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={marking}
                  title="Mark all as read"
                  style={{
                    background: 'none', border: 'none', cursor: marking ? 'not-allowed' : 'pointer',
                    padding: '4px', borderRadius: 6, display: 'flex', alignItems: 'center',
                    opacity: marking ? 0.5 : 1,
                  }}
                >
                  <CheckCheck size={13} style={{ color: '#5B4FE9' }} />
                </button>
              )}
              <button
                onClick={() => void fetchList(tab)}
                title="Refresh"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px', borderRadius: 6, display: 'flex', alignItems: 'center',
                }}
              >
                <RefreshCw size={12} style={{ color: '#8A88A8' }} />
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px', borderRadius: 6, display: 'flex', alignItems: 'center',
                }}
              >
                <X size={13} style={{ color: '#8A88A8' }} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div
            className="flex"
            style={{ borderBottom: '1px solid #F0EFFB', padding: '0 4px' }}
          >
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => handleTab(t.key as 'all' | 'unread')}
                style={{
                  flex: 1, height: 36, border: 'none', cursor: 'pointer',
                  background: 'none', fontSize: 11, fontWeight: tab === t.key ? 700 : 500,
                  color: tab === t.key ? '#5B4FE9' : '#8A88A8',
                  borderBottom: tab === t.key ? '2px solid #5B4FE9' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {t.label}
                {t.key === 'unread' && unreadCount > 0 && (
                  <span
                    className="ml-1.5 rounded-full font-bold"
                    style={{ fontSize: 8, padding: '1px 5px', background: '#EEF0FF', color: '#5B4FE9' }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {loading && (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <RefreshCw size={18} style={{ color: '#C4C2DC', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: 11, color: '#B0AECC' }}>Loading…</span>
              </div>
            )}

            {!loading && display.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div
                  className="flex items-center justify-center rounded-2xl"
                  style={{ width: 44, height: 44, background: '#F6F5FF' }}
                >
                  <Bell size={20} style={{ color: '#C4C2DC' }} />
                </div>
                <span className="font-semibold" style={{ fontSize: 12, color: '#4A4770' }}>
                  {tab === 'unread' ? 'All caught up!' : 'No notifications yet'}
                </span>
                <span style={{ fontSize: 10, color: '#B0AECC' }}>
                  {tab === 'unread' ? 'No unread notifications' : 'Notifications will appear here'}
                </span>
              </div>
            )}

            {!loading && display.map(n => (
              <div
                key={n.notificationId}
                className="flex items-start gap-3 px-4 py-3 cursor-pointer"
                style={{
                  background: n.isRead ? 'transparent' : '#FAFAFE',
                  borderLeft: n.isRead ? '3px solid transparent' : '3px solid #5B4FE9',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F6F5FF')}
                onMouseLeave={e => (e.currentTarget.style.background = n.isRead ? 'transparent' : '#FAFAFE')}
                onClick={() => { if (!n.isRead) void markRead(n.notificationId); }}
              >
                <NotifIcon type={n.type} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1 mb-0.5">
                    <span
                      className="font-semibold"
                      style={{ fontSize: 12, color: '#1A1730', lineHeight: 1.4 }}
                    >
                      {n.title}
                    </span>
                    {!n.isRead && (
                      <div
                        className="flex-shrink-0 rounded-full"
                        style={{ width: 6, height: 6, background: '#5B4FE9', marginTop: 4 }}
                      />
                    )}
                  </div>
                  <p
                    className="line-clamp-2"
                    style={{ fontSize: 11, color: '#8A88A8', lineHeight: 1.5, margin: 0 }}
                  >
                    {n.body}
                  </p>
                  <span style={{ fontSize: 10, color: '#C4C2DC', marginTop: 2, display: 'block' }}>
                    {relativeTime(n.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-center"
            style={{ height: 40, borderTop: '1px solid #F0EFFB', background: '#FAFAFE' }}
          >
            <button
              onClick={() => { setOpen(false); router.push('/inventory-alerts'); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: '#5B4FE9', fontWeight: 600,
              }}
            >
              View inventory alerts →
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
