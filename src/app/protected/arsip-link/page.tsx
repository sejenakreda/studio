"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle, Link2, Info } from "lucide-react";
import { getArsipLinks } from '@/lib/firestoreService';
import type { ArsipLink } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';

export default function ArsipLinkPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [arsipLinks, setArsipLinks] = useState<ArsipLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const dashboardLink = userProfile?.role === 'admin' ? '/protected/admin' : '/protected/guru';

  const fetchLinks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getArsipLinks();
      setArsipLinks(data || []);
    } catch (e: any) {
      setError("Gagal memuat daftar link arsip. Silakan coba lagi nanti.");
      toast({ variant: "destructive", title: "Error Memuat Data", description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={dashboardLink}>
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Arsip Link Penting</h1>
          <p className="text-muted-foreground">
            Kumpulan tautan penting, dokumen, dan sumber daya yang relevan.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
                <Card key={i}>
                    <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                    <CardContent className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-10 w-1/3 mt-4" />
                    </CardContent>
                </Card>
            ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : arsipLinks.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6 border-2 border-dashed rounded-lg">
            <Info className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">Belum Ada Arsip Link</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                Saat ini belum ada link yang diarsipkan. Admin dapat menambahkannya melalui menu "Kelola Arsip".
            </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {arsipLinks.map((link) => (
            <Card key={link.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-start gap-2 text-xl">
                  <LinkIcon className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                  {link.judul}
                </CardTitle>
                <CardDescription>
                  Ditambahkan pada {link.createdAt ? format(link.createdAt.toDate(), "dd MMMM yyyy", { locale: indonesiaLocale }) : '-'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">{link.deskripsi}</p>
              </CardContent>
              <CardFooter>
                 <a href={link.url} target="_blank" rel="noopener noreferrer" className="w-full">
                    <Button className="w-full">
                        Buka Link
                    </Button>
                </a>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
