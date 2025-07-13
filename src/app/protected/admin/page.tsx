"use client";

import React from 'react';
import Link from "next/link";
import { 
    Users, Settings, FileText, CalendarCog, 
    ListChecks, Megaphone, BookUser, BookCopy, CalendarCheck, Building, FileWarning, Award, ShieldCheck, BarChart3, Printer, CalendarOff
} from "lucide-react";
import { useAuth } from '@/context/AuthContext';

interface AdminMenuItem {
  title: string;
  href: string;
  icon: React.ElementType;
  color?: string;
  requiredTugas?: (authContext: ReturnType<typeof useAuth>) => boolean;
}

const allMenuItems: AdminMenuItem[] = [
    // Manajemen Akademik & Sistem
    { title: "Kelola Guru", href: "/protected/admin/teachers", icon: Users, color: "text-blue-500" },
    { title: "Kelola Siswa", href: "/protected/admin/students", icon: BookUser, color: "text-sky-500" },
    { title: "Kelola Mapel", href: "/protected/admin/mapel", icon: ListChecks, color: "text-indigo-500" },
    { title: "Atur KKM", href: "/protected/admin/kkm", icon: ShieldCheck, color: "text-emerald-500" },
    { title: "Atur Bobot", href: "/protected/admin/weights", icon: Settings, color: "text-slate-500" },
    { title: "Tahun Ajaran", href: "/protected/admin/academic-years", icon: CalendarCog, color: "text-amber-500" },
    { title: "Kalender Libur", href: "/protected/admin/holidays", icon: CalendarOff, color: "text-red-500" },
    { title: "Pengumuman", href: "/protected/admin/announcements", icon: Megaphone, color: "text-cyan-500" },
    { title: "Profil Sekolah", href: "/protected/admin/school-profile", icon: Building, color: "text-gray-500" },
    { title: "Pengaturan Cetak", href: "/protected/admin/print-settings", icon: Printer, color: "text-pink-500" },

    // Laporan & Rekapitulasi
    { title: "Semua Nilai", href: "/protected/admin/grades", icon: FileText, color: "text-purple-500" },
    { title: "Rekap Kehadiran", href: "/protected/admin/teacher-attendance", icon: CalendarCheck, color: "text-teal-500" },
    { title: "Agenda Kelas", href: "/protected/admin/agenda-kelas", icon: BookCopy, color: "text-lime-500" },
    { title: "Laporan Pelanggaran", href: "/protected/admin/violation-reports", icon: FileWarning, color: "text-orange-500" },
    { title: "Laporan Kegiatan", href: "/protected/admin/kegiatan-reports", icon: Award, color: "text-fuchsia-500" },
    { title: "Statistik", href: "/protected/admin/reports", icon: BarChart3, color: "text-rose-500" },
];


export default function AdminDashboardPage() {
  const authContext = useAuth();
  
  const visibleMenuItems = allMenuItems.filter(item => 
      !item.requiredTugas || item.requiredTugas(authContext)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Dasbor Admin</h1>
        <p className="text-muted-foreground">Manajemen Sistem & Laporan SiAP Smapna.</p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-x-4 gap-y-8 pt-4">
        {visibleMenuItems.map((item) => (
          <Link
            href={item.href}
            key={item.title}
            className="flex flex-col items-center justify-center text-center gap-2 group"
          >
            <div className="p-4 rounded-full bg-muted/60 group-hover:bg-primary/10 transition-colors duration-200">
              <item.icon className={`h-8 w-8 transition-colors duration-200 ${item.color || 'text-muted-foreground'} group-hover:text-primary`} />
            </div>
            <p className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors duration-200">
              {item.title}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
