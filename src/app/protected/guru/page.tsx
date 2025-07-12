
"use client";

import React from 'react';
import Link from "next/link";
import { 
    BookUser, Edit3, BarChartHorizontalBig, Megaphone, Building, 
    BookCheck, CalendarPlus, UserCheck, FileClock, ShieldAlert, HeartHandshake, Library, Users2, CircleDollarSign, Award, Briefcase, DatabaseZap, ShieldQuestion
} from "lucide-react";
import { useAuth } from "@/context/AuthContext"; 

interface GuruMenuItem {
  title: string;
  href: string;
  icon: React.ElementType;
  color?: string;
  requiredTugas: (authContext: ReturnType<typeof useAuth>) => boolean;
}

const menuItems: GuruMenuItem[] = [
    // General Teacher Menu
    { title: "Input Nilai", href: "/protected/guru/grades", icon: Edit3, color: "text-blue-500", requiredTugas: ({ isStafTu, isSatpam, isPenjagaSekolah }) => !isStafTu && !isSatpam && !isPenjagaSekolah },
    { title: "Daftar Siswa", href: "/protected/guru/students", icon: BookUser, color: "text-green-500", requiredTugas: ({ isStafTu, isSatpam, isPenjagaSekolah }) => !isStafTu && !isSatpam && !isPenjagaSekolah },
    { title: "Agenda Mengajar", href: "/protected/guru/agenda-kelas", icon: CalendarPlus, color: "text-sky-500", requiredTugas: ({ isStafTu, isSatpam, isPenjagaSekolah }) => !isStafTu && !isSatpam && !isPenjagaSekolah },
    { title: "Rekap Nilai", href: "/protected/guru/rekap-nilai", icon: BarChartHorizontalBig, color: "text-purple-500", requiredTugas: ({ isStafTu, isSatpam, isPenjagaSekolah }) => !isStafTu && !isSatpam && !isPenjagaSekolah },
    { title: "Catat Kehadiran", href: "/protected/guru/attendance", icon: UserCheck, color: "text-indigo-500", requiredTugas: () => true },
    { title: "Rekap Kehadiran", href: "/protected/guru/rekap-kehadiran-saya", icon: FileClock, color: "text-amber-500", requiredTugas: () => true },
    { title: "Pengumuman", href: "/protected/guru/announcements", icon: Megaphone, color: "text-cyan-500", requiredTugas: () => true },
    { title: "Profil Sekolah", href: "/protected/guru/school-profile", icon: Building, color: "text-gray-500", requiredTugas: () => true },

    // Special Roles Menu
    { title: "Laporan Kegiatan", href: "/protected/guru/laporan-kegiatan", icon: BookCheck, color: "text-rose-500", requiredTugas: ({ isKesiswaan, isKurikulum, isPembinaEskul, isPembinaOsis, isBendahara, isBk, isOperator, isKepalaTataUsaha, isStafTu, isSatpam, isPenjagaSekolah }) => isKesiswaan || isKurikulum || isPembinaEskul || isPembinaOsis || isBendahara || isBk || isOperator || isKepalaTataUsaha || isStafTu || isSatpam || isPenjagaSekolah },
    { title: "Catat Pelanggaran", href: "/protected/guru/pelanggaran-siswa", icon: ShieldAlert, color: "text-red-500", requiredTugas: ({ isKesiswaan, isBk }) => isKesiswaan || isBk },
    
    // Links to Dashboards for those with multiple roles (these will be filtered out if not needed)
    { title: "Dasbor Kesiswaan", href: "/protected/guru/kesiswaan", icon: Users2, color: "text-teal-500", requiredTugas: ({ isKesiswaan }) => isKesiswaan },
    { title: "Dasbor Kurikulum", href: "/protected/guru/kurikulum", icon: Library, color: "text-teal-500", requiredTugas: ({ isKurikulum }) => isKurikulum },
    { title: "Dasbor Keuangan", href: "/protected/guru/bendahara", icon: CircleDollarSign, color: "text-teal-500", requiredTugas: ({ isBendahara }) => isBendahara },
    { title: "Dasbor Pembina", href: "/protected/guru/pembina", icon: Award, color: "text-teal-500", requiredTugas: ({ isPembinaEskul, isPembinaOsis }) => isPembinaEskul || isPembinaOsis },
    { title: "Dasbor BK", href: "/protected/guru/bk", icon: HeartHandshake, color: "text-pink-500", requiredTugas: ({ isBk }) => isBk },
    { title: "Dasbor Operator", href: "/protected/guru/operator", icon: DatabaseZap, color: "text-teal-500", requiredTugas: ({ isOperator }) => isOperator },
    { title: "Dasbor Ka. TU", href: "/protected/guru/tata-usaha", icon: Briefcase, color: "text-teal-500", requiredTugas: ({ isKepalaTataUsaha }) => isKepalaTataUsaha },
];

export default function GuruDashboardPage() {
  const authContext = useAuth();
  const { userProfile } = authContext;

  const visibleMenuItems = menuItems.filter(item => item.requiredTugas(authContext));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Dasbor</h1>
        <p className="text-muted-foreground">Selamat datang kembali, {userProfile?.displayName || "Guru"}!</p>
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
