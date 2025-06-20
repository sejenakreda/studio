
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { format } from "date-fns";
import { id as indonesiaLocale } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, AlertCircle, CalendarDays, UserCheck, PieChart, Info } from "lucide-react";
import { getTeacherDailyAttendanceForMonth } from '@/lib/firestoreService';
import type { TeacherDailyAttendance, TeacherDailyAttendanceStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const MONTHS = [
  { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' }, { value: 3, label: 'Maret' },
  { value: 4, label: 'April' }, { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' }, { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' }, { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

interface AttendanceSummary {
  Hadir: number;
  Izin: number;
  Sakit: number;
  Alpa: number;
  Total: number;
}

export default function GuruMyAttendanceRekapPage() {
  const { toast } = useToast();
  const { userProfile, loading: authLoading } = useAuth();
  
  const [dailyRecords, setDailyRecords] = useState<TeacherDailyAttendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({ Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0, Total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [filterYear, setFilterYear] = useState<number>(currentYear);
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);

  const fetchMyAttendanceRekap = useCallback(async () => {
    if (!userProfile?.uid || authLoading) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setFetchError(null);
    try {
      const records = await getTeacherDailyAttendanceForMonth(userProfile.uid, filterYear, filterMonth);
      setDailyRecords(records || []);
      
      const newSummary: AttendanceSummary = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0, Total: records.length };
      records.forEach(record => {
        if (newSummary[record.status] !== undefined) {
          newSummary[record.status]++;
        }
      });
      setSummary(newSummary);

    } catch (error: any) {
      console.error("Error fetching my attendance rekap:", error);
      setFetchError("Gagal memuat data rekap kehadiran Anda.");
      toast({ variant: "destructive", title: "Error", description: "Gagal memuat rekap kehadiran." });
      setDailyRecords([]);
      setSummary({ Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0, Total: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [userProfile?.uid, authLoading, filterYear, filterMonth, toast]);

  useEffect(() => {
    fetchMyAttendanceRekap();
  }, [fetchMyAttendanceRekap]);

  if (authLoading) {
     return <div className="flex justify-center items-center min-h-[300px]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/guru">
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Guru">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Rekap Kehadiran Saya</h1>
          <p className="text-muted-foreground">
            Lihat rekapitulasi kehadiran harian Anda per bulan.
          </p>
        </div>
      </div>

      {!userProfile && !authLoading && (
         <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" /><AlertTitle>Sesi Tidak Ditemukan</AlertTitle>
          <AlertDescription>Tidak dapat memuat profil guru. Silakan login ulang.</AlertDescription>
        </Alert>
      )}

      {userProfile && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Filter Rekapitulasi</CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <Select onValueChange={(val) => setFilterYear(parseInt(val))} value={String(filterYear)}>
                    <SelectTrigger><SelectValue placeholder="Pilih tahun..." /></SelectTrigger>
                    <SelectContent>{YEARS.map(year => (<SelectItem key={year} value={String(year)}>{year}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Select onValueChange={(val) => setFilterMonth(parseInt(val))} value={String(filterMonth)}>
                    <SelectTrigger><SelectValue placeholder="Pilih bulan..." /></SelectTrigger>
                    <SelectContent>{MONTHS.map(month => (<SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-green-600">Hadir</CardTitle>
                      <UserCheck className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold text-green-600">{isLoading ? <Skeleton className="h-8 w-12"/> : summary.Hadir}</div></CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-blue-600">Izin</CardTitle>
                      <CalendarDays className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold text-blue-600">{isLoading ? <Skeleton className="h-8 w-12"/> : summary.Izin}</div></CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-yellow-600">Sakit</CardTitle>
                      <Info className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold text-yellow-600">{isLoading ? <Skeleton className="h-8 w-12"/> : summary.Sakit}</div></CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-red-600">Alpa</CardTitle>
                      <AlertCircle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold text-red-600">{isLoading ? <Skeleton className="h-8 w-12"/> : summary.Alpa}</div></CardContent>
              </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Detail Kehadiran Harian</CardTitle>
              <CardDescription>Daftar kehadiran Anda untuk periode {MONTHS.find(m=>m.value === filterMonth)?.label} {filterYear}.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => (<Skeleton key={i} className="h-10 w-full rounded-md" />))}</div>
              ) : fetchError ? (
                <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{fetchError}</AlertDescription></Alert>
              ) : dailyRecords.length === 0 ? (
                <div className="text-center p-6 border-2 border-dashed rounded-lg"><PieChart className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-2 text-sm font-medium">Belum Ada Data</h3><p className="mt-1 text-sm text-muted-foreground">Belum ada data kehadiran yang tercatat untuk periode ini.</p></div>
              ) : (
                <div className="overflow-x-auto max-h-[400px]">
                  <Table>
                    <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Status</TableHead><TableHead>Catatan</TableHead><TableHead>Dicatat Pada</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {dailyRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{format(record.date.toDate(), "EEEE, dd MMMM yyyy", { locale: indonesiaLocale })}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                record.status === 'Hadir' ? 'bg-green-100 text-green-700' :
                                record.status === 'Izin' ? 'bg-blue-100 text-blue-700' :
                                record.status === 'Sakit' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'}`}>
                                {record.status}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-xs truncate" title={record.notes}>{record.notes || '-'}</TableCell>
                          <TableCell>{record.recordedAt ? format(record.recordedAt.toDate(), "dd MMM yyyy, HH:mm", { locale: indonesiaLocale }) : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
