"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user || !userProfile) {
        router.replace('/login');
      } else {
        // Role-specific redirection logic
        const isAdminRoute = pathname.startsWith('/admin');
        const isGuruRoute = pathname.startsWith('/guru');

        if (isAdminRoute && userProfile.role !== 'admin') {
          router.replace('/guru'); // Or an unauthorized page
        } else if (isGuruRoute && userProfile.role !== 'guru') {
          router.replace('/admin'); // Or an unauthorized page
        }
      }
    }
  }, [user, userProfile, loading, router, pathname]);

  if (loading || !user || !userProfile) {
    // Enhanced loading skeleton for the shell
    return (
      <div className="flex min-h-screen w-full">
        {/* Sidebar Skeleton */}
        <div className="hidden md:flex flex-col w-64 border-r bg-card p-4 space-y-4">
          <Skeleton className="h-10 w-3/4 rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md mt-auto" />
        </div>
        {/* Main Content Skeleton */}
        <div className="flex flex-col flex-1">
          {/* Header Skeleton */}
          <div className="flex h-16 items-center justify-between border-b bg-card px-6">
            <Skeleton className="h-8 w-1/4 rounded-md" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          {/* Page Content Skeleton */}
          <main className="flex-1 p-6 space-y-6">
            <Skeleton className="h-12 w-1/2 rounded-md" />
            <Skeleton className="h-64 w-full rounded-md" />
            <Skeleton className="h-32 w-full rounded-md" />
          </main>
        </div>
      </div>
    );
  }

  // Check again for role mismatch after loading, before rendering AppShell
  const isAdminRoute = pathname.startsWith('/admin');
  const isGuruRoute = pathname.startsWith('/guru');
  if ((isAdminRoute && userProfile.role !== 'admin') || (isGuruRoute && userProfile.role !== 'guru')) {
    // This will show the loading skeleton briefly before redirecting, which is fine.
    // The useEffect above handles the actual redirection.
    return (
         <div className="flex min-h-screen w-full items-center justify-center">
            <p>Mengalihkan...</p>
         </div>
    );
  }
  

  return <AppShell>{children}</AppShell>;
}
