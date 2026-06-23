import { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export function Badge({
  className,
  children,
}: Readonly<{ className?: string; children: ReactNode }>) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700',
        className,
      )}
    >
      {children}
    </span>
  );
}
