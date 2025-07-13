"use client";

import React from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
            Menu dan alat bantu untuk manajemen Tata Usaha.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Menu Laporan</CardTitle>
          <CardDescription>
            Akses cepat ke laporan kegiatan Anda dan staf di bawah Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {reportCategories.map((item) => (
                <Link href={item.href} key={item.title}>
                    <Card className="hover:bg-primary/5 hover:border-primary cursor-pointer h-full transition-colors">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <item.icon className={`h-5 w-5 ${item.color}`} />
                                {item.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Lihat dan kelola laporan untuk {item.title.toLowerCase()}.</p>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
