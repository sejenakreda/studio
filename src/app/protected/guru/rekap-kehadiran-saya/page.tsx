
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { format } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle, PieChart } from "lucide-react";
import { getTeacherDailyAttendanceForMonth } from '@/lib/firestoreService';
import type { TeacherDailyAttendance } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getWorkdaysInMonth } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const currentYear = new Date().getFullYear();
const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: format(new Date(0, i), "MMMM", { locale: indonesiaLocale }) }));
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i + 1).reverse();

interface MonthlySummary {
  Hadir: number;
  Izin: number;
  Sakit: number;
  Alpa: number;
  TotalTercatat: number;
  PersentaseHadir: number;
  TotalHariKerja: number;
}

export default function RekapKehadiranSayaPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  
  const [records, setRecords] = useState<TeacherDailyAttendance[]>([]);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);

  const fetchData = useCallback(async () => {
    if (!userProfile?.uid) return;
    setIsLoading(true);
    setError(null);
    try {
      const fetchedRecords = await getTeacherDailyAttendanceForMonth(userProfile.uid, filterYear, filterMonth);
      setRecords(fetchedRecords);

      // Calculate summary
      const workdays = getWorkdaysInMonth(filterYear, filterMonth);
      const summaryData: Omit<MonthlySummary, 'PersentaseHadir' | 'TotalHariKerja'> = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0, TotalTercatat: 0 };
      
      fetchedRecords.forEach(rec => {
        if(summaryData[rec.status] !== undefined) summaryData[rec.status]++;
      });
      summaryData.TotalTercatat = fetchedRecords.length;

      const percentage = workdays > 0 ? (summaryData.Hadir / workdays) * 100 : 0;
      setSummary({
          ...summaryData,
          PersentaseHadir: parseFloat(percentage.toFixed(1)),
          TotalHariKerja: workdays
      });

    } catch (err: any) {
      setError("Gagal memuat data kehadiran Anda.");
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [userProfile, filterYear, filterMonth, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/protected/guru">
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Rekap Kehadiran Saya</h1>
          <p className="text-muted-foreground">
            Lihat riwayat dan rekapitulasi kehadiran harian Anda per bulan.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Periode</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <label className="text-sm font-medium">Pilih Tahun</label>
              <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(Number(v))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{YEARS.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Pilih Bulan</label>
              <Select value={String(filterMonth)} onValueChange={(v) => setFilterMonth(Number(v))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{MONTHS.map(m=><SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          : error ? <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
          : (
            <>
              {summary && (
                <Card className="mb-6 bg-muted/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><PieChart className="h-5 w-5 text-primary"/>Rekapitulasi Bulan {MONTHS.find(m => m.value === filterMonth)?.label} {filterYear}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
                        <div className="p-3 border rounded-lg bg-background"><p className="text-2xl font-bold text-green-600">{summary.Hadir}</p><p className="text-sm font-medium text-muted-foreground">Hadir</p></div>
                        <div className="p-3 border rounded-lg bg-background"><p className="text-2xl font-bold text-blue-600">{summary.Izin}</p><p className="text-sm font-medium text-muted-foreground">Izin</p></div>
                        <div className="p-3 border rounded-lg bg-background"><p className="text-2xl font-bold text-yellow-600">{summary.Sakit}</p><p className="text-sm font-medium text-muted-foreground">Sakit</p></div>
                        <div className="p-3 border rounded-lg bg-background"><p className="text-2xl font-bold text-red-600">{summary.Alpa}</p><p className="text-sm font-medium text-muted-foreground">Alpa</p></div>
                        <div className="p-3 border rounded-lg bg-primary/10 col-span-2 lg:col-span-1"><p className="text-2xl font-bold text-primary">{summary.PersentaseHadir}%</p><p className="text-sm font-medium text-muted-foreground">Kehadiran</p></div>
                    </div>
                    <p className="text-xs text-center text-muted-foreground mt-3">Total hari kerja di bulan ini: {summary.TotalHariKerja} hari. Total kehadiran tercatat: {summary.TotalTercatat} hari.</p>
                  </CardContent>
                </Card>
              )}

              <h3 className="text-md font-semibold mb-2">Detail Kehadiran Harian</h3>
              {records.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Tidak ada catatan kehadiran untuk periode ini.</p>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Status</TableHead><TableHead>Waktu Dicatat</TableHead><TableHead>Catatan</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {records.map(rec => (
                        <TableRow key={rec.id}>
                          <TableCell>{format(rec.date.toDate(), "EEEE, dd MMMM yyyy", { locale: indonesiaLocale })}</TableCell>
                          <TableCell>{rec.status}</TableCell>
                          <TableCell>{rec.recordedAt ? format(rec.recordedAt.toDate(), "HH:mm") : '-'}</TableCell>
                          <TableCell>{rec.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
