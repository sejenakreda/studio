"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { format } from "date-fns";
import { id as indonesiaLocale } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, AlertCircle, CalendarRange, Download, PieChart, Printer } from "lucide-react";
import {
  getAllUsersByRole,
  getAllTeachersDailyAttendanceForPeriod,
  getPrintSettings
} from '@/lib/firestoreService';
import type { UserProfile, TeacherDailyAttendance, PrintSettings, TugasTambahan } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getWorkdaysInMonth } from '@/lib/utils';
import { PrintHeader } from '@/components/layout/PrintHeader';
import { PrintFooter } from '@/components/layout/PrintFooter';

const MONTHS = [
  { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' }, { value: 3, label: 'Maret' },
  { value: 4, label: 'April' }, { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' }, { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' }, { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
];

const currentYear = new Date().getFullYear();
const startYearRange = currentYear - 10;
const endYearRange = currentYear + 5;
const YEARS = Array.from({ length: endYearRange - startYearRange + 1 }, (_, i) => endYearRange - i);

interface MonthlySummary {
  teacherUid: string;
  teacherName: string;
  Hadir: number;
  Izin: number;
  Sakit: number;
  Alpa: number;
  TotalTercatat: number;
  PersentaseHadir: number;
  TotalHariKerja: number;
}

const TU_STAFF_ROLES: TugasTambahan[] = ['kepala_tata_usaha', 'operator', 'staf_tu', 'satpam', 'penjaga_sekolah'];

export default function RekapKehadiranStafTUPage() {
  const { toast } = useToast();
  const [tuStaff, setTuStaff] = useState<UserProfile[]>([]);
  const [printSettings, setPrintSettings] = useState<PrintSettings | null>(null);

  const [dailyRecords, setDailyRecords] = useState<TeacherDailyAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filterYear, setFilterYear] = useState<number>(currentYear);
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);

  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        const [allGuruUsers, settings] = await Promise.all([
            getAllUsersByRole('guru'),
            getPrintSettings()
        ]);
        
        const staff = allGuruUsers.filter(user => 
            user.tugasTambahan?.some(tugas => TU_STAFF_ROLES.includes(tugas))
        );
        setTuStaff(staff);
        setPrintSettings(settings);

        const allRecordsForPeriod = await getAllTeachersDailyAttendanceForPeriod(filterYear, filterMonth);
        const staffUids = new Set(staff.map(s => s.uid));
        const staffRecords = allRecordsForPeriod.filter(rec => staffUids.has(rec.teacherUid));
        setDailyRecords(staffRecords);

    } catch (err: any) {
        setError("Gagal memuat data. Pastikan Anda memiliki izin akses.");
        toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
        setIsLoading(false);
    }
  }, [filterYear, filterMonth, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    async function calculateSummary() {
        if (isLoading || tuStaff.length === 0) {
            setMonthlySummary([]);
            return;
        }

        const summaryMap = new Map<string, Omit<MonthlySummary, 'PersentaseHadir' | 'TotalHariKerja' | 'teacherUid' | 'teacherName'> & { records: TeacherDailyAttendance[] }>();
        tuStaff.forEach(teacher => {
            summaryMap.set(teacher.uid, { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0, TotalTercatat: 0, records: [] });
        });
        dailyRecords.forEach(rec => {
            if (summaryMap.has(rec.teacherUid)) {
                const teacherSummary = summaryMap.get(rec.teacherUid)!;
                if(teacherSummary[rec.status] !== undefined) teacherSummary[rec.status]++;
                teacherSummary.TotalTercatat++;
                teacherSummary.records.push(rec);
            }
        });
        
        const fullSummaryPromises = tuStaff.map(async (teacher) => {
            const summary = summaryMap.get(teacher.uid) || { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0, TotalTercatat: 0, records: [] };
            const workdaysInMonth = await getWorkdaysInMonth(filterYear, filterMonth, summary.records);
            const percentage = workdaysInMonth > 0 ? (summary.Hadir / workdaysInMonth) * 100 : 0;
            return {
                teacherUid: teacher.uid,
                teacherName: teacher.displayName || teacher.uid,
                Hadir: summary.Hadir,
                Izin: summary.Izin,
                Sakit: summary.Sakit,
                Alpa: summary.Alpa,
                TotalTercatat: summary.TotalTercatat,
                PersentaseHadir: parseFloat(percentage.toFixed(1)),
                TotalHariKerja: workdaysInMonth
            };
        });

        try {
            const results = await Promise.all(fullSummaryPromises);
            setMonthlySummary(results.sort((a,b) => a.teacherName.localeCompare(b.teacherName)));
        } catch (err) {
            toast({variant: 'destructive', title: "Error", description: "Gagal menghitung rekap bulanan."})
        }
    }
    calculateSummary();
}, [dailyRecords, filterMonth, filterYear, isLoading, toast, tuStaff]);

  const handleDownloadMonthlySummaryExcel = () => {
    if (monthlySummary.length === 0) return;
    const dataForExcel = monthlySummary.map(summary => ({ 'Nama Staf': summary.teacherName, 'Bulan': MONTHS.find(m => m.value === filterMonth)?.label, 'Tahun': filterYear, 'Hadir': summary.Hadir, 'Izin': summary.Izin, 'Sakit': summary.Sakit, 'Alpa': summary.Alpa, 'Hari Kerja': summary.TotalHariKerja, 'Kehadiran (%)': summary.PersentaseHadir }));
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Kehadiran Staf");
    XLSX.writeFile(workbook, `rekap_bulanan_kehadiran_staf_${filterYear}_${MONTHS.find(m => m.value === filterMonth)?.label}.xlsx`);
  };

  const handlePrint = () => { window.print(); };

  const printTitle = `Rekapitulasi Kehadiran Staf Tata Usaha - Periode ${MONTHS.find(m => m.value === filterMonth)?.label} ${filterYear}`;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <div className="flex items-center gap-4">
            <Link href="/protected/guru/tata-usaha"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <div><h1 className="text-3xl font-bold tracking-tight">Rekap Kehadiran Staf TU</h1><p className="text-muted-foreground">Lihat dan cetak rekapitulasi kehadiran staf tata usaha.</p></div>
        </div>

        <Card className="mt-6">
            <CardHeader>
              <CardTitle>Filter Data</CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div><Label htmlFor="filter-daily-year">Filter Tahun</Label><Select onValueChange={(v) => setFilterYear(parseInt(v))} value={String(filterYear)}><SelectTrigger id="filter-daily-year"><SelectValue placeholder="Pilih tahun..." /></SelectTrigger><SelectContent>{YEARS.map(y => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}</SelectContent></Select></div>
                  <div><Label htmlFor="filter-daily-month">Filter Bulan</Label><Select onValueChange={(v) => setFilterMonth(parseInt(v))} value={String(filterMonth)}><SelectTrigger id="filter-daily-month"><SelectValue placeholder="Pilih bulan..." /></SelectTrigger><SelectContent>{MONTHS.map(m => (<SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>))}</SelectContent></Select></div>
              </div>
              <div className="pt-4 grid grid-cols-2 gap-4">
                    <Button variant="outline" onClick={handleDownloadMonthlySummaryExcel} disabled={monthlySummary.length === 0}><Download className="mr-2 h-4 w-4" />Unduh Rekap</Button>
                    <Button variant="outline" onClick={handlePrint} disabled={monthlySummary.length === 0}><Printer className="mr-2 h-4 w-4" />Cetak/PDF</Button>
              </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (<div className="flex justify-center items-center h-24"><Loader2 className="h-8 w-8 animate-spin" /></div>)
                : error ? (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>)
                : monthlySummary.length === 0 ? (<div className="text-center p-6 border-2 border-dashed rounded-lg"><PieChart className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-2 text-sm font-medium">Tidak Ada Data</h3><p className="mt-1 text-sm text-muted-foreground">Tidak ada data kehadiran staf untuk direkap pada periode ini.</p></div>)
                : (<div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Nama Staf</TableHead><TableHead>Hadir</TableHead><TableHead>Izin</TableHead><TableHead>Sakit</TableHead><TableHead>Alpa</TableHead><TableHead>Hari Kerja</TableHead><TableHead className="font-semibold text-primary">Persentase</TableHead></TableRow></TableHeader><TableBody>
                {monthlySummary.map(s => (<TableRow key={s.teacherUid}>
                    <TableCell className="font-medium">{s.teacherName}</TableCell>
                    <TableCell className="text-center">{s.Hadir}</TableCell><TableCell className="text-center">{s.Izin}</TableCell><TableCell className="text-center">{s.Sakit}</TableCell><TableCell className="text-center">{s.Alpa}</TableCell>
                    <TableCell className="text-center">{s.TotalHariKerja}</TableCell><TableCell className="text-center font-bold text-primary">{s.PersentaseHadir}%</TableCell>
                </TableRow>))}
                </TableBody></Table></div>)
                }
            </CardContent>
        </Card>
      </div>

      <div className="print-area">
        <PrintHeader imageUrl={printSettings?.headerImageUrl} />
        <div className="text-center my-4"><h2 className="text-lg font-bold uppercase">{printTitle}</h2></div>
        {monthlySummary.length > 0 ? (<Table><TableHeader><TableRow><TableHead>No.</TableHead><TableHead>Nama Staf</TableHead><TableHead>Hadir</TableHead><TableHead>Izin</TableHead><TableHead>Sakit</TableHead><TableHead>Alpa</TableHead><TableHead>%</TableHead></TableRow></TableHeader><TableBody>{monthlySummary.map((s, index) => (<TableRow key={s.teacherUid}><TableCell>{index + 1}</TableCell><TableCell>{s.teacherName}</TableCell><TableCell>{s.Hadir}</TableCell><TableCell>{s.Izin}</TableCell><TableCell>{s.Sakit}</TableCell><TableCell>{s.Alpa}</TableCell><TableCell>{s.PersentaseHadir}%</TableCell></TableRow>))}</TableBody></Table>) : <p className="text-center">Tidak ada data untuk periode ini.</p>}
        <PrintFooter settings={printSettings} />
      </div>

      <style jsx global>{`
        @media print {
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-size: 10pt !important; }
            .print-area { display: block !important; } .print\\:hidden { display: none !important; }
            table { width: 100%; border-collapse: collapse !important; font-size: 9pt !important; }
            th, td { border: 1px solid #ccc !important; padding: 4px 6px !important; text-align: left; vertical-align: top; }
        }
        .print-area { display: none; }
      `}</style>
    </div>
  );
}
