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
import { ArrowLeft, Loader2, AlertCircle, FileWarning, Filter, Download, Printer, ExternalLink } from "lucide-react";
import { DateRange } from "react-day-picker"
import { addDays } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAllPelanggaran, getStudents } from '@/lib/firestoreService';
import type { PelanggaranSiswa, Siswa } from '@/types';


export default function ViolationReportsPage() {
  const { toast } = useToast();
  const [violations, setViolations] = useState<PelanggaranSiswa[]>([]);
  const [students, setStudents] = useState<Siswa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterKelas, setFilterKelas] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedViolations, fetchedStudents] = await Promise.all([
        getAllPelanggaran(),
        getStudents(),
      ]);
      setViolations(fetchedViolations);
      setStudents(fetchedStudents);
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
    let items = [...violations];
    if (filterKelas !== "all") {
      items = items.filter(v => v.kelasSiswa === filterKelas);
    }
    if (dateRange?.from) {
        items = items.filter(v => v.tanggal.toDate() >= dateRange.from!);
    }
    if (dateRange?.to) {
        // Set time to end of day for inclusive filtering
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        items = items.filter(v => v.tanggal.toDate() <= toDate);
    }
    return items;
  }, [violations, filterKelas, dateRange]);
  
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
      'Link Bukti Foto': v.photoUrl || 'Tidak ada',
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Pelanggaran");
    const wscols = [ {wch:12}, {wch:25}, {wch:10}, {wch:30}, {wch:8}, {wch:40}, {wch:20}, {wch:50} ];
    worksheet['!cols'] = wscols;
    XLSX.writeFile(workbook, "laporan_pelanggaran_siswa.xlsx");
    toast({ title: "Unduhan Dimulai", description: "File Excel sedang disiapkan." });
  };


  return (
    <div className="space-y-6 print:space-y-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/admin"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline flex items-center gap-2">
              <FileWarning className="h-8 w-8 text-primary" /> Laporan Pelanggaran Siswa
            </h1>
            <p className="text-muted-foreground">Lihat dan ekspor semua catatan pelanggaran siswa.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownloadExcel} variant="outline"><Download className="mr-2 h-4 w-4" />Unduh Excel</Button>
          <Button onClick={handlePrint} variant="outline"><Printer className="mr-2 h-4 w-4" />Cetak</Button>
        </div>
      </div>
      
      <div className="print:block hidden text-center mb-4">
        <h2 className="text-xl font-bold">LAPORAN PELANGGARAN SISWA</h2>
        <h3 className="text-lg font-semibold">SMA PGRI NARINGGUL</h3>
        <p className="text-sm">Periode: {dateRange?.from ? format(dateRange.from, "d MMM yyyy", {locale: indonesiaLocale}) : 'Semua'} - {dateRange?.to ? format(dateRange.to, "d MMM yyyy", {locale: indonesiaLocale}) : 'Semua'}</p>
      </div>

      <Card className="print:shadow-none print:border-none">
        <CardHeader className="print:hidden">
          <CardTitle>Filter Laporan</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <label htmlFor="filter-kelas" className="text-sm font-medium">Filter Kelas</label>
              <Select value={filterKelas} onValueChange={setFilterKelas}><SelectTrigger id="filter-kelas" className="w-full mt-1"><Filter className="h-4 w-4 mr-2 opacity-70" /><SelectValue placeholder="Pilih kelas..." /></SelectTrigger><SelectContent><SelectItem value="all">Semua Kelas</SelectItem>{uniqueClasses.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <label htmlFor="date-range-picker" className="text-sm font-medium">Filter Tanggal</label>
              <Popover><PopoverTrigger asChild><Button id="date-range-picker" variant={"outline"} className="w-full justify-start text-left font-normal mt-1">{dateRange?.from ? (dateRange.to ? <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</> : format(dateRange.from, "LLL dd, y")) : <span>Pilih tanggal</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={indonesiaLocale} /></PopoverContent></Popover>
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
            <div className="overflow-x-auto"><Table className="print:text-xs"><TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Siswa</TableHead><TableHead>Kelas</TableHead><TableHead>Pelanggaran</TableHead><TableHead>Poin</TableHead><TableHead>Catatan</TableHead><TableHead>Foto</TableHead><TableHead>Oleh</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredViolations.map(v => (
                  <TableRow key={v.id}>
                    <TableCell>{format(v.tanggal.toDate(), "dd MMM yyyy")}</TableCell>
                    <TableCell className="font-medium">{v.namaSiswa}</TableCell>
                    <TableCell>{v.kelasSiswa}</TableCell>
                    <TableCell className="max-w-xs truncate" title={v.pelanggaran}>{v.pelanggaran}</TableCell>
                    <TableCell>{v.poin}</TableCell>
                    <TableCell className="max-w-xs truncate" title={v.catatan || ''}>{v.catatan || '-'}</TableCell>
                    <TableCell>
                      {v.photoUrl ? (<a href={v.photoUrl} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="icon" className="print:hidden"><ExternalLink className="h-4 w-4"/></Button><span className="print:block hidden text-blue-600 underline">Lihat</span></a>) : '-'}
                    </TableCell>
                    <TableCell>{v.recordedByName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div>
          )}
        </CardContent>
      </Card>
      
      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-size: 10pt !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:space-y-2 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.5rem !important; margin-bottom: 0 !important; }
          .print\\:text-center { text-align: center !important; }
          .print\\:mb-4 { margin-bottom: 1rem !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          .print\\:text-xs table, .print\\:text-xs th, .print\\:text-xs td { font-size: 9pt !important; line-height: 1.2 !important; }
          .print\\:text-xl { font-size: 1.5rem !important; }
          .print\\:text-lg { font-size: 1.25rem !important; }
          .print\\:text-sm { font-size: 0.875rem !important; }
          table { width: 100%; border-collapse: collapse !important; }
          th, td { border: 1px solid #ccc !important; padding: 4px 6px !important; }
          thead { background-color: #f3f4f6 !important; }
        }
      `}</style>
    </div>
  );
}
