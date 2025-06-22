
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import { format } from "date-fns";
import { id as indonesiaLocale } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle, Award, Download, Info, Printer } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAllLaporanKegiatan } from '@/lib/firestoreService';
import type { LaporanKegiatan, TugasTambahan } from '@/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";


const getActivityName = (activityId: TugasTambahan | string): string => {
    if (activityId === 'pembina_osis') return 'OSIS';
    if (activityId === 'kesiswaan') return 'Kesiswaan';
    return activityId
        .replace('pembina_eskul_', '')
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export default function KegiatanReportsPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const activityFilter = searchParams.get('activity') as TugasTambahan | null;

  const [reports, setReports] = useState<LaporanKegiatan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedReports = await getAllLaporanKegiatan();
      setReports(fetchedReports);
    } catch (err: any) {
      setError("Gagal memuat data laporan kegiatan.");
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredReportGroups = useMemo(() => {
    const groups = new Map<TugasTambahan, LaporanKegiatan[]>();
    
    const reportsToProcess = activityFilter
      ? reports.filter(report => report.activityId === activityFilter)
      : reports;

    reportsToProcess.forEach(report => {
      if (!groups.has(report.activityId)) {
        groups.set(report.activityId, []);
      }
      groups.get(report.activityId)!.push(report);
    });
    // Sort groups by activity name
    return new Map([...groups.entries()].sort((a, b) => a[1][0].activityName.localeCompare(b[1][0].activityName)));
  }, [reports, activityFilter]);

  const handleDownloadExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    if (filteredReportGroups.size === 0) {
        toast({ variant: "default", title: "Tidak ada data untuk diunduh." });
        return;
    }

    filteredReportGroups.forEach((groupReports, activityId) => {
      if (groupReports.length > 0) {
        const sheetName = groupReports[0].activityName.substring(0, 31);
        const dataForExcel = groupReports.map(report => ({
          'Judul Laporan': report.title,
          'Tanggal Kegiatan': report.date ? format(report.date.toDate(), "yyyy-MM-dd") : 'N/A',
          'Isi Laporan': report.content,
          'Dibuat Oleh': report.createdByDisplayName,
          'Tanggal Dibuat': report.createdAt ? format(report.createdAt.toDate(), "yyyy-MM-dd HH:mm") : 'N/A',
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
        const wscols = [ {wch:30}, {wch:15}, {wch:50}, {wch:20}, {wch:20} ];
        worksheet['!cols'] = wscols;
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }
    });

    XLSX.writeFile(workbook, "laporan_kegiatan_semua.xlsx");
    toast({ title: "Unduhan Dimulai", description: "File Excel sedang disiapkan." });
  };
  
  const handlePrint = () => {
    window.print();
  };

  const pageTitle = activityFilter ? `Laporan ${getActivityName(activityFilter)}` : 'Semua Laporan Kegiatan';
  const pageDescription = activityFilter ? `Menampilkan semua laporan yang dibuat untuk kegiatan ${getActivityName(activityFilter)}.` : 'Lihat semua laporan kegiatan yang dibuat oleh Pembina & Kesiswaan.';
  const printTitle = `LAPORAN KEGIATAN - ${activityFilter ? getActivityName(activityFilter).toUpperCase() : 'SEMUA'}`;
  
  const renderReportList = (reports: LaporanKegiatan[]) => (
     <div className="space-y-3 print:space-y-1">
        {reports.map(report => (
            <Card key={report.id} className="p-4 hover:shadow-md transition-shadow print:shadow-none print:border-none print:p-0 print:mb-2">
                <CardHeader className="p-0 mb-2 print:mb-1">
                    <CardTitle className="text-base print:text-sm">{report.title}</CardTitle>
                    <CardDescription className="print:text-xs">
                        Kegiatan tgl: {report.date ? format(report.date.toDate(), "EEEE, dd MMMM yyyy", { locale: indonesiaLocale }) : 'N/A'} | 
                        Dibuat oleh: {report.createdByDisplayName}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <p className="text-sm whitespace-pre-wrap print:text-xs">{report.content}</p>
                </CardContent>
            </Card>
        ))}
    </div>
  );
  
  return (
    <div className="space-y-6 print:space-y-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden sticky top-0 bg-background/80 backdrop-blur-sm pt-2 pb-4 -mt-2 -mx-4 px-4 z-10">
        <div className="flex items-center gap-4">
          <Link href="/admin"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline flex items-center gap-2">
              <Award className="h-8 w-8 text-primary" /> {pageTitle}
            </h1>
            <p className="text-muted-foreground">{pageDescription}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownloadExcel} variant="outline" disabled={isLoading || filteredReportGroups.size === 0}><Download className="mr-2 h-4 w-4" />Unduh Excel</Button>
          <Button onClick={handlePrint} variant="outline" disabled={isLoading || filteredReportGroups.size === 0}><Printer className="mr-2 h-4 w-4" />Cetak/PDF</Button>
        </div>
      </div>
      
       <div className="print:block hidden text-center mb-4">
        <h2 className="text-xl font-bold">{printTitle}</h2>
        <h3 className="text-lg font-semibold">SMA PGRI NARINGGUL</h3>
      </div>

      <Card className="print:shadow-none print:border-none">
        <CardHeader className="print:hidden">
          <CardTitle>Daftar Laporan</CardTitle>
          {!activityFilter && <CardDescription>Klik pada setiap kegiatan untuk melihat daftar laporannya.</CardDescription>}
        </CardHeader>
        <CardContent className="print:pt-0">
          {isLoading ? (<div className="space-y-2"><Skeleton className="h-12 w-full"/><Skeleton className="h-12 w-full"/><Skeleton className="h-12 w-full"/></div>)
          : error ? (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>)
          : (
            <>
            {filteredReportGroups.size === 0 && !isLoading && (
              <Alert variant="default" className="print:hidden">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Informasi</AlertTitle>
                  <AlertDescription>Belum ada laporan kegiatan yang cocok dengan filter ini.</AlertDescription>
              </Alert>
            )}
            
            {activityFilter && filteredReportGroups.size > 0 ? (
                renderReportList(Array.from(filteredReportGroups.values())[0])
            ) : (
                <Accordion type="multiple" className="w-full">
                {Array.from(filteredReportGroups.entries()).map(([activityId, groupReports]) => (
                    <AccordionItem key={activityId} value={activityId} className="print:border-b-2 print:border-black print:mb-4">
                    <AccordionTrigger className="hover:no-underline text-base font-semibold print:text-lg">
                        <div className="flex items-center gap-4">
                            <span>{groupReports[0].activityName}</span>
                            <Badge variant="secondary" className="print:hidden">{groupReports.length} Laporan</Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-2 print:p-0">
                        {groupReports.length === 0 ? (
                            <p className="text-sm text-muted-foreground px-4 py-6 text-center">Belum ada laporan untuk kegiatan ini.</p>
                        ) : (
                            renderReportList(groupReports)
                        )}
                    </AccordionContent>
                    </AccordionItem>
                ))}
                </Accordion>
            )}
            </>
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
          .print\\:text-xl { font-size: 1.5rem !important; }
          .print\\:text-lg { font-size: 1.25rem !important; }
          .print\\:text-sm { font-size: 0.875rem !important; }
          .print\\:text-base { font-size: 1rem !important; }
          .print\\:text-xs { font-size: 0.75rem !important; }
          .print\\:pt-0 { padding-top: 0 !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:mb-2 { margin-bottom: 0.5rem !important; }
          .print\\:mb-1 { margin-bottom: 0.25rem !important; }
          .print\\:space-y-1 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.25rem !important; margin-bottom: 0 !important; }
          .print\\:border-b-2 { border-bottom-width: 2px !important; }
          .print\\:border-black { border-color: #000 !important; }
          .accordion-content[data-state="closed"] {
             display: none !important;
          }
          .accordion-content[data-state="open"] {
             display: block !important;
          }
           .accordion-trigger > svg {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
