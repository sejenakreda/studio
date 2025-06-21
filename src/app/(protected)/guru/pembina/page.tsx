
"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Award, Construction } from "lucide-react";

export default function PembinaDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/guru">
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Guru">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline flex items-center gap-2">
            <Award className="h-8 w-8 text-primary" />
            Dasbor Pembina
          </h1>
          <p className="text-muted-foreground">
            Menu khusus untuk Pembina OSIS dan Ekstrakurikuler.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fitur Manajemen Pembina</CardTitle>
          <CardDescription>
            Area ini diperuntukkan bagi fitur-fitur yang akan datang terkait dengan tugas Pembina.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center min-h-[200px] text-center p-6 border-2 border-dashed rounded-lg">
           <Construction className="mx-auto h-12 w-12 text-yellow-500" />
            <h3 className="mt-4 text-lg font-medium text-foreground">
                Fitur Sedang Dalam Pengembangan
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-md">
                Fitur spesifik untuk Pembina, seperti manajemen anggota, pencatatan kegiatan, dan penilaian keaktifan akan tersedia di sini di pembaruan mendatang.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
