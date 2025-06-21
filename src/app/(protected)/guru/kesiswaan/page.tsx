
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { id as indonesiaLocale } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Users2, PlusCircle, Loader2, AlertCircle, Trash2, Filter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getStudents, addPelanggaran, getAllPelanggaran, deletePelanggaran, addActivityLog } from '@/lib/firestoreService';
import type { Siswa, PelanggaranSiswa } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Timestamp } from 'firebase/firestore';

const violationSchema = z.object({
  id_siswa: z.string().min(1, "Siswa harus dipilih"),
  tanggal: z.date({ required_error: "Tanggal harus dipilih" }),
  pelanggaran: z.string().min(3, "Jenis pelanggaran minimal 3 karakter").max(150, "Maksimal 150 karakter"),
  catatan: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
  poin: z.coerce.number().min(0, "Poin minimal 0").optional().default(0),
});

type ViolationFormData = z.infer<typeof violationSchema>;

export default function KesiswaanDashboardPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [violations, setViolations] = useState<PelanggaranSiswa[]>([]);
  const [students, setStudents] = useState<Siswa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [violationToDelete, setViolationToDelete] = useState<PelanggaranSiswa | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterKelas, setFilterKelas] = useState("all");

  const form = useForm<ViolationFormData>({
    resolver: zodResolver(violationSchema),
    defaultValues: {
      id_siswa: "",
      tanggal: new Date(),
      pelanggaran: "",
      catatan: "",
      poin: 0,
    },
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedViolations, fetchedStudents] = await Promise.all([
        getAllPelanggaran(),
        getStudents(),
      ]);
      setViolations(fetchedViolations);
      setStudents(fetchedStudents);
    } catch (err: any) {
      setError("Gagal memuat data pelanggaran atau siswa.");
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const uniqueClasses = useMemo(() => {
    const klasses = [...new Set(students.map(s => s.kelas).filter(Boolean))].sort();
    return klasses;
  }, [students]);

  const filteredViolations = useMemo(() => {
    if (filterKelas === "all") return violations;
    return violations.filter(v => v.kelasSiswa === filterKelas);
  }, [violations, filterKelas]);

  const onSubmit = async (data: ViolationFormData) => {
    if (!userProfile) {
      toast({ variant: "destructive", title: "Error", description: "Sesi tidak valid." });
      return;
    }
    setIsSubmitting(true);
    try {
      const selectedStudent = students.find(s => s.id_siswa === data.id_siswa);
      if (!selectedStudent) throw new Error("Siswa tidak ditemukan.");
      
      const violationData: Omit<PelanggaranSiswa, 'id' | 'createdAt'> = {
        id_siswa: data.id_siswa,
        namaSiswa: selectedStudent.nama,
        kelasSiswa: selectedStudent.kelas,
        tanggal: Timestamp.fromDate(data.tanggal),
        pelanggaran: data.pelanggaran,
        catatan: data.catatan,
        poin: data.poin,
        recordedByUid: userProfile.uid,
        recordedByName: userProfile.displayName || "Kesiswaan",
      };

      await addPelanggaran(violationData);
      await addActivityLog(
        "Pelanggaran Siswa Dicatat",
        `Siswa: ${selectedStudent.nama}, Pelanggaran: ${data.pelanggaran}, Poin: ${data.poin}`,
        userProfile.uid,
        userProfile.displayName || "Kesiswaan"
      );

      toast({ title: "Sukses", description: "Catatan pelanggaran berhasil disimpan." });
      form.reset();
      setIsFormOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirmation = (violation: PelanggaranSiswa) => {
    setViolationToDelete(violation);
  };
  
  const handleActualDelete = async () => {
    if (!violationToDelete) return;
    setIsDeleting(true);
    try {
      await deletePelanggaran(violationToDelete.id!);
      toast({ title: "Sukses", description: "Catatan pelanggaran telah dihapus." });
      setViolationToDelete(null);
      fetchData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal Hapus", description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/guru"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline flex items-center gap-2">
            <Users2 className="h-8 w-8 text-primary" /> Dasbor Kesiswaan
          </h1>
          <p className="text-muted-foreground">Catat dan kelola data pelanggaran siswa.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle>Data Pelanggaran Siswa</CardTitle>
              <CardDescription>Daftar semua catatan pelanggaran yang telah diinput.</CardDescription>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4" />Catat Pelanggaran Baru</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <DialogHeader><DialogTitle>Form Catatan Pelanggaran</DialogTitle><DialogDescription>Isi detail pelanggaran siswa.</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                      <FormField control={form.control} name="id_siswa" render={({ field }) => (<FormItem><FormLabel>Siswa</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih siswa..." /></SelectTrigger></FormControl><SelectContent>{students.map(s => (<SelectItem key={s.id_siswa} value={s.id_siswa}>{s.nama} ({s.kelas})</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="tanggal" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Tanggal Kejadian</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={`w-full justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: indonesiaLocale }) : (<span>Pilih tanggal</span>)}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("2020-01-01")} initialFocus locale={indonesiaLocale}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="pelanggaran" render={({ field }) => (<FormItem><FormLabel>Jenis Pelanggaran</FormLabel><FormControl><Input placeholder="cth: Tidak mengerjakan tugas, terlambat" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="poin" render={({ field }) => (<FormItem><FormLabel>Poin Pelanggaran</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="catatan" render={({ field }) => (<FormItem><FormLabel>Catatan/Detail Kejadian</FormLabel><FormControl><Textarea placeholder="Detail kronologi atau tindakan yang diambil..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <DialogFooter><DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmitting}>Batal</Button></DialogClose><Button type="submit" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Menyimpan...</> : "Simpan"}</Button></DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="filter-kelas">Filter Berdasarkan Kelas</Label>
            <Select value={filterKelas} onValueChange={setFilterKelas} disabled={isLoading}>
              <SelectTrigger id="filter-kelas" className="w-full md:w-64 mt-1"><Filter className="h-4 w-4 mr-2 opacity-70"/><SelectValue placeholder="Pilih kelas..."/></SelectTrigger>
              <SelectContent><SelectItem value="all">Semua Kelas</SelectItem>{uniqueClasses.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {isLoading ? (<div className="space-y-2"><Skeleton className="h-12 w-full"/><Skeleton className="h-12 w-full"/><Skeleton className="h-12 w-full"/></div>)
          : error ? (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>)
          : filteredViolations.length === 0 ? (
            <div className="text-center p-6 border-2 border-dashed rounded-lg">
                <Users2 className="mx-auto h-12 w-12 text-muted-foreground"/>
                <h3 className="mt-2 text-sm font-medium">Tidak Ada Data Pelanggaran</h3>
                <p className="mt-1 text-sm text-muted-foreground">Belum ada data pelanggaran untuk filter yang dipilih.</p>
            </div>
          ) : (
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Siswa</TableHead><TableHead>Kelas</TableHead><TableHead>Pelanggaran</TableHead><TableHead>Poin</TableHead><TableHead>Catatan</TableHead><TableHead>Dicatat Oleh</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredViolations.map(v => (
                  <TableRow key={v.id}>
                    <TableCell>{format(v.tanggal.toDate(), "dd MMM yyyy", { locale: indonesiaLocale })}</TableCell>
                    <TableCell className="font-medium">{v.namaSiswa}</TableCell>
                    <TableCell>{v.kelasSiswa}</TableCell>
                    <TableCell className="max-w-xs truncate" title={v.pelanggaran}>{v.pelanggaran}</TableCell>
                    <TableCell>{v.poin}</TableCell>
                    <TableCell className="max-w-xs truncate" title={v.catatan || ''}>{v.catatan || '-'}</TableCell>
                    <TableCell>{v.recordedByName}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteConfirmation(v)} disabled={isDeleting && violationToDelete?.id === v.id}>
                            {isDeleting && violationToDelete?.id === v.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div>
          )}
        </CardContent>
      </Card>
      
      {violationToDelete && (
        <AlertDialog open={!!violationToDelete} onOpenChange={(isOpen) => !isOpen && setViolationToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Anda Yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus catatan pelanggaran <span className="font-semibold">{violationToDelete.pelanggaran}</span> oleh siswa <span className="font-semibold">{violationToDelete.namaSiswa}</span>. Ini tidak dapat diurungkan.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel onClick={() => setViolationToDelete(null)} disabled={isDeleting}>Batal</AlertDialogCancel><AlertDialogAction onClick={handleActualDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Ya, Hapus</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
