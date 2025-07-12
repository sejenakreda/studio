
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import { format } from "date-fns";
import { id as indonesiaLocale } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle, Award, Download, Info, Printer, Users2, Library, CircleDollarSign, HeartHandshake, Briefcase, DatabaseZap, ShieldQuestion, ShieldAlert, Users } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAllLaporanKegiatan, getPrintSettings } from '@/lib/firestoreService';
import type { LaporanKegiatan, TugasTambahan, PrintSettings } from '@/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { getActivityName } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PrintHeader } from '@/components/layout/PrintHeader';
import { PrintFooter } from '@/components/layout/PrintFooter';

const activityIconMap: Record<TugasTambahan, React.ElementType> = {
    kesiswaan: Users2,
    kurikulum: Library,
    bendahara: CircleDollarSign,
    pembina_osis: Award,
    pembina_eskul_pmr: Award,
    pembina_eskul_paskibra: Award,
    pembina_eskul_pramuka: Award,
    pembina_eskul_karawitan: Award,
    pembina_eskul_pencak_silat: Award,
    pembina_eskul_volly_ball: Award,
    bk: HeartHandshake,
    kepala_sekolah: Award,
    operator: DatabaseZap,
    kepala_tata_usaha: Briefcase,
    staf_tu: Users,
    satpam: ShieldQuestion,
    penjaga_sekolah: ShieldAlert,
};


export default function KegiatanReportsPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const activityFilter = searchParams.get('activity') as TugasTambahan | null;

  const [reports, setReports] = useState<LaporanKegiatan[]>([]);
  const [printSettings, setPrintSettings] = useState<PrintSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedReports, fetchedPrintSettings] = await Promise.all([
        getAllLaporanKegiatan(),
        getPrintSettings(),
      ]);
      setReports(fetchedReports);
      setPrintSettings(fetchedPrintSettings);
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
    
    const sortedEntries = Array.from(groups.entries()).sort((a, b) => {
        const nameA = getActivityName(a[0]);
        const nameB = getActivityName(b[0]);
        return nameA.localeCompare(nameB);
    });
    return new Map(sortedEntries);
  }, [reports, activityFilter]);

  const handleDownloadExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    if (filteredReportGroups.size === 0) {
        toast({ variant: "default", title: "Tidak ada data untuk diunduh." });
        return;
    }

    filteredReportGroups.forEach((groupReports, activityId) => {
      if (groupReports.length > 0) {
        const sheetName = getActivityName(activityId).substring(0, 31);
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
  const pageDescription = activityFilter ? `Menampilkan semua laporan yang dibuat untuk kegiatan ${getActivityName(activityFilter)}.` : 'Lihat semua laporan kegiatan yang dibuat oleh Pembina & Staf.';
  const printTitle = `LAPORAN KEGIATAN - ${activityFilter ? getActivityName(activityFilter).toUpperCase() : 'SEMUA'}`;
  
  const renderReportList = (reports: LaporanKegiatan[]) => (
     <div className="space-y-3">
        {reports.map(report => (
            <Card key={report.id} className="p-4 hover:shadow-md transition-shadow">
                <CardHeader className="p-0 mb-2">
                    <CardTitle className="text-base">{report.title}</CardTitle>
                    <CardDescription>
                        Kegiatan tgl: {report.date ? format(report.date.toDate(), "EEEE, dd MMMM yyyy", { locale: indonesiaLocale }) : 'N/A'} | 
                        Dibuat oleh: {report.createdByDisplayName}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <p className="text-sm whitespace-pre-wrap">{report.content}</p>
                </CardContent>
            </Card>
        ))}
    </div>
  );
  
  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/protected/admin"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
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

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Daftar Laporan</CardTitle>
            {!activityFilter && <CardDescription>Klik pada setiap kegiatan untuk melihat daftar laporannya.</CardDescription>}
          </CardHeader>
          <CardContent>
            {isLoading ? (<div className="space-y-2"><Skeleton className="h-12 w-full"/><Skeleton className="h-12 w-full"/><Skeleton className="h-12 w-full"/></div>)
            : error ? (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>)
            : (
              <>
              {filteredReportGroups.size === 0 && !isLoading ? (
                <Alert variant="default">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Informasi</AlertTitle>
                    <AlertDescription>Belum ada laporan kegiatan yang cocok dengan filter ini.</AlertDescription>
                </Alert>
              ) : activityFilter && filteredReportGroups.size > 0 ? (
                  renderReportList(Array.from(filteredReportGroups.values())[0])
              ) : (
                  <Accordion type="multiple" className="w-full">
                  {Array.from(filteredReportGroups.entries()).map(([activityId, groupReports]) => {
                    const Icon = activityIconMap[activityId] || Award;
                    return (
                      <AccordionItem key={activityId} value={activityId}>
                        <AccordionTrigger className="hover:no-underline text-base font-semibold">
                            <div className="flex items-center gap-4 flex-1">
                                <Icon className="h-5 w-5 text-muted-foreground" />
                                <span className="flex-1 text-left">{getActivityName(activityId)}</span>
                                <Badge variant="secondary">{groupReports.length} Laporan</Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-2">
                            {groupReports.length === 0 ? (
                                <p className="text-sm text-muted-foreground px-4 py-6 text-center">Belum ada laporan untuk kegiatan ini.</p>
                            ) : (
                                renderReportList(groupReports)
                            )}
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                  </Accordion>
              )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="print-area">
          <PrintHeader imageUrl={printSettings?.headerImageUrl} />
          <div className="text-center my-4">
            <h2 className="text-lg font-bold uppercase">{printTitle}</h2>
          </div>
        {Array.from(filteredReportGroups.entries()).map(([activityId, groupReports]) => (
            <div key={activityId} className="mb-8 page-break-before">
            <h3 className="text-md font-bold mb-2">Laporan: {getActivityName(activityId)}</h3>
            {groupReports.length > 0 ? (
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[40px]">No.</TableHead>
                    <TableHead className="w-[150px]">Hari/Tanggal</TableHead>
                    <TableHead>Judul Laporan</TableHead>
                    <TableHead>Isi Laporan</TableHead>
                    <TableHead>Dibuat Oleh</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {groupReports.map((report, index) => (
                    <TableRow key={report.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{report.date ? format(report.date.toDate(), "EEEE, dd MMM yyyy", { locale: indonesiaLocale }) : 'N/A'}</TableCell>
                        <TableCell>{report.title}</TableCell>
                        <TableCell className="whitespace-pre-wrap">{report.content}</TableCell>
                        <TableCell>{report.createdByDisplayName}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            ) : (
                <p>Tidak ada laporan untuk kegiatan ini.</p>
            )}
            </div>
        ))}
        <PrintFooter settings={printSettings} />
      </div>
      
      <style jsx global>{`
        @media print {
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-size: 10pt !important; }
            .print\\:hidden { display: none !important; }
            .print-area { display: block !important; }
            .print-header { text-align: center; margin-bottom: 0.5rem; }
            .page-break-before { break-before: page; }
            .page-break-before:first-child { break-before: auto; }
            table { width: 100%; border-collapse: collapse !important; font-size: 9pt !important; }
            th, td { border: 1px solid #ccc !important; padding: 4px 6px !important; text-align: left; vertical-align: top; }
            thead { background-color: #f3f4f6 !important; }
            tr { break-inside: avoid !important; }
            .whitespace-pre-wrap { white-space: pre-wrap !important; }
        }
        .print-area {
            display: none;
        }
      `}</style>
    </div>
  );
}
