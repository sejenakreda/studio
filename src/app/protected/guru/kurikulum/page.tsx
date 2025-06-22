
"use client";

import React from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Library } from "lucide-react";

export default function KurikulumDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/protected/guru">
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Dasbor Wakasek Kurikulum</h1>
          <p className="text-muted-foreground">
            Menu dan alat bantu untuk manajemen kurikulum.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Menu Kurikulum</CardTitle>
          <CardDescription>
            Akses cepat ke fitur-fitur terkait kurikulum.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           <Link href="/protected/guru/laporan-kegiatan">
                <Card className="hover:bg-primary/5 hover:border-primary cursor-pointer h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Library className="h-5 w-5 text-primary"/>
                            Laporan Kegiatan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Buat dan kelola laporan kegiatan terkait bidang kurikulum.</p>
                    </CardContent>
                </Card>
           </Link>
           {/* Add more cards for other features here */}
        </CardContent>
      </Card>
    </div>
  );
}
