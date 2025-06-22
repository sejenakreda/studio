
"use client";

import React from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users2, ShieldAlert } from "lucide-react";

export default function KesiswaanDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/protected/guru">
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Dasbor Wakasek Kesiswaan</h1>
          <p className="text-muted-foreground">
            Menu dan alat bantu untuk manajemen kesiswaan.
          </p>
        </div>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Menu Kesiswaan</CardTitle>
          <CardDescription>
            Akses cepat ke fitur-fitur terkait kesiswaan.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           <Link href="/protected/guru/laporan-kegiatan">
                <Card className="hover:bg-primary/5 hover:border-primary cursor-pointer h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Users2 className="h-5 w-5 text-primary"/>
                            Laporan Kegiatan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Buat dan kelola laporan kegiatan terkait bidang kesiswaan.</p>
                    </CardContent>
                </Card>
           </Link>
           <Link href="/protected/guru/pelanggaran-siswa">
                <Card className="hover:bg-primary/5 hover:border-primary cursor-pointer h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ShieldAlert className="h-5 w-5 text-primary"/>
                            Catat Pelanggaran
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Catat dan kelola data pelanggaran siswa.</p>
                    </CardContent>
                </Card>
           </Link>
        </CardContent>
      </Card>
    </div>
  );
}
