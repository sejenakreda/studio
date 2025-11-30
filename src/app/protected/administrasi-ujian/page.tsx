
"use client";

import React from 'react';
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSignature, ClipboardCheck } from "lucide-react";

const menuItems = [
    {
        title: "Berita Acara Ujian",
        href: "/protected/administrasi-ujian/berita-acara",
        icon: FileSignature,
        description: "Buat, kelola, dan cetak berita acara pelaksanaan ujian.",
        color: "text-blue-500",
    },
    {
        title: "Daftar Hadir Pengawas",
        href: "/protected/administrasi-ujian/daftar-hadir",
        icon: ClipboardCheck,
        description: "Catat dan rekapitulasi kehadiran Anda sebagai pengawas ujian.",
        color: "text-green-500",
    }
];

export default function AdministrasiUjianDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Administrasi Ujian</h1>
        <p className="text-muted-foreground">
          Pilih menu administrasi yang ingin Anda akses.
        </p>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {menuItems.map((item) => (
           <Link href={item.href} key={item.title}>
                <Card className="hover:bg-primary/5 hover:shadow-lg transition-all duration-300 h-full">
                    <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                        <div className={`p-3 rounded-full bg-muted/80 ${item.color}`}>
                           <item.icon className="h-6 w-6 text-white bg-current p-1 rounded-full" />
                        </div>
                        <CardTitle className="text-xl">
                            {item.title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                    </CardContent>
                </Card>
           </Link>
        ))}
      </div>
    </div>
  );
}
