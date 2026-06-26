import type { ElementType } from 'react';

type Props = {
  label: string;
  value: string;
  sub: string;
  subColor: string;
  icon: ElementType;
  iconBg: string;
  iconColor: string;
  loading?: boolean;
  trend?: { value: string; up: boolean } | null;
};

export function KpiCard({ label, value, sub, subColor, icon: Icon, iconBg, iconColor, loading = false, trend }: Props) {
  return (
    <div className="card card-hover rounded-card p-4 flex flex-col gap-2.5">
      <div className="flex items-start justify-between">
        <span
          className="font-semibold uppercase tracking-widest"
          style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em' }}
        >
          {label}
        </span>
        <div
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ width: 32, height: 32, background: iconBg }}
        >
          <Icon size={14} style={{ color: iconColor }} />
        </div>
      </div>

      <div className="flex items-end gap-2">
        {loading ? (
          <div className="skeleton" style={{ width: 80, height: 28 }} />
        ) : (
          <span
            className="font-extrabold tracking-tight leading-none"
            style={{ fontSize: 24, color: 'var(--text-primary)' }}
          >
            {value}
          </span>
        )}
        {!loading && trend && (
          <span
            className="rounded-pill px-1.5 py-0.5 font-bold flex-shrink-0 mb-0.5"
            style={{
              fontSize: 9,
              background: trend.up ? 'var(--success-bg)' : 'var(--danger-bg)',
              color: trend.up ? 'var(--success)' : 'var(--danger)',
            }}
          >
            {trend.up ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>

      {loading ? (
        <div className="skeleton" style={{ width: '70%', height: 11 }} />
      ) : (
        <div className="font-medium truncate" style={{ fontSize: 10.5, color: subColor, lineHeight: 1.3 }}>
          {sub}
        </div>
      )}
    </div>
  );
}
