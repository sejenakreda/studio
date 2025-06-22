
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
    BarChart3, Users, Settings, FileText, Loader2, History, CalendarCog, 
    ListChecks, Megaphone, BookUser, ArrowRight, BookCopy, CalendarCheck, Building, FileWarning, Users2, Award
} from "lucide-react";
import Link from "next/link";
import { getAllUsersByRole, getStudents, getRecentActivityLogs } from '@/lib/firestoreService';
import { useToast } from '@/hooks/use-toast';
import type { ActivityLog } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminDashboardGroup {
  title: string;
  icon: React.ElementType;
  items: AdminDashboardItem[];
  defaultOpen?: boolean;
}

interface AdminDashboardItem {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color?: string;
}

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
        getRecentActivityLogs(5) 
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

  const dashboardGroups: AdminDashboardGroup[] = [
    {
      title: "Sistem Akademik & Penilaian",
      icon: BookCopy,
      defaultOpen: true,
      items: [
        { title: "Kelola Siswa", description: "Tambah, edit, atau impor data siswa.", href: "/admin/students", icon: BookUser, color: "text-sky-500" },
        { title: "Kelola Mapel", description: "Atur daftar mata pelajaran master.", href: "/admin/mapel", icon: ListChecks, color: "text-indigo-500" },
        { title: "Atur Bobot Nilai", description: "Konfigurasi bobot komponen penilaian.", href: "/admin/weights", icon: Settings, color: "text-green-500" },
        { title: "Tahun Ajaran Aktif", description: "Kelola tahun ajaran yang aktif.", href: "/admin/academic-years", icon: CalendarCog, color: "text-amber-500" },
        { title: "Semua Nilai Siswa", description: "Lihat semua data nilai siswa.", href: "/admin/grades", icon: FileText, color: "text-purple-500" },
      ]
    },
    {
      title: "Manajemen Pengguna & Sistem",
      icon: Users,
      items: [
        { title: "Kelola Guru", description: "Tambah atau edit data profil guru.", href: "/admin/teachers", icon: Users, color: "text-blue-500" },
        { title: "Laporan Sistem", description: "Statistik dan laporan umum sistem.", href: "/admin/reports", icon: BarChart3, color: "text-rose-500" },
        { title: "Laporan Pelanggaran", description: "Lihat dan ekspor data pelanggaran.", href: "/admin/violation-reports", icon: FileWarning, color: "text-orange-500" },
        { title: "Laporan Kegiatan", description: "Lihat laporan dari Pembina & Kesiswaan.", href: "/admin/kegiatan-reports", icon: Award, color: "text-teal-500" },
      ]
    },
    {
      title: "Kehadiran Guru",
      icon: CalendarCheck,
      items: [
        { title: "Rekap Kehadiran Guru", description: "Kelola rekapitulasi kehadiran guru.", href: "/admin/teacher-attendance", icon: CalendarCheck, color: "text-teal-500" }
      ]
    },
    {
      title: "Komunikasi & Informasi",
      icon: Megaphone,
      items: [
        { title: "Pengumuman Guru", description: "Buat dan kelola pengumuman untuk guru.", href: "/admin/announcements", icon: Megaphone, color: "text-cyan-500" }
      ]
    },
    {
      title: "Pengaturan Umum",
      icon: Settings,
      items: [
        { title: "Profil Sekolah", description: "Kelola data statistik sekolah seperti jumlah siswa, guru, dan sarana.", href: "/admin/school-profile", icon: Building, color: "text-gray-500" }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Dasbor Admin</h1>
          <p className="text-muted-foreground">Ringkasan dan manajemen sistem SiAP Smapna.</p>
        </div>
         <Button onClick={fetchDashboardData} variant="outline" disabled={isLoadingStats || isLoadingLogs}>
          {(isLoadingStats || isLoadingLogs) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Muat Ulang Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-primary/10">
                <CardTitle className="text-sm font-medium text-primary">Total Guru Terdaftar</CardTitle>
                <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent className="pt-2">
                <div className="text-2xl font-bold text-primary">
                    {isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : (teacherCount !== null ? teacherCount : "N/A")}
                </div>
            </CardContent>
        </Card>
        <Card className="md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-accent/10">
                <CardTitle className="text-sm font-medium text-accent">Total Siswa Terdaftar</CardTitle>
                <BookUser className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent className="pt-2">
                <div className="text-2xl font-bold text-accent">
                    {isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : (studentCount !== null ? studentCount : "N/A")}
                </div>
            </CardContent>
        </Card>
         <Card className="md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted">
                <CardTitle className="text-sm font-medium text-muted-foreground">Aktivitas Terkini</CardTitle>
                <History className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-2">
                <div className="text-2xl font-bold text-muted-foreground">
                    {isLoadingLogs ? <Loader2 className="h-6 w-6 animate-spin" /> : `${activityLogs.length} Log`}
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Menu Manajemen Sistem</CardTitle>
            <CardDescription>Akses cepat ke berbagai fitur manajemen.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion 
              type="multiple" 
              className="w-full"
              defaultValue={dashboardGroups.filter(g => g.defaultOpen).map(g => g.title)}
            >
              {dashboardGroups.map((group) => (
                <AccordionItem value={group.title} key={group.title}>
                  <AccordionTrigger className="text-lg hover:no-underline">
                    <div className="flex items-center gap-3">
                      <group.icon className="h-6 w-6 text-primary" />
                      {group.title}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      {group.items.map((item) => (
                        <Link href={item.href} key={item.title} className="block group">
                          <Card className="h-full hover:shadow-md transition-shadow hover:border-primary/50">
                            <CardHeader className="pb-3">
                              <div className="flex items-center gap-3">
                                <item.icon className={`h-6 w-6 ${item.color || 'text-muted-foreground'} group-hover:text-primary transition-colors`} />
                                <CardTitle className={`text-base ${item.color || 'text-foreground'} group-hover:text-primary transition-colors`}>{item.title}</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            </CardContent>
                            <CardFooter className="pt-2 pb-3">
                                <Button variant="link" size="sm" className="p-0 h-auto text-primary group-hover:underline">
                                    Buka Halaman <ArrowRight className="ml-1 h-4 w-4 transform transition-transform group-hover:translate-x-1"/>
                                </Button>
                            </CardFooter>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
        
        <Card id="activity-log" className="md:col-span-2">
          <CardHeader>
            <CardTitle>Log Aktivitas Terbaru</CardTitle>
            <CardDescription>Perubahan penting dalam sistem (5 terbaru).</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLogs ? (
              <div className="space-y-3">
                {[...Array(3)].map((_,i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : activityLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada aktivitas tercatat.</p>
            ) : (
              <ul className="space-y-3 max-h-96 overflow-y-auto">
                {activityLogs.map((log) => (
                  <li key={log.id} className="flex items-start space-x-3 p-3 border rounded-md hover:bg-accent/50 transition-colors">
                    <History className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-grow min-w-0"> 
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
      </div>
    </div>
  );
}
    
