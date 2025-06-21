
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookUser, Edit3, Users, Loader2, BarChartHorizontalBig, Megaphone, ArrowRight, GraduationCap, UserSquare, Briefcase, School, Database, Users2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext"; 
import { getStudents, getPengumumanUntukGuru, getSchoolProfile } from '@/lib/firestoreService';
import type { Pengumuman, SchoolProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';

export default function GuruDashboardPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [announcements, setAnnouncements] = useState<Pengumuman[]>([]);
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [studentList, fetchedAnnouncements, fetchedProfile] = await Promise.all([
        getStudents(),
        getPengumumanUntukGuru(3),
        getSchoolProfile(),
      ]);
      setStudentCount(studentList?.length || 0);
      setAnnouncements(fetchedAnnouncements || []);
      setSchoolProfile(fetchedProfile);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        variant: "destructive",
        title: "Error Memuat Data Dasbor",
        description: "Gagal mengambil data untuk dasbor.",
      });
      setStudentCount(0); 
      setAnnouncements([]);
      setSchoolProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const totalSiswaAktif = React.useMemo(() => {
      if (!schoolProfile || !schoolProfile.classDetails) return 0;
      return schoolProfile.classDetails.reduce((sum, detail) => sum + (detail.male || 0) + (detail.female || 0), 0);
  }, [schoolProfile]);


  const getPrioritasColor = (prioritas: Pengumuman['prioritas']) => {
    switch (prioritas) {
      case 'Tinggi': return 'text-red-500';
      case 'Sedang': return 'text-yellow-500';
      case 'Rendah': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Dasbor Guru</h1>
          <p className="text-muted-foreground">Selamat datang kembali, {userProfile?.displayName || "Guru"}!</p>
        </div>
         <Button onClick={fetchDashboardData} variant="outline" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Muat Ulang Data
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Pintasan Menu Guru</CardTitle>
            <CardDescription>Akses cepat ke fitur yang sering digunakan.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/guru/students">
              <Button variant="outline" className="w-full justify-start gap-2 py-6 text-base hover:bg-primary/10 hover:border-primary hover:text-primary">
                <Users className="h-6 w-6" /> Daftar Siswa
              </Button>
            </Link>
            <Link href="/guru/grades">
              <Button variant="outline" className="w-full justify-start gap-2 py-6 text-base hover:bg-primary/10 hover:border-primary hover:text-primary">
                <Edit3 className="h-6 w-6" /> Input & Lihat Nilai
              </Button>
            </Link>
            <Link href="/guru/rekap-nilai">
              <Button variant="outline" className="w-full justify-start gap-2 py-6 text-base hover:bg-primary/10 hover:border-primary hover:text-primary">
                <BarChartHorizontalBig className="h-6 w-6" /> Rekap Nilai
              </Button>
            </Link>
             <Link href="/guru/attendance">
               <Button variant="outline" className="w-full justify-start gap-2 py-6 text-base hover:bg-primary/10 hover:border-primary hover:text-primary">
                <BookUser className="h-6 w-6" /> Catat Kehadiran
              </Button>
             </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pengumuman & Info Penting</CardTitle>
            <CardDescription>Daftar pengumuman terbaru dari admin (maks. 3).</CardDescription>
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
              <Link href="/guru/announcements" className="w-full">
                <Button variant="outline" className="w-full">
                  Lihat Semua Pengumuman <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          )}
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><School className="h-5 w-5 text-primary" /> Profil Sekolah</CardTitle>
            <CardDescription>Data statistik umum sekolah.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5"><Users2 className="h-4 w-4 text-muted-foreground" /> Sumber Daya Manusia</h4>
                <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="flex justify-between items-center p-2 rounded bg-muted/50"><span>Siswa Aktif</span><span className="font-bold">{isLoading ? <Skeleton className="h-4 w-6"/> : totalSiswaAktif}</span></div>
                    <div className="p-2 rounded bg-muted/50">
                        <div className="flex justify-between items-center"><span>Alumni</span> <span className="font-bold">{isLoading ? <Skeleton className="h-4 w-6"/> : schoolProfile?.stats.alumni.ril ?? 0}</span></div>
                        <div className="flex justify-between items-center text-muted-foreground text-[0.7rem]">(Dapodik: {isLoading ? <Skeleton className="h-3 w-5 inline-block"/> : schoolProfile?.stats.alumni.dapodik ?? 0})</div>
                    </div>
                     <div className="p-2 rounded bg-muted/50">
                        <div className="flex justify-between items-center"><span>Guru</span> <span className="font-bold">{isLoading ? <Skeleton className="h-4 w-6"/> : schoolProfile?.stats.guru.ril ?? 0}</span></div>
                        <div className="flex justify-between items-center text-muted-foreground text-[0.7rem]">(Dapodik: {isLoading ? <Skeleton className="h-3 w-5 inline-block"/> : schoolProfile?.stats.guru.dapodik ?? 0})</div>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                        <div className="flex justify-between items-center"><span>Staf/Tendik</span> <span className="font-bold">{isLoading ? <Skeleton className="h-4 w-6"/> : schoolProfile?.stats.tendik.ril ?? 0}</span></div>
                        <div className="flex justify-between items-center text-muted-foreground text-[0.7rem]">(Dapodik: {isLoading ? <Skeleton className="h-3 w-5 inline-block"/> : schoolProfile?.stats.tendik.dapodik ?? 0})</div>
                    </div>
                </div>
            </div>
            <div>
                <h4 className="text-sm font-medium mb-2">Sarana & Prasarana</h4>
                {isLoading ? (
                    <div className="grid grid-cols-2 gap-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full"/>)}</div>
                ) : !schoolProfile || !schoolProfile.sarana || schoolProfile.sarana.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Data sarana belum diisi.</p>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {(schoolProfile.sarana || []).map((item) => (
                             <div key={item.name} className="p-2 rounded-md bg-muted/50">
                                <p className="text-sm font-semibold">{item.quantity}</p>
                                <p className="text-xs text-muted-foreground">{item.name}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
