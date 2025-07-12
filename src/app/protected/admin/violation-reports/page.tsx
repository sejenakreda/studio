
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { format } from "date-fns";
import { id as indonesiaLocale } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, AlertCircle, FileWarning, Filter, Download, Printer } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAllPelanggaran, getStudents, getPrintSettings } from '@/lib/firestoreService';
import type { PelanggaranSiswa, Siswa, PrintSettings } from '@/types';
import { PrintHeader } from '@/components/layout/PrintHeader';
import { PrintFooter } from '@/components/layout/PrintFooter';


const currentYear = new Date().getFullYear();
const startYearRange = currentYear - 10;
const endYearRange = currentYear + 5;
const YEARS = Array.from({ length: endYearRange - startYearRange + 1 }, (_, i) => endYearRange - i);

const MONTHS = [
  { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' }, { value: 3, label: 'Maret' },
  { value: 4, label: 'April' }, { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' }, { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' }, { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
];

export default function ViolationReportsPage() {
  const { toast } = useToast();
  const [violations, setViolations] = useState<PelanggaranSiswa[]>([]);
  const [students, setStudents] = useState<Siswa[]>([]);
  const [printSettings, setPrintSettings] = useState<PrintSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterKelas, setFilterKelas] = useState("all");
  const [filterYear, setFilterYear] = useState<number>(currentYear);
  const [filterMonth, setFilterMonth] = useState<number | "all">(new Date().getMonth() + 1);


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedViolations, fetchedStudents, fetchedPrintSettings] = await Promise.all([
        getAllPelanggaran(),
        getStudents(),
        getPrintSettings(),
      ]);
      setViolations(fetchedViolations);
      setStudents(fetchedStudents);
      setPrintSettings(fetchedPrintSettings);
    } catch (err: any) {
      setError("Gagal memuat data. Silakan coba lagi.");
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const uniqueClasses = useMemo(() => {
    return [...new Set(students.map(s => s.kelas).filter(Boolean))].sort();
  }, [students]);

  const filteredViolations = useMemo(() => {
    return violations
      .filter(v => {
        if (filterKelas !== "all" && v.kelasSiswa !== filterKelas) return false;
        
        const violationDate = v.tanggal.toDate();
        if (violationDate.getFullYear() !== filterYear) return false;
        if (filterMonth !== "all" && violationDate.getMonth() !== filterMonth - 1) return false;
        
        return true;
      })
      .sort((a, b) => b.tanggal.toMillis() - a.tanggal.toMillis());
  }, [violations, filterKelas, filterYear, filterMonth]);
  
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadExcel = () => {
    if (filteredViolations.length === 0) {
      toast({ variant: "default", title: "Tidak ada data untuk diunduh." });
      return;
    }
    const dataForExcel = filteredViolations.map(v => ({
      'Tanggal': format(v.tanggal.toDate(), "yyyy-MM-dd"),
      'Nama Siswa': v.namaSiswa,
      'Kelas': v.kelasSiswa,
      'Pelanggaran': v.pelanggaran,
      'Poin': v.poin,
      'Catatan': v.catatan || '-',
      'Dicatat Oleh': v.recordedByName,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Pelanggaran");
    const wscols = [ {wch:12}, {wch:25}, {wch:10}, {wch:30}, {wch:8}, {wch:40}, {wch:20} ];
    worksheet['!cols'] = wscols;
    XLSX.writeFile(workbook, "laporan_pelanggaran_siswa.xlsx");
    toast({ title: "Unduhan Dimulai", description: "File Excel sedang disiapkan." });
  };
  
  const printTitle = useMemo(() => {
    const classLabel = filterKelas === 'all' ? 'Semua Kelas' : `Kelas ${filterKelas}`;
    const monthLabel = filterMonth === 'all' 
      ? `Tahun ${filterYear}` 
      : `${MONTHS.find(m => m.value === filterMonth)?.label || ''} ${filterYear}`;
    return `Periode: ${monthLabel} - ${classLabel}`;
  }, [filterYear, filterMonth, filterKelas]);


  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/protected/admin"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline flex items-center gap-2">
                <FileWarning className="h-8 w-8 text-primary" /> Laporan Pelanggaran Siswa
              </h1>
              <p className="text-muted-foreground">Lihat dan ekspor semua catatan pelanggaran siswa.</p>
            </div>
          </div>
        </div>
        
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Filter Laporan</CardTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-2">
              <div>
                <label htmlFor="filter-kelas" className="text-sm font-medium">Filter Kelas</label>
                <Select value={filterKelas} onValueChange={setFilterKelas}><SelectTrigger id="filter-kelas" className="w-full mt-1"><Filter className="h-4 w-4 mr-2 opacity-70" /><SelectValue placeholder="Pilih kelas..." /></SelectTrigger><SelectContent><SelectItem value="all">Semua Kelas</SelectItem>{uniqueClasses.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent></Select>
              </div>
              <div>
                <label htmlFor="filter-year" className="text-sm font-medium">Filter Tahun</label>
                <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(parseInt(v))}>
                  <SelectTrigger id="filter-year" className="w-full mt-1">
                    <SelectValue placeholder="Pilih tahun..." />
                  </SelectTrigger>
                  <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="filter-month" className="text-sm font-medium">Filter Bulan</label>
                <Select value={String(filterMonth)} onValueChange={(v) => setFilterMonth(v === "all" ? "all" : parseInt(v))}>
                  <SelectTrigger id="filter-month" className="w-full mt-1">
                    <SelectValue placeholder="Pilih bulan..." />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Semua Bulan (Tahun Dipilih)</SelectItem>
                      {MONTHS.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="pt-4 grid grid-cols-2 gap-4">
                 <div
                    onClick={() => !isLoading && filteredViolations.length > 0 && handleDownloadExcel()}
                    className={`flex flex-col items-center justify-center text-center gap-2 group p-4 rounded-lg border transition-colors ${isLoading || filteredViolations.length === 0 ? 'bg-muted/50 text-muted-foreground cursor-not-allowed' : 'bg-card hover:bg-primary/5 hover:border-primary cursor-pointer'}`}
                    title="Unduh Laporan Excel"
                >
                    <Download className="h-7 w-7" />
                    <p className="text-xs font-medium">Unduh Excel</p>
                </div>
                 <div
                    onClick={() => !isLoading && filteredViolations.length > 0 && handlePrint()}
                    className={`flex flex-col items-center justify-center text-center gap-2 group p-4 rounded-lg border transition-colors ${isLoading || filteredViolations.length === 0 ? 'bg-muted/50 text-muted-foreground cursor-not-allowed' : 'bg-card hover:bg-primary/5 hover:border-primary cursor-pointer'}`}
                    title="Cetak/PDF Laporan"
                >
                    <Printer className="h-7 w-7" />
                    <p className="text-xs font-medium">Cetak/PDF</p>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (<div className="space-y-2"><Skeleton className="h-12 w-full"/><Skeleton className="h-12 w-full"/><Skeleton className="h-12 w-full"/></div>)
            : error ? (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>)
            : filteredViolations.length === 0 ? (
              <div className="text-center p-6 border-2 border-dashed rounded-lg">
                  <FileWarning className="mx-auto h-12 w-12 text-muted-foreground"/>
                  <h3 className="mt-2 text-sm font-medium">Tidak Ada Data Pelanggaran</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Tidak ada data yang cocok dengan filter yang Anda pilih.</p>
              </div>
            ) : (
              <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Siswa</TableHead><TableHead>Kelas</TableHead><TableHead>Pelanggaran</TableHead><TableHead>Poin</TableHead><TableHead>Catatan</TableHead><TableHead>Oleh</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredViolations.map(v => (
                    <TableRow key={v.id}>
                      <TableCell>{format(v.tanggal.toDate(), "dd MMM yyyy")}</TableCell>
                      <TableCell className="font-medium">{v.namaSiswa}</TableCell>
                      <TableCell>{v.kelasSiswa}</TableCell>
                      <TableCell className="max-w-xs truncate" title={v.pelanggaran}>{v.pelanggaran}</TableCell>
                      <TableCell>{v.poin}</TableCell>
                      <TableCell className="max-w-xs truncate" title={v.catatan || ''}>{v.catatan || '-'}</TableCell>
                      <TableCell>{v.recordedByName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="print:block hidden">
          <PrintHeader imageUrl={printSettings?.headerImageUrl} />
          <div className="text-center my-4">
              <h2 className="text-lg font-bold uppercase">LAPORAN PELANGGARAN SISWA</h2>
              <p className="text-sm">{printTitle}</p>
          </div>
          {filteredViolations.length > 0 ? (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[40px]">No.</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Nama Siswa</TableHead>
                        <TableHead>Kelas</TableHead>
                        <TableHead>Pelanggaran</TableHead>
                        <TableHead>Poin</TableHead>
                        <TableHead>Catatan</TableHead>
                        <TableHead>Dicatat Oleh</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {filteredViolations.map((v, index) => (
                    <TableRow key={v.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{format(v.tanggal.toDate(), "dd MMM yyyy")}</TableCell>
                        <TableCell>{v.namaSiswa}</TableCell>
                        <TableCell>{v.kelasSiswa}</TableCell>
                        <TableCell className="whitespace-pre-wrap">{v.pelanggaran}</TableCell>
                        <TableCell>{v.poin}</TableCell>
                        <TableCell className="whitespace-pre-wrap">{v.catatan || '-'}</TableCell>
                        <TableCell>{v.recordedByName}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          ): <p className="text-center">Tidak ada data untuk periode ini.</p>}
          <PrintFooter settings={printSettings} />
      </div>

      <style jsx global>{`
        @media print {
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-size: 10pt !important; }
            .print\\:hidden { display: none !important; }
            .print\\:block { display: block !important; }
            .print-header { text-align: center; margin-bottom: 0.5rem; }
            table { width: 100%; border-collapse: collapse !important; font-size: 9pt !important; }
            th, td { border: 1px solid #ccc !important; padding: 4px 6px !important; text-align: left; vertical-align: top; }
            thead { background-color: #f3f4f6 !important; }
            tr { break-inside: avoid !important; }
            .whitespace-pre-wrap { white-space: pre-wrap !important; }
        }
      `}</style>
    </div>
  );
}
