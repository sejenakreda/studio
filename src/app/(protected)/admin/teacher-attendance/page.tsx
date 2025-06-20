
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"; 
import { Label } from "@/components/ui/label"; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, AlertCircle, CalendarCheck, User, CalendarDays, Search, Trash2, Edit, Filter } from "lucide-react";
import { 
  getAllUsersByRole, 
  addOrUpdateTeacherAttendance, 
  getTeacherAttendance, 
  getAllTeacherAttendanceRecords,
  deleteTeacherAttendance,
  addActivityLog 
} from '@/lib/firestoreService';
import type { UserProfile, TeacherAttendance } from '@/types';
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
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i); // Last 5 years

const attendanceSchema = z.object({
  teacherUid: z.string().min(1, "Guru harus dipilih"),
  year: z.coerce.number().min(2000, "Tahun tidak valid"),
  month: z.coerce.number().min(1).max(12),
  daysPresent: z.coerce.number().min(0, "Minimal 0").max(31, "Maksimal 31"),
  daysAbsentWithReason: z.coerce.number().min(0, "Minimal 0").max(31, "Maksimal 31"),
  daysAbsentWithoutReason: z.coerce.number().min(0, "Minimal 0").max(31, "Maksimal 31"),
  totalSchoolDaysInMonth: z.coerce.number().min(1, "Minimal 1").max(31, "Maksimal 31"),
  notes: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
});

type AttendanceFormData = z.infer<typeof attendanceSchema>;

