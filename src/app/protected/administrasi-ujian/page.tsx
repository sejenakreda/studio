
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

// This page is now a redirector.
// The user will be redirected to the Berita Acara page by default.
// The individual menu items are now on the main dashboards.
export default function AdministrasiUjianDashboardPage() {
  const router = useRouter();
  
  React.useEffect(() => {
    router.replace('/protected/administrasi-ujian/berita-acara');
  }, [router]);

  return (
    <div className="flex justify-center items-center h-full">
      <p>Mengarahkan...</p>
    </div>
  );
}
