
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider } from '@/components/ui/sidebar'; // Import SidebarProvider

export const metadata: Metadata = {
  title: 'SiAP Smapna',
  description: 'Sistem Informasi Akademik & Penilaian SMAS PGRI Naringgul',
  manifest: '/manifest.json', // Ditambahkan untuk PWA
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        
        {/* PWA Meta Tags - Corrected & Expanded */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3498DB" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SiAP Smapna" />
        
        {/* References to actual icon files */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <SidebarProvider>
            {children}
          </SidebarProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
