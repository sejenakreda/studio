
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, Settings, FileText, ShieldAlert, Loader2, History } from "lucide-react";
import Link from "next/link";
import { getAllUsersByRole, getStudents, getRecentActivityLogs } from '@/lib/firestoreService';
import { useToast } from '@/hooks/use-toast';
import type { ActivityLog } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const [teacherCount, setTeacherCount] = useState<number | null>(null);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setIsLoadingStats(true);
    setIsLoadingLogs(true);
    try {
      const [guruUsers, studentList, logs] = await Promise.all([
        getAllUsersByRole('guru'),
        getStudents(),
        getRecentActivityLogs(5) // Fetch 5 most recent logs
      ]);
      setTeacherCount(guruUsers?.length || 0);
      setStudentCount(studentList?.length || 0);
      setActivityLogs(logs || []);
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast({
        variant: "destructive",
        title: "Error Memuat Data Dasbor",
        description: error.message || "Gagal mengambil data untuk dasbor.",
      });
      setTeacherCount(0); 
      setStudentCount(0); 
      setActivityLogs([]);
    } finally {
      setIsLoadingStats(false);
      setIsLoadingLogs(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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
      value: isLoadingLogs ? <Loader2 className="h-5 w-5 animate-spin" /> : `${activityLogs.length} Log`,
      icon: History, 
      color: "text-yellow-500", 
      bgColor: "bg-yellow-100", 
      href: "#activity-log" 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Dasbor Admin</h1>
          <p className="text-muted-foreground">Ringkasan dan manajemen sistem SkorZen.</p>
        </div>
         <Button onClick={fetchDashboardData} variant="outline" disabled={isLoadingStats || isLoadingLogs}>
          {isLoadingStats || isLoadingLogs ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Muat Ulang Data
        </Button>
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
        <Card id="activity-log">
          <CardHeader>
            <CardTitle>Aktivitas Terkini</CardTitle>
            <CardDescription>Log perubahan penting dalam sistem.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLogs ? (
              <div className="space-y-3">
                {[...Array(3)].map((_,i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : activityLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada aktivitas tercatat.</p>
            ) : (
              <ul className="space-y-3 max-h-96 overflow-y-auto">
                {activityLogs.map((log) => (
                  <li key={log.id} className="flex items-start space-x-3 p-3 border rounded-md hover:bg-accent/50 transition-colors">
                    <History className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-grow min-w-0"> {/* Ensure text wraps */}
                      <p className="text-sm font-medium text-foreground truncate" title={log.action}>{log.action}</p>
                      {log.details && <p className="text-xs text-muted-foreground truncate" title={log.details}>{log.details}</p>}
                      <p className="text-xs text-muted-foreground">
                        Oleh: <span className="font-medium">{log.userName || "Sistem"}</span> - 
                        {' '}
                        {log.timestamp ? formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true, locale: indonesiaLocale }) : 'Beberapa saat lalu'}
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

    