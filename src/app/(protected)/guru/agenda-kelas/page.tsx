
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { id as indonesiaLocale } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, PlusCircle, Loader2, AlertCircle, Edit, Trash2, CalendarPlus, BookCheck, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getStudents, getAgendasForTeacher, addOrUpdateAgendaKelas, deleteAgenda, addActivityLog } from '@/lib/firestoreService';
import type { Siswa, AgendaKelas } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Timestamp } from 'firebase/firestore';
import { cn } from "@/lib/utils";

const agendaSchema = z.object({
    id: z.string().optional(),
    tanggal: z.date({ required_error: "Tanggal harus dipilih." }),
    kelas: z.string().min(1, "Kelas harus dipilih."),
    mapel: z.string().min(1, "Mata pelajaran harus dipilih."),
    jamKe: z.string().min(1, "Jam ke- harus diisi."),
    tujuanPembelajaran: z.string().min(5, "Tujuan pembelajaran minimal 5 karakter."),
    pokokBahasan: z.string().min(5, "Pokok bahasan minimal 5 karakter."),
    siswaAbsen: z.array(z.object({ idSiswa: z.string(), namaSiswa: z.string() })).optional(),
    refleksi: z.string().optional(),
});

type AgendaFormData = z.infer<typeof agendaSchema>;

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: format(new Date(0, i), "MMMM", { locale: indonesiaLocale }) }));

