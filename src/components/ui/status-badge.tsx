'use client';

type StatusVariant = string;

type Cfg = { bg: string; text: string; dot: string; label: string };

const MAP: Record<string, Cfg> = {
  // Order pipeline
  placed:            { bg: '#F0EEFF', text: '#5B4FE9', dot: '#5B4FE9', label: 'Placed' },
  confirmed:         { bg: '#EEF0FF', text: '#5B4FE9', dot: '#5B4FE9', label: 'Confirmed' },
  preparing:         { bg: '#FFF3EC', text: '#E06520', dot: '#E06520', label: 'Preparing' },
  ready:             { bg: '#FFF8E8', text: '#D4820A', dot: '#D4820A', label: 'Ready' },
  delivering:        { bg: '#E8F0FF', text: '#0A6ED4', dot: '#0A6ED4', label: 'Delivering' },
  completed:         { bg: '#E8FAF2', text: '#16A660', dot: '#16A660', label: 'Completed' },
  delivered:         { bg: '#E8FAF2', text: '#16A660', dot: '#16A660', label: 'Delivered' },
  cancelled:         { bg: '#FFF0F0', text: '#D84040', dot: '#D84040', label: 'Cancelled' },
  // Entity statuses
  pending:           { bg: '#FFF8E8', text: '#D4820A', dot: '#D4820A', label: 'Pending' },
  active:            { bg: '#E8FAF2', text: '#16A660', dot: '#16A660', label: 'Active' },
  suspended:         { bg: '#FFF0F0', text: '#D84040', dot: '#D84040', label: 'Suspended' },
  online:            { bg: '#E8FAF2', text: '#16A660', dot: '#16A660', label: 'Online' },
  offline:           { bg: '#F4F3FB', text: '#8A88A8', dot: '#C4C2DC', label: 'Offline' },
  inactive:          { bg: '#F4F3FB', text: '#8A88A8', dot: '#C4C2DC', label: 'Inactive' },
  // Payment / refund
  succeeded:         { bg: '#E8FAF2', text: '#16A660', dot: '#16A660', label: 'Succeeded' },
  failed:            { bg: '#FFF0F0', text: '#D84040', dot: '#D84040', label: 'Failed' },
  refunded:          { bg: '#EEF0FF', text: '#5B4FE9', dot: '#5B4FE9', label: 'Refunded' },
  'requires-action': { bg: '#FFF8E8', text: '#D4820A', dot: '#D4820A', label: 'Action needed' },
  expired:           { bg: '#F4F3FB', text: '#8A88A8', dot: '#C4C2DC', label: 'Expired' },
  approved:          { bg: '#E8FAF2', text: '#16A660', dot: '#16A660', label: 'Approved' },
  rejected:          { bg: '#FFF0F0', text: '#D84040', dot: '#D84040', label: 'Rejected' },
  scheduled:         { bg: '#EEF0FF', text: '#5B4FE9', dot: '#5B4FE9', label: 'Scheduled' },
};

export function StatusBadge({
  status,
  label: labelOverride,
  showDot = false,
}: {
  status: string;
  label?: string;
  showDot?: boolean;
}) {
  const norm = status.toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-') as StatusVariant;
  const cfg: Cfg = MAP[norm] ?? { bg: '#F4F3FB', text: '#8A88A8', dot: '#C4C2DC', label: status };
  const display = labelOverride ?? cfg.label;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-pill font-semibold"
      style={{
        background: cfg.bg,
        color: cfg.text,
        fontSize: 10.5,
        padding: '2px 7px',
        lineHeight: 1.4,
        fontWeight: 600,
        letterSpacing: '0.01em',
      }}
    >
      {showDot && (
        <span
          className="rounded-full flex-shrink-0"
          style={{ width: 5, height: 5, background: cfg.dot }}
        />
      )}
      {display}
    </span>
  );
}
