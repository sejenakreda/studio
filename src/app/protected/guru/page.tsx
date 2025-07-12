
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    BookUser, Edit3, BarChartHorizontalBig, Megaphone, ArrowRight, Building, 
    BookCheck, CalendarPlus, UserCheck, FileClock, ShieldAlert, HeartHandshake, Award 
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext"; 
import { getPengumumanUntukGuru } from '@/lib/firestoreService';
import type { Pengumuman } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';

interface GuruDashboardItem {
  title: string;
  href: string;
  icon: React.ElementType;
  description: string;
  color?: string;
  requiredTugas?: (authContext: ReturnType<typeof useAuth>) => boolean;
}

const guruMenuItems: GuruDashboardItem[] = [
    { title: "Input & Edit Nilai", href: "/protected/guru/grades", icon: Edit3, description: "Input nilai siswa per mapel.", color: "text-blue-500", requiredTugas: ({ isStafTu, isSatpam, isPenjagaSekolah }) => !isStafTu && !isSatpam && !isPenjagaSekolah },
    { title: "Daftar Siswa", href: "/protected/guru/students", icon: BookUser, description: "Lihat data siswa & rapor.", color: "text-green-500", requiredTugas: ({ isStafTu, isSatpam, isPenjagaSekolah }) => !isStafTu && !isSatpam && !isPenjagaSekolah },
    { title: "Rekap Nilai", href: "/protected/guru/rekap-nilai", icon: BarChartHorizontalBig, description: "Lihat rekap nilai per kelas.", color: "text-purple-500", requiredTugas: ({ isStafTu, isSatpam, isPenjagaSekolah }) => !isStafTu && !isSatpam && !isPenjagaSekolah },
    { title: "Agenda Mengajar", href: "/protected/guru/agenda-kelas", icon: CalendarPlus, description: "Catat agenda mengajar harian.", color: "text-sky-500", requiredTugas: ({ isStafTu, isSatpam, isPenjagaSekolah }) => !isStafTu && !isSatpam && !isPenjagaSekolah },
    { title: "Catat Kehadiran", href: "/protected/guru/attendance", icon: UserCheck, description: "Catat kehadiran harian Anda.", color: "text-indigo-500" },
    { title: "Rekap Kehadiran Saya", href: "/protected/guru/rekap-kehadiran-saya", icon: FileClock, description: "Lihat rekap kehadiran Anda.", color: "text-amber-500" },
    { title: "Lihat Pengumuman", href: "/protected/guru/announcements", icon: Megaphone, description: "Lihat semua info dari admin.", color: "text-cyan-500" },
    { title: "Profil Sekolah", href: "/protected/guru/school-profile", icon: Building, description: "Lihat statistik sekolah.", color: "text-gray-500" },
];

const tugasTambahanMenuItems: GuruDashboardItem[] = [
    { title: "Laporan Kegiatan", href: "/protected/guru/laporan-kegiatan", icon: BookCheck, description: "Buat laporan untuk tugas Anda.", color: "text-rose-500", requiredTugas: ({ isKesiswaan, isKurikulum, isPembinaEskul, isPembinaOsis, isBendahara, isBk, isOperator, isKepalaTataUsaha, isStafTu, isSatpam, isPenjagaSekolah }) => isKesiswaan || isKurikulum || isPembinaEskul || isPembinaOsis || isBendahara || isBk || isOperator || isKepalaTataUsaha || isStafTu || isSatpam || isPenjagaSekolah },
    { title: "Catat Pelanggaran", href: "/protected/guru/pelanggaran-siswa", icon: ShieldAlert, description: "Catat pelanggaran siswa.", color: "text-red-500", requiredTugas: ({ isKesiswaan, isBk }) => isKesiswaan || isBk },
    { title: "Dasbor Kesiswaan", href: "/protected/guru/kesiswaan", icon: Award, description: "Menu khusus kesiswaan.", color: "text-teal-500", requiredTugas: ({ isKesiswaan }) => isKesiswaan },
    { title: "Dasbor Kurikulum", href: "/protected/guru/kurikulum", icon: Award, description: "Menu khusus kurikulum.", color: "text-teal-500", requiredTugas: ({ isKurikulum }) => isKurikulum },
    { title: "Dasbor Pembina", href: "/protected/guru/pembina", icon: Award, description: "Menu khusus pembina.", color: "text-teal-500", requiredTugas: ({ isPembinaEskul, isPembinaOsis }) => isPembinaEskul || isPembinaOsis },
    { title: "Dasbor BK", href: "/protected/guru/bk", icon: HeartHandshake, description: "Menu khusus Bimbingan Konseling.", color: "text-pink-500", requiredTugas: ({ isBk }) => isBk },
];


