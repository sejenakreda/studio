
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { id as indonesiaLocale } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, PlusCircle, Loader2, AlertCircle, Pencil, Trash2, HeartHandshake, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getLaporanKegiatanByActivity, addLaporanKegiatan, deleteLaporanKegiatan, updateLaporanKegiatan, addActivityLog } from '@/lib/firestoreService';
import type { LaporanKegiatan } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const laporanSchema = z.object({
    title: z.string().min(5, "Judul minimal 5 karakter").max(100, "Judul maksimal 100 karakter"),
    date: z.date({ required_error: "Tanggal kegiatan harus dipilih" }),
    content: z.string().min(10, "Isi laporan minimal 10 karakter").max(5000, "Isi laporan maksimal 5000 karakter"),
});

type LaporanFormData = z.infer<typeof laporanSchema>;

const ACTIVITY_ID = 'bk';
const ACTIVITY_NAME = 'Bimbingan Konseling';

export default function BkDashboardPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [laporanList, setLaporanList] = useState<LaporanKegiatan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [reportToModify, setReportToModify] = useState<LaporanKegiatan | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  
  const form = useForm<LaporanFormData>({ 
      resolver: zodResolver(laporanSchema), 
      defaultValues: { title: "", date: new Date(), content: "" } 
  });

  const fetchReports = useCallback(async () => {
      setIsLoading(true);
      setError(null);
      try {
          const reports = await getLaporanKegiatanByActivity(ACTIVITY_ID);
          setLaporanList(reports);
      } catch (error: any) {
          setError(`Gagal memuat laporan: ${error.message}`);
          toast({ variant: "destructive", title: "Error", description: `Gagal memuat laporan: ${error.message}` });
      } finally {
          setIsLoading(false);
      }
  }, [toast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleOpenForm = (laporan?: LaporanKegiatan) => {
      setReportToModify(laporan || null);
      if (laporan) {
          form.reset({ title: laporan.title, content: laporan.content, date: laporan.date.toDate() });
      } else {
          form.reset({ title: "", content: "", date: new Date() });
      }
      setIsFormOpen(true);
  };

  const onSubmit = async (data: LaporanFormData) => {
      if (!userProfile) return;
      setIsSubmitting(true);
      try {
          if (reportToModify) { // Editing
              await updateLaporanKegiatan(reportToModify.id!, { ...data, date: Timestamp.fromDate(data.date) });
              await addActivityLog("Laporan BK Diperbarui", `Laporan "${data.title}" diperbarui oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName || 'Guru BK');
              toast({ title: "Sukses", description: "Laporan berhasil diperbarui." });
          } else { // Adding
              await addLaporanKegiatan({
                  activityId: ACTIVITY_ID, activityName: ACTIVITY_NAME, ...data,
                  date: Timestamp.fromDate(data.date),
                  createdByUid: userProfile.uid, createdByDisplayName: userProfile.displayName || 'Guru BK',
              });
              await addActivityLog("Laporan BK Dibuat", `Laporan "${data.title}" dibuat oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName || 'Guru BK');
              toast({ title: "Sukses", description: "Laporan berhasil disimpan." });
          }
          form.reset(); setIsFormOpen(false); setReportToModify(null); fetchReports();
      } catch (error: any) {
          toast({ variant: "destructive", title: "Gagal Menyimpan", description: error.message });
      } finally {
          setIsSubmitting(false);
      }
  };
  
  const handleDeleteClick = (laporan: LaporanKegiatan) => {
      setReportToModify(laporan);
      setIsAlertOpen(true);
  };
  
  const handleConfirmDelete = async () => {
      if (!reportToModify?.id) return;
      setIsSubmitting(true);
      try {
          await deleteLaporanKegiatan(reportToModify.id);
          toast({ title: "Sukses", description: "Laporan berhasil dihapus." });
          setReportToModify(null); setIsAlertOpen(false); fetchReports();
      } catch (error: any) {
          toast({ variant: "destructive", title: "Gagal Hapus", description: error.message });
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/guru"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline flex items-center gap-2">
            <HeartHandshake className="h-8 w-8 text-primary" /> Dasbor Bimbingan Konseling
          </h1>
          <p className="text-muted-foreground">Catat dan kelola laporan kegiatan Bimbingan Konseling.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Laporan Kegiatan BK</CardTitle>
              <CardDescription>Daftar laporan yang telah Anda buat.</CardDescription>
            </div>
            <Button onClick={() => handleOpenForm()}><PlusCircle className="mr-2 h-4 w-4" /> Buat Laporan Baru</Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="border rounded-md">
            <Table>
              <TableHeader><TableRow><TableHead>Judul</TableHead><TableHead>Tanggal Kegiatan</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading ? (<TableRow><TableCell colSpan={3} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) :
                 laporanList.length === 0 && !error ? (<TableRow><TableCell colSpan={3} className="text-center h-24">Belum ada laporan.</TableCell></TableRow>) :
                 (laporanList.map((laporan) => (<TableRow key={laporan.id}><TableCell className="font-medium max-w-sm truncate" title={laporan.title}>{laporan.title}</TableCell><TableCell>{format(laporan.date.toDate(), "dd MMM yyyy", { locale: indonesiaLocale })}</TableCell><TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenForm(laporan)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(laporan)} disabled={isSubmitting} title="Hapus"><Trash2 className="h-4 w-4" /></Button>
                 </TableCell></TableRow>)))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-[525px]">
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                      <DialogHeader><DialogTitle>{reportToModify ? 'Edit' : 'Buat'} Laporan BK</DialogTitle><DialogDescription>Isi detail laporan kegiatan Bimbingan Konseling.</DialogDescription></DialogHeader>
                      <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                          <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Judul Laporan</FormLabel><FormControl><Input placeholder="cth: Sesi Konseling Kelompok Kelas X" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Tanggal Kegiatan</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={`w-full justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: indonesiaLocale }) : (<span>Pilih tanggal</span>)}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="content" render={({ field }) => (<FormItem><FormLabel>Isi Laporan/Rincian</FormLabel><FormControl><Textarea placeholder="Tuliskan detail laporan di sini..." {...field} rows={6} /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                      <DialogFooter><DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmitting}>Batal</Button></DialogClose><Button type="submit" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Menyimpan...</> : "Simpan"}</Button></DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>

      {reportToModify && (
          <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
              <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Anda Yakin?</AlertDialogTitle><AlertDialogDescription>Ini akan menghapus laporan <span className="font-semibold">{reportToModify.title}</span>. Tindakan ini tidak dapat diurungkan.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel disabled={isSubmitting} onClick={() => setIsAlertOpen(false)}>Batal</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/80">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Ya, Hapus</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
      )}
    </div>
  );
}
