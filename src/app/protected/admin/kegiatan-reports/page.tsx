"use client";

import React, { Suspense } from 'react';
import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import { 
    ArrowLeft, Award, Users2, Library, CircleDollarSign, HeartHandshake, Briefcase, 
    DatabaseZap, ShieldQuestion, ShieldAlert, Users 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TugasTambahan } from '@/types';

// Import components for the report view
import { useEffect, useState, useCallback, useMemo } from 'react';
import { format } from "date-fns";
import { id as indonesiaLocale } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, Filter, Download, Printer, BookOpen } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAllLaporanKegiatan, getPrintSettings, getAllUsersByRole } from '@/lib/firestoreService';
import type { LaporanKegiatan, UserProfile, PrintSettings } from '@/types';
import { PrintHeader } from '@/components/layout/PrintHeader';
import { PrintFooter } from '@/components/layout/PrintFooter';
import { getActivityName } from '@/lib/utils';

// --- Data for the Menu View ---
interface ReportCategory {
  title: string;
  href: string;
  icon: React.ElementType;
  color: string;
  activityId: TugasTambahan;
}

const reportCategories: ReportCategory[] = [
    { title: "Kesiswaan", href: "/protected/admin/kegiatan-reports?activity=kesiswaan", icon: Users2, color: "text-blue-500", activityId: "kesiswaan" },
    { title: "Kurikulum", href: "/protected/admin/kegiatan-reports?activity=kurikulum", icon: Library, color: "text-green-500", activityId: "kurikulum" },
    { title: "Bendahara", href: "/protected/admin/kegiatan-reports?activity=bendahara", icon: CircleDollarSign, color: "text-amber-500", activityId: "bendahara" },
    { title: "OSIS", href: "/protected/admin/kegiatan-reports?activity=pembina_osis", icon: Award, color: "text-purple-500", activityId: "pembina_osis" },
    { title: "Bimbingan Konseling", href: "/protected/admin/kegiatan-reports?activity=bk", icon: HeartHandshake, color: "text-rose-500", activityId: "bk" },
    { title: "Operator", href: "/protected/admin/kegiatan-reports?activity=operator", icon: DatabaseZap, color: "text-sky-500", activityId: "operator" },
    { title: "Kepala TU", href: "/protected/admin/kegiatan-reports?activity=kepala_tata_usaha", icon: Briefcase, color: "text-slate-500", activityId: "kepala_tata_usaha" },
    { title: "Staf TU", href: "/protected/admin/kegiatan-reports?activity=staf_tu", icon: Users, color: "text-gray-500", activityId: "staf_tu" },
    { title: "Satpam", href: "/protected/admin/kegiatan-reports?activity=satpam", icon: ShieldQuestion, color: "text-indigo-500", activityId: "satpam" },
    { title: "Penjaga Sekolah", href: "/protected/admin/kegiatan-reports?activity=penjaga_sekolah", icon: ShieldAlert, color: "text-red-500", activityId: "penjaga_sekolah" },
    { title: "Eskul PMR", href: "/protected/admin/kegiatan-reports?activity=pembina_eskul_pmr", icon: Award, color: "text-teal-500", activityId: "pembina_eskul_pmr" },
    { title: "Eskul Paskibra", href: "/protected/admin/kegiatan-reports?activity=pembina_eskul_paskibra", icon: Award, color: "text-teal-500", activityId: "pembina_eskul_paskibra" },
    { title: "Eskul Pramuka", href: "/protected/admin/kegiatan-reports?activity=pembina_eskul_pramuka", icon: Award, color: "text-teal-500", activityId: "pembina_eskul_pramuka" },
    { title: "Eskul Karawitan", href: "/protected/admin/kegiatan-reports?activity=pembina_eskul_karawitan", icon: Award, color: "text-teal-500", activityId: "pembina_eskul_karawitan" },
    { title: "Eskul Pencak Silat", href: "/protected/admin/kegiatan-reports?activity=pembina_eskul_pencak_silat", icon: Award, color: "text-teal-500", activityId: "pembina_eskul_pencak_silat" },
    { title: "Eskul Volly Ball", href: "/protected/admin/kegiatan-reports?activity=pembina_eskul_volly_ball", icon: Award, color: "text-teal-500", activityId: "pembina_eskul_volly_ball" },
];


