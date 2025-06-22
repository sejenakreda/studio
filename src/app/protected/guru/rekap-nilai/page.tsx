
"use client";

import React from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Construction } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function RekapNilaiPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/protected/guru">
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Rekapitulasi Nilai</h1>
          <p className="text-muted-foreground">
            Lihat rekapitulasi nilai untuk mata pelajaran yang Anda ampu.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fitur Dalam Pengembangan</CardTitle>
          <CardDescription>
            Halaman untuk melihat dan mengunduh rekapitulasi nilai sedang dalam tahap pengembangan.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center min-h-[300px]">
           <Construction className="h-16 w-16 text-primary mb-4" />
           <h2 className="text-xl font-semibold">Segera Hadir</h2>
           <p className="text-muted-foreground mt-2 max-w-md">
                Kami sedang bekerja keras untuk menyediakan fitur rekapitulasi nilai yang komprehensif. 
                Anda akan dapat melihat statistik dan mengunduh laporan dari halaman ini.
           </p>
        </CardContent>
      </Card>
    </div>
  );
}
