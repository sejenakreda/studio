
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import * as XLSX from 'xlsx';
import { format } from "date-fns";
import { id as indonesiaLocale } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle, Award, Download, Info } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAllLaporanKegiatan } from '@/lib/firestoreService';
import type { LaporanKegiatan, TugasTambahan } from '@/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function KegiatanReportsPage() {
  const { toast } = useToast();
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

  const reportGroups = useMemo(() => {
    const groups = new Map<TugasTambahan, LaporanKegiatan[]>();
    reports.forEach(report => {
      if (!groups.has(report.activityId)) {
        groups.set(report.activityId, []);
      }
      groups.get(report.activityId)!.push(report);
    });
    return groups;
  }, [reports]);

  const handleDownloadExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    reportGroups.forEach((groupReports, activityId) => {
      if (groupReports.length > 0) {
        const sheetName = groupReports[0].activityName.substring(0, 31);
        const dataForExcel = groupReports.map(report => ({
          'Judul Laporan': report.title,
          'Tanggal Kegiatan': format(report.date.toDate(), "yyyy-MM-dd"),
          'Isi Laporan': report.content,
          'Dibuat Oleh': report.createdByDisplayName,
          'Tanggal Dibuat': format(report.createdAt.toDate(), "yyyy-MM-dd HH:mm"),
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
        const wscols = [ {wch:30}, {wch:15}, {wch:50}, {wch:20}, {wch:20} ];
        worksheet['!cols'] = wscols;
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }
    });

    if (workbook.SheetNames.length === 0) {
        toast({ variant: "default", title: "Tidak ada data untuk diunduh." });
        return;
    }

    XLSX.writeFile(workbook, "laporan_kegiatan_pembina.xlsx");
    toast({ title: "Unduhan Dimulai", description: "File Excel sedang disiapkan." });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline flex items-center gap-2">
              <Award className="h-8 w-8 text-primary" /> Laporan Kegiatan
            </h1>
            <p className="text-muted-foreground">Lihat semua laporan kegiatan yang dibuat oleh Pembina & Kesiswaan.</p>
          </div>
        </div>
        <Button onClick={handleDownloadExcel} variant="outline" disabled={isLoading}><Download className="mr-2 h-4 w-4" />Unduh Semua Laporan</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Kegiatan</CardTitle>
          <CardDescription>Klik pada setiap kegiatan untuk melihat daftar laporannya.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (<div className="space-y-2"><Skeleton className="h-12 w-full"/><Skeleton className="h-12 w-full"/><Skeleton className="h-12 w-full"/></div>)
          : error ? (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>)
          : (
            <Accordion type="multiple" className="w-full">
              {Array.from(reportGroups.entries()).map(([activityId, groupReports]) => (
                <AccordionItem key={activityId} value={activityId}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4">
                        <span className="font-semibold text-base">{groupReports[0].activityName}</span>
                        <Badge variant="secondary">{groupReports.length} Laporan</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {groupReports.length === 0 ? (
                        <p className="text-sm text-muted-foreground px-4 py-6 text-center">Belum ada laporan untuk kegiatan ini.</p>
                    ) : (
                        <div className="space-y-3">
                            {groupReports.map(report => (
                                <Card key={report.id} className="p-4">
                                    <CardHeader className="p-0 mb-2">
                                        <CardTitle className="text-base">{report.title}</CardTitle>
                                        <CardDescription>
                                            Kegiatan tgl: {format(report.date.toDate(), "EEEE, dd MMMM yyyy", { locale: indonesiaLocale })} | 
                                            Dibuat oleh: {report.createdByDisplayName}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <p className="text-sm whitespace-pre-wrap">{report.content}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
              {reportGroups.size === 0 && (
                 <Alert variant="default">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Informasi</AlertTitle>
                    <AlertDescription>Belum ada laporan kegiatan yang dibuat oleh pembina manapun.</AlertDescription>
                </Alert>
              )}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
