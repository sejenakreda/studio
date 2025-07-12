
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
import { ArrowLeft, Loader2, AlertCircle, BookCheck, Filter, Download, Printer } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAllAgendas, getAllUsersByRole, getPrintSettings } from '@/lib/firestoreService';
import type { AgendaKelas, UserProfile, PrintSettings } from '@/types';
import { PrintHeader } from '@/components/layout/PrintHeader';
import { PrintFooter } from '@/components/layout/PrintFooter';


const currentYear = new Date().getFullYear();
const startYearRange = currentYear - 10;
const endYearRange = currentYear + 5;
const YEARS = Array.from({ length: endYearRange - startYearRange + 1 }, (_, i) => endYearRange - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: format(new Date(0, i), "MMMM", { locale: indonesiaLocale }) }));

export default function LaporanAgendaKelasPage() {
    const { toast } = useToast();
    const [agendas, setAgendas] = useState<AgendaKelas[]>([]);
    const [teachers, setTeachers] = useState<UserProfile[]>([]);
    const [printSettings, setPrintSettings] = useState<PrintSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filterTeacher, setFilterTeacher] = useState("all");
    const [filterYear, setFilterYear] = useState<number>(currentYear);
    const [filterMonth, setFilterMonth] = useState<number | "all">(new Date().getMonth() + 1);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [fetchedAgendas, fetchedTeachers, fetchedPrintSettings] = await Promise.all([
                getAllAgendas(),
                getAllUsersByRole('guru'),
                getPrintSettings()
            ]);
            setAgendas(fetchedAgendas);
            setTeachers(fetchedTeachers);
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

    const filteredAgendas = useMemo(() => {
        return agendas.filter(agenda => {
            if (filterTeacher !== "all" && agenda.teacherUid !== filterTeacher) return false;
            
            if (!agenda.tanggal || typeof agenda.tanggal.toDate !== 'function') return false;
            
            const agendaDate = agenda.tanggal.toDate();
            if (agendaDate.getFullYear() !== filterYear) return false;
            if (filterMonth !== "all" && agendaDate.getMonth() !== filterMonth - 1) return false;
            return true;
        });
    }, [agendas, filterTeacher, filterYear, filterMonth]);
    
    const handleDownloadExcel = () => {
        if (filteredAgendas.length === 0) {
            toast({ variant: "default", title: "Tidak ada data untuk diunduh." });
            return;
        }
        const dataForExcel = filteredAgendas.map(a => ({
            'Tanggal': format(a.tanggal.toDate(), "yyyy-MM-dd"),
            'Jam Ke-': a.jamKe,
            'Guru': a.teacherName,
            'Kelas': a.kelas,
            'Mata Pelajaran': a.mapel,
            'Tujuan Pembelajaran': a.tujuanPembelajaran,
            'Pokok Bahasan': a.pokokBahasan,
            'Siswa Absen': a.siswaAbsen.map(s => s.namaSiswa).join(', ') || '-',
            'Refleksi': a.refleksi || '-',
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Agenda Kelas");
        const wscols = [ {wch:12}, {wch:8}, {wch:20}, {wch:10}, {wch:20}, {wch:40}, {wch:40}, {wch:30}, {wch:50} ];
        worksheet['!cols'] = wscols;
        XLSX.writeFile(workbook, "laporan_agenda_kelas.xlsx");
        toast({ title: "Unduhan Dimulai", description: "File Excel sedang disiapkan." });
    };
    
    const handlePrint = () => {
        window.print();
    };

    const printTitle = useMemo(() => {
        const teacherName = filterTeacher === "all" ? "Semua Guru" : teachers.find(t => t.uid === filterTeacher)?.displayName || "";
        const monthLabel = filterMonth === "all" ? `Tahun ${filterYear}` : `${MONTHS.find(m => m.value === filterMonth)?.label || ''} ${filterYear}`;
        return `Periode: ${monthLabel} - ${teacherName}`;
    }, [filterYear, filterMonth, filterTeacher, teachers]);

    return (
        <div className="space-y-6">
            <div className="print:hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/protected/admin"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline flex items-center gap-2">
                                <BookCheck className="h-8 w-8 text-primary" /> Laporan Agenda Kelas
                            </h1>
                            <p className="text-muted-foreground">Lihat dan ekspor semua catatan agenda mengajar dari guru.</p>
                        </div>
                    </div>
                </div>

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Filter Laporan Agenda</CardTitle>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                            <div>
                                <label htmlFor="filter-teacher" className="text-sm font-medium">Filter Guru</label>
                                <Select value={filterTeacher} onValueChange={setFilterTeacher}><SelectTrigger id="filter-teacher" className="w-full mt-1"><Filter className="h-4 w-4 mr-2 opacity-70" /><SelectValue placeholder="Pilih guru..." /></SelectTrigger><SelectContent><SelectItem value="all">Semua Guru</SelectItem>{teachers.map(t => <SelectItem key={t.uid} value={t.uid}>{t.displayName}</SelectItem>)}</SelectContent></Select>
                            </div>
                            <div>
                                <label htmlFor="filter-year" className="text-sm font-medium">Filter Tahun</label>
                                <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(parseInt(v))}><SelectTrigger id="filter-year" className="w-full mt-1"><SelectValue placeholder="Pilih tahun..." /></SelectTrigger><SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
                            </div>
                            <div>
                                <label htmlFor="filter-month" className="text-sm font-medium">Filter Bulan</label>
                                <Select value={String(filterMonth)} onValueChange={(v) => setFilterMonth(v === "all" ? "all" : parseInt(v))}><SelectTrigger id="filter-month" className="w-full mt-1"><SelectValue placeholder="Pilih bulan..." /></SelectTrigger><SelectContent><SelectItem value="all">Semua Bulan</SelectItem>{MONTHS.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent></Select>
                            </div>
                        </div>
                        <div className="pt-4 grid grid-cols-2 gap-4">
                            <div
                                onClick={() => !isLoading && filteredAgendas.length > 0 && handleDownloadExcel()}
                                className={`flex flex-col items-center justify-center text-center gap-2 group p-4 rounded-lg border transition-colors ${isLoading || filteredAgendas.length === 0 ? 'bg-muted/50 text-muted-foreground cursor-not-allowed' : 'bg-card hover:bg-primary/5 hover:border-primary cursor-pointer'}`}
                                title="Unduh Laporan Excel"
                            >
                                <Download className="h-7 w-7" />
                                <p className="text-xs font-medium">Unduh Excel</p>
                            </div>
                            <div
                                onClick={() => !isLoading && filteredAgendas.length > 0 && handlePrint()}
                                className={`flex flex-col items-center justify-center text-center gap-2 group p-4 rounded-lg border transition-colors ${isLoading || filteredAgendas.length === 0 ? 'bg-muted/50 text-muted-foreground cursor-not-allowed' : 'bg-card hover:bg-primary/5 hover:border-primary cursor-pointer'}`}
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
                        : filteredAgendas.length === 0 ? (
                            <div className="text-center p-6 border-2 border-dashed rounded-lg">
                                <BookCheck className="mx-auto h-12 w-12 text-muted-foreground"/>
                                <h3 className="mt-2 text-sm font-medium">Tidak Ada Data Agenda</h3>
                                <p className="mt-1 text-sm text-muted-foreground">Tidak ada data agenda yang cocok dengan filter yang Anda pilih.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Guru</TableHead><TableHead>Kelas</TableHead><TableHead>Mapel</TableHead><TableHead>Siswa Absen</TableHead><TableHead>Pokok Bahasan</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {filteredAgendas.map(a => (
                                    <TableRow key={a.id}>
                                        <TableCell>{format(a.tanggal.toDate(), "dd MMM yyyy")} (Jam {a.jamKe})</TableCell>
                                        <TableCell className="font-medium">{a.teacherName}</TableCell>
                                        <TableCell>{a.kelas}</TableCell>
                                        <TableCell>{a.mapel}</TableCell>
                                        <TableCell className="text-xs">{a.siswaAbsen.map(s => s.namaSiswa).join(', ') || '-'}</TableCell>
                                        <TableCell className="max-w-xs truncate" title={a.pokokBahasan}>{a.pokokBahasan}</TableCell>
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
                    <h2 className="text-lg font-bold uppercase">LAPORAN AGENDA KELAS</h2>
                    <p className="text-sm">{printTitle}</p>
                </div>
                {filteredAgendas.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40px]">No.</TableHead>
                                <TableHead>Tanggal & Jam</TableHead>
                                <TableHead>Guru</TableHead>
                                <TableHead>Kelas</TableHead>
                                <TableHead>Mapel</TableHead>
                                <TableHead>Tujuan Pembelajaran</TableHead>
                                <TableHead>Pokok Bahasan</TableHead>
                                <TableHead>Siswa Absen</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredAgendas.map((a, index) => (
                            <TableRow key={a.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{format(a.tanggal.toDate(), "dd MMM yyyy")} (Jam {a.jamKe})</TableCell>
                                <TableCell>{a.teacherName}</TableCell>
                                <TableCell>{a.kelas}</TableCell>
                                <TableCell>{a.mapel}</TableCell>
                                <TableCell className="whitespace-pre-wrap">{a.tujuanPembelajaran}</TableCell>
                                <TableCell className="whitespace-pre-wrap">{a.pokokBahasan}</TableCell>
                                <TableCell className="whitespace-pre-wrap">{a.siswaAbsen.map(s => s.namaSiswa).join(', ') || '-'}</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                ) : <p className="text-center">Tidak ada data untuk periode ini.</p>}
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
