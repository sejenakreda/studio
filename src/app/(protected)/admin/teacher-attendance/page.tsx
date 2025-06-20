
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { id as indonesiaLocale } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"; 
import { Label } from "@/components/ui/label"; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, AlertCircle, CalendarCheck, User, CalendarDays, Trash2, Edit, Users, History } from "lucide-react";
import { 
  getAllUsersByRole, 
  addOrUpdateTeacherAttendance, 
  getTeacherAttendance, 
  getAllTeacherAttendanceRecords, // For monthly rekap
  deleteTeacherAttendance, // For monthly rekap
  getAllTeachersDailyAttendanceForPeriod, // For daily from guru
  deleteTeacherDailyAttendance, // For daily from guru
  addActivityLog 
} from '@/lib/firestoreService';
import type { UserProfile, TeacherAttendance, TeacherDailyAttendance } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';
import { Timestamp } from 'firebase/firestore';
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

const MONTHS = [
  { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' }, { value: 3, label: 'Maret' },
  { value: 4, label: 'April' }, { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' }, { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' }, { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

const monthlyAttendanceSchema = z.object({
  teacherUid: z.string().min(1, "Guru harus dipilih"),
  year: z.coerce.number().min(2000, "Tahun tidak valid"),
  month: z.coerce.number().min(1).max(12),
  daysPresent: z.coerce.number().min(0, "Minimal 0").max(31, "Maksimal 31"),
  daysAbsentWithReason: z.coerce.number().min(0, "Minimal 0").max(31, "Maksimal 31"),
  daysAbsentWithoutReason: z.coerce.number().min(0, "Minimal 0").max(31, "Maksimal 31"),
  totalSchoolDaysInMonth: z.coerce.number().min(1, "Minimal 1").max(31, "Maksimal 31"),
  notes: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
});
type MonthlyAttendanceFormData = z.infer<typeof monthlyAttendanceSchema>;

export default function ManageTeacherAttendancePage() {
  const { toast } = useToast();
  const { userProfile: adminProfile } = useAuth();
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  
  // States for Manual Monthly Rekap
  const [monthlyRecords, setMonthlyRecords] = useState<TeacherAttendance[]>([]);
  const [isLoadingMonthlyRecords, setIsLoadingMonthlyRecords] = useState(false);
  const [isSubmittingMonthly, setIsSubmittingMonthly] = useState(false);
  const [isEditingMonthly, setIsEditingMonthly] = useState<string | null>(null); 
  const [monthlyRecordToDelete, setMonthlyRecordToDelete] = useState<TeacherAttendance | null>(null);
  const [isDeletingMonthly, setIsDeletingMonthly] = useState(false);
  const [monthlyFilterYear, setMonthlyFilterYear] = useState<number>(currentYear);
  const [monthlyFilterMonth, setMonthlyFilterMonth] = useState<number | "all">(new Date().getMonth() + 1);
  const [monthlyFilterTeacherUid, setMonthlyFilterTeacherUid] = useState<string | "all">("all");

  // States for Daily Attendance by Guru
  const [dailyRecords, setDailyRecords] = useState<TeacherDailyAttendance[]>([]);
  const [isLoadingDailyRecords, setIsLoadingDailyRecords] = useState(false);
  const [dailyRecordToDelete, setDailyRecordToDelete] = useState<TeacherDailyAttendance | null>(null);
  const [isDeletingDaily, setIsDeletingDaily] = useState(false);
  const [dailyFilterYear, setDailyFilterYear] = useState<number>(currentYear);
  const [dailyFilterMonth, setDailyFilterMonth] = useState<number | "all">(new Date().getMonth() + 1);
  const [dailyFilterTeacherUid, setDailyFilterTeacherUid] = useState<string | "all">("all");
  
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const monthlyForm = useForm<MonthlyAttendanceFormData>({
    resolver: zodResolver(monthlyAttendanceSchema),
    defaultValues: { teacherUid: "", year: currentYear, month: new Date().getMonth() + 1, daysPresent: 0, daysAbsentWithReason: 0, daysAbsentWithoutReason: 0, totalSchoolDaysInMonth: 20, notes: "" },
  });
  
  const watchedMonthlyTeacherUid = monthlyForm.watch("teacherUid");
  const watchedMonthlyYear = monthlyForm.watch("year");
  const watchedMonthlyMonth = monthlyForm.watch("month");

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

  const fetchMonthlyAttendanceRecords = useCallback(async () => {
    setIsLoadingMonthlyRecords(true);
    try {
      const filters = { year: monthlyFilterYear, month: monthlyFilterMonth === "all" ? undefined : monthlyFilterMonth, teacherUid: monthlyFilterTeacherUid === "all" ? undefined : monthlyFilterTeacherUid };
      const records = await getAllTeacherAttendanceRecords(filters);
      setMonthlyRecords(records);
    } catch (error) { setFetchError("Gagal memuat data rekap bulanan."); toast({ variant: "destructive", title: "Error", description: "Gagal memuat data rekap bulanan." });
    } finally { setIsLoadingMonthlyRecords(false); }
  }, [toast, monthlyFilterYear, monthlyFilterMonth, monthlyFilterTeacherUid]);

  const fetchDailyAttendanceRecords = useCallback(async () => {
    setIsLoadingDailyRecords(true);
    try {
      let records: TeacherDailyAttendance[] = [];
      if (dailyFilterTeacherUid === "all") {
        // Fetch for all teachers for the given month and year
        records = await getAllTeachersDailyAttendanceForPeriod(dailyFilterYear, dailyFilterMonth === "all" ? (new Date().getMonth() +1) : dailyFilterMonth);
      } else if (dailyFilterTeacherUid && dailyFilterMonth !== "all") {
        // Fetch for specific teacher, month, and year
        records = await getTeacherDailyAttendanceForMonth(dailyFilterTeacherUid, dailyFilterYear, dailyFilterMonth);
      }
      // If month is "all" for a specific teacher, it might be too much data, so we might not fetch or provide specific UI.
      // For now, only enable full fetch if month is selected or all teachers for a specific month.
      setDailyRecords(records);
    } catch (error) {
      setFetchError("Gagal memuat data kehadiran harian guru.");
      toast({ variant: "destructive", title: "Error", description: "Gagal memuat data kehadiran harian." });
    } finally {
      setIsLoadingDailyRecords(false);
    }
  }, [toast, dailyFilterYear, dailyFilterMonth, dailyFilterTeacherUid]);

  useEffect(() => { fetchTeachersList(); }, [fetchTeachersList]);
  useEffect(() => { fetchMonthlyAttendanceRecords(); }, [fetchMonthlyAttendanceRecords]);
  useEffect(() => { fetchDailyAttendanceRecords(); }, [fetchDailyAttendanceRecords]);
  
  useEffect(() => {
    const loadMonthlyRecordForEditing = async () => {
      if (watchedMonthlyTeacherUid && watchedMonthlyYear && watchedMonthlyMonth && !isEditingMonthly) { 
        monthlyForm.reset({ ...monthlyForm.getValues(), daysPresent: 0, daysAbsentWithReason: 0, daysAbsentWithoutReason: 0, totalSchoolDaysInMonth: monthlyForm.getValues('totalSchoolDaysInMonth') || 20, notes: "" }); 
        const record = await getTeacherAttendance(watchedMonthlyTeacherUid, watchedMonthlyYear, watchedMonthlyMonth);
        if (record) { monthlyForm.reset({ teacherUid: record.teacherUid, year: record.year, month: record.month, daysPresent: record.daysPresent, daysAbsentWithReason: record.daysAbsentWithReason, daysAbsentWithoutReason: record.daysAbsentWithoutReason, totalSchoolDaysInMonth: record.totalSchoolDaysInMonth, notes: record.notes || "" }); setIsEditingMonthly(record.id || null); 
        } else { setIsEditingMonthly(null); }
      }
    };
    loadMonthlyRecordForEditing();
  }, [watchedMonthlyTeacherUid, watchedMonthlyYear, watchedMonthlyMonth, monthlyForm, isEditingMonthly]);

  const onMonthlySubmit = async (data: MonthlyAttendanceFormData) => {
    if (!adminProfile?.uid) { toast({ variant: "destructive", title: "Error", description: "Sesi admin tidak valid." }); return; }
    setIsSubmittingMonthly(true);
    try {
      const teacher = teachers.find(t => t.uid === data.teacherUid);
      const attendancePayload: Omit<TeacherAttendance, 'id' | 'recordedAt' | 'updatedAt'> = { ...data, teacherName: teacher?.displayName || data.teacherUid, recordedByUid: adminProfile.uid };
      await addOrUpdateTeacherAttendance(attendancePayload);
      toast({ title: "Sukses", description: `Rekap bulanan guru ${teacher?.displayName || ''} untuk ${MONTHS.find(m=>m.value === data.month)?.label} ${data.year} berhasil ${isEditingMonthly ? 'diperbarui' : 'disimpan'}.` });
      await addActivityLog(`Rekap Bulanan Guru ${isEditingMonthly ? 'Diperbarui' : 'Dicatat'} (Admin)`, `Guru: ${teacher?.displayName}, Periode: ${MONTHS.find(m=>m.value === data.month)?.label} ${data.year}. H:${data.daysPresent}, I/S:${data.daysAbsentWithReason}, A:${data.daysAbsentWithoutReason}. Oleh: ${adminProfile.displayName}`, adminProfile.uid, adminProfile.displayName || "Admin");
      monthlyForm.reset({ teacherUid: "", year: currentYear, month: new Date().getMonth() + 1, daysPresent: 0, daysAbsentWithReason: 0, daysAbsentWithoutReason: 0, totalSchoolDaysInMonth: 20, notes: "" });
      setIsEditingMonthly(null);
      fetchMonthlyAttendanceRecords(); 
    } catch (error: any) { toast({ variant: "destructive", title: "Error", description: error.message || `Gagal menyimpan rekap bulanan.` });
    } finally { setIsSubmittingMonthly(false); }
  };
  
  const handleEditMonthlyRecord = (record: TeacherAttendance) => {
    monthlyForm.reset({ teacherUid: record.teacherUid, year: record.year, month: record.month, daysPresent: record.daysPresent, daysAbsentWithReason: record.daysAbsentWithReason, daysAbsentWithoutReason: record.daysAbsentWithoutReason, totalSchoolDaysInMonth: record.totalSchoolDaysInMonth, notes: record.notes || "" });
    setIsEditingMonthly(record.id || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleDeleteMonthlyConfirmation = (record: TeacherAttendance) => { setMonthlyRecordToDelete(record); };
  const handleActualMonthlyDelete = async () => {
    if (!monthlyRecordToDelete || !monthlyRecordToDelete.id || !adminProfile) return;
    setIsDeletingMonthly(true);
    try {
      await deleteTeacherAttendance(monthlyRecordToDelete.id);
      await addActivityLog("Data Rekap Bulanan Guru Dihapus (Admin)", `Data untuk Guru: ${monthlyRecordToDelete.teacherName}, Periode: ${MONTHS.find(m=>m.value === monthlyRecordToDelete.month)?.label} ${monthlyRecordToDelete.year} dihapus oleh Admin: ${adminProfile.displayName}`, adminProfile.uid, adminProfile.displayName || "Admin");
      toast({ title: "Sukses", description: "Data rekap bulanan berhasil dihapus." });
      setMonthlyRecordToDelete(null); fetchMonthlyAttendanceRecords();
    } catch (error: any) { toast({ variant: "destructive", title: "Error", description: "Gagal menghapus data rekap bulanan." });
    } finally { setIsDeletingMonthly(false); }
  };
  const handleResetMonthlyForm = () => {
    monthlyForm.reset({ teacherUid: "", year: currentYear, month: new Date().getMonth() + 1, daysPresent: 0, daysAbsentWithReason: 0, daysAbsentWithoutReason: 0, totalSchoolDaysInMonth: 20, notes: "" });
    setIsEditingMonthly(null);
  };

  const handleDeleteDailyConfirmation = (record: TeacherDailyAttendance) => { setDailyRecordToDelete(record); };
  const handleActualDailyDelete = async () => {
    if (!dailyRecordToDelete || !dailyRecordToDelete.id || !adminProfile) return;
    setIsDeletingDaily(true);
    try {
      await deleteTeacherDailyAttendance(dailyRecordToDelete.id);
      await addActivityLog("Data Kehadiran Harian Guru Dihapus (Admin)", `Data harian Guru: ${dailyRecordToDelete.teacherName}, Tgl: ${format(dailyRecordToDelete.date.toDate(), "yyyy-MM-dd")} dihapus oleh Admin: ${adminProfile.displayName}`, adminProfile.uid, adminProfile.displayName || "Admin");
      toast({ title: "Sukses", description: "Data kehadiran harian berhasil dihapus." });
      setDailyRecordToDelete(null); fetchDailyAttendanceRecords(); // Refresh list
    } catch (error: any) { toast({ variant: "destructive", title: "Error", description: "Gagal menghapus data kehadiran harian." });
    } finally { setIsDeletingDaily(false); }
  };

  // Placeholder for Admin Edit Daily - Can be implemented later
  const handleEditDailyRecord = (record: TeacherDailyAttendance) => {
      toast({ title: "Info", description: "Fitur edit kehadiran harian oleh Admin belum tersedia. Gunakan Hapus jika perlu."});
      // Later: Open a dialog or navigate to an edit form for 'record'
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div><h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Kelola Rekap Kehadiran Guru</h1>
          <p className="text-muted-foreground">Catat rekap bulanan manual atau lihat & kelola data kehadiran harian yang dicatat guru.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>{isEditingMonthly ? "Edit Rekap Bulanan Guru (Manual Admin)" : "Catat Rekap Kehadiran Guru Bulanan (Manual Admin)"}</CardTitle><CardDescription>Pilih guru, periode, dan masukkan detail rekap kehadiran bulanan.</CardDescription></CardHeader>
        <Form {...monthlyForm}>
          <form onSubmit={monthlyForm.handleSubmit(onMonthlySubmit)}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={monthlyForm.control} name="teacherUid" render={({ field }) => (<FormItem><FormLabel>Pilih Guru</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isLoadingTeachers || isEditingMonthly !== null}><FormControl><SelectTrigger><SelectValue placeholder={isLoadingTeachers ? "Memuat guru..." : "Pilih guru..."} /></SelectTrigger></FormControl><SelectContent>{isLoadingTeachers ? (<SelectItem value="loading" disabled>Memuat...</SelectItem>) : teachers.map(teacher => (<SelectItem key={teacher.uid} value={teacher.uid}>{teacher.displayName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={monthlyForm.control} name="year" render={({ field }) => (<FormItem><FormLabel>Tahun</FormLabel><Select onValueChange={(val) => field.onChange(parseInt(val))} value={String(field.value)} disabled={isEditingMonthly !== null}><FormControl><SelectTrigger><SelectValue placeholder="Pilih tahun..." /></SelectTrigger></FormControl><SelectContent>{YEARS.map(year => (<SelectItem key={year} value={String(year)}>{year}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={monthlyForm.control} name="month" render={({ field }) => (<FormItem><FormLabel>Bulan</FormLabel><Select onValueChange={(val) => field.onChange(parseInt(val))} value={String(field.value)} disabled={isEditingMonthly !== null}><FormControl><SelectTrigger><SelectValue placeholder="Pilih bulan..." /></SelectTrigger></FormControl><SelectContent>{MONTHS.map(month => (<SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <FormField control={monthlyForm.control} name="daysPresent" render={({ field }) => (<FormItem><FormLabel>Hari Hadir</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={monthlyForm.control} name="daysAbsentWithReason" render={({ field }) => (<FormItem><FormLabel>Izin/Sakit</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={monthlyForm.control} name="daysAbsentWithoutReason" render={({ field }) => (<FormItem><FormLabel>Tanpa Keterangan (Alpa)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={monthlyForm.control} name="totalSchoolDaysInMonth" render={({ field }) => (<FormItem><FormLabel>Total Hari Sekolah</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormDescription className="text-xs">Total hari sekolah di bulan ini.</FormDescription><FormMessage /></FormItem>)} />
              </div>
              <FormField control={monthlyForm.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Catatan (Opsional)</FormLabel><FormControl><Textarea placeholder="Catatan tambahan jika ada..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>)}/>
            </CardContent>
            <CardFooter className="gap-2">
              <Button type="submit" disabled={isSubmittingMonthly}>{isSubmittingMonthly ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{isEditingMonthly ? "Simpan Perubahan" : "Simpan Rekap Bulanan"}</Button>
              {isEditingMonthly && (<Button type="button" variant="outline" onClick={handleResetMonthlyForm}>Batal Edit / Input Baru</Button>)}
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader><CardTitle>Rekap Kehadiran Bulanan Guru (Manual Admin)</CardTitle><CardDescription>Lihat dan kelola data rekap bulanan yang sudah dicatat manual oleh Admin.</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-md bg-muted/30 items-end">
            <div><Label htmlFor="filter-monthly-teacher">Filter Guru</Label><Select onValueChange={setMonthlyFilterTeacherUid} value={monthlyFilterTeacherUid} disabled={isLoadingTeachers}><SelectTrigger id="filter-monthly-teacher"><SelectValue placeholder={isLoadingTeachers ? "Memuat..." : "Pilih guru..."} /></SelectTrigger><SelectContent><SelectItem value="all">Semua Guru</SelectItem>{isLoadingTeachers ? (<SelectItem value="loading" disabled>Memuat...</SelectItem>) : teachers.map(t => (<SelectItem key={t.uid} value={t.uid}>{t.displayName}</SelectItem>))}</SelectContent></Select></div>
            <div><Label htmlFor="filter-monthly-year">Filter Tahun</Label><Select onValueChange={(v) => setMonthlyFilterYear(parseInt(v))} value={String(monthlyFilterYear)}><SelectTrigger id="filter-monthly-year"><SelectValue placeholder="Pilih tahun..." /></SelectTrigger><SelectContent>{YEARS.map(y => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}</SelectContent></Select></div>
            <div><Label htmlFor="filter-monthly-month">Filter Bulan</Label><Select onValueChange={(v) => setMonthlyFilterMonth(v === "all" ? "all" : parseInt(v))} value={String(monthlyFilterMonth)}><SelectTrigger id="filter-monthly-month"><SelectValue placeholder="Pilih bulan..." /></SelectTrigger><SelectContent><SelectItem value="all">Semua Bulan</SelectItem>{MONTHS.map(m => (<SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>))}</SelectContent></Select></div>
          </div>
          {fetchError && !isLoadingMonthlyRecords && (<Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{fetchError}</AlertDescription></Alert>)}
          {isLoadingMonthlyRecords ? (<div className="space-y-2">{[...Array(3)].map((_, i) => (<Skeleton key={i} className="h-12 w-full rounded-md" />))}</div>)
           : monthlyRecords.length === 0 && !fetchError ? (<div className="text-center p-6 border-2 border-dashed rounded-lg"><CalendarCheck className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-2 text-sm font-medium">Belum Ada Data Rekap Bulanan</h3><p className="mt-1 text-sm text-muted-foreground">Belum ada data rekap bulanan yang cocok dengan filter.</p></div>)
           : (<div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Nama Guru</TableHead><TableHead>Periode</TableHead><TableHead className="text-center">Hadir</TableHead><TableHead className="text-center">Izin/Sakit</TableHead><TableHead className="text-center">Alpa</TableHead><TableHead className="text-center">Total Hr Sekolah</TableHead><TableHead>Catatan</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader><TableBody>{monthlyRecords.map((rec) => (<TableRow key={rec.id}><TableCell className="font-medium">{rec.teacherName || rec.teacherUid}</TableCell><TableCell>{MONTHS.find(m => m.value === rec.month)?.label} {rec.year}</TableCell><TableCell className="text-center">{rec.daysPresent}</TableCell><TableCell className="text-center">{rec.daysAbsentWithReason}</TableCell><TableCell className="text-center">{rec.daysAbsentWithoutReason}</TableCell><TableCell className="text-center">{rec.totalSchoolDaysInMonth}</TableCell><TableCell className="max-w-xs truncate" title={rec.notes}>{rec.notes || '-'}</TableCell><TableCell className="text-right space-x-1"><Button variant="ghost" size="icon" onClick={() => handleEditMonthlyRecord(rec)} title="Edit"><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteMonthlyConfirmation(rec)} disabled={isDeletingMonthly && monthlyRecordToDelete?.id === rec.id} title="Hapus"><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>))}</TableBody></Table></div>)
          }
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Daftar Kehadiran Harian (Dicatat Guru)</CardTitle><CardDescription>Lihat dan kelola data kehadiran harian yang dicatat oleh masing-masing guru.</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-md bg-muted/30 items-end">
            <div><Label htmlFor="filter-daily-teacher">Filter Guru</Label><Select onValueChange={setDailyFilterTeacherUid} value={dailyFilterTeacherUid} disabled={isLoadingTeachers}><SelectTrigger id="filter-daily-teacher"><SelectValue placeholder={isLoadingTeachers ? "Memuat..." : "Pilih guru..."} /></SelectTrigger><SelectContent><SelectItem value="all">Semua Guru</SelectItem>{isLoadingTeachers ? (<SelectItem value="loading" disabled>Memuat...</SelectItem>) : teachers.map(t => (<SelectItem key={t.uid} value={t.uid}>{t.displayName}</SelectItem>))}</SelectContent></Select></div>
            <div><Label htmlFor="filter-daily-year">Filter Tahun</Label><Select onValueChange={(v) => setDailyFilterYear(parseInt(v))} value={String(dailyFilterYear)}><SelectTrigger id="filter-daily-year"><SelectValue placeholder="Pilih tahun..." /></SelectTrigger><SelectContent>{YEARS.map(y => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}</SelectContent></Select></div>
            <div><Label htmlFor="filter-daily-month">Filter Bulan</Label><Select onValueChange={(v) => setDailyFilterMonth(v === "all" ? "all" : parseInt(v))} value={String(dailyFilterMonth)}><SelectTrigger id="filter-daily-month"><SelectValue placeholder="Pilih bulan..." /></SelectTrigger><SelectContent><SelectItem value="all">Semua Bulan</SelectItem>{MONTHS.map(m => (<SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>))}</SelectContent></Select></div>
          </div>
          {fetchError && !isLoadingDailyRecords && (<Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{fetchError}</AlertDescription></Alert>)}
          {isLoadingDailyRecords ? (<div className="space-y-2">{[...Array(3)].map((_, i) => (<Skeleton key={i} className="h-12 w-full rounded-md" />))}</div>)
           : dailyRecords.length === 0 && !fetchError ? (<div className="text-center p-6 border-2 border-dashed rounded-lg"><Users className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-2 text-sm font-medium">Belum Ada Data Kehadiran Harian</h3><p className="mt-1 text-sm text-muted-foreground">Belum ada data kehadiran harian guru yang cocok dengan filter ini.</p></div>)
           : (<div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Nama Guru</TableHead><TableHead>Tanggal</TableHead><TableHead>Status</TableHead><TableHead>Catatan</TableHead><TableHead>Dicatat Pada</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader><TableBody>{dailyRecords.map((rec) => (<TableRow key={rec.id}><TableCell className="font-medium">{rec.teacherName || rec.teacherUid}</TableCell><TableCell>{format(rec.date.toDate(), "dd MMM yyyy", { locale: indonesiaLocale })}</TableCell><TableCell>{rec.status}</TableCell><TableCell className="max-w-xs truncate" title={rec.notes}>{rec.notes || '-'}</TableCell><TableCell>{rec.recordedAt ? format(rec.recordedAt.toDate(), "dd MMM yyyy, HH:mm", { locale: indonesiaLocale }) : '-'}</TableCell><TableCell className="text-right space-x-1"><Button variant="outline" size="icon" onClick={() => handleEditDailyRecord(rec)} title="Edit Kehadiran Harian (Admin)"><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteDailyConfirmation(rec)} disabled={isDeletingDaily && dailyRecordToDelete?.id === rec.id} title="Hapus"><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>))}</TableBody></Table></div>)
          }
        </CardContent>
      </Card>

      {monthlyRecordToDelete && (<AlertDialog open={!!monthlyRecordToDelete} onOpenChange={(isOpen) => !isOpen && setMonthlyRecordToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Yakin Hapus Rekap Bulanan Ini?</AlertDialogTitle><AlertDialogDescription>Rekap kehadiran untuk guru <span className="font-semibold">{monthlyRecordToDelete.teacherName}</span> periode {MONTHS.find(m=>m.value === monthlyRecordToDelete.month)?.label} {monthlyRecordToDelete.year} akan dihapus. Ini tidak dapat diurungkan.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setMonthlyRecordToDelete(null)} disabled={isDeletingMonthly}>Batal</AlertDialogCancel><AlertDialogAction onClick={handleActualMonthlyDelete} disabled={isDeletingMonthly} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">{isDeletingMonthly ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Ya, Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
      {dailyRecordToDelete && (<AlertDialog open={!!dailyRecordToDelete} onOpenChange={(isOpen) => !isOpen && setDailyRecordToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Yakin Hapus Kehadiran Harian Ini?</AlertDialogTitle><AlertDialogDescription>Kehadiran guru <span className="font-semibold">{dailyRecordToDelete.teacherName}</span> tanggal {format(dailyRecordToDelete.date.toDate(), "PPP", { locale: indonesiaLocale })} akan dihapus. Ini tidak dapat diurungkan.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setDailyRecordToDelete(null)} disabled={isDeletingDaily}>Batal</AlertDialogCancel><AlertDialogAction onClick={handleActualDailyDelete} disabled={isDeletingDaily} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">{isDeletingDaily ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Ya, Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
    </div>
  );
}

