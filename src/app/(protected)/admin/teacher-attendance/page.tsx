
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
// Removed useForm, zodResolver, z as monthly form is gone
// Removed MonthlyAttendanceFormData type
import { format } from "date-fns";
import { id as indonesiaLocale } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Removed Input, Textarea, Form related components for monthly form
import { Label } from "@/components/ui/label"; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, AlertCircle, Users, History, Trash2, Edit } from "lucide-react";
import { 
  getAllUsersByRole, 
  getAllTeachersDailyAttendanceForPeriod, 
  deleteTeacherDailyAttendance, 
  addActivityLog 
} from '@/lib/firestoreService';
import type { UserProfile, TeacherDailyAttendance } from '@/types'; // Removed TeacherAttendance
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';
// Removed Timestamp as it was mainly for monthly form's serverTimestamp
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

// Removed monthlyAttendanceSchema and MonthlyAttendanceFormData

export default function ManageTeacherAttendancePage() {
  const { toast } = useToast();
  const { userProfile: adminProfile } = useAuth();
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  
  // Removed states for Manual Monthly Rekap
  // const [monthlyRecords, setMonthlyRecords] = useState<TeacherAttendance[]>([]);
  // const [isLoadingMonthlyRecords, setIsLoadingMonthlyRecords] = useState(false);
  // const [isSubmittingMonthly, setIsSubmittingMonthly] = useState(false);
  // const [isEditingMonthly, setIsEditingMonthly] = useState<string | null>(null); 
  // const [monthlyRecordToDelete, setMonthlyRecordToDelete] = useState<TeacherAttendance | null>(null);
  // const [isDeletingMonthly, setIsDeletingMonthly] = useState(false);
  // const [monthlyFilterYear, setMonthlyFilterYear] = useState<number>(currentYear);
  // const [monthlyFilterMonth, setMonthlyFilterMonth] = useState<number | "all">(new Date().getMonth() + 1);
  // const [monthlyFilterTeacherUid, setMonthlyFilterTeacherUid] = useState<string | "all">("all");

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

  // Removed monthlyForm and its related useEffects
  
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

  // Removed fetchMonthlyAttendanceRecords

  const fetchDailyAttendanceRecords = useCallback(async () => {
    setIsLoadingDailyRecords(true);
    setFetchError(null); // Clear previous fetch errors for daily records specifically
    try {
      let records: TeacherDailyAttendance[] = [];
      // Ensure month is valid before fetching
      const monthToFetch = dailyFilterMonth === "all" ? (new Date().getMonth() +1) : dailyFilterMonth;

      if (dailyFilterTeacherUid === "all") {
        records = await getAllTeachersDailyAttendanceForPeriod(dailyFilterYear, monthToFetch);
      } else if (dailyFilterTeacherUid) { 
        // Assuming getTeacherDailyAttendanceForMonth exists and works for specific teacher
        // This part might need a specific function if `getAllTeachersDailyAttendanceForPeriod` doesn't filter by teacher
        // For now, let's assume admin wants to see all records for a month and then filter visually,
        // or we need a new service function: getTeacherDailyAttendanceForPeriodAndTeacher(teacherUid, year, month)
        // For simplicity, we'll fetch all for the period and let admin use the client-side filter for teacher name
        const allRecordsForPeriod = await getAllTeachersDailyAttendanceForPeriod(dailyFilterYear, monthToFetch);
        records = allRecordsForPeriod.filter(rec => rec.teacherUid === dailyFilterTeacherUid);
      }
      setDailyRecords(records);
    } catch (error) {
      setFetchError("Gagal memuat data kehadiran harian guru.");
      toast({ variant: "destructive", title: "Error", description: "Gagal memuat data kehadiran harian." });
      setDailyRecords([]);
    } finally {
      setIsLoadingDailyRecords(false);
    }
  }, [toast, dailyFilterYear, dailyFilterMonth, dailyFilterTeacherUid]);

  useEffect(() => { fetchTeachersList(); }, [fetchTeachersList]);
  // Removed useEffect for monthly records
  useEffect(() => { fetchDailyAttendanceRecords(); }, [fetchDailyAttendanceRecords]);
  
  // Removed onMonthlySubmit, handleEditMonthlyRecord, handleDeleteMonthlyConfirmation, handleActualMonthlyDelete, handleResetMonthlyForm

  const handleDeleteDailyConfirmation = (record: TeacherDailyAttendance) => { setDailyRecordToDelete(record); };
  const handleActualDailyDelete = async () => {
    if (!dailyRecordToDelete || !dailyRecordToDelete.id || !adminProfile) return;
    setIsDeletingDaily(true);
    try {
      await deleteTeacherDailyAttendance(dailyRecordToDelete.id);
      await addActivityLog("Data Kehadiran Harian Guru Dihapus (Admin)", `Data harian Guru: ${dailyRecordToDelete.teacherName}, Tgl: ${format(dailyRecordToDelete.date.toDate(), "yyyy-MM-dd")} dihapus oleh Admin: ${adminProfile.displayName}`, adminProfile.uid, adminProfile.displayName || "Admin");
      toast({ title: "Sukses", description: "Data kehadiran harian berhasil dihapus." });
      setDailyRecordToDelete(null); fetchDailyAttendanceRecords(); 
    } catch (error: any) { toast({ variant: "destructive", title: "Error", description: "Gagal menghapus data kehadiran harian." });
    } finally { setIsDeletingDaily(false); }
  };

  const handleEditDailyRecord = (record: TeacherDailyAttendance) => {
      toast({ title: "Info", description: "Fitur edit kehadiran harian oleh Admin akan segera tersedia. Gunakan Hapus jika ada kesalahan."});
      // Future: Open a dialog or navigate to an edit form for 'record'
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div><h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Kelola Kehadiran Harian Guru</h1>
          <p className="text-muted-foreground">Lihat dan kelola data kehadiran harian yang dicatat oleh guru.</p>
        </div>
      </div>

      {/* Removed Manual Monthly Rekap Card */}

      <Card>
        <CardHeader>
          <CardTitle>Daftar Kehadiran Harian (Dicatat Guru)</CardTitle>
          <CardDescription>Lihat dan kelola data kehadiran harian yang dicatat oleh masing-masing guru.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-md bg-muted/30 items-end">
            <div><Label htmlFor="filter-daily-teacher">Filter Guru</Label><Select onValueChange={setDailyFilterTeacherUid} value={dailyFilterTeacherUid} disabled={isLoadingTeachers}><SelectTrigger id="filter-daily-teacher"><SelectValue placeholder={isLoadingTeachers ? "Memuat..." : "Pilih guru..."} /></SelectTrigger><SelectContent><SelectItem value="all">Semua Guru</SelectItem>{isLoadingTeachers ? (<SelectItem value="loading" disabled>Memuat...</SelectItem>) : teachers.map(t => (<SelectItem key={t.uid} value={t.uid}>{t.displayName}</SelectItem>))}</SelectContent></Select></div>
            <div><Label htmlFor="filter-daily-year">Filter Tahun</Label><Select onValueChange={(v) => setDailyFilterYear(parseInt(v))} value={String(dailyFilterYear)}><SelectTrigger id="filter-daily-year"><SelectValue placeholder="Pilih tahun..." /></SelectTrigger><SelectContent>{YEARS.map(y => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}</SelectContent></Select></div>
            <div><Label htmlFor="filter-daily-month">Filter Bulan</Label><Select onValueChange={(v) => setDailyFilterMonth(v === "all" ? "all" : parseInt(v))} value={String(dailyFilterMonth)}><SelectTrigger id="filter-daily-month"><SelectValue placeholder="Pilih bulan..." /></SelectTrigger><SelectContent><SelectItem value="all">Semua Bulan (Tahun Dipilih)</SelectItem>{MONTHS.map(m => (<SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>))}</SelectContent></Select></div>
          </div>
          {fetchError && !isLoadingDailyRecords && (<Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{fetchError}</AlertDescription></Alert>)}
          {isLoadingDailyRecords ? (<div className="space-y-2">{[...Array(3)].map((_, i) => (<Skeleton key={i} className="h-12 w-full rounded-md" />))}</div>)
           : dailyRecords.length === 0 && !fetchError ? (<div className="text-center p-6 border-2 border-dashed rounded-lg"><Users className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-2 text-sm font-medium">Belum Ada Data Kehadiran Harian</h3><p className="mt-1 text-sm text-muted-foreground">Belum ada data kehadiran harian guru yang cocok dengan filter ini, atau guru belum mencatat kehadiran.</p></div>)
           : (<div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Nama Guru</TableHead><TableHead>Tanggal</TableHead><TableHead>Status</TableHead><TableHead>Catatan</TableHead><TableHead>Dicatat Pada</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader><TableBody>{dailyRecords.map((rec) => (<TableRow key={rec.id}><TableCell className="font-medium">{rec.teacherName || rec.teacherUid}</TableCell><TableCell>{format(rec.date.toDate(), "dd MMM yyyy", { locale: indonesiaLocale })}</TableCell><TableCell>{rec.status}</TableCell><TableCell className="max-w-xs truncate" title={rec.notes}>{rec.notes || '-'}</TableCell><TableCell>{rec.recordedAt ? format(rec.recordedAt.toDate(), "dd MMM yyyy, HH:mm", { locale: indonesiaLocale }) : '-'}</TableCell><TableCell className="text-right space-x-1"><Button variant="outline" size="icon" onClick={() => handleEditDailyRecord(rec)} title="Edit Kehadiran Harian (Admin)"><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteDailyConfirmation(rec)} disabled={isDeletingDaily && dailyRecordToDelete?.id === rec.id} title="Hapus"><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>))}</TableBody></Table></div>)
          }
        </CardContent>
      </Card>

      {/* Removed Monthly Record Delete Dialog */}
      {dailyRecordToDelete && (<AlertDialog open={!!dailyRecordToDelete} onOpenChange={(isOpen) => !isOpen && setDailyRecordToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Yakin Hapus Kehadiran Harian Ini?</AlertDialogTitle><AlertDialogDescription>Kehadiran guru <span className="font-semibold">{dailyRecordToDelete.teacherName}</span> tanggal {format(dailyRecordToDelete.date.toDate(), "PPP", { locale: indonesiaLocale })} akan dihapus. Ini tidak dapat diurungkan.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setDailyRecordToDelete(null)} disabled={isDeletingDaily}>Batal</AlertDialogCancel><AlertDialogAction onClick={handleActualDailyDelete} disabled={isDeletingDaily} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">{isDeletingDaily ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Ya, Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
    </div>
  );
}

