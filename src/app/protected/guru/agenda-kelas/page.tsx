
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, PlusCircle, Loader2, AlertCircle, BookOpen, Trash2, Edit, CalendarDays } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';
import { getStudents } from '@/lib/firestoreService';
import type { Siswa, AgendaKelas } from '@/types';
import { addOrUpdateAgendaKelas, getAgendasForTeacher, deleteAgenda, addActivityLog } from '@/lib/firestoreService';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Timestamp } from 'firebase/firestore';


const agendaSchema = z.object({
  kelas: z.string().min(1, "Kelas harus dipilih"),
  mapel: z.string().min(1, "Mata pelajaran harus dipilih"),
  tanggal: z.date({ required_error: "Tanggal harus diisi" }),
  jamKe: z.string().min(1, "Jam pelajaran harus diisi"),
  tujuanPembelajaran: z.string().min(5, "Tujuan pembelajaran minimal 5 karakter").max(500, "Maksimal 500 karakter"),
  pokokBahasan: z.string().min(5, "Pokok bahasan minimal 5 karakter").max(500, "Maksimal 500 karakter"),
  siswaAbsen: z.array(z.string()).optional(),
  refleksi: z.string().max(1000, "Refleksi maksimal 1000 karakter").optional(),
});

type AgendaFormData = z.infer<typeof agendaSchema>;

