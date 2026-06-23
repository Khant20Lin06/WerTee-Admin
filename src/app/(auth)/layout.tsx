import { ReactNode } from 'react';

export default function AuthLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <main className="min-h-screen" style={{ background: '#F0EFFB' }}>{children}</main>;
}
