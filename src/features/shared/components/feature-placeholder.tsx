import { Card } from '@/components/ui/card';

export function FeaturePlaceholder({
  title,
}: Readonly<{ title: string }>) {
  return (
    <Card>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">
        This module scaffold is in place and ready for domain implementation.
      </p>
    </Card>
  );
}
