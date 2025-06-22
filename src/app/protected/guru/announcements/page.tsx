"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle, Megaphone, Info } from "lucide-react";
import { getAllPengumuman } from '@/lib/firestoreService';
import type { Pengumuman } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDistanceToNow } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';

export default function GuruAnnouncementsPage() {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Pengumuman[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchAllAnnouncements = useCallback(async () => {
    setIsLoadingData(true);
    setFetchError(null);
    try {
      const data = await getAllPengumuman(); // Fetches all, sorted by newest first
      setAnnouncements(data || []);
    } catch (error: any) {
      console.error("Error fetching all announcements for guru:", error);
      setFetchError("Gagal memuat daftar semua pengumuman. Silakan coba lagi.");
      toast({ variant: "destructive", title: "Error", description: "Gagal memuat daftar pengumuman." });
      setAnnouncements([]);
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllAnnouncements();
  }, [fetchAllAnnouncements]);
  
  const getPrioritasColor = (prioritas: Pengumuman['prioritas']) => {
    switch (prioritas) {
      case 'Tinggi': return 'text-red-500 border-red-500/50';
      case 'Sedang': return 'text-yellow-500 border-yellow-500/50';
      case 'Rendah': return 'text-green-500 border-green-500/50';
      default: return 'text-gray-500 border-gray-500/50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/protected/guru">
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Guru">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Semua Pengumuman</h1>
          <p className="text-muted-foreground">
            Daftar semua pengumuman dan informasi penting dari Admin.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengumuman</CardTitle>
          <CardDescription>Berikut adalah semua pengumuman yang telah diterbitkan, terbaru di atas.</CardDescription>
        </CardHeader>
        <CardContent>
          {fetchError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Memuat Data</AlertTitle>
              <AlertDescription>{fetchError}</AlertDescription>
            </Alert>
          )}
          {isLoadingData ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-full mb-3" />
                  <Skeleton className="h-3 w-1/2" />
                </Card>
              ))}
            </div>
          ) : announcements.length === 0 && !fetchError ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] text-center p-6 border-2 border-dashed rounded-lg">
              <Megaphone className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">Belum Ada Pengumuman</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Saat ini belum ada pengumuman yang diterbitkan oleh Admin.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {announcements.map((item) => (
                <Card key={item.id} className={`p-4 border-l-4 ${getPrioritasColor(item.prioritas)} hover:shadow-md transition-shadow`}>
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                       <Megaphone className={`h-5 w-5 ${getPrioritasColor(item.prioritas)}`} />
                      {item.judul}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-2">{item.isi}</p>
                    <div className="text-xs text-muted-foreground">
                      {item.infoTambahan && <p className="font-medium">Info: {item.infoTambahan}</p>}
                      <p>Prioritas: <span className={`font-semibold ${getPrioritasColor(item.prioritas).split(' ')[0]}`}>{item.prioritas}</span></p>
                      <p>
                        Diterbitkan: {item.createdAt ? formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true, locale: indonesiaLocale }) : 'Beberapa saat lalu'}
                        {item.createdByDisplayName && <span className="italic"> oleh {item.createdByDisplayName}</span>}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