function MenuKegiatan() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/protected/admin">
                    <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Admin">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Pilih Jenis Laporan Kegiatan</h1>
                    <p className="text-muted-foreground">Pilih kategori laporan yang ingin Anda lihat.</p>
                </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-x-4 gap-y-8 pt-4">
                {reportCategories.map((item) => (
                    <Link
                        href={item.href}
                        key={item.title}
                        className="flex flex-col items-center justify-center text-center gap-2 group"
                    >
                        <div className="p-4 rounded-full bg-muted/60 group-hover:bg-primary/10 transition-colors duration-200">
                            <item.icon className={`h-8 w-8 transition-colors duration-200 ${item.color || 'text-muted-foreground'} group-hover:text-primary`} />
                        </div>
                        <p className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors duration-200">
                            {item.title}
                        </p>
                    </Link>
                ))}
            </div>
        </div>
    );
}

const currentYear = new Date().getFullYear();
const startYearRange = currentYear - 10;
const endYearRange = currentYear + 5;
const YEARS = Array.from({ length: endYearRange - startYearRange + 1 }, (_, i) => endYearRange - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: format(new Date(0, i), "MMMM", { locale: indonesiaLocale }) }));

function LaporanDetail({ activity }: { activity: TugasTambahan }) {
    const { toast } = useToast();
    const [reports, setReports] = useState<LaporanKegiatan[]>([]);
    const [teachers, setTeachers] = useState<UserProfile[]>([]);
    const [printSettings, setPrintSettings] = useState<PrintSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filterTeacher, setFilterTeacher] = useState("all");
    const [filterYear, setFilterYear] = useState<number>(currentYear);
    const [filterMonth, setFilterMonth] = useState<number | "all">(new Date().getMonth() + 1);

    const activityName = getActivityName(activity);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [allReports, guruUsers, settings] = await Promise.all([
                getAllLaporanKegiatan(),
                getAllUsersByRole('guru'),
                getPrintSettings()
            ]);
            
            const relevantReports = allReports.filter(r => r.activityId === activity);
            setReports(relevantReports);
            
            const relevantTeacherUids = new Set(relevantReports.map(r => r.createdByUid));
            const relevantTeachers = guruUsers.filter(u => relevantTeacherUids.has(u.uid));
            setTeachers(relevantTeachers);
            setPrintSettings(settings);

        } catch (err: any) {
            setError("Gagal memuat data. Silakan coba lagi.");
            toast({ variant: "destructive", title: "Error", description: err.message });
        } finally {
            setIsLoading(false);
        }
    }, [activity, toast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filteredReports = useMemo(() => {
        return reports.filter(report => {
            if (filterTeacher !== "all" && report.createdByUid !== filterTeacher) return false;
            
            if (!report.date || typeof report.date.toDate !== 'function') return false;
            const reportDate = report.date.toDate();
            
            if (reportDate.getFullYear() !== filterYear) return false;
            if (filterMonth !== "all" && reportDate.getMonth() !== filterMonth - 1) return false;
            
            return true;
        });
    }, [reports, filterTeacher, filterYear, filterMonth]);
    
    const handleDownloadExcel = () => {
        if (filteredReports.length === 0) return;
        const dataForExcel = filteredReports.map(r => ({
            'Tanggal': format(r.date.toDate(), "yyyy-MM-dd"), 'Judul': r.title, 'Isi Laporan': r.content, 'Oleh': r.createdByDisplayName
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Laporan ${activityName}`);
        const wscols = [ {wch:12}, {wch:30}, {wch:50}, {wch:20} ];
        worksheet['!cols'] = wscols;
        XLSX.writeFile(workbook, `laporan_${activity}.xlsx`);
    };
    
    const handlePrint = () => { window.print(); };

    const printTitle = `Laporan Kegiatan ${activityName}`;

    return (
        <div className="space-y-6">
            <div className="print:hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/protected/admin/kegiatan-reports"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
                        <div><h1 className="text-3xl font-bold tracking-tight text-foreground font-headline flex items-center gap-2"><BookOpen className="h-8 w-8 text-primary" /> Laporan {activityName}</h1><p className="text-muted-foreground">Lihat dan ekspor semua laporan untuk kegiatan ini.</p></div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleDownloadExcel} variant="outline" disabled={filteredReports.length === 0}><Download className="mr-2 h-4 w-4" />Unduh Excel</Button>
                        <Button onClick={handlePrint} variant="outline" disabled={filteredReports.length === 0}><Printer className="mr-2 h-4 w-4" />Cetak/PDF</Button>
                    </div>
                </div>
                <Card className="mt-6">
                    <CardHeader><CardTitle>Filter Laporan</CardTitle>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                            <div><label htmlFor="filter-teacher" className="text-sm font-medium">Filter Pembuat</label><Select value={filterTeacher} onValueChange={setFilterTeacher}><SelectTrigger id="filter-teacher" className="w-full mt-1"><Filter className="h-4 w-4 mr-2 opacity-70" /><SelectValue placeholder="Pilih guru..." /></SelectTrigger><SelectContent><SelectItem value="all">Semua Pembuat</SelectItem>{teachers.map(t => <SelectItem key={t.uid} value={t.uid}>{t.displayName}</SelectItem>)}</SelectContent></Select></div>
                            <div><label htmlFor="filter-year" className="text-sm font-medium">Filter Tahun</label><Select value={String(filterYear)} onValueChange={(v) => setFilterYear(parseInt(v))}><SelectTrigger id="filter-year" className="w-full mt-1"><SelectValue placeholder="Pilih tahun..." /></SelectTrigger><SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
                            <div><label htmlFor="filter-month" className="text-sm font-medium">Filter Bulan</label><Select value={String(filterMonth)} onValueChange={(v) => setFilterMonth(v === "all" ? "all" : parseInt(v))}><SelectTrigger id="filter-month" className="w-full mt-1"><SelectValue placeholder="Pilih bulan..." /></SelectTrigger><SelectContent><SelectItem value="all">Semua Bulan</SelectItem>{MONTHS.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <div className="space-y-2"><Skeleton className="h-12 w-full"/><Skeleton className="h-12 w-full"/></div>
                        : error ? <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
                        : filteredReports.length === 0 ? <div className="text-center p-6 border-2 border-dashed rounded-lg"><BookOpen className="mx-auto h-12 w-12 text-muted-foreground"/><h3 className="mt-2 text-sm font-medium">Tidak Ada Data</h3><p className="mt-1 text-sm text-muted-foreground">Tidak ada laporan yang cocok dengan filter yang Anda pilih.</p></div>
                        : (<div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Judul</TableHead><TableHead>Pembuat</TableHead><TableHead>Isi Laporan</TableHead></TableRow></TableHeader><TableBody>{filteredReports.map(r => (<TableRow key={r.id}><TableCell>{format(r.date.toDate(), "dd MMM yyyy")}</TableCell><TableCell className="font-medium">{r.title}</TableCell><TableCell>{r.createdByDisplayName}</TableCell><TableCell className="max-w-xs truncate" title={r.content}>{r.content}</TableCell></TableRow>))}</TableBody></Table></div>)
                        }
                    </CardContent>
                </Card>
            </div>
            <div className="print:block hidden"><PrintHeader imageUrl={printSettings?.headerImageUrl} /><div className="text-center my-4"><h2 className="text-lg font-bold uppercase">{printTitle}</h2></div>
                {filteredReports.length > 0 ? (<Table><TableHeader><TableRow><TableHead>No.</TableHead><TableHead>Tanggal</TableHead><TableHead>Judul</TableHead><TableHead>Isi Laporan</TableHead><TableHead>Pembuat</TableHead></TableRow></TableHeader><TableBody>{filteredReports.map((r, index) => (<TableRow key={r.id}><TableCell>{index + 1}</TableCell><TableCell>{format(r.date.toDate(), "dd MMM yyyy")}</TableCell><TableCell>{r.title}</TableCell><TableCell className="whitespace-pre-wrap">{r.content}</TableCell><TableCell>{r.createdByDisplayName}</TableCell></TableRow>))}</TableBody></Table>) : <p className="text-center">Tidak ada data untuk periode ini.</p>}
                <PrintFooter settings={printSettings} />
            </div>
            <style jsx global>{` @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-size: 10pt !important; } .print\\:hidden { display: none !important; } .print\\:block { display: block !important; } .print-header { text-align: center; margin-bottom: 0.5rem; } table { width: 100%; border-collapse: collapse !important; font-size: 9pt !important; } th, td { border: 1px solid #ccc !important; padding: 4px 6px !important; text-align: left; vertical-align: top; } thead { background-color: #f3f4f6 !important; } tr { break-inside: avoid !important; } .whitespace-pre-wrap { white-space: pre-wrap !important; } } `}</style>
        </div>
    );
}

// Main component that decides which view to show
export default function KegiatanReportsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-10 w-10 animate-spin"/></div>}>
            <KegiatanReportsSwitcher />
        </Suspense>
    )
}

function KegiatanReportsSwitcher() {
    const searchParams = useSearchParams();
    const activity = searchParams.get('activity') as TugasTambahan | null;

    if (activity) {
        return <LaporanDetail activity={activity} />;
    }
    
    return <MenuKegiatan />;
}
