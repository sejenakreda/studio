
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { id as indonesiaLocale } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Loader2, AlertCircle, Users, History, Trash2, Edit, Download, CalendarRange, Save, UserCheck, Info as InfoIcon, PieChart, Printer } from "lucide-react";
import {
  getAllUsersByRole,
  getAllTeachersDailyAttendanceForPeriod,
  deleteTeacherDailyAttendance,
  addActivityLog,
  addOrUpdateTeacherDailyAttendance, 
} from '@/lib/firestoreService';
import type { UserProfile, TeacherDailyAttendance, TeacherDailyAttendanceStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Timestamp } from 'firebase/firestore';
import { getWorkdaysInMonth } from '@/lib/utils';

const MONTHS = [
  { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' }, { value: 3, label: 'Maret' },
  { value: 4, label: 'April' }, { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' }, { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' }, { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
];

const currentYear = new Date().getFullYear();
const startYearRange = currentYear - 10;
const endYearRange = currentYear + 5;
const YEARS = Array.from({ length: endYearRange - startYearRange + 1 }, (_, i) => endYearRange - i);


interface MonthlySummary {
  teacherUid: string;
  teacherName: string;
  Hadir: number;
  Izin: number;
  Sakit: number;
  Alpa: number;
  TotalTercatat: number;
  PersentaseHadir: number;
  TotalHariKerja: number;
}

const dailyAttendanceStatusOptions: TeacherDailyAttendanceStatus[] = ['Hadir', 'Izin', 'Sakit', 'Alpa'];

const editAttendanceSchema = z.object({
  status: z.enum(dailyAttendanceStatusOptions, { required_error: "Status kehadiran harus dipilih" }),
  notes: z.string().max(300, "Catatan maksimal 300 karakter").optional(),
});
type EditAttendanceFormData = z.infer<typeof editAttendanceSchema>;


export default function ManageTeacherAttendancePage() {
  const { toast } = useToast();
  const { userProfile: adminProfile } = useAuth();
  const [teachers, setTeachers] = useState<UserProfile[]>([]);

  const [dailyRecords, setDailyRecords] = useState<TeacherDailyAttendance[]>([]);
  const [isLoadingDailyRecords, setIsLoadingDailyRecords] = useState(false);
  const [dailyRecordToDelete, setDailyRecordToDelete] = useState<TeacherDailyAttendance | null>(null);
  const [isDeletingDaily, setIsDeletingDaily] = useState(false);

  const [editingRecord, setEditingRecord] = useState<TeacherDailyAttendance | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [dailyFilterYear, setDailyFilterYear] = useState<number>(currentYear);
  const [dailyFilterMonth, setDailyFilterMonth] = useState<number | "all">(new Date().getMonth() + 1);
  const [dailyFilterTeacherUid, setDailyFilterTeacherUid] = useState<string | "all">("all");

  const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const editForm = useForm<EditAttendanceFormData>({
    resolver: zodResolver(editAttendanceSchema),
    defaultValues: { status: "Hadir", notes: "" },
  });

  const fetchTeachersList = useCallback(async () => {
    setIsLoadingTeachers(true);
    try {
      const guruUsers = await getAllUsersByRole('guru');
      setTeachers(guruUsers || []);
    } catch (error) {
      setFetchError("Gagal memuat daftar guru.");
      toast({ variant: "destructive", title: "Error", description: "Gagal memuat daftar guru." });
    } finally { setIsLoadingTeachers(false); }
  }, [toast]);

  const fetchDailyAttendanceRecords = useCallback(async () => {
    setIsLoadingDailyRecords(true);
    setFetchError(null);
    try {
      const monthQueryValue = dailyFilterMonth === "all" ? null : dailyFilterMonth;
      const allRecordsForPeriod = await getAllTeachersDailyAttendanceForPeriod(dailyFilterYear, monthQueryValue);
      let records = dailyFilterTeacherUid === "all" ? allRecordsForPeriod : allRecordsForPeriod.filter(rec => rec.teacherUid === dailyFilterTeacherUid);
      setDailyRecords(records.sort((a, b) => {
        const dateA = a.date?.toDate() ?? new Date(0);
        const dateB = b.date?.toDate() ?? new Date(0);
        const dateComparison = dateB.getTime() - dateA.getTime();
        if (dateComparison !== 0) return dateComparison;
        return (a.teacherName || "").localeCompare(b.teacherName || "");
      }));
    } catch (error: any) {
      console.error("Admin - Error in fetchDailyAttendanceRecords:", error);
      setFetchError("Gagal memuat data kehadiran harian guru. Pastikan indeks Firestore sudah dibuat. Cek konsol browser untuk detail.");
      toast({ variant: "destructive", title: "Error Memuat Data", description: "Gagal memuat data kehadiran harian. Kemungkinan ada masalah dengan query atau indeks Firestore. Periksa konsol browser (klik kanan > Inspect > Console) untuk pesan error dari Firebase, mungkin terkait indeks." });
      setDailyRecords([]);
    } finally {
      setIsLoadingDailyRecords(false);
    }
  }, [toast, dailyFilterYear, dailyFilterMonth, dailyFilterTeacherUid]);

  useEffect(() => { fetchTeachersList(); }, [fetchTeachersList]);
  useEffect(() => { fetchDailyAttendanceRecords(); }, [fetchDailyAttendanceRecords]);

  useEffect(() => {
    if (dailyFilterMonth !== "all" && !isLoadingDailyRecords && dailyRecords.length > 0) {
      setIsLoadingSummary(true);
      const workdaysInMonth = getWorkdaysInMonth(dailyFilterYear, dailyFilterMonth);
      const summaryMap = new Map<string, Omit<MonthlySummary, 'PersentaseHadir' | 'TotalHariKerja'>>();

      dailyRecords.forEach(rec => {
        if (!summaryMap.has(rec.teacherUid)) {
          summaryMap.set(rec.teacherUid, { teacherUid: rec.teacherUid, teacherName: rec.teacherName || rec.teacherUid, Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0, TotalTercatat: 0 });
        }
        const teacherSummary = summaryMap.get(rec.teacherUid)!;
        
        switch (rec.status) {
            case 'Hadir': teacherSummary.Hadir++; break;
            case 'Izin': teacherSummary.Izin++; break;
            case 'Sakit': teacherSummary.Sakit++; break;
            case 'Alpa': teacherSummary.Alpa++; break;
            default: teacherSummary.Alpa++; break; // Fallback for unexpected status
        }
        teacherSummary.TotalTercatat++;
      });
      
      const fullSummary = Array.from(summaryMap.values()).map(summary => {
        const percentage = workdaysInMonth > 0 ? (summary.Hadir / workdaysInMonth) * 100 : 0;
        return {
          ...summary,
          PersentaseHadir: parseFloat(percentage.toFixed(1)),
          TotalHariKerja: workdaysInMonth
        };
      }).sort((a, b) => a.teacherName.localeCompare(b.teacherName));

      setMonthlySummary(fullSummary);
      setIsLoadingSummary(false);
    } else {
      setMonthlySummary([]);
    }
  }, [dailyRecords, dailyFilterMonth, dailyFilterYear, isLoadingDailyRecords]);


  const handleDeleteDailyConfirmation = (record: TeacherDailyAttendance) => { setDailyRecordToDelete(record); };
  const handleActualDailyDelete = async () => {
    if (!dailyRecordToDelete || !dailyRecordToDelete.id || !adminProfile) return;
    setIsDeletingDaily(true);
    try {
      await deleteTeacherDailyAttendance(dailyRecordToDelete.id);
      await addActivityLog("Data Kehadiran Harian Guru Dihapus (Admin)", `Data harian Guru: ${dailyRecordToDelete.teacherName}, Tgl: ${format(dailyRecordToDelete.date.toDate(), "EEEE, yyyy-MM-dd", {locale: indonesiaLocale})} dihapus oleh Admin: ${adminProfile.displayName || adminProfile.email}`, adminProfile.uid, adminProfile.displayName || adminProfile.email || "Admin");
      toast({ title: "Sukses", description: "Data kehadiran harian berhasil dihapus." });
      setDailyRecordToDelete(null); fetchDailyAttendanceRecords();
    } catch (error: any) { toast({ variant: "destructive", title: "Error", description: "Gagal menghapus data kehadiran harian." });
    } finally { setIsDeletingDaily(false); }
  };
  
  const handleEditDailyRecordClick = (record: TeacherDailyAttendance) => {
    setEditingRecord(record);
    editForm.reset({ status: record.status, notes: record.notes || "" });
    setIsEditModalOpen(true);
  };

  const onSaveEditedAttendance = async (data: EditAttendanceFormData) => {
    if (!editingRecord || !adminProfile?.uid) {
      toast({ variant: "destructive", title: "Error", description: "Data tidak lengkap untuk pembaruan." });
      return;
    }
    setIsSubmittingEdit(true);
    try {
      const payloadForUpdate = { teacherUid: editingRecord.teacherUid, teacherName: editingRecord.teacherName, date: editingRecord.date, status: data.status, notes: data.notes || "", recordedAt: editingRecord.recordedAt, lastUpdatedByUid: adminProfile.uid };
      await addOrUpdateTeacherDailyAttendance(payloadForUpdate);
      await addActivityLog("Kehadiran Harian Guru Diedit (Admin)", `Data Guru: ${editingRecord.teacherName}, Tgl: ${format(editingRecord.date.toDate(), "yyyy-MM-dd")} diubah menjadi Status: ${data.status}${data.notes ? ', Ket: ' + data.notes : ''} oleh Admin: ${adminProfile.displayName || adminProfile.email}`, adminProfile.uid, adminProfile.displayName || adminProfile.email || "Admin");
      toast({ title: "Sukses", description: "Data kehadiran harian berhasil diperbarui." });
      setIsEditModalOpen(false); setEditingRecord(null); fetchDailyAttendanceRecords();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Simpan Edit", description: error.message || "Gagal memperbarui kehadiran." });
    } finally {
      setIsSubmittingEdit(false);
    }
  };


  const handleDownloadDailyExcel = () => {
    if (dailyRecords.length === 0) {
      toast({ variant: "default", title: "Tidak Ada Data Harian", description: "Tidak ada data kehadiran harian yang sesuai dengan filter untuk diunduh." });
      return;
    }
    const dataForExcel = dailyRecords.map(rec => ({ 'Nama Guru': rec.teacherName || rec.teacherUid, 'Hari, Tanggal': format(rec.date.toDate(), "EEEE, dd MMMM yyyy", { locale: indonesiaLocale }), 'Status': rec.status, 'Catatan': rec.notes || '-', 'Dicatat Pada': rec.recordedAt ? format(rec.recordedAt.toDate(), "dd MMM yyyy, HH:mm", { locale: indonesiaLocale }) : '-', 'Diperbarui Pada': rec.updatedAt ? format(rec.updatedAt.toDate(), "dd MMM yyyy, HH:mm", { locale: indonesiaLocale }) : '-', 'Pencatat/Pengedit Terakhir': rec.lastUpdatedByUid || '-', }));
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Kehadiran Harian");
    const wscols = [ { wch: 25 }, { wch: 30 }, { wch: 10 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 25 } ];
    worksheet['!cols'] = wscols;
    const monthLabel = dailyFilterMonth === "all" ? "SemuaBulan" : MONTHS.find(m => m.value === dailyFilterMonth)?.label || String(dailyFilterMonth);
    XLSX.writeFile(workbook, `rekap_harian_kehadiran_${dailyFilterYear}_${monthLabel}.xlsx`);
    toast({ title: "Unduhan Dimulai", description: "File Excel rekap kehadiran harian sedang disiapkan." });
  };

  const handleDownloadMonthlySummaryExcel = () => {
    if (monthlySummary.length === 0) {
      toast({ variant: "default", title: "Tidak Ada Data Bulanan", description: "Tidak ada data rekap bulanan yang sesuai dengan filter untuk diunduh." });
      return;
    }
    const dataForExcel = monthlySummary.map(summary => ({ 'Nama Guru': summary.teacherName, 'Bulan': MONTHS.find(m => m.value === dailyFilterMonth)?.label || String(dailyFilterMonth), 'Tahun': dailyFilterYear, 'Total Hadir': summary.Hadir, 'Total Izin': summary.Izin, 'Total Sakit': summary.Sakit, 'Total Alpa': summary.Alpa, 'Total Hari Tercatat': summary.TotalTercatat, 'Total Hari Kerja': summary.TotalHariKerja, 'Persentase Kehadiran (%)': summary.PersentaseHadir, }));
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Kehadiran Bulanan");
    const wscols = [ { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 25 } ];
    worksheet['!cols'] = wscols;
    const monthLabel = MONTHS.find(m => m.value === dailyFilterMonth)?.label || String(dailyFilterMonth);
    XLSX.writeFile(workbook, `rekap_bulanan_kehadiran_${dailyFilterYear}_${monthLabel}.xlsx`);
    toast({ title: "Unduhan Dimulai", description: "File Excel rekap kehadiran bulanan sedang disiapkan." });
  };

  const handlePrint = () => { window.print(); };

  const printTitle = useMemo(() => {
    const monthLabel = dailyFilterMonth === "all" ? `Tahun ${dailyFilterYear}` : `${MONTHS.find(m => m.value === dailyFilterMonth)?.label || ''} ${dailyFilterYear}`;
    return `Periode: ${monthLabel}`;
  }, [dailyFilterYear, dailyFilterMonth]);


  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <div className="flex items-center gap-4">
            <Link href="/protected/admin"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <div><h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Kelola Kehadiran Harian Guru</h1><p className="text-muted-foreground">Lihat, kelola, dan rekapitulasi data kehadiran harian yang dicatat oleh guru.</p></div>
        </div>

        <Card className="mt-6">
            <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div><CardTitle>Filter Data</CardTitle><CardDescription>Gunakan filter untuk menampilkan data yang diinginkan.</CardDescription></div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button onClick={handleDownloadMonthlySummaryExcel} variant="outline" className="w-full sm:w-auto" disabled={dailyFilterMonth === "all" || monthlySummary.length === 0} title={dailyFilterMonth === "all" ? "Pilih bulan spesifik untuk rekap bulanan" : "Unduh rekapitulasi bulanan"}><CalendarRange className="mr-2 h-4 w-4" />Unduh Rekap Bulanan</Button>
                    <Button onClick={handleDownloadDailyExcel} variant="outline" className="w-full sm:w-auto" disabled={dailyRecords.length === 0}><Download className="mr-2 h-4 w-4" />Unduh Detail Harian</Button>
                    <Button onClick={handlePrint} variant="outline" className="w-full sm:w-auto" disabled={monthlySummary.length === 0 && dailyRecords.length === 0}><Printer className="mr-2 h-4 w-4" />Cetak</Button>
                </div>
            </div>
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-md bg-muted/30 items-end">
                <div><Label htmlFor="filter-daily-teacher">Filter Guru</Label><Select onValueChange={setDailyFilterTeacherUid} value={dailyFilterTeacherUid} disabled={isLoadingTeachers}><SelectTrigger id="filter-daily-teacher"><SelectValue placeholder={isLoadingTeachers ? "Memuat..." : "Pilih guru..."} /></SelectTrigger><SelectContent><SelectItem value="all">Semua Guru</SelectItem>{isLoadingTeachers ? (<SelectItem value="loading" disabled>Memuat...</SelectItem>) : teachers.map(t => (<SelectItem key={t.uid} value={t.uid}>{t.displayName}</SelectItem>))}</SelectContent></Select></div>
                <div><Label htmlFor="filter-daily-year">Filter Tahun</Label><Select onValueChange={(v) => setDailyFilterYear(parseInt(v))} value={String(dailyFilterYear)}><SelectTrigger id="filter-daily-year"><SelectValue placeholder="Pilih tahun..." /></SelectTrigger><SelectContent>{YEARS.map(y => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}</SelectContent></Select></div>
                <div><Label htmlFor="filter-daily-month">Filter Bulan</Label><Select onValueChange={(v) => setDailyFilterMonth(v === "all" ? "all" : parseInt(v))} value={String(dailyFilterMonth)}><SelectTrigger id="filter-daily-month"><SelectValue placeholder="Pilih bulan..." /></SelectTrigger><SelectContent><SelectItem value="all">Semua Bulan (Tahun Dipilih)</SelectItem>{MONTHS.map(m => (<SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>))}</SelectContent></Select></div>
            </div>
            </CardContent>
        </Card>

        {dailyFilterMonth !== "all" && (
            <Card>
            <CardHeader><CardTitle>Rekapitulasi Kehadiran Bulanan</CardTitle><CardDescription>Ringkasan kehadiran untuk periode {MONTHS.find(m => m.value === dailyFilterMonth)?.label} {dailyFilterYear}. Persentase dihitung berdasarkan total hari kerja (Senin-Jumat) dalam sebulan.</CardDescription></CardHeader>
            <CardContent>
                {isLoadingSummary || isLoadingDailyRecords ? (<div className="flex justify-center items-center h-24"><Loader2 className="h-8 w-8 animate-spin" /></div>)
                : monthlySummary.length === 0 ? (<div className="text-center p-6 border-2 border-dashed rounded-lg"><PieChart className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-2 text-sm font-medium">Tidak Ada Data Rekap</h3><p className="mt-1 text-sm text-muted-foreground">Tidak ada data kehadiran yang tercatat untuk direkap pada bulan ini.</p></div>)
                : (<div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Nama Guru</TableHead><TableHead className="text-center">Hadir</TableHead><TableHead className="text-center">Izin</TableHead><TableHead className="text-center">Sakit</TableHead><TableHead className="text-center">Alpa</TableHead><TableHead className="text-center">Total Tercatat</TableHead><TableHead className="text-center">Total Hari Kerja</TableHead><TableHead className="text-center font-semibold text-primary">Persentase Hadir</TableHead></TableRow></TableHeader><TableBody>
                {monthlySummary.map(s => (<TableRow key={s.teacherUid}>
                    <TableCell className="font-medium">{s.teacherName}</TableCell>
                    <TableCell className="text-center text-green-600 font-medium">{s.Hadir}</TableCell>
                    <TableCell className="text-center text-blue-600 font-medium">{s.Izin}</TableCell>
                    <TableCell className="text-center text-yellow-600 font-medium">{s.Sakit}</TableCell>
                    <TableCell className="text-center text-red-600 font-medium">{s.Alpa}</TableCell>
                    <TableCell className="text-center">{s.TotalTercatat}</TableCell>
                    <TableCell className="text-center">{s.TotalHariKerja}</TableCell>
                    <TableCell className="text-center font-bold text-primary">{s.PersentaseHadir}%</TableCell>
                </TableRow>))}
                </TableBody></Table></div>)
                }
            </CardContent>
            </Card>
        )}

        <Card>
            <CardHeader><CardTitle>Detail Kehadiran Harian (Sesuai Filter)</CardTitle><CardDescription>Lihat dan kelola data kehadiran harian yang dicatat oleh masing-masing guru.</CardDescription></CardHeader>
            <CardContent>
            {fetchError && !isLoadingDailyRecords && (<Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{fetchError}</AlertDescription></Alert>)}
            {isLoadingDailyRecords ? (<div className="space-y-2">{[...Array(3)].map((_, i) => (<Skeleton key={i} className="h-12 w-full rounded-md" />))}</div>)
            : dailyRecords.length === 0 && !fetchError ? (<div className="text-center p-6 border-2 border-dashed rounded-lg"><Users className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-2 text-sm font-medium">Belum Ada Data Kehadiran Harian</h3><p className="mt-1 text-sm text-muted-foreground">Belum ada data kehadiran harian guru yang cocok dengan filter ini, atau guru belum mencatat kehadiran.</p></div>)
            : (<div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Nama Guru</TableHead><TableHead>Hari, Tanggal</TableHead><TableHead>Status</TableHead><TableHead>Catatan</TableHead><TableHead>Dicatat Pada</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader><TableBody>{dailyRecords.map((rec) => (<TableRow key={rec.id}><TableCell className="font-medium">{rec.teacherName || rec.teacherUid}</TableCell><TableCell>{format(rec.date.toDate(), "EEEE, dd MMMM yyyy", { locale: indonesiaLocale })}</TableCell><TableCell>{rec.status}</TableCell><TableCell className="max-w-xs truncate" title={rec.notes || undefined}>{rec.notes || '-'}</TableCell><TableCell>{rec.recordedAt ? format(rec.recordedAt.toDate(), "dd MMM yyyy, HH:mm", { locale: indonesiaLocale }) : '-'}</TableCell><TableCell className="text-right space-x-1"><Button variant="outline" size="icon" onClick={() => handleEditDailyRecordClick(rec)} title="Edit Kehadiran Harian (Admin)"><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteDailyConfirmation(rec)} disabled={isDeletingDaily && dailyRecordToDelete?.id === rec.id} title="Hapus"><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>))}</TableBody></Table></div>)
            }
            </CardContent>
        </Card>
      </div>

      <div className="print:block hidden">
        <div className="print-header">
            <h2>REKAPITULASI KEHADIRAN GURU</h2>
            <h3>SMA PGRI NARINGGUL</h3>
            <p>{printTitle}</p>
        </div>
        {monthlySummary.length > 0 && dailyFilterMonth !== 'all' && (
            <div className="mb-8">
                <h3 className="text-lg font-bold mb-2">Rekapitulasi Bulanan</h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>No.</TableHead>
                            <TableHead>Nama Guru</TableHead>
                            <TableHead>Hadir</TableHead>
                            <TableHead>Izin</TableHead>
                            <TableHead>Sakit</TableHead>
                            <TableHead>Alpa</TableHead>
                            <TableHead>Persentase</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {monthlySummary.map((s, index) => (
                            <TableRow key={s.teacherUid}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{s.teacherName}</TableCell>
                                <TableCell>{s.Hadir}</TableCell>
                                <TableCell>{s.Izin}</TableCell>
                                <TableCell>{s.Sakit}</TableCell>
                                <TableCell>{s.Alpa}</TableCell>
                                <TableCell>{s.PersentaseHadir}%</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        )}
         {dailyRecords.length > 0 && (
            <div>
                <h3 className="text-lg font-bold mb-2 page-break-before">Detail Kehadiran Harian</h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>No.</TableHead>
                            <TableHead>Nama Guru</TableHead>
                            <TableHead>Hari, Tanggal</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Catatan</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dailyRecords.map((rec, index) => (
                            <TableRow key={rec.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{rec.teacherName || rec.teacherUid}</TableCell>
                                <TableCell>{format(rec.date.toDate(), "EEEE, dd MMM yyyy", { locale: indonesiaLocale })}</TableCell>
                                <TableCell>{rec.status}</TableCell>
                                <TableCell className="whitespace-pre-wrap">{rec.notes || '-'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        )}
      </div>
    
      {dailyRecordToDelete && (<AlertDialog open={!!dailyRecordToDelete} onOpenChange={(isOpen) => !isOpen && setDailyRecordToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Yakin Hapus Kehadiran Harian Ini?</AlertDialogTitle><AlertDialogDescription>Kehadiran guru <span className="font-semibold">{dailyRecordToDelete.teacherName}</span> tanggal {format(dailyRecordToDelete.date.toDate(), "EEEE, PPP", { locale: indonesiaLocale })} akan dihapus. Ini tidak dapat diurungkan.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setDailyRecordToDelete(null)} disabled={isDeletingDaily}>Batal</AlertDialogCancel><AlertDialogAction onClick={handleActualDailyDelete} disabled={isDeletingDaily} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">{isDeletingDaily ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Ya, Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
    
      {editingRecord && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onSaveEditedAttendance)}>
                <DialogHeader><DialogTitle>Edit Kehadiran Harian Guru</DialogTitle><DialogDescription>Ubah status atau catatan kehadiran untuk guru <span className="font-semibold">{editingRecord.teacherName}</span> pada tanggal <span className="font-semibold">{format(editingRecord.date.toDate(), "EEEE, dd MMMM yyyy", { locale: indonesiaLocale })}</span>.</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                  <FormField control={editForm.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status Kehadiran</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih status..." /></SelectTrigger></FormControl><SelectContent>{dailyAttendanceStatusOptions.map(option => (<SelectItem key={option} value={option}>{option}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                  <FormField control={editForm.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Catatan (Opsional)</FormLabel><FormControl><Textarea placeholder="Alasan izin, sakit, atau keterangan tambahan..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={isSubmittingEdit}>Batal</Button></DialogClose><Button type="submit" disabled={isSubmittingEdit}>{isSubmittingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Simpan Perubahan</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      <style jsx global>{`
        @media print {
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-size: 10pt !important; }
            .print\\:hidden { display: none !important; }
            .print\\:block { display: block !important; }
            .print-header { text-align: center; margin-bottom: 1.5rem; }
            .print-header h2 { font-size: 1.5rem; font-weight: bold; }
            .print-header h3 { font-size: 1.25rem; font-weight: 600; }
            .print-header p { font-size: 0.875rem; }
            .page-break-before { break-before: page; }
            .page-break-before:first-child { break-before: auto; }
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
