
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";

export default function ManageAllGradesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Manajemen Nilai Global</h1>
          <p className="text-muted-foreground">
            Lihat dan kelola semua data nilai siswa secara keseluruhan.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Semua Nilai</CardTitle>
          <CardDescription>
            Fitur untuk melihat dan mengelola semua nilai akan ditambahkan di sini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center min-h-[200px] text-center p-6 border-2 border-dashed rounded-lg">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">
              Segera Hadir
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Fungsionalitas untuk manajemen nilai global sedang dalam pengembangan.
            </p>
            <div className="mt-6">
              <Link href="/admin">
                <Button>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Kembali ke Dasbor Admin
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
