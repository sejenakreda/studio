
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, BookUser, Loader2, AlertCircle } from "lucide-react";
import { getAllUsersByRole, getStudents } from '@/lib/firestoreService';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SystemReportsPage() {
  const { toast } = useToast();
  const [teacherCount, setTeacherCount] = useState<number | null>(null);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [guruUsers, studentList] = await Promise.all([
        getAllUsersByRole('guru'),
        getStudents()
      ]);
      setTeacherCount(guruUsers?.length || 0);
      setStudentCount(studentList?.length || 0);
    } catch (err: any) {
      console.error("Error fetching report data:", err);
      setError("Gagal memuat data untuk laporan. Silakan coba lagi nanti.");
      toast({
        variant: "destructive",
        title: "Error Memuat Data Laporan",
        description: err.message || "Terjadi kesalahan saat mengambil data.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Admin">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Laporan Sistem</h1>
          <p className="text-muted-foreground">
            Ringkasan data dan statistik penting dari sistem SkorZen.
          </p>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-48 mb-2 rounded-md" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-5 w-32 rounded-md" />
                  <Skeleton className="h-6 w-6 rounded-md" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 rounded-md" />
                  <Skeleton className="h-4 w-24 mt-1 rounded-md" />
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Laporan</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button onClick={fetchReportData} variant="outline" className="mt-4">
            Coba Lagi
          </Button>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Statistik Pengguna & Siswa</CardTitle>
            <CardDescription>
              Data jumlah pengguna dan siswa yang terdaftar dalam sistem.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-primary">
                  Total Guru Terdaftar
                </CardTitle>
                <Users className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {teacherCount !== null ? teacherCount : <Loader2 className="h-6 w-6 animate-spin" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  Jumlah akun guru aktif dalam sistem.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-accent">
                  Total Siswa Terdaftar
                </CardTitle>
                <BookUser className="h-5 w-5 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">
                  {studentCount !== null ? studentCount : <Loader2 className="h-6 w-6 animate-spin" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  Jumlah seluruh siswa di semua kelas.
                </p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Laporan Lainnya</CardTitle>
          <CardDescription>Fitur laporan lebih lanjut akan ditambahkan di sini.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Contoh laporan yang mungkin berguna di masa depan:
          </p>
          <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
            <li>Distribusi Nilai Rata-Rata per Kelas</li>
            <li>Statistik Kehadiran Global</li>
            <li>Log Aktivitas Pengguna Lebih Detail</li>
            <li>Pertumbuhan Jumlah Siswa dari Waktu ke Waktu</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
