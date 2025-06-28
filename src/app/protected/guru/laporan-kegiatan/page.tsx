
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, PlusCircle, Loader2, AlertCircle, BookOpen, Trash2, Edit, CalendarDays, Award } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';
import { addLaporanKegiatan, getLaporanKegiatanByActivity, deleteLaporanKegiatan, updateLaporanKegiatan, addActivityLog } from '@/lib/firestoreService';
import type { LaporanKegiatan, TugasTambahan } from '@/types';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, getActivityName } from "@/lib/utils";
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
import { Timestamp } from 'firebase/firestore';

const laporanSchema = z.object({
  title: z.string().min(5, "Judul minimal 5 karakter").max(150, "Maksimal 150 karakter"),
  content: z.string().min(10, "Isi laporan minimal 10 karakter").max(2000, "Maksimal 2000 karakter"),
  date: z.date({ required_error: "Tanggal kegiatan harus diisi" }),
});

type LaporanFormData = z.infer<typeof laporanSchema>;

export default function LaporanKegiatanPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const searchParams = useSearchParams();
  const context = searchParams.get('context');
  
  const [selectedActivity, setSelectedActivity] = useState<TugasTambahan | null>(null);
  const [reports, setReports] = useState<LaporanKegiatan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [editingReport, setEditingReport] = useState<LaporanKegiatan | null>(null);
  const [reportToDelete, setReportToDelete] = useState<LaporanKegiatan | null>(null);

  const form = useForm<LaporanFormData>({
    resolver: zodResolver(laporanSchema),
    defaultValues: {
      title: "",
      content: "",
      date: new Date(),
    }
  });

  const reportableActivities = useMemo(() => {
    if (!userProfile?.tugasTambahan) return [];

    const allReportableRoles = userProfile.tugasTambahan.filter(tugas => 
        tugas.startsWith('pembina_') || ['kesiswaan', 'kurikulum', 'bendahara', 'bk', 'operator', 'staf_tu', 'satpam', 'penjaga_sekolah', 'kepala_tata_usaha', 'kepala_sekolah'].includes(tugas)
    );
    
    if (!context) return allReportableRoles;

    switch (context) {
        case 'pembina':
            return allReportableRoles.filter(t => t.startsWith('pembina_'));
        case 'tu':
            return allReportableRoles.filter(t => t === 'kepala_tata_usaha');
        case 'kurikulum':
            return allReportableRoles.filter(t => t === 'kurikulum');
        case 'kesiswaan':
            return allReportableRoles.filter(t => t === 'kesiswaan');
        case 'keuangan':
            return allReportableRoles.filter(t => t === 'bendahara');
        case 'bk':
            return allReportableRoles.filter(t => t === 'bk');
        case 'operator':
            return allReportableRoles.filter(t => t === 'operator');
        case 'staf_tu':
            return allReportableRoles.filter(t => t === 'staf_tu');
        case 'satpam':
            return allReportableRoles.filter(t => t === 'satpam');
        case 'penjaga_sekolah':
            return allReportableRoles.filter(t => t === 'penjaga_sekolah');
        default:
            return allReportableRoles;
    }
  }, [userProfile, context]);
  
  useEffect(() => {
    if (reportableActivities.length > 0) {
        if (!selectedActivity || !reportableActivities.includes(selectedActivity)) {
            setSelectedActivity(reportableActivities[0]);
        }
    } else {
        setSelectedActivity(null);
    }
  }, [reportableActivities, selectedActivity]);

  const fetchReports = useCallback(async () => {
    if (!selectedActivity || !userProfile?.uid) {
        setReports([]);
        return;
    };
    setIsLoading(true);
    setError(null);
    try {
      const fetchedReports = await getLaporanKegiatanByActivity(selectedActivity, userProfile.uid);
      const sortedReports = fetchedReports.sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      setReports(sortedReports);
    } catch (err: any) {
      setError(`Gagal memuat laporan untuk ${getActivityName(selectedActivity)}.`);
      toast({ variant: "destructive", title: "Error Memuat Data", description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [selectedActivity, toast, userProfile?.uid]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const onSubmit = async (data: LaporanFormData) => {
    if (!userProfile || !selectedActivity) return toast({ variant: "destructive", title: "Error", description: "Sesi atau aktivitas tidak valid." });
    setIsSubmitting(true);
    
    try {
        if (editingReport) {
            await updateLaporanKegiatan(editingReport.id!, { title: data.title, content: data.content, date: Timestamp.fromDate(data.date) });
            await addActivityLog(`Laporan Kegiatan Diperbarui`, `Judul: "${data.title}" oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName || "Guru");
            toast({ title: "Sukses", description: "Laporan kegiatan berhasil diperbarui." });
        } else {
            const payload: Omit<LaporanKegiatan, 'id' | 'createdAt' | 'updatedAt'> = {
                activityId: selectedActivity,
                activityName: getActivityName(selectedActivity),
                title: data.title,
                content: data.content,
                date: Timestamp.fromDate(data.date),
                createdByUid: userProfile.uid,
                createdByDisplayName: userProfile.displayName || "Guru",
            };
            await addLaporanKegiatan(payload);
            await addActivityLog(`Laporan Kegiatan Ditambahkan`, `Judul: "${data.title}" oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName || "Guru");
            toast({ title: "Sukses", description: "Laporan kegiatan berhasil disimpan." });
        }
        form.reset();
        setEditingReport(null);
        fetchReports();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: err.message });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleEdit = (report: LaporanKegiatan) => {
    setEditingReport(report);
    form.reset({
      title: report.title,
      content: report.content,
      date: report.date.toDate(),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async () => {
    if (!reportToDelete || !userProfile) return;
    try {
      await deleteLaporanKegiatan(reportToDelete.id!);
      await addActivityLog("Laporan Kegiatan Dihapus", `Laporan "${reportToDelete.title}" dihapus oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName || "Guru");
      toast({ title: "Sukses", description: "Laporan berhasil dihapus." });
      setReportToDelete(null);
      fetchReports();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/protected/guru">
          <Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Laporan Kegiatan</h1>
          <p className="text-muted-foreground">Buat dan kelola laporan untuk tugas tambahan Anda.</p>
        </div>
      </div>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>{editingReport ? 'Edit Laporan' : 'Buat Laporan Baru'}</CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <FormItem>
                  <FormLabel>Pilih Jenis Laporan</FormLabel>
                   <Select value={selectedActivity || ''} onValueChange={(val) => setSelectedActivity(val as TugasTambahan)} disabled={reportableActivities.length === 0}>
                    <SelectTrigger>
                      <SelectValue placeholder={reportableActivities.length === 0 ? "Tidak ada tugas laporan" : "Pilih jenis laporan..."}/>
                    </SelectTrigger>
                    <SelectContent>
                      {reportableActivities.map(act => (
                        <SelectItem key={act} value={act}>{getActivityName(act)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Judul Laporan</FormLabel><FormControl><Input placeholder="cth: Laporan Kegiatan Class Meeting" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Tanggal Kegiatan</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: indonesiaLocale }) : <span>Pilih tanggal</span>}<CalendarDays className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="content" render={({ field }) => (<FormItem><FormLabel>Isi Laporan</FormLabel><FormControl><Textarea placeholder="Jelaskan detail kegiatan, hasil, dan evaluasi..." {...field} rows={5} /></FormControl><FormMessage /></FormItem>)} />
            </CardContent>
            <CardFooter className="gap-2">
              <Button type="submit" disabled={isSubmitting || !selectedActivity}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}{editingReport ? 'Simpan Perubahan' : 'Tambah Laporan'}</Button>
              {editingReport && (<Button variant="outline" onClick={() => { setEditingReport(null); form.reset(); }}>Batal Edit</Button>)}
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Laporan: {selectedActivity ? getActivityName(selectedActivity) : 'Pilih Laporan'}</CardTitle>
        </CardHeader>
        <CardContent>
           {isLoading ? (<Skeleton className="h-40 w-full" />)
            : error ? (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>)
            : reports.length === 0 ? (
                <div className="text-center py-10"><BookOpen className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-2 text-sm font-semibold">Belum Ada Laporan</h3><p className="mt-1 text-sm text-muted-foreground">Anda belum membuat laporan untuk kegiatan ini.</p></div>
            ) : (
                <div className="overflow-x-auto">
                <Table>
                    <TableHeader><TableRow><TableHead>Judul</TableHead><TableHead>Tgl. Kegiatan</TableHead><TableHead>Isi Laporan</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                    <TableBody>
                    {reports.map(r => (
                        <TableRow key={r.id}>
                        <TableCell className="font-medium max-w-xs truncate">{r.title}</TableCell>
                        <TableCell>{format(r.date.toDate(), "dd MMM yyyy")}</TableCell>
                        <TableCell className="max-w-xs truncate">{r.content}</TableCell>
                        <TableCell className="text-right space-x-1">
                            <Button variant="outline" size="icon" onClick={() => handleEdit(r)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setReportToDelete(r)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </div>
            )
           }
        </CardContent>
      </Card>

      {reportToDelete && (
        <AlertDialog open={!!reportToDelete} onOpenChange={() => setReportToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle><AlertDialogDescription>Yakin ingin menghapus laporan "{reportToDelete.title}"? Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
