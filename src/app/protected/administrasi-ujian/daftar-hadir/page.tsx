"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Loader2, AlertCircle, Trash2, ClipboardCheck, CalendarIcon, Printer } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';
import { addDaftarHadirPengawas, getDaftarHadirPengawas, deleteDaftarHadirPengawas } from '@/lib/firestoreService';
import type { DaftarHadirPengawas } from '@/types';
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
import { ImageUploadField } from '@/components/form/ImageUploadField';
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const daftarHadirSchema = z.object({
  tanggalUjian: z.date({ required_error: "Tanggal ujian harus diisi." }),
  mataUjian: z.string().min(3, "Mata ujian minimal 3 karakter"),
  ruangUjian: z.string().min(1, "Ruang ujian harus diisi"),
  waktuMulai: z.string().regex(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, "Format waktu tidak valid (HH:MM)"),
  waktuSelesai: z.string().regex(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, "Format waktu tidak valid (HH:MM)"),
  tandaTanganUrl: z.string().min(1, "Tanda tangan wajib diisi."),
});

type DaftarHadirFormData = z.infer<typeof daftarHadirSchema>;

export default function DaftarHadirPengawasPage() {
    const { toast } = useToast();
    const { userProfile } = useAuth();
    const router = useRouter();

    const [riwayat, setRiwayat] = useState<DaftarHadirPengawas[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hadirToDelete, setHadirToDelete] = useState<DaftarHadirPengawas | null>(null);

    const form = useForm<DaftarHadirFormData>({
        resolver: zodResolver(daftarHadirSchema),
        defaultValues: {
          tanggalUjian: new Date(),
          mataUjian: "",
          ruangUjian: "R-01",
          waktuMulai: "07:30",
          waktuSelesai: "09:30",
          tandaTanganUrl: "",
        },
    });

    const fetchRiwayat = useCallback(async () => {
        if (!userProfile) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await getDaftarHadirPengawas(userProfile);
            setRiwayat(data);
        } catch (err: any) {
            setError("Gagal memuat riwayat daftar hadir.");
            toast({ variant: "destructive", title: "Error", description: err.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast, userProfile]);

    useEffect(() => {
        if(userProfile) fetchRiwayat();
    }, [fetchRiwayat, userProfile]);
    
    useEffect(() => {
        if (userProfile) {
            form.setValue('tandaTanganUrl', userProfile.signatureUrl || "");
        }
    }, [userProfile, form]);

    const onSubmit = async (data: DaftarHadirFormData) => {
        if (!userProfile) return toast({ variant: "destructive", title: "Error", description: "Sesi Anda tidak valid." });
        
        try {
            await addDaftarHadirPengawas({ 
              ...data,
              tanggalUjian: Timestamp.fromDate(data.tanggalUjian),
              namaPengawas: userProfile.displayName || "Pengawas",
              createdByUid: userProfile.uid,
            });
            toast({ title: "Sukses", description: "Kehadiran Anda sebagai pengawas berhasil dicatat." });
            form.reset({
                tanggalUjian: new Date(),
                mataUjian: "",
                ruangUjian: "R-01",
                waktuMulai: "07:30",
                waktuSelesai: "09:30",
                tandaTanganUrl: userProfile.signatureUrl || "",
            });
            fetchRiwayat();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Gagal Menyimpan", description: err.message });
        }
    };
    
    const handleDelete = async () => {
        if (!hadirToDelete || !userProfile) return;
        try {
            await deleteDaftarHadirPengawas(hadirToDelete.id!, userProfile);
            toast({ title: "Sukses", description: "Catatan kehadiran berhasil dihapus." });
            setHadirToDelete(null);
            fetchRiwayat();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message });
        }
    };
    
    const handlePrint = (year: number, month: number) => {
        router.push(`/protected/administrasi-ujian/daftar-hadir/print?year=${year}&month=${month}`);
    };

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    return (
        <div className="space-y-6">
            <div><h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Daftar Hadir Pengawas Ujian</h1><p className="text-muted-foreground">Catat kehadiran Anda setiap kali mengawas ujian.</p></div>

            <Card>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardHeader><CardTitle>Formulir Kehadiran Pengawas</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <FormField
                                control={form.control}
                                name="tanggalUjian"
                                render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Tanggal Ujian</FormLabel>
                                    <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                        <Button
                                            variant={"outline"}
                                            className={cn("w-[240px] pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                                            {field.value ? (format(field.value, "PPP", {locale: indonesiaLocale})) : (<span>Pilih tanggal</span>)}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                    </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="mataUjian" render={({ field }) => (<FormItem><FormLabel>Mata Ujian</FormLabel><FormControl><Input placeholder="cth: Matematika" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="ruangUjian" render={({ field }) => (<FormItem><FormLabel>Ruang Ujian</FormLabel><FormControl><Input placeholder="cth: R-01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="waktuMulai" render={({ field }) => (<FormItem><FormLabel>Waktu Mulai</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="waktuSelesai" render={({ field }) => (<FormItem><FormLabel>Waktu Selesai</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                             <FormField control={form.control} name="tandaTanganUrl" render={({ field }) => (<FormItem><FormLabel>Tanda Tangan</FormLabel><FormControl><ImageUploadField value={field.value} onChange={field.onChange} folderPath={`signatures/${userProfile?.uid}`} /></FormControl><FormMessage /></FormItem>)} />
                        </CardContent>
                        <CardFooter className="gap-2">
                            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}Simpan Kehadiran</Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Riwayat Kehadiran Saya</CardTitle>
                        <CardDescription>Daftar kehadiran yang pernah Anda catat.</CardDescription>
                    </div>
                     <Button variant="outline" onClick={() => handlePrint(currentYear, currentMonth)}><Printer className="mr-2 h-4 w-4" /> Cetak Bulan Ini</Button>
                </CardHeader>
                <CardContent>
                    {isLoading ? (<Skeleton className="h-40 w-full" />)
                    : error ? (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>)
                    : riwayat.length === 0 ? (
                        <div className="text-center py-10"><ClipboardCheck className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-2 text-sm font-semibold">Belum Ada Riwayat</h3><p className="mt-1 text-sm text-muted-foreground">Anda belum mencatat kehadiran sebagai pengawas.</p></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table><TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Mata Ujian</TableHead><TableHead>Ruang</TableHead><TableHead>Waktu</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {riwayat.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{format(item.tanggalUjian.toDate(), "EEEE, dd MMM yyyy", { locale: indonesiaLocale })}</TableCell>
                                        <TableCell>{item.mataUjian}</TableCell>
                                        <TableCell>{item.ruangUjian}</TableCell>
                                        <TableCell>{`${item.waktuMulai} - ${item.waktuSelesai}`}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setHadirToDelete(item)}><Trash2 className="h-4 w-4"/></Button>
                                        </TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
            
            {hadirToDelete && (
                <AlertDialog open={!!hadirToDelete} onOpenChange={() => setHadirToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle><AlertDialogDescription>Apakah Anda yakin ingin menghapus catatan kehadiran ini? Tindakan ini tidak dapat diurungkan.</AlertDialogDescription></AlertDialogHeader>
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