export default function ManageTeacherAttendancePage() {
  const { toast } = useToast();
  const { userProfile: adminProfile } = useAuth();
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<TeacherAttendance[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null); 
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<TeacherAttendance | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [filterYear, setFilterYear] = useState<number>(currentYear);
  const [filterMonth, setFilterMonth] = useState<number | "all">(new Date().getMonth() + 1);
  const [filterTeacherUid, setFilterTeacherUid] = useState<string | "all">("all");


  const form = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      teacherUid: "",
      year: currentYear,
      month: new Date().getMonth() + 1,
      daysPresent: 0,
      daysAbsentWithReason: 0,
      daysAbsentWithoutReason: 0,
      totalSchoolDaysInMonth: 20, 
      notes: "",
    },
  });

  const watchedTeacherUid = form.watch("teacherUid");
  const watchedYear = form.watch("year");
  const watchedMonth = form.watch("month");

  const fetchTeachersList = useCallback(async () => {
    setIsLoadingTeachers(true);
    try {
      const guruUsers = await getAllUsersByRole('guru');
      setTeachers(guruUsers || []);
    } catch (error) {
      setFetchError("Gagal memuat daftar guru.");
      toast({ variant: "destructive", title: "Error", description: "Gagal memuat daftar guru." });
    } finally {
      setIsLoadingTeachers(false);
    }
  }, [toast]);

  const fetchAttendanceRecords = useCallback(async () => {
    setIsLoadingRecords(true);
    try {
      const filters = {
        year: filterYear,
        month: filterMonth === "all" ? undefined : filterMonth,
        teacherUid: filterTeacherUid === "all" ? undefined : filterTeacherUid,
      };
      const records = await getAllTeacherAttendanceRecords(filters);
      setAttendanceRecords(records);
    } catch (error) {
      setFetchError("Gagal memuat data kehadiran.");
      toast({ variant: "destructive", title: "Error", description: "Gagal memuat data kehadiran." });
    } finally {
      setIsLoadingRecords(false);
    }
  }, [toast, filterYear, filterMonth, filterTeacherUid]);


  useEffect(() => {
    fetchTeachersList();
    fetchAttendanceRecords();
  }, [fetchTeachersList, fetchAttendanceRecords]);
  
  useEffect(() => {
    const loadRecordForEditing = async () => {
      if (watchedTeacherUid && watchedYear && watchedMonth && !isEditing) { 
        form.reset({ 
          ...form.getValues(), 
          daysPresent: 0, daysAbsentWithReason: 0, daysAbsentWithoutReason: 0, 
          totalSchoolDaysInMonth: form.getValues('totalSchoolDaysInMonth') || 20, notes: "" 
        }); 

        const record = await getTeacherAttendance(watchedTeacherUid, watchedYear, watchedMonth);
        if (record) {
          form.reset({
            teacherUid: record.teacherUid,
            year: record.year,
            month: record.month,
            daysPresent: record.daysPresent,
            daysAbsentWithReason: record.daysAbsentWithReason,
            daysAbsentWithoutReason: record.daysAbsentWithoutReason,
            totalSchoolDaysInMonth: record.totalSchoolDaysInMonth,
            notes: record.notes || "",
          });
          setIsEditing(record.id || null); 
        } else {
          setIsEditing(null); 
        }
      }
    };
    loadRecordForEditing();
  }, [watchedTeacherUid, watchedYear, watchedMonth, form, isEditing]);


  const onSubmit = async (data: AttendanceFormData) => {
    if (!adminProfile?.uid) {
      toast({ variant: "destructive", title: "Error", description: "Sesi admin tidak valid." });
      return;
    }
    setIsSubmitting(true);
    try {
      const teacher = teachers.find(t => t.uid === data.teacherUid);
      const attendancePayload: Omit<TeacherAttendance, 'id' | 'recordedAt' | 'updatedAt'> = {
        ...data,
        teacherName: teacher?.displayName || data.teacherUid,
        recordedByUid: adminProfile.uid,
      };
      
      const savedRecord = await addOrUpdateTeacherAttendance(attendancePayload);
      
      toast({ title: "Sukses", description: `Rekap kehadiran guru ${teacher?.displayName || ''} untuk ${MONTHS.find(m=>m.value === data.month)?.label} ${data.year} berhasil ${isEditing ? 'diperbarui' : 'disimpan'}.` });
      
      await addActivityLog(
        `Rekap Kehadiran Guru ${isEditing ? 'Diperbarui' : 'Dicatat'} (Admin)`,
        `Guru: ${teacher?.displayName}, Periode: ${MONTHS.find(m=>m.value === data.month)?.label} ${data.year}. H:${data.daysPresent}, I/S:${data.daysAbsentWithReason}, A:${data.daysAbsentWithoutReason}. Oleh: ${adminProfile.displayName}`,
        adminProfile.uid,
        adminProfile.displayName || "Admin"
      );
      
      form.reset({ teacherUid: "", year: currentYear, month: new Date().getMonth() + 1, daysPresent: 0, daysAbsentWithReason: 0, daysAbsentWithoutReason: 0, totalSchoolDaysInMonth: 20, notes: "" });
      setIsEditing(null);
      fetchAttendanceRecords(); 
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || `Gagal menyimpan rekap kehadiran.` });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEditRecord = (record: TeacherAttendance) => {
    form.reset({
      teacherUid: record.teacherUid,
      year: record.year,
      month: record.month,
      daysPresent: record.daysPresent,
      daysAbsentWithReason: record.daysAbsentWithReason,
      daysAbsentWithoutReason: record.daysAbsentWithoutReason,
      totalSchoolDaysInMonth: record.totalSchoolDaysInMonth,
      notes: record.notes || "",
    });
    setIsEditing(record.id || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleDeleteConfirmation = (record: TeacherAttendance) => {
    setRecordToDelete(record);
  };

  const handleActualDelete = async () => {
    if (!recordToDelete || !recordToDelete.id || !adminProfile) return;
    setIsDeleting(true);
    try {
      await deleteTeacherAttendance(recordToDelete.id);
      await addActivityLog(
        "Data Rekap Kehadiran Guru Dihapus (Admin)",
        `Data untuk Guru: ${recordToDelete.teacherName}, Periode: ${MONTHS.find(m=>m.value === recordToDelete.month)?.label} ${recordToDelete.year} dihapus oleh Admin: ${adminProfile.displayName}`,
        adminProfile.uid,
        adminProfile.displayName || "Admin"
      );
      toast({ title: "Sukses", description: "Data rekap kehadiran berhasil dihapus." });
      setRecordToDelete(null);
      fetchAttendanceRecords();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Gagal menghapus data." });
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleResetForm = () => {
    form.reset({ teacherUid: "", year: currentYear, month: new Date().getMonth() + 1, daysPresent: 0, daysAbsentWithReason: 0, daysAbsentWithoutReason: 0, totalSchoolDaysInMonth: 20, notes: "" });
    setIsEditing(null);
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Admin">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Rekap Kehadiran Guru Bulanan (Manual Admin)</h1>
          <p className="text-muted-foreground">
            Catat dan kelola data rekapitulasi kehadiran guru per bulan.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Rekap Kehadiran Guru" : "Catat Rekap Kehadiran Guru Baru"}</CardTitle>
          <CardDescription>Pilih guru, periode, dan masukkan detail rekap kehadiran.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="teacherUid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pilih Guru</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingTeachers || isEditing !== null}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingTeachers ? "Memuat guru..." : "Pilih guru..."} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingTeachers ? (<SelectItem value="loading" disabled>Memuat...</SelectItem>) :
                           teachers.map(teacher => (
                            <SelectItem key={teacher.uid} value={teacher.uid}>{teacher.displayName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tahun</FormLabel>
                      <Select onValueChange={(val) => field.onChange(parseInt(val))} value={String(field.value)} disabled={isEditing !== null}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Pilih tahun..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {YEARS.map(year => (
                            <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="month"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bulan</FormLabel>
                      <Select onValueChange={(val) => field.onChange(parseInt(val))} value={String(field.value)} disabled={isEditing !== null}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Pilih bulan..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {MONTHS.map(month => (
                            <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <FormField control={form.control} name="daysPresent" render={({ field }) => (<FormItem><FormLabel>Hari Hadir</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="daysAbsentWithReason" render={({ field }) => (<FormItem><FormLabel>Izin/Sakit</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="daysAbsentWithoutReason" render={({ field }) => (<FormItem><FormLabel>Tanpa Keterangan (Alpa)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="totalSchoolDaysInMonth" render={({ field }) => (<FormItem><FormLabel>Total Hari Sekolah</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormDescription className="text-xs">Total hari sekolah di bulan ini.</FormDescription><FormMessage /></FormItem>)} />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catatan (Opsional)</FormLabel>
                    <FormControl><Textarea placeholder="Catatan tambahan jika ada..." {...field} rows={3} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isEditing ? "Simpan Perubahan" : "Simpan Rekap"}
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={handleResetForm}>
                  Batal Edit / Input Baru
                </Button>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Rekap Kehadiran Guru Bulanan</CardTitle>
          <CardDescription>Lihat dan kelola data rekap kehadiran yang sudah tersimpan (dicatat manual oleh Admin).</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-md bg-muted/30 items-end">
                 <div> 
                    <Label htmlFor="filter-teacher">Filter Guru</Label> 
                    <Select onValueChange={setFilterTeacherUid} value={filterTeacherUid} disabled={isLoadingTeachers}>
                        <SelectTrigger id="filter-teacher"><SelectValue placeholder={isLoadingTeachers ? "Memuat guru..." : "Pilih guru..."} /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Guru</SelectItem>
                            {isLoadingTeachers ? (<SelectItem value="loading" disabled>Memuat...</SelectItem>) :
                             teachers.map(teacher => (<SelectItem key={teacher.uid} value={teacher.uid}>{teacher.displayName}</SelectItem>))}
                        </SelectContent>
                    </Select>
                 </div>
                 <div> 
                    <Label htmlFor="filter-year">Filter Tahun</Label> 
                    <Select onValueChange={(v) => setFilterYear(parseInt(v))} value={String(filterYear)}>
                        <SelectTrigger id="filter-year"><SelectValue placeholder="Pilih tahun..." /></SelectTrigger>
                        <SelectContent>{YEARS.map(year => (<SelectItem key={year} value={String(year)}>{year}</SelectItem>))}</SelectContent>
                    </Select>
                 </div>
                 <div> 
                    <Label htmlFor="filter-month">Filter Bulan</Label> 
                    <Select onValueChange={(v) => setFilterMonth(v === "all" ? "all" : parseInt(v))} value={String(filterMonth)}>
                        <SelectTrigger id="filter-month"><SelectValue placeholder="Pilih bulan..." /></SelectTrigger>
                        <SelectContent><SelectItem value="all">Semua Bulan</SelectItem>{MONTHS.map(month => (<SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>))}</SelectContent>
                    </Select>
                 </div>
            </div>

          {fetchError && !isLoadingRecords && (<Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4" /><AlertTitle>Error Memuat Data</AlertTitle><AlertDescription>{fetchError}</AlertDescription></Alert>)}
          
          {isLoadingRecords ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => (<Skeleton key={i} className="h-12 w-full rounded-md" />))}</div>
          ) : attendanceRecords.length === 0 && !fetchError ? (
            <div className="flex flex-col items-center justify-center min-h-[150px] text-center p-6 border-2 border-dashed rounded-lg">
              <CalendarCheck className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">Belum Ada Data Rekap Kehadiran</h3>
              <p className="mt-1 text-sm text-muted-foreground">Belum ada data rekap kehadiran yang tercatat sesuai filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Guru</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-center">Hadir</TableHead>
                    <TableHead className="text-center">Izin/Sakit</TableHead>
                    <TableHead className="text-center">Alpa</TableHead>
                    <TableHead className="text-center">Total Hr Sekolah</TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.teacherName || record.teacherUid}</TableCell>
                      <TableCell>{MONTHS.find(m => m.value === record.month)?.label} {record.year}</TableCell>
                      <TableCell className="text-center">{record.daysPresent}</TableCell>
                      <TableCell className="text-center">{record.daysAbsentWithReason}</TableCell>
                      <TableCell className="text-center">{record.daysAbsentWithoutReason}</TableCell>
                      <TableCell className="text-center">{record.totalSchoolDaysInMonth}</TableCell>
                      <TableCell className="max-w-xs truncate" title={record.notes}>{record.notes || '-'}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditRecord(record)} title="Edit Data">
                            <Edit className="h-4 w-4" /> <span className="sr-only">Edit</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteConfirmation(record)} disabled={isDeleting && recordToDelete?.id === record.id} title="Hapus Data">
                            {isDeleting && recordToDelete?.id === record.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            <span className="sr-only">Hapus</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {recordToDelete && (
        <AlertDialog open={!!recordToDelete} onOpenChange={(isOpen) => !isOpen && setRecordToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Anda Yakin Ingin Menghapus Data Rekap Ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini akan menghapus data rekap kehadiran untuk guru <span className="font-semibold">{recordToDelete.teacherName}</span>
                pada periode {MONTHS.find(m=>m.value === recordToDelete.month)?.label} {recordToDelete.year}. Tindakan ini tidak dapat diurungkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRecordToDelete(null)} disabled={isDeleting}>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleActualDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Ya, Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

