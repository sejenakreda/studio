
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
  const { user, userProfile, loading, isKepalaSekolah, isKepalaTataUsaha, isKesiswaan } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user || !userProfile) {
        router.replace('/login');
        return; // Early return to prevent further checks
      }

      const isAdminRoute = pathname.startsWith('/protected/admin');
      const isGuruRoute = pathname.startsWith('/protected/guru');

      // Admin logic: Admins should not be on guru routes
      if (userProfile.role === 'admin' && isGuruRoute) {
        router.replace('/protected/admin');
        return;
      }
      
      // Guru logic: Check if a guru is trying to access an admin route
      if (userProfile.role === 'guru' && isAdminRoute) {
        // Define which special roles are allowed to access *any* admin routes
        const canAccessAdminArea = isKepalaSekolah || isKepalaTataUsaha || isKesiswaan;
        
        if (!canAccessAdminArea) {
          // If the guru does not have any special role, redirect them away from admin area
          router.replace('/protected/guru');
          return;
        }

        // Further granular checks for special roles if needed in the future
        // For now, if they have any of the special roles, we allow them into the /admin space,
        // and the AppShell will filter the menu items they can see.
        // This is a simpler and more robust approach than listing allowed routes here.
      }
    }
  }, [user, userProfile, loading, router, pathname, isKepalaSekolah, isKesiswaan, isKepalaTataUsaha]);


  if (loading || !user || !userProfile) {
    return (
      <div className="flex min-h-screen w-full">
        <div className="hidden md:flex flex-col w-64 border-r bg-card p-4 space-y-4">
          <Skeleton className="h-10 w-3/4 rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md mt-auto" />
        </div>
        <div className="flex flex-col flex-1">
          <div className="flex h-16 items-center justify-between border-b bg-card px-6">
            <Skeleton className="h-8 w-1/4 rounded-md" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <main className="flex-1 p-6 space-y-6">
            <Skeleton className="h-12 w-1/2 rounded-md" />
            <Skeleton className="h-64 w-full rounded-md" />
            <Skeleton className="h-32 w-full rounded-md" />
          </main>
        </div>
      </div>
    );
  }

  // Fallback loading/redirecting state for gurus on admin routes to prevent flashing content
  const isAdminRoute = pathname.startsWith('/protected/admin');
  if (userProfile.role === 'guru' && isAdminRoute) {
    const canAccessAdminArea = isKepalaSekolah || isKepalaTataUsaha || isKesiswaan;
    if (!canAccessAdminArea) {
         return (
             <div className="flex min-h-screen w-full items-center justify-center">
                <p>Mengalihkan...</p>
             </div>
        );
    }
  }

  return <AppShell>{children}</AppShell>;
}
