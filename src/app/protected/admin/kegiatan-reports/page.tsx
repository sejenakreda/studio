"use client";

import React from 'react';
import Link from "next/link";
import { 
    ArrowLeft, Award, Users2, Library, CircleDollarSign, HeartHandshake, Briefcase, 
    DatabaseZap, ShieldQuestion, ShieldAlert, Users 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TugasTambahan } from '@/types';

interface ReportCategory {
  title: string;
  href: string;
  icon: React.ElementType;
  color: string;
  activityId: TugasTambahan;
}

// Mendefinisikan semua kemungkinan laporan kegiatan dalam bentuk menu
const reportCategories: ReportCategory[] = [
    { title: "Kesiswaan", href: "/protected/admin/kegiatan-reports?activity=kesiswaan", icon: Users2, color: "text-blue-500", activityId: "kesiswaan" },
    { title: "Kurikulum", href: "/protected/admin/kegiatan-reports?activity=kurikulum", icon: Library, color: "text-green-500", activityId: "kurikulum" },
    { title: "Bendahara", href: "/protected/admin/kegiatan-reports?activity=bendahara", icon: CircleDollarSign, color: "text-amber-500", activityId: "bendahara" },
    { title: "OSIS", href: "/protected/admin/kegiatan-reports?activity=pembina_osis", icon: Award, color: "text-purple-500", activityId: "pembina_osis" },
    { title: "Bimbingan Konseling", href: "/protected/admin/kegiatan-reports?activity=bk", icon: HeartHandshake, color: "text-rose-500", activityId: "bk" },
    { title: "Operator", href: "/protected/admin/kegiatan-reports?activity=operator", icon: DatabaseZap, color: "text-sky-500", activityId: "operator" },
    { title: "Kepala TU", href: "/protected/admin/kegiatan-reports?activity=kepala_tata_usaha", icon: Briefcase, color: "text-slate-500", activityId: "kepala_tata_usaha" },
    { title: "Staf TU", href: "/protected/admin/kegiatan-reports?activity=staf_tu", icon: Users, color: "text-gray-500", activityId: "staf_tu" },
    { title: "Satpam", href: "/protected/admin/kegiatan-reports?activity=satpam", icon: ShieldQuestion, color: "text-indigo-500", activityId: "satpam" },
    { title: "Penjaga Sekolah", href: "/protected/admin/kegiatan-reports?activity=penjaga_sekolah", icon: ShieldAlert, color: "text-red-500", activityId: "penjaga_sekolah" },
    { title: "Eskul PMR", href: "/protected/admin/kegiatan-reports?activity=pembina_eskul_pmr", icon: Award, color: "text-teal-500", activityId: "pembina_eskul_pmr" },
    { title: "Eskul Paskibra", href: "/protected/admin/kegiatan-reports?activity=pembina_eskul_paskibra", icon: Award, color: "text-teal-500", activityId: "pembina_eskul_paskibra" },
    { title: "Eskul Pramuka", href: "/protected/admin/kegiatan-reports?activity=pembina_eskul_pramuka", icon: Award, color: "text-teal-500", activityId: "pembina_eskul_pramuka" },
    { title: "Eskul Karawitan", href: "/protected/admin/kegiatan-reports?activity=pembina_eskul_karawitan", icon: Award, color: "text-teal-500", activityId: "pembina_eskul_karawitan" },
    { title: "Eskul Pencak Silat", href: "/protected/admin/kegiatan-reports?activity=pembina_eskul_pencak_silat", icon: Award, color: "text-teal-500", activityId: "pembina_eskul_pencak_silat" },
    { title: "Eskul Volly Ball", href: "/protected/admin/kegiatan-reports?activity=pembina_eskul_volly_ball", icon: Award, color: "text-teal-500", activityId: "pembina_eskul_volly_ball" },
];

export default function LaporanKegiatanSubDashboardPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/protected/admin">
                    <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Admin">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Laporan Kegiatan</h1>
                    <p className="text-muted-foreground">Pilih jenis laporan kegiatan yang ingin Anda lihat.</p>
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