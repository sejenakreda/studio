
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
  const { user, userProfile, loading, isKepalaSekolah } = useAuth();
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

        if (userProfile.role === 'admin') {
          if (isGuruRoute) router.replace('/admin');
        
        } else if (userProfile.role === 'guru') {
          if (isAdminRoute) {
            // If user is a guru on an admin route, check if they are Headmaster
            if (isKepalaSekolah) {
              const allowedRoutes = ['/admin/reports', '/admin/grades', '/admin/violation-reports', '/admin/kegiatan-reports'];
              // Headmaster is allowed on the dashboard itself, and on the allowed report routes.
              const isAllowed = pathname === '/admin' || allowedRoutes.some(route => pathname.startsWith(route));
              if (!isAllowed) {
                router.replace('/admin'); // Redirect from forbidden admin pages to the admin dashboard
              }
            } else {
              // A regular guru should not be on any admin pages.
              router.replace('/guru');
            }
          }
          // If a guru is on a guru route, it's fine.
        
        } else {
          // Fallback for any unknown role
          router.replace('/login');
        }
      }
    }
  }, [user, userProfile, loading, router, pathname, isKepalaSekolah]);


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
  if (userProfile.role === 'guru' && isAdminRoute && !isKepalaSekolah) {
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
