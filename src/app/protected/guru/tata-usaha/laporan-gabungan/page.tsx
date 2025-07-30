"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
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
import { getAllLaporanKegiatan, getPrintSettings, getStudents, getAllUsersByRole } from '@/lib/firestoreService';
import type { LaporanKegiatan, PrintSettings, TugasTambahan, UserProfile } from '@/types';
import { PrintHeader } from '@/components/layout/PrintHeader';
import { PrintFooter } from '@/components/layout/PrintFooter';
import { getActivityName, getCurrentAcademicYear } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

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
    const { userProfile } = useAuth();
    const [reports, setReports] = useState<LaporanKegiatan[]>([]);
    const [printSettings, setPrintSettings] = useState<PrintSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [allStaf, setAllStaf] = useState<UserProfile[]>([]);

    const [filterYear, setFilterYear] = useState<number>(currentYear);
    const [filterMonth, setFilterMonth] = useState<number | "all">(new Date().getMonth() + 1);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [allReports, settings, allUsers] = await Promise.all([
                getAllLaporanKegiatan(),
                getPrintSettings(),
                getAllUsersByRole('guru')
            ]);
            
            const staffUsers = allUsers.filter(u => u.tugasTambahan?.some(t => TU_STAFF_ROLES.includes(t)));
            setAllStaf(staffUsers);

            const staffUids = new Set(staffUsers.map(u => u.uid));
            const staffReports = allReports.filter(r => staffUids.has(r.createdByUid));

            setReports(staffReports);
            setPrintSettings(settings);

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
                'Tanggal': format(r.date.toDate(), "yyyy-MM-dd"), 'Judul': r.title, 'Isi Laporan': r.content, 'Oleh': r.createdByDisplayName
            }));
            if (dataForExcel.length > 0) {
                const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
                XLSX.utils.book_append_sheet(workbook, worksheet, groupName.substring(0, 31));
            }
        }
        XLSX.writeFile(workbook, `laporan_gabungan_staf_tu.xlsx`);
    };
    
    const handlePrint = () => { window.print(); };
    
    const printMainTitle = `LAPORAN KEGIATAN KEPALA DAN STAF TATA USAHA TAHUN PELAJARAN ${getCurrentAcademicYear()}`;
    const printSubTitle = `BULAN: ${filterMonth === 'all' ? 'SATU TAHUN' : MONTHS.find(m => m.value === filterMonth)?.label.toUpperCase()}`;
    
    const kepalaTUName = useMemo(() => {
        return allStaf.find(s => s.tugasTambahan?.includes('kepala_tata_usaha'))?.displayName || null;
    }, [allStaf]);

    const kepalaSekolahName = useMemo(() => {
        return allStaf.find(s => s.tugasTambahan?.includes('kepala_sekolah'))?.displayName || printSettings?.signerOneName || null;
    }, [allStaf, printSettings]);


    return (
        <div className="space-y-6">
            <div className="print:hidden">
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
            
            <div className="print-area">
                <PrintHeader imageUrl={printSettings?.headerImageUrl} />
                <div className="text-center my-4">
                  <h2 className="text-lg font-bold uppercase">{printMainTitle}</h2>
                  <h3 className="text-lg font-bold uppercase">{printSubTitle}</h3>
                </div>
                {orderedGroupKeys.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[20px]">No.</TableHead>
                                <TableHead className="w-[90px]">Tanggal</TableHead>
                                <TableHead className="w-[120px]">Nama Staf</TableHead>
                                <TableHead>Uraian Kegiatan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {orderedGroupKeys.flatMap((groupKey) => [
                            // Sub-header row
                            <TableRow key={`header-${groupKey}`} className="report-group-title">
                                <TableCell colSpan={4} className="font-bold text-base">
                                    {getActivityName(groupKey)}
                                </TableCell>
                            </TableRow>,
                            // Data rows for this group
                            ...filteredAndGroupedReports[groupKey].map((r, index) => (
                                <TableRow key={r.id}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{format(r.date.toDate(), "dd-MM-yyyy")}</TableCell>
                                    <TableCell>{r.createdByDisplayName}</TableCell>
                                    <TableCell className="whitespace-pre-wrap">{r.title}{r.content ? `\n\n${r.content}` : ''}</TableCell>
                                </TableRow>
                            ))
                        ])}
                        </TableBody>
                    </Table>
                ) : <p className="text-center">Tidak ada data untuk periode ini.</p>}
                
                <PrintFooter settings={{...printSettings, signerOneName: kepalaSekolahName, signerOnePosition: "Kepala Sekolah"}} waliKelasName={kepalaTUName} />
            </div>

            <style jsx global>{`
                @media print {
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        font-size: 10pt !important;
                        background-color: #fff !important;
                    }
                    .print-area { display: block !important; }
                    .print\\:hidden { display: none !important; }
                    
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        font-size: 9pt !important;
                    }
                    tr {
                        break-inside: avoid !important;
                    }
                    th, td {
                        border: 1px solid #000 !important;
                        padding: 4px 6px !important;
                        text-align: left !important;
                        vertical-align: top !important;
                        background-color: transparent !important;
                        word-wrap: break-word !important;
                    }
                    thead tr {
                        background-color: #e2e8f0 !important;
                    }
                    .report-group-title td {
                        background-color: #f1f5f9 !important;
                        font-weight: bold !important;
                    }
                    .whitespace-pre-wrap { white-space: pre-wrap !important; }
                    div, section, main, header, footer {
                        background-color: transparent !important;
                    }
                    @page {
                        size: A4;
                        margin: 1.5cm;
                    }
                }
                .print-area { display: none; }
            `}</style>
        </div>
    );
}
