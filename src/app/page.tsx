"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from "@/components/ui/skeleton";


export default function HomePage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user && userProfile) {
        if (userProfile.role === 'admin') {
          router.replace('/admin');
        } else if (userProfile.role === 'guru') {
          router.replace('/guru');
        } else {
          // Fallback or error if role is undefined
          router.replace('/login');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [user, userProfile, loading, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <svg
            className="mx-auto h-16 w-16 text-primary mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <h1 className="text-4xl font-bold text-primary font-headline">SkorZen</h1>
          <p className="mt-2 text-lg text-muted-foreground">Mengarahkan ke dasbor Anda...</p>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-1/2 mx-auto rounded-md" />
        </div>
         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mt-8"></div>
      </div>
    </div>
  );
}
