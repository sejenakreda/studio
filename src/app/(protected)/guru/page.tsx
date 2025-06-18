
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookUser, Edit3, BarChart2, Users, Loader2, FileClock, Presentation, BarChartHorizontalBig } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext"; 
import { getStudents } from '@/lib/firestoreService';
import { useToast } from '@/hooks/use-toast';

export default function GuruDashboardPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const fetchDashboardStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const studentList = await getStudents();
      setStudentCount(studentList?.length || 0);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      toast({
        variant: "destructive",
        title: "Error Memuat Statistik Siswa",
        description: "Gagal mengambil data siswa untuk dasbor.",
      });
      setStudentCount(0); // Fallback on error
    } finally {
      setIsLoadingStats(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

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
      title: "Pengingat & Analisis", 
      value: "Segera Hadir", 
      icon: Presentation, // Changed icon for variety
      color: "text-gray-500", 
      bgColor: "bg-gray-100 dark:bg-gray-700/30", 
      href: "#", 
      isExternal: false, 
      disabled: true,
      tooltip: "Fitur pengingat dan analisis akan tersedia nanti"
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Dasbor Guru</h1>
          <p className="text-muted-foreground">Selamat datang kembali, {userProfile?.displayName || "Guru"}!</p>
        </div>
         <Button onClick={fetchDashboardStats} variant="outline" disabled={isLoadingStats}>
          {isLoadingStats ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Muat Ulang Statistik
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
            <CardTitle>Tugas & Pengumuman</CardTitle>
            <CardDescription>Daftar tugas atau pengumuman penting dari admin.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[
                { task: "Input nilai PTS Semester Ganjil paling lambat 25 Okt", class: "Semua Kelas", urgency: "Tinggi" },
                { task: "Rapat koordinasi wali kelas (jika ada)", class: "Khusus Wali Kelas", urgency: "Sedang" },
                { task: "Pengumpulan RPP terbaru (jika ada)", class: "Semua Guru", urgency: "Rendah" },
              ].map((item, idx) => (
                <li key={idx} className="flex items-start space-x-3 p-3 rounded-md border hover:bg-accent/50">
                  <Edit3 className={`h-5 w-5 mt-0.5 ${item.urgency === 'Tinggi' ? 'text-red-500' : item.urgency === 'Sedang' ? 'text-yellow-500' : 'text-green-500'}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.task}</p>
                    <p className="text-xs text-muted-foreground">{item.class} - Prioritas: {item.urgency}</p>
                  </div>
                </li>
              ))}
            </ul>
             <p className="mt-4 text-sm text-muted-foreground text-center">Fitur pengumuman dinamis akan ditambahkan nanti.</p>
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
                <BarChartHorizontalBig className="h-6 w-6" /> Rekap Nilai Semester
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


    