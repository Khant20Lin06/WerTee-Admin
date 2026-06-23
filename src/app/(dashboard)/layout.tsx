import { ReactNode } from 'react';

import { AdminShell } from '@/components/layout/admin-shell';

export default function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <AdminShell>{children}</AdminShell>;
}
