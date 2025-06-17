
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ManageTeachersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Kelola Data Guru</h1>
          <p className="text-muted-foreground">
            Halaman untuk menambah, mengubah, dan menghapus data guru.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Guru</CardTitle>
          <CardDescription>
            Fitur pengelolaan data guru akan ditambahkan di sini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center min-h-[200px] text-center p-6 border-2 border-dashed rounded-lg">
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-foreground">
              Segera Hadir
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Fungsionalitas untuk mengelola guru sedang dalam pengembangan.
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
