"use client";

import React from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Briefcase, DatabaseZap, Users, ShieldQuestion, ShieldAlert, FileWarning } from "lucide-react";
import { useAuth } from '@/context/AuthContext';

export default function TataUsahaDashboardPage() {
    const { isKepalaTataUsaha } = useAuth();
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
          <CardTitle>Menu Manajemen Tata Usaha</CardTitle>
          <CardDescription>
            Akses cepat untuk membuat laporan atau melihat laporan staf.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           <Link href="/protected/guru/laporan-kegiatan">
                <Card className="hover:bg-primary/5 hover:border-primary cursor-pointer h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Briefcase className="h-5 w-5 text-primary"/>
                            Laporan Saya
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Buat dan kelola laporan kegiatan Anda sebagai Kepala TU.</p>
                    </CardContent>
                </Card>
           </Link>
        </CardContent>
      </Card>
    </div>
  );
}
