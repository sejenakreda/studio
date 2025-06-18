
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, Settings, FileText, ShieldAlert, Loader2 } from "lucide-react";
import Link from "next/link";
import { getAllUsersByRole, getStudents } from '@/lib/firestoreService';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const [teacherCount, setTeacherCount] = useState<number | null>(null);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const fetchDashboardStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const [guruUsers, studentList] = await Promise.all([
        getAllUsersByRole('guru'),
        getStudents()
      ]);
      setTeacherCount(guruUsers?.length || 0);
      setStudentCount(studentList?.length || 0);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      toast({
        variant: "destructive",
        title: "Error Memuat Statistik",
        description: "Gagal mengambil data statistik untuk dasbor.",
      });
      setTeacherCount(0); // Fallback on error
      setStudentCount(0); // Fallback on error
    } finally {
      setIsLoadingStats(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const stats = [
    { 
      title: "Total Guru", 
      value: isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin" /> : (teacherCount !== null ? teacherCount.toString() : "N/A"), 
      icon: Users, 
      color: "text-blue-500", 
      bgColor: "bg-blue-100", 
      href: "/admin/teachers" 
    },
    { 
      title: "Bobot Penilaian", 
      value: "Dikonfigurasi", 
      icon: Settings, 
      color: "text-green-500", 
      bgColor: "bg-green-100", 
      href: "/admin/weights" 
    },
    { 
      title: "Total Siswa (Global)", 
      value: isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin" /> : (studentCount !== null ? studentCount.toString() : "N/A"), 
      icon: FileText, 
      color: "text-purple-500", 
      bgColor: "bg-purple-100", 
      href: "/admin/grades" 
    },
    { 
      title: "Aktivitas Terbaru", 
      value: "Update Bobot", // This can be made dynamic later
      icon: ShieldAlert, 
      color: "text-yellow-500", 
      bgColor: "bg-yellow-100", 
      href: "#" 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Dasbor Admin</h1>
          <p className="text-muted-foreground">Ringkasan dan manajemen sistem SkorZen.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link 
            href={stat.href} 
            key={stat.title} 
            className="block hover:shadow-lg transition-shadow duration-300 rounded-lg"
          >
            <Card className="overflow-hidden h-full flex flex-col">
              <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${stat.bgColor}`}>
                <CardTitle className={`text-sm font-medium ${stat.color}`}>{stat.title}</CardTitle>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-center">
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <p className="text-xs text-muted-foreground pt-1">
                  Lihat Detail
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Terkini</CardTitle>
            <CardDescription>Log perubahan penting dalam sistem.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[
                { action: "Bobot 'Tugas' diubah menjadi 25%", user: "Admin Test", time: "2 jam lalu" },
                { action: "Guru 'Budi Sudarsono' ditambahkan", user: "Admin Test", time: "1 hari lalu" },
                { action: "Sistem backup berhasil", user: "Sistem", time: "3 hari lalu" },
              ].map((item, idx) => (
                <li key={idx} className="flex items-start space-x-3">
                  <BarChart3 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.action}</p>
                    <p className="text-xs text-muted-foreground">{item.user} - {item.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pintasan Cepat</CardTitle>
            <CardDescription>Akses cepat ke fitur utama admin.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Link href="/admin/teachers">
              <Button variant="outline" className="w-full justify-start gap-2 hover:bg-accent hover:text-accent-foreground">
                <Users className="h-5 w-5" /> Kelola Guru
              </Button>
            </Link>
            <Link href="/admin/weights">
              <Button variant="outline" className="w-full justify-start gap-2 hover:bg-accent hover:text-accent-foreground">
                <Settings className="h-5 w-5" /> Atur Bobot
              </Button>
            </Link>
            <Link href="/admin/grades">
              <Button variant="outline" className="w-full justify-start gap-2 hover:bg-accent hover:text-accent-foreground">
                <FileText className="h-5 w-5" /> Lihat Semua Nilai
              </Button>
            </Link>
            <Button variant="outline" className="w-full justify-start gap-2 hover:bg-accent hover:text-accent-foreground" disabled>
              <ShieldAlert className="h-5 w-5" /> Laporan Sistem
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
