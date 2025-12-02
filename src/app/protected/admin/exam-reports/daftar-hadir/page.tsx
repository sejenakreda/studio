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
import { ArrowLeft, Loader2, AlertCircle, CalendarCheck, Filter, Download, Printer } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getDaftarHadirPengawas } from '@/lib/firestoreService';
import type { DaftarHadirPengawas } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const currentYear = new Date().getFullYear();
const startYearRange = currentYear - 10;
const endYearRange = currentYear + 5;
const YEARS = Array.from({ length: endYearRange - startYearRange + 1 }, (_, i) => endYearRange - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: format(new Date(0, i), "MMMM", { locale: indonesiaLocale }) }));
const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export default function AdminRekapDaftarHadirPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { userProfile } = useAuth();
    const [allRecords, setAllRecords] = useState<DaftarHadirPengawas[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filterYear, setFilterYear] = useState<number>(currentYear);
    const [filterMonth, setFilterMonth] = useState<number | "all">(new Date().getMonth() + 1);
    const [filterHari, setFilterHari] = useState<string>("all");
    const [filterMapel, setFilterMapel] = useState<string>("all");

    const fetchData = useCallback(async () => {
        if (!userProfile) return;
        setIsLoading(true);
        setError(null);
        try {
            const fetchedData = await getDaftarHadirPengawas(userProfile);
            setAllRecords(fetchedData);
        } catch (err: any) {
            setError("Gagal memuat data. Silakan coba lagi.");
            toast({ variant: "destructive", title: "Error", description: err.message });
        } finally {
            setIsLoading(false);
        }
    }, [userProfile, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const availableMapel = useMemo(() => {
        const mapelSet = new Set(allRecords.map(item => item.mataUjian));
        return Array.from(mapelSet).sort();
    }, [allRecords]);

    const filteredData = useMemo(() => {
        return allRecords.filter(item => {
            const itemDate = item.tanggalUjian.toDate();
            const dayName = format(itemDate, 'EEEE', { locale: indonesiaLocale });

            if (filterYear !== new Date().getFullYear() && itemDate.getFullYear() !== filterYear) return false;
            if (filterMonth !== "all" && itemDate.getMonth() !== filterMonth - 1) return false;
            if (filterHari !== "all" && dayName !== filterHari) return false;
            if (filterMapel !== "all" && item.mataUjian !== filterMapel) return false;
            return true;
        });
    }, [allRecords, filterYear, filterMonth, filterHari, filterMapel]);
    
    const handleDownloadExcel = () => {
        if (filteredData.length === 0) {
            toast({ variant: "default", title: "Tidak ada data untuk diunduh." });
            return;
        }
        const dataForExcel = filteredData.map(item => ({
            'Tanggal': format(item.tanggalUjian.toDate(), "EEEE, dd-MM-yyyy", { locale: indonesiaLocale }),
            'Nama Pengawas': item.namaPengawas,
            'Mata Ujian': item.mataUjian,
            'Ruang': item.ruangUjian,
            'Waktu Mulai': item.waktuMulai,
            'Waktu Selesai': item.waktuSelesai,
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Hadir Pengawas");
        XLSX.writeFile(workbook, "rekap_hadir_pengawas.xlsx");
        toast({ title: "Unduhan Dimulai", description: "File Excel sedang disiapkan." });
    };
    
    const handlePrint = () => {
        if (filterMonth === "all") {
            toast({ variant: "default", title: "Pilih Bulan Spesifik", description: "Pilih bulan tertentu untuk mencetak rekap." });
            return;
        }
        router.push(`/protected/administrasi-ujian/daftar-hadir/print?year=${filterYear}&month=${filterMonth}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/protected/admin"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline flex items-center gap-2">
                        <CalendarCheck className="h-8 w-8 text-primary" /> Rekapitulasi Daftar Hadir Pengawas
                    </h1>
                    <p className="text-muted-foreground">Lihat dan ekspor semua data kehadiran pengawas ujian.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filter Rekapitulasi</CardTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                        <div>
                            <label htmlFor="filter-year" className="text-sm font-medium">Filter Tahun</label>
                            <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(parseInt(v))}><SelectTrigger id="filter-year" className="w-full mt-1"><SelectValue /></SelectTrigger><SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <label htmlFor="filter-month" className="text-sm font-medium">Filter Bulan</label>
                            <Select value={String(filterMonth)} onValueChange={(v) => setFilterMonth(v === "all" ? "all" : parseInt(v))}><SelectTrigger id="filter-month" className="w-full mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Semua Bulan</SelectItem>{MONTHS.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent></Select>
                        </div>
                         <div>
                            <label htmlFor="filter-hari" className="text-sm font-medium">Filter Hari</label>
                            <Select value={filterHari} onValueChange={setFilterHari}><SelectTrigger id="filter-hari" className="w-full mt-1"><SelectValue placeholder="Pilih hari..." /></SelectTrigger><SelectContent><SelectItem value="all">Semua Hari</SelectItem>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
                        </div>
                         <div>
                            <label htmlFor="filter-mapel" className="text-sm font-medium">Filter Mata Pelajaran</label>
                            <Select value={filterMapel} onValueChange={setFilterMapel}><SelectTrigger id="filter-mapel" className="w-full mt-1"><SelectValue placeholder="Pilih mapel..." /></SelectTrigger><SelectContent><SelectItem value="all">Semua Mapel</SelectItem>{availableMapel.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
                        </div>
                    </div>
                     <div className="pt-4 flex gap-2">
                        <Button onClick={handleDownloadExcel} disabled={filteredData.length === 0}><Download className="mr-2 h-4 w-4" />Unduh Excel</Button>
                        <Button onClick={handlePrint} disabled={filteredData.length === 0 || filterMonth === 'all'}><Printer className="mr-2 h-4 w-4" />Cetak</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (<Skeleton className="h-40 w-full" />)
                    : error ? (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>)
                    : filteredData.length === 0 ? (
                        <div className="text-center p-6 border-2 border-dashed rounded-lg">
                            <CalendarCheck className="mx-auto h-12 w-12 text-muted-foreground"/>
                            <h3 className="mt-2 text-sm font-medium">Tidak Ada Data</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Tidak ada daftar hadir yang cocok dengan filter yang Anda pilih.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Pengawas</TableHead><TableHead>Mapel</TableHead><TableHead>Ruang</TableHead><TableHead>Waktu</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredData.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{format(item.tanggalUjian.toDate(), "EEEE, dd-MM-yyyy", { locale: indonesiaLocale })}</TableCell>
                                    <TableCell className="font-medium">{item.namaPengawas}</TableCell>
                                    <TableCell>{item.mataUjian}</TableCell>
                                    <TableCell>{item.ruangUjian}</TableCell>
                                    <TableCell>{item.waktuMulai} - {item.waktuSelesai}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table></div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
