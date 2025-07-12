"use client";

import React, { useMemo } from 'react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Award } from "lucide-react";
import { useAuth } from '@/context/AuthContext';
import type { TugasTambahan } from '@/types';

interface SubMenuCategory {
  title: string;
  href: string;
  icon: React.ElementType;
  color: string;
  activityId: TugasTambahan;
}

const allPembinaCategories: SubMenuCategory[] = [
    { title: "Laporan OSIS", href: "/protected/guru/laporan-kegiatan?context=pembina_osis", icon: Award, color: "text-purple-500", activityId: "pembina_osis" },
    { title: "Laporan Eskul PMR", href: "/protected/guru/laporan-kegiatan?context=pembina_eskul_pmr", icon: Award, color: "text-teal-500", activityId: "pembina_eskul_pmr" },
    { title: "Laporan Eskul Paskibra", href: "/protected/guru/laporan-kegiatan?context=pembina_eskul_paskibra", icon: Award, color: "text-teal-500", activityId: "pembina_eskul_paskibra" },
    { title: "Laporan Eskul Pramuka", href: "/protected/guru/laporan-kegiatan?context=pembina_eskul_pramuka", icon: Award, color: "text-teal-500", activityId: "pembina_eskul_pramuka" },
    { title: "Laporan Eskul Karawitan", href: "/protected/guru/laporan-kegiatan?context=pembina_eskul_karawitan", icon: Award, color: "text-teal-500", activityId: "pembina_eskul_karawitan" },
    { title: "Laporan Eskul Pencak Silat", href: "/protected/guru/laporan-kegiatan?context=pembina_eskul_pencak_silat", icon: Award, color: "text-teal-500", activityId: "pembina_eskul_pencak_silat" },
    { title: "Laporan Eskul Volly Ball", href: "/protected/guru/laporan-kegiatan?context=pembina_eskul_volly_ball", icon: Award, color: "text-teal-500", activityId: "pembina_eskul_volly_ball" },
];


export default function PembinaDashboardPage() {
    const { userProfile } = useAuth();

    const availableMenus = useMemo(() => {
        if (!userProfile?.tugasTambahan) return [];
        return allPembinaCategories.filter(cat => userProfile.tugasTambahan!.includes(cat.activityId));
    }, [userProfile]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/protected/guru">
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Dasbor Pembina</h1>
          <p className="text-muted-foreground">
            Menu dan alat bantu untuk tugas pembinaan Anda.
          </p>
        </div>
      </div>

       <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-x-4 gap-y-8 pt-4">
        {availableMenus.map((item) => (
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
