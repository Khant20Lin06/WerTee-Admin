// Shared formatting utilities — import from here, never redefine per-page.

export function fmtMMK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M MMK`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K MMK`;
  return `${n.toLocaleString()} MMK`;
}

export function fmtMMKShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K`;
  return n.toString();
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short',
  });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1)    return 'just now';
  if (m < 60)   return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

export function initials(name: string | null, fallback = ''): string {
  if (!name) return fallback.slice(-2).toUpperCase();
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