export default function AgendaKelasPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const [agendas, setAgendas] = useState<AgendaKelas[]>([]);
    const [students, setStudents] = useState<Siswa[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingAgenda, setEditingAgenda] = useState<AgendaKelas | null>(null);
    const [agendaToDelete, setAgendaToDelete] = useState<AgendaKelas | null>(null);

    const [filterYear, setFilterYear] = useState(currentYear);
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);

    const form = useForm<AgendaFormData>({
        resolver: zodResolver(agendaSchema),
        defaultValues: { tanggal: new Date(), siswaAbsen: [] },
    });
    
    const watchedKelas = form.watch('kelas');
    const studentsInSelectedClass = useMemo(() => students.filter(s => s.kelas === watchedKelas), [students, watchedKelas]);

    const fetchInitialData = useCallback(async () => {
        if (!userProfile?.uid) {
            setIsLoading(false);
            setError("Profil guru tidak ditemukan.");
            return;
        }
        setIsLoading(true);
        try {
            const [fetchedStudents, fetchedAgendas] = await Promise.all([
                getStudents(),
                getAgendasForTeacher(userProfile.uid, filterYear, filterMonth)
            ]);
            setStudents(fetchedStudents);
            setAgendas(fetchedAgendas);
        } catch (err: any) {
            setError("Gagal memuat data awal.");
            toast({ variant: "destructive", title: "Error", description: err.message });
        } finally {
            setIsLoading(false);
        }
    }, [userProfile?.uid, filterYear, filterMonth, toast]);

    useEffect(() => {
        if (!authLoading) {
            fetchInitialData();
        }
    }, [authLoading, fetchInitialData]);

    const handleOpenForm = (agenda?: AgendaKelas) => {
        setEditingAgenda(agenda || null);
        if (agenda) {
            form.reset({
                ...agenda,
                tanggal: agenda.tanggal.toDate(),
            });
        } else {
            form.reset({
                tanggal: new Date(),
                kelas: "", mapel: userProfile?.assignedMapel?.[0] || "", jamKe: "",
                tujuanPembelajaran: "", pokokBahasan: "", siswaAbsen: [], refleksi: ""
            });
        }
        setIsFormOpen(true);
    };

    const onSubmit = async (data: AgendaFormData) => {
        if (!userProfile) return;
        setIsSubmitting(true);
        try {
            const agendaData: Omit<AgendaKelas, 'id' | 'createdAt' | 'updatedAt'> = {
                ...data,
                tanggal: Timestamp.fromDate(data.tanggal),
                siswaAbsen: data.siswaAbsen || [],
                teacherUid: userProfile.uid,
                teacherName: userProfile.displayName || "Guru",
            };

            const savedAgenda = await addOrUpdateAgendaKelas(agendaData, editingAgenda?.id);

            await addActivityLog(
                `Agenda Kelas ${editingAgenda ? 'Diperbarui' : 'Dibuat'}`,
                `Mapel: ${data.mapel}, Kelas: ${data.kelas}, Tgl: ${format(data.tanggal, 'yyyy-MM-dd')}`,
                userProfile.uid,
                userProfile.displayName || 'Guru'
            );

            toast({ title: "Sukses", description: `Agenda kelas berhasil disimpan.` });
            setIsFormOpen(false);
            setEditingAgenda(null);
            fetchInitialData();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Gagal Menyimpan", description: err.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!agendaToDelete || !agendaToDelete.id) return;
        setIsSubmitting(true);
        try {
            await deleteAgenda(agendaToDelete.id);
            toast({ title: "Sukses", description: "Agenda berhasil dihapus." });
            setAgendaToDelete(null);
            fetchInitialData();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const uniqueClasses = useMemo(() => [...new Set(students.map(s => s.kelas))], [students]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/guru"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline flex items-center gap-2">
                        <CalendarPlus className="h-8 w-8 text-primary" /> Agenda Mengajar
                    </h1>
                    <p className="text-muted-foreground">Catat dan kelola agenda mengajar Anda.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle>Riwayat Agenda</CardTitle>
                            <CardDescription>Menampilkan agenda untuk periode yang dipilih.</CardDescription>
                        </div>
                        <Button onClick={() => handleOpenForm()}><PlusCircle className="mr-2 h-4 w-4" /> Buat Agenda Baru</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <Select value={String(filterMonth)} onValueChange={(v) => setFilterMonth(Number(v))}>
                            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Pilih Bulan" /></SelectTrigger>
                            <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(Number(v))}>
                            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Pilih Tahun" /></SelectTrigger>
                            <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>

                    {isLoading ? <Skeleton className="h-48 w-full" /> :
                     error ? <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> :
                     agendas.length === 0 ? <p className="text-center text-muted-foreground py-8">Belum ada agenda untuk periode ini.</p> :
                     (
                        <div className="border rounded-md overflow-hidden">
                            <Table>
                                <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Kelas</TableHead><TableHead>Mapel</TableHead><TableHead>Pokok Bahasan</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {agendas.map(agenda => (
                                        <TableRow key={agenda.id}>
                                            <TableCell>{format(agenda.tanggal.toDate(), 'EEEE, dd MMM yyyy', { locale: indonesiaLocale })}</TableCell>
                                            <TableCell>{agenda.kelas}</TableCell>
                                            <TableCell>{agenda.mapel}</TableCell>
                                            <TableCell className="max-w-xs truncate" title={agenda.pokokBahasan}>{agenda.pokokBahasan}</TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenForm(agenda)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setAgendaToDelete(agenda)}><Trash2 className="h-4 w-4" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                     )}
                </CardContent>
            </Card>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader><DialogTitle>{editingAgenda ? 'Edit' : 'Buat'} Agenda Kelas</DialogTitle><DialogDescription>Isi rincian agenda mengajar Anda.</DialogDescription></DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-2 pr-4">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="tanggal" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Tanggal</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className="justify-start text-left font-normal">{field.value ? format(field.value, "PPP", { locale: indonesiaLocale }) : <span>Pilih tanggal</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="jamKe" render={({ field }) => (<FormItem><FormLabel>Jam Ke-</FormLabel><FormControl><Input placeholder="cth: 1-2, 3-4" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="kelas" render={({ field }) => (<FormItem><FormLabel>Kelas</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger></FormControl><SelectContent>{uniqueClasses.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="mapel" render={({ field }) => (<FormItem><FormLabel>Mata Pelajaran</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih mapel" /></SelectTrigger></FormControl><SelectContent>{userProfile?.assignedMapel?.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                            </div>
                            <FormField control={form.control} name="tujuanPembelajaran" render={({ field }) => (<FormItem><FormLabel>Tujuan Pembelajaran</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="pokokBahasan" render={({ field }) => (<FormItem><FormLabel>Materi / Pokok Bahasan</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="siswaAbsen" render={({ field }) => (
                                <FormItem><FormLabel>Siswa Tidak Hadir</FormLabel>
                                <Popover><PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className="w-full justify-between" disabled={!watchedKelas}> {field.value && field.value.length > 0 ? `${field.value.length} siswa dipilih` : "Pilih siswa absen..."} <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></FormControl></PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command>
                                    <CommandInput placeholder="Cari siswa..." />
                                    <CommandList><CommandEmpty>Tidak ada siswa.</CommandEmpty>
                                    <CommandGroup>{studentsInSelectedClass.map(student => (
                                        <CommandItem key={student.id_siswa} onSelect={() => {
                                            const currentSelection = field.value || [];
                                            const isSelected = currentSelection.some(s => s.idSiswa === student.id_siswa);
                                            if (isSelected) {
                                                field.onChange(currentSelection.filter(s => s.idSiswa !== student.id_siswa));
                                            } else {
                                                field.onChange([...currentSelection, { idSiswa: student.id_siswa, namaSiswa: student.nama }]);
                                            }
                                        }}>
                                            <BookCheck className={cn("mr-2 h-4 w-4", (field.value || []).some(s => s.idSiswa === student.id_siswa) ? "opacity-100" : "opacity-0")} />
                                            {student.nama}
                                        </CommandItem>
                                    ))}</CommandGroup></CommandList>
                                </Command></PopoverContent></Popover>
                                <div className="text-xs text-muted-foreground space-x-1">{ (field.value || []).map(s => <span key={s.idSiswa} className="bg-muted px-1.5 py-0.5 rounded">{s.namaSiswa}</span>) }</div>
                                <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="refleksi" render={({ field }) => (<FormItem><FormLabel>Refleksi dan Catatan</FormLabel><FormControl><Textarea placeholder="Catatan tentang proses belajar, kendala, atau hal lain..." rows={3} {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <DialogFooter><DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmitting}>Batal</Button></DialogClose><Button type="submit" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Menyimpan...</> : "Simpan"}</Button></DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!agendaToDelete} onOpenChange={() => setAgendaToDelete(null)}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Anda Yakin?</AlertDialogTitle><AlertDialogDescription>Ini akan menghapus agenda secara permanen. Tindakan ini tidak dapat diurungkan.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Ya, Hapus</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