export default function GuruDashboardPage() {
  const authContext = useAuth();
  const { userProfile, loading } = authContext;
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Pengumuman[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedAnnouncements = await getPengumumanUntukGuru(3);
      setAnnouncements(fetchedAnnouncements || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        variant: "destructive",
        title: "Error Memuat Data Dasbor",
        description: "Gagal mengambil data untuk dasbor.",
      });
      setAnnouncements([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getPrioritasColor = (prioritas: Pengumuman['prioritas']) => {
    switch (prioritas) {
      case 'Tinggi': return 'text-red-500';
      case 'Sedang': return 'text-yellow-500';
      case 'Rendah': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  const visibleGuruMenuItems = guruMenuItems.filter(item => !item.requiredTugas || item.requiredTugas(authContext));
  const visibleTugasTambahanMenuItems = tugasTambahanMenuItems.filter(item => item.requiredTugas && item.requiredTugas(authContext));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Dasbor Guru</h1>
        <p className="text-muted-foreground">Selamat datang kembali, {userProfile?.displayName || "Guru"}!</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pengumuman Terbaru</CardTitle>
          <CardDescription>Informasi penting dari admin.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="space-y-3">
              {[...Array(2)].map((_,i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada pengumuman terbaru.</p>
          ) : (
            <ul className="space-y-3">
              {announcements.map((item) => (
                <li key={item.id} className="flex items-start space-x-3 p-3 rounded-md border hover:bg-accent/50">
                  <Megaphone className={`h-5 w-5 mt-1 flex-shrink-0 ${getPrioritasColor(item.prioritas)}`} />
                  <div className="flex-grow">
                    <p className="text-sm font-medium text-foreground">{item.judul}</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{item.isi}</p>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">{item.infoTambahan || 'Umum'}</span> - 
                      Prioritas: <span className={`font-semibold ${getPrioritasColor(item.prioritas)}`}>{item.prioritas}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.createdAt ? formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true, locale: indonesiaLocale }) : 'Beberapa saat lalu'}
                      {item.createdByDisplayName && <span className="italic"> oleh {item.createdByDisplayName}</span>}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
         {announcements.length > 0 && (
          <CardFooter>
            <Link href="/protected/guru/announcements" className="w-full">
              <Button variant="outline" className="w-full">
                Lihat Semua Pengumuman <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        )}
      </Card>

      {visibleTugasTambahanMenuItems.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold tracking-tight mb-4">Menu Tugas Tambahan</h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {visibleTugasTambahanMenuItems.map((item) => (
                    <Link href={item.href} key={item.title} className="block group">
                    <Card className="h-full hover:shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-primary/50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-base font-medium">{item.title}</CardTitle>
                            <item.icon className={`h-6 w-6 ${item.color || 'text-muted-foreground'} transition-colors`} />
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                        </CardContent>
                    </Card>
                    </Link>
                ))}
            </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold tracking-tight mb-4">Menu Utama Guru</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleGuruMenuItems.map((item) => (
                <Link href={item.href} key={item.title} className="block group">
                <Card className="h-full hover:shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-primary/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium">{item.title}</CardTitle>
                        <item.icon className={`h-6 w-6 ${item.color || 'text-muted-foreground'} transition-colors`} />
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                    </CardContent>
                </Card>
                </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
