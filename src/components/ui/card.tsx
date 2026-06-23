import { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export function Card({
  className,
  children,
}: Readonly<{ className?: string; children: ReactNode }>) {
  return (
    <div className={cn('rounded-3xl border border-slate-200 bg-white p-5', className)}>
      {children}
    </div>
  );
}
