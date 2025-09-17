'use client';

import { usePathname } from 'next/navigation';
import MainLayout from './MainLayout';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();

  // Pages that should NOT use the dashboard layout
  const excludedPages = ['/login', '/register'];

  const shouldUseDashboardLayout = !excludedPages.includes(pathname);

  if (shouldUseDashboardLayout) {
    return <MainLayout>{children}</MainLayout>;
  }

  // For login/register pages, return children without dashboard layout
  return <>{children}</>;
}