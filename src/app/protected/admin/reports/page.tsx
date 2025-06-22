"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, BookUser, Loader2, AlertCircle, BarChartHorizontalBig } from "lucide-react";
import { getAllUsersByRole, getStudents } from '@/lib/firestoreService';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";

interface ClassDistribution {
  name: string;
  total: number;
}

const chartConfig = {
  total: {
    label: "Jumlah Siswa",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function SystemReportsPage() {
  const { toast } = useToast();
  const [teacherCount, setTeacherCount] = useState<number | null>(null);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [classDistribution, setClassDistribution] = useState<ClassDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    setIsLoadingChart(true);
    setError(null);
    try {
      const [guruUsers, studentList] = await Promise.all([
        getAllUsersByRole('guru'),
        getStudents()
      ]);
      setTeacherCount(guruUsers?.length || 0);
      setStudentCount(studentList?.length || 0);

      // Process class distribution
      if (studentList && studentList.length > 0) {
        const counts: { [key: string]: number } = {};
        studentList.forEach(student => {
          const className = typeof student.kelas === 'string' && student.kelas ? student.kelas : "Tidak Diketahui";
          counts[className] = (counts[className] || 0) + 1;
        });
        const distributionData = Object.entries(counts).map(([name, total]) => ({
          name,
          total
        })).sort((a,b) => b.total - a.total); // Sort by count descending
        setClassDistribution(distributionData);
      } else {
        setClassDistribution([]);
      }

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
      setIsLoadingChart(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/protected/admin">
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
          <CardTitle>Distribusi Siswa per Kelas</CardTitle>
          <CardDescription>
            Visualisasi jumlah siswa di setiap kelas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingChart ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : error ? (
             <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Gagal Memuat Grafik</AlertTitle>
              <AlertDescription>Tidak dapat memuat data distribusi kelas. Silakan coba muat ulang.</AlertDescription>
            </Alert>
          ) : classDistribution.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[150px] text-center p-4 border-2 border-dashed rounded-lg">
              <BarChartHorizontalBig className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Belum ada data siswa untuk ditampilkan dalam grafik.</p>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300 + classDistribution.length * 20}>
                <BarChart 
                  data={classDistribution} 
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 + (classDistribution.length > 10 ? classDistribution.length * 5 : 0) }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tickLine={false} 
                    axisLine={false}
                    width={120} 
                    interval={0}
                    style={{ fontSize: '12px' }}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    content={<ChartTooltipContent />} 
                  />
                  <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

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
