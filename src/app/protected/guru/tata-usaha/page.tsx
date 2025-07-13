"use client";

import React from 'react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Briefcase, DatabaseZap, Users, ShieldQuestion, ShieldAlert } from "lucide-react";
import type { TugasTambahan } from '@/types';

interface ReportCategory {
  title: string;
  href: string;
  icon: React.ElementType;
  color: string;
  activityId: TugasTambahan;
}

// These links point to the admin report page, which is now accessible by Ka. TU
const reportCategories: ReportCategory[] = [
    { title: "Laporan Saya", href: "/protected/guru/laporan-kegiatan?context=kepala_tata_usaha", icon: Briefcase, color: "text-slate-500", activityId: "kepala_tata_usaha" },
    { title: "Laporan Operator", href: "/protected/admin/kegiatan-reports?activity=operator", icon: DatabaseZap, color: "text-sky-500", activityId: "operator" },
    { title: "Laporan Staf TU", href: "/protected/admin/kegiatan-reports?activity=staf_tu", icon: Users, color: "text-gray-500", activityId: "staf_tu" },
    { title: "Laporan Satpam", href: "/protected/admin/kegiatan-reports?activity=satpam", icon: ShieldQuestion, color: "text-indigo-500", activityId: "satpam" },
    { title: "Laporan Penjaga Sekolah", href: "/protected/admin/kegiatan-reports?activity=penjaga_sekolah", icon: ShieldAlert, color: "text-red-500", activityId: "penjaga_sekolah" },
];

export default function TataUsahaDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/protected/guru">
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Dasbor Kepala Tata Usaha</h1>
          <p className="text-muted-foreground">
            Akses cepat ke laporan kegiatan Anda dan staf di bawah Anda.
          </p>
        </div>
      </div>

       <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-x-4 gap-y-8 pt-4">
        {reportCategories.map((item) => (
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
