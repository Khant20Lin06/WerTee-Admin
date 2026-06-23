'use client';

type StatusVariant = string;

const MAP: Record<string, { bg: string; text: string; label: string }> = {
  // Order statuses
  confirmed:        { bg: '#EEF0FF', text: '#5B4FE9', label: 'Confirmed' },
  preparing:        { bg: '#FFF3EC', text: '#E06520', label: 'Preparing' },
  ready:            { bg: '#FFF8E8', text: '#D4820A', label: 'Ready' },
  delivering:       { bg: '#E8F0FF', text: '#0A6ED4', label: 'Delivering' },
  completed:        { bg: '#E8FAF2', text: '#16A660', label: 'Completed' },
  cancelled:        { bg: '#FFF0F0', text: '#D84040', label: 'Cancelled' },
  // Rider / merchant statuses
  pending:          { bg: '#FFF8E8', text: '#D4820A', label: 'Pending' },
  active:           { bg: '#E8FAF2', text: '#16A660', label: 'Active' },
  suspended:        { bg: '#FFF0F0', text: '#D84040', label: 'Suspended' },
  online:           { bg: '#E8FAF2', text: '#16A660', label: 'Online' },
  offline:          { bg: '#F6F5FF', text: '#8A88A8', label: 'Offline' },
  inactive:         { bg: '#F6F5FF', text: '#8A88A8', label: 'Inactive' },
  // Payment statuses
  succeeded:        { bg: '#E8FAF2', text: '#16A660', label: 'Succeeded' },
  failed:           { bg: '#FFF0F0', text: '#D84040', label: 'Failed' },
  refunded:         { bg: '#EEF0FF', text: '#5B4FE9', label: 'Refunded' },
  'requires-action':{ bg: '#FFF8E8', text: '#D4820A', label: 'Action needed' },
  expired:          { bg: '#F6F5FF', text: '#8A88A8', label: 'Expired' },
  // Refund statuses
  approved:         { bg: '#E8FAF2', text: '#16A660', label: 'Approved' },
  rejected:         { bg: '#FFF0F0', text: '#D84040', label: 'Rejected' },
  // General
  scheduled:        { bg: '#EEF0FF', text: '#5B4FE9', label: 'Scheduled' },
};

export function StatusBadge({
  status,
  label: labelOverride,
}: {
  status: string;
  label?: string;
}) {
  const norm = status.toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-') as StatusVariant;
  const cfg = MAP[norm] ?? { bg: '#F6F5FF', text: '#8A88A8', label: status };
  const display = labelOverride ?? cfg.label;

  return (
    <span
      className="inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-600"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {display}
    </span>
  );
}
