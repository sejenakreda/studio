
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { format } from "date-fns";
import { id as indonesiaLocale } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, AlertCircle, Download, Printer, BookOpen } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAllLaporanKegiatan } from '@/lib/firestoreService';
import type { LaporanKegiatan, TugasTambahan } from '@/types';
import { getActivityName } from '@/lib/utils';

const currentYear = new Date().getFullYear();
const startYearRange = currentYear - 10;
const endYearRange = currentYear + 5;
const YEARS = Array.from({ length: endYearRange - startYearRange + 1 }, (_, i) => endYearRange - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: format(new Date(0, i), "MMMM", { locale: indonesiaLocale }) }));
const TU_STAFF_ROLES: TugasTambahan[] = ['kepala_tata_usaha', 'operator', 'staf_tu', 'satpam', 'penjaga_sekolah'];

const TU_ROLE_ORDER: TugasTambahan[] = [
    'kepala_tata_usaha',
    'operator',
    'staf_tu',
    'satpam',
    'penjaga_sekolah'
];

export default function LaporanGabunganStafTUPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [reports, setReports] = useState<LaporanKegiatan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filterYear, setFilterYear] = useState<number>(currentYear);
    const [filterMonth, setFilterMonth] = useState<number | "all">(new Date().getMonth() + 1);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const allReports = await getAllLaporanKegiatan();
            const staffReports = allReports.filter(r => TU_STAFF_ROLES.includes(r.activityId));
            setReports(staffReports);
        } catch (err: any) {
            setError("Gagal memuat data. Silakan coba lagi.");
            toast({ variant: "destructive", title: "Error", description: err.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filteredAndGroupedReports = useMemo(() => {
        const filtered = reports.filter(report => {
            if (!report.date || typeof report.date.toDate !== 'function') return false;
            const reportDate = report.date.toDate();
            if (reportDate.getFullYear() !== filterYear) return false;
            if (filterMonth !== "all" && reportDate.getMonth() !== filterMonth - 1) return false;
            return TU_STAFF_ROLES.includes(report.activityId);
        });

        const grouped = filtered.reduce((acc, report) => {
            const groupKey = report.activityId;
            if (!acc[groupKey]) acc[groupKey] = [];
            acc[groupKey].push(report);
            return acc;
        }, {} as Record<TugasTambahan, LaporanKegiatan[]>);

        for (const key in grouped) {
            grouped[key as TugasTambahan].sort((a, b) => b.date.toMillis() - a.date.toMillis());
        }

        return grouped;
    }, [reports, filterYear, filterMonth]);

    const orderedGroupKeys = useMemo(() => {
        return TU_ROLE_ORDER.filter(role => filteredAndGroupedReports[role] && filteredAndGroupedReports[role].length > 0);
    }, [filteredAndGroupedReports]);
    
    const handleDownloadExcel = () => {
        if (Object.keys(filteredAndGroupedReports).length === 0) return;
        const workbook = XLSX.utils.book_new();
        for (const groupKey of orderedGroupKeys) {
            const groupName = getActivityName(groupKey);
            const dataForExcel = filteredAndGroupedReports[groupKey].map(r => ({
                'Tanggal': format(r.date.toDate(), "yyyy-MM-dd"), 
                'Nama Staf': r.createdByDisplayName,
                'Judul Laporan': r.title, 
                'Uraian Kegiatan': r.content,
            }));
            if (dataForExcel.length > 0) {
                const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
                XLSX.utils.book_append_sheet(workbook, worksheet, groupName.substring(0, 31));
            }
        }
        XLSX.writeFile(workbook, `laporan_gabungan_staf_tu.xlsx`);
    };
    
    const handlePrint = () => {
        const printUrl = `/protected/guru/tata-usaha/laporan-gabungan/print?year=${filterYear}&month=${filterMonth}`;
        window.open(printUrl, '_blank');
    };

    return (
        <div className="space-y-6">
            <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/protected/guru/tata-usaha"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
                        <div><h1 className="text-3xl font-bold tracking-tight">Laporan Gabungan Staf TU</h1><p className="text-muted-foreground">Lihat dan cetak semua laporan dari staf tata usaha.</p></div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleDownloadExcel} variant="outline" disabled={Object.keys(filteredAndGroupedReports).length === 0}><Download className="mr-2 h-4 w-4" />Unduh Excel</Button>
                        <Button onClick={handlePrint} variant="outline" disabled={Object.keys(filteredAndGroupedReports).length === 0}><Printer className="mr-2 h-4 w-4" />Cetak/PDF</Button>
                    </div>
                </div>
                <Card className="mt-6">
                    <CardHeader><CardTitle>Filter Laporan</CardTitle>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div><Label htmlFor="filter-year">Filter Tahun</Label><Select value={String(filterYear)} onValueChange={(v) => setFilterYear(parseInt(v))}><SelectTrigger id="filter-year"><SelectValue /></SelectTrigger><SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label htmlFor="filter-month">Filter Bulan</Label><Select value={String(filterMonth)} onValueChange={(v) => setFilterMonth(v === "all" ? "all" : parseInt(v))}><SelectTrigger id="filter-month"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Semua Bulan</SelectItem>{MONTHS.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <div className="space-y-2"><Skeleton className="h-12 w-full"/><Skeleton className="h-12 w-full"/></div>
                        : error ? <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
                        : Object.keys(filteredAndGroupedReports).length === 0 ? <div className="text-center p-6 border-2 border-dashed rounded-lg"><BookOpen className="mx-auto h-12 w-12 text-muted-foreground"/><h3 className="mt-2 text-sm font-medium">Tidak Ada Data</h3><p className="mt-1 text-sm text-muted-foreground">Tidak ada laporan yang cocok dengan filter yang Anda pilih.</p></div>
                        : (<div>
                            {orderedGroupKeys.map((groupKey) => (
                                <div key={groupKey} className="mb-6">
                                    <h3 className="text-lg font-semibold border-b pb-2 mb-2">Laporan {getActivityName(groupKey)} ({filteredAndGroupedReports[groupKey].length})</h3>
                                    <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Judul</TableHead><TableHead>Pembuat</TableHead><TableHead>Isi Laporan</TableHead></TableRow></TableHeader><TableBody>{filteredAndGroupedReports[groupKey].map(r => (<TableRow key={r.id}><TableCell>{format(r.date.toDate(), "dd MMM yyyy")}</TableCell><TableCell className="font-medium">{r.title}</TableCell><TableCell>{r.createdByDisplayName}</TableCell><TableCell className="max-w-xs truncate" title={r.content}>{r.content}</TableCell></TableRow>))}</TableBody></Table></div>
                                </div>
                            ))}
                          </div>)
                        }
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
