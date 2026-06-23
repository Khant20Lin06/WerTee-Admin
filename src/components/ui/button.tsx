import { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

export function Button({
  className,
  ...props
}: Readonly<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={cn(
        'rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90',
        className,
      )}
      {...props}
    />
  );
}
