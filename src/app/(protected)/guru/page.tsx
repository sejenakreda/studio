
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookUser, Edit3, BarChart2, Users, Loader2, FileClock, Presentation, BarChartHorizontalBig, Megaphone } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext"; 
import { getStudents, getPengumumanUntukGuru } from '@/lib/firestoreService';
import type { Pengumuman } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';

export default function GuruDashboardPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [announcements, setAnnouncements] = useState<Pengumuman[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setIsLoadingStats(true);
    setIsLoadingAnnouncements(true);
    try {
      const [studentList, fetchedAnnouncements] = await Promise.all([
        getStudents(),
        getPengumumanUntukGuru(3) // Get latest 3 announcements
      ]);
      setStudentCount(studentList?.length || 0);
      setAnnouncements(fetchedAnnouncements || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        variant: "destructive",
        title: "Error Memuat Data Dasbor",
        description: "Gagal mengambil data untuk dasbor.",
      });
      setStudentCount(0); 
      setAnnouncements([]);
    } finally {
      setIsLoadingStats(false);
      setIsLoadingAnnouncements(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const quickStats = [
    { 
      title: "Total Siswa (Global)", 
      value: isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin" /> : (studentCount !== null ? studentCount.toString() : "N/A"), 
      icon: Users, 
      color: "text-blue-500", 
      bgColor: "bg-blue-100 dark:bg-blue-900/30", 
      href: "/guru/students",
      isExternal: false,
      disabled: false,
      tooltip: "Lihat semua siswa terdaftar"
    },
     { 
      title: "Rekap Nilai Semester", 
      value: "Lihat & Unduh", 
      icon: BarChartHorizontalBig, 
      color: "text-teal-500", 
      bgColor: "bg-teal-100 dark:bg-teal-900/30", 
      href: "/guru/rekap-nilai",
      isExternal: false, 
      disabled: false,
      tooltip: "Lihat rekapitulasi nilai per semester"
    },
    { 
      title: "Manajemen Kelas", 
      value: "Segera Hadir", 
      icon: BookUser, 
      color: "text-gray-500", 
      bgColor: "bg-gray-100 dark:bg-gray-700/30", 
      href: "#", 
      isExternal: false, 
      disabled: true,
      tooltip: "Fitur ini akan tersedia nanti"
    },
    { 
      title: "Analisis & Laporan", 
      value: "Segera Hadir", 
      icon: Presentation, 
      color: "text-gray-500", 
      bgColor: "bg-gray-100 dark:bg-gray-700/30", 
      href: "#", 
      isExternal: false, 
      disabled: true,
      tooltip: "Fitur analisis dan laporan akan tersedia nanti"
    },
  ];
  
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
         <Button onClick={fetchDashboardData} variant="outline" disabled={isLoadingStats || isLoadingAnnouncements}>
          {(isLoadingStats || isLoadingAnnouncements) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Muat Ulang Data
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat) => {
          const CardLink = stat.disabled || stat.href === "#" ? 'div' : Link;
          return (
            <CardLink 
              href={stat.disabled ? undefined : stat.href} 
              key={stat.title} 
              className={`block rounded-lg ${stat.disabled ? 'cursor-not-allowed opacity-70' : 'hover:shadow-lg transition-shadow duration-300'}`}
              title={stat.tooltip}
            >
              <Card className="overflow-hidden h-full flex flex-col">
                <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${stat.bgColor}`}>
                  <CardTitle className={`text-sm font-medium ${stat.color}`}>{stat.title}</CardTitle>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-center">
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  {!stat.disabled && (
                    <p className="text-xs text-muted-foreground pt-1">
                      Lihat Detail
                    </p>
                  )}
                  {stat.disabled && (
                     <p className="text-xs text-muted-foreground pt-1">
                      Segera Hadir
                    </p>
                  )}
                </CardContent>
              </Card>
            </CardLink>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pengumuman & Info Penting</CardTitle>
            <CardDescription>Daftar pengumuman terbaru dari admin (maks. 3).</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAnnouncements ? (
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
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pintasan Menu Guru</CardTitle>
            <CardDescription>Akses cepat ke fitur yang sering digunakan.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/guru/students">
              <Button variant="outline" className="w-full justify-start gap-2 py-6 text-base hover:bg-primary/10 hover:border-primary hover:text-primary">
                <Users className="h-6 w-6" /> Kelola Data Siswa
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
             <Button variant="outline" className="w-full justify-start gap-2 py-6 text-base hover:bg-primary/10 hover:border-primary hover:text-primary" disabled title="Fitur dalam pengembangan">
              <BookUser className="h-6 w-6" /> Daftar Kehadiran
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
    
