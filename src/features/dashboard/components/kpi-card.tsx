import { Card } from '@/components/ui/card';

export function KpiCard({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
    </Card>
  );
}
