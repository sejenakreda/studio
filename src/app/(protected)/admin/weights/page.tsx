
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Percent } from "lucide-react";

export default function ManageWeightsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Atur Bobot Penilaian</h1>
          <p className="text-muted-foreground">
            Sesuaikan persentase bobot untuk setiap komponen penilaian.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Konfigurasi Bobot</CardTitle>
          <CardDescription>
            Fitur untuk mengatur bobot penilaian akan ditambahkan di sini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center min-h-[200px] text-center p-6 border-2 border-dashed rounded-lg">
            <Percent className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">
              Segera Hadir
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Fungsionalitas untuk mengatur bobot penilaian sedang dalam pengembangan.
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
