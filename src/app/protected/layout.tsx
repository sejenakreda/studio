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
  const { user, userProfile, loading, isKepalaSekolah, isKepalaTataUsaha } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user || !userProfile) {
        router.replace('/login');
      } else {
        const isAdminRoute = pathname.startsWith('/protected/admin');
        const isGuruRoute = pathname.startsWith('/protected/guru');

        if (userProfile.role === 'admin') {
          if (isGuruRoute) router.replace('/protected/admin');
        } else if (userProfile.role === 'guru') {
          if (isAdminRoute) {
            if (isKepalaSekolah || isKepalaTataUsaha) {
              const allowedAdminRoutesForKepsek = [
                '/protected/admin/reports', 
                '/protected/admin/grades', 
                '/protected/admin/violation-reports', 
                '/protected/admin/kegiatan-reports',
                '/protected/admin/agenda-kelas',
                '/protected/admin/teacher-attendance',
                '/protected/admin/school-profile', // Kepsek should see this too
              ];
              // Kepsek can see the main admin dashboard and any route starting with the allowed paths
              const isAllowed = pathname === '/protected/admin' || allowedAdminRoutesForKepsek.some(route => pathname.startsWith(route));
              if (!isAllowed) {
                router.replace('/protected/guru');
              }
            } else {
              router.replace('/protected/guru');
            }
          }
        } else {
          router.replace('/login');
        }
      }
    }
  }, [user, userProfile, loading, router, pathname, isKepalaSekolah, isKepalaTataUsaha]);

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

  const isAdminRoute = pathname.startsWith('/protected/admin');
  if (userProfile.role === 'guru' && isAdminRoute && !isKepalaSekolah && !isKepalaTataUsaha) {
    return (
         <div className="flex min-h-screen w-full items-center justify-center">
            <p>Mengalihkan...</p>
         </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