export default function AgendaKelasPage() {
    const { toast } = useToast();
    const { userProfile } = useAuth();
    const [agendas, setAgendas] = useState<AgendaKelas[]>([]);
    const [students, setStudents] = useState<Siswa[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingAgenda, setEditingAgenda] = useState<AgendaKelas | null>(null);
    const [agendaToDelete, setAgendaToDelete] = useState<AgendaKelas | null>(null);
    
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);

    const form = useForm<AgendaFormData>({
        resolver: zodResolver(agendaSchema),
        defaultValues: {
            kelas: "",
            mapel: "",
            jamKe: "",
            tujuanPembelajaran: "",
            pokokBahasan: "",
            siswaAbsen: [],
            refleksi: "",
        },
    });

    const fetchPrerequisites = useCallback(async () => {
        if (!userProfile) return;
        setIsLoading(true);
        setError(null);
        try {
            const [fetchedStudents, fetchedAgendas] = await Promise.all([
                getStudents(),
                getAgendasForTeacher(userProfile.uid, filterYear, filterMonth)
            ]);
            setStudents(fetchedStudents || []);
            setAgendas(fetchedAgendas || []);
        } catch (err: any) {
            setError("Gagal memuat data prasyarat (siswa/agenda). Silakan coba lagi.");
            toast({ variant: "destructive", title: "Error", description: err.message });
        } finally {
            setIsLoading(false);
        }
    }, [userProfile, toast, filterYear, filterMonth]);

    useEffect(() => {
        fetchPrerequisites();
    }, [fetchPrerequisites]);

    const uniqueClasses = useMemo(() => [...new Set(students.map(s => s.kelas).filter(Boolean))].sort(), [students]);
    const selectedKelas = form.watch('kelas');
    const studentsInSelectedClass = useMemo(() => students.filter(s => s.kelas === selectedKelas), [students, selectedKelas]);

    const onSubmit = async (data: AgendaFormData) => {
        if (!userProfile) return toast({ variant: "destructive", title: "Error", description: "Sesi Anda tidak valid." });
        const siswaAbsenData = students.filter(s => data.siswaAbsen?.includes(s.id_siswa)).map(s => ({ idSiswa: s.id_siswa, namaSiswa: s.nama }));
        
        const payload: Omit<AgendaKelas, 'id' | 'createdAt' | 'updatedAt'> = {
            teacherUid: userProfile.uid,
            teacherName: userProfile.displayName || "Guru",
            kelas: data.kelas,
            mapel: data.mapel,
            tanggal: Timestamp.fromDate(data.tanggal),
            jamKe: data.jamKe,
            tujuanPembelajaran: data.tujuanPembelajaran,
            pokokBahasan: data.pokokBahasan,
            siswaAbsen: siswaAbsenData,
            refleksi: data.refleksi || "",
        };

        try {
            await addOrUpdateAgendaKelas(payload, editingAgenda?.id);
            await addActivityLog(`Agenda Kelas ${editingAgenda ? 'Diperbarui' : 'Ditambahkan'}`, `Mapel: ${data.mapel} di Kelas: ${data.kelas} oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName || "Guru");
            toast({ title: "Sukses", description: `Agenda kelas untuk mapel ${data.mapel} berhasil ${editingAgenda ? 'diperbarui' : 'disimpan'}.` });
            form.reset();
            setEditingAgenda(null);
            fetchPrerequisites();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Gagal Menyimpan", description: err.message });
        }
    };
    
    const handleEdit = (agenda: AgendaKelas) => {
        setEditingAgenda(agenda);
        form.reset({
            ...agenda,
            tanggal: agenda.tanggal.toDate(),
            siswaAbsen: agenda.siswaAbsen.map(s => s.idSiswa),
            refleksi: agenda.refleksi || "",
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async () => {
        if (!agendaToDelete || !userProfile) return;
        try {
            await deleteAgenda(agendaToDelete.id!);
            await addActivityLog("Agenda Kelas Dihapus", `Agenda mapel ${agendaToDelete.mapel} di kelas ${agendaToDelete.kelas} dihapus oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName || "Guru");
            toast({ title: "Sukses", description: "Agenda kelas berhasil dihapus." });
            setAgendaToDelete(null);
            fetchPrerequisites();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message });
        }
    };
    
    const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: format(new Date(0, i), "MMMM", { locale: indonesiaLocale }) }));
    const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i + 1).reverse();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4"><Link href="/protected/guru"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link><div><h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Agenda Mengajar</h1><p className="text-muted-foreground">Catat dan kelola agenda mengajar Anda setiap hari.</p></div></div>

            <Card>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardHeader><CardTitle>{editingAgenda ? 'Edit Agenda Mengajar' : 'Tambah Agenda Mengajar Baru'}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="kelas" render={({ field }) => (<FormItem><FormLabel>Kelas</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih kelas..." /></SelectTrigger></FormControl><SelectContent>{uniqueClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="mapel" render={({ field }) => (<FormItem><FormLabel>Mata Pelajaran</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih mapel..." /></SelectTrigger></FormControl><SelectContent>{userProfile?.assignedMapel?.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="tanggal" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Tanggal Mengajar</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: indonesiaLocale }) : <span>Pilih tanggal</span>}<CalendarDays className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="jamKe" render={({ field }) => (<FormItem><FormLabel>Jam Pelajaran Ke-</FormLabel><FormControl><Input placeholder="cth: 1-2" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <FormField control={form.control} name="pokokBahasan" render={({ field }) => (<FormItem><FormLabel>Pokok Bahasan</FormLabel><FormControl><Textarea placeholder="Materi yang diajarkan..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="tujuanPembelajaran" render={({ field }) => (<FormItem><FormLabel>Tujuan Pembelajaran</FormLabel><FormControl><Textarea placeholder="Tujuan yang ingin dicapai..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField
                                control={form.control}
                                name="siswaAbsen"
                                render={() => (
                                    <FormItem>
                                        <FormLabel>Siswa Tidak Hadir (Opsional)</FormLabel>
                                        {!selectedKelas ? (
                                            <div className="p-3 border rounded-md text-sm text-muted-foreground bg-muted/50">Pilih kelas terlebih dahulu untuk menampilkan daftar siswa.</div>
                                        ) : studentsInSelectedClass.length === 0 ? (
                                            <div className="p-3 border rounded-md text-sm text-muted-foreground bg-muted/50">Tidak ada siswa yang terdaftar di kelas ini.</div>
                                        ) : (
                                            <ScrollArea className="h-40 w-full rounded-md border p-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {studentsInSelectedClass.map((item) => (
                                                <FormField
                                                    key={item.id_siswa}
                                                    control={form.control}
                                                    name="siswaAbsen"
                                                    render={({ field }) => {
                                                    return (
                                                        <FormItem
                                                        key={item.id_siswa}
                                                        className="flex flex-row items-start space-x-3 space-y-0"
                                                        >
                                                        <FormControl>
                                                            <Checkbox
                                                            checked={field.value?.includes(item.id_siswa)}
                                                            onCheckedChange={(checked) => {
                                                                return checked
                                                                ? field.onChange([...(field.value || []), item.id_siswa])
                                                                : field.onChange(
                                                                    (field.value || []).filter(
                                                                        (value) => value !== item.id_siswa
                                                                    )
                                                                    );
                                                            }}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">
                                                            {item.nama}
                                                        </FormLabel>
                                                        </FormItem>
                                                    );
                                                    }}
                                                />
                                                ))}
                                            </div>
                                            </ScrollArea>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                                />
                            <FormField control={form.control} name="refleksi" render={({ field }) => (<FormItem><FormLabel>Refleksi (Opsional)</FormLabel><FormControl><Textarea placeholder="Catatan refleksi setelah mengajar..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </CardContent>
                        <CardFooter className="gap-2">
                            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}{editingAgenda ? 'Simpan Perubahan' : 'Tambah Agenda'}</Button>
                            {editingAgenda && (<Button variant="outline" onClick={() => { setEditingAgenda(null); form.reset(); }}>Batal Edit</Button>)}
                        </CardFooter>
                    </form>
                </Form>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Riwayat Agenda Mengajar</CardTitle>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                        <div><label className="text-sm font-medium">Filter Tahun</label><Select value={String(filterYear)} onValueChange={(v) => setFilterYear(Number(v))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{YEARS.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
                        <div><label className="text-sm font-medium">Filter Bulan</label><Select value={String(filterMonth)} onValueChange={(v) => setFilterMonth(Number(v))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{MONTHS.map(m=><SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (<Skeleton className="h-40 w-full" />)
                    : error ? (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>)
                    : agendas.length === 0 ? (
                        <div className="text-center py-10"><BookOpen className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-2 text-sm font-semibold">Belum Ada Agenda</h3><p className="mt-1 text-sm text-muted-foreground">Anda belum mencatat agenda untuk periode ini.</p></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table><TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Kelas</TableHead><TableHead>Mapel</TableHead><TableHead>Pokok Bahasan</TableHead><TableHead>Siswa Absen</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {agendas.map(a => (
                                    <TableRow key={a.id}>
                                        <TableCell>{format(a.tanggal.toDate(), "dd MMM yyyy")} (Jam {a.jamKe})</TableCell>
                                        <TableCell>{a.kelas}</TableCell>
                                        <TableCell>{a.mapel}</TableCell>
                                        <TableCell className="max-w-xs truncate" title={a.pokokBahasan}>{a.pokokBahasan}</TableCell>
                                        <TableCell>{a.siswaAbsen.map(s => s.namaSiswa).join(', ') || '-'}</TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Button variant="outline" size="icon" onClick={()=>handleEdit(a)}><Edit className="h-4 w-4"/></Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={()=>setAgendaToDelete(a)}><Trash2 className="h-4 w-4"/></Button>
                                        </TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
            
            {agendaToDelete && (
                <AlertDialog open={!!agendaToDelete} onOpenChange={() => setAgendaToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle><AlertDialogDescription>Apakah Anda yakin ingin menghapus agenda mengajar untuk mapel <span className="font-bold">{agendaToDelete.mapel}</span> di kelas <span className="font-bold">{agendaToDelete.kelas}</span> pada tanggal <span className="font-bold">{format(agendaToDelete.tanggal.toDate(), "dd MMM yyyy")}</span>? Tindakan ini tidak dapat diurungkan.</AlertDialogDescription></AlertDialogHeader>
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

    