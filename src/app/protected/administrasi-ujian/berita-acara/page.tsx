"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { PlusCircle, Loader2, AlertCircle, Trash2, Edit, FileSignature, Image as ImageIcon, Printer } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';
import { addBeritaAcara, getBeritaAcara, deleteBeritaAcara, updateBeritaAcara } from '@/lib/firestoreService';
import type { BeritaAcaraUjian } from '@/types';
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


const beritaAcaraSchema = z.object({
  jenisUjian: z.string().min(3, "Jenis ujian minimal 3 karakter"),
  tahunPelajaran: z.string().min(9, "Format tahun pelajaran tidak sesuai, cth: 2023/2024").regex(/^\d{4}\/\d{4}$/, "Format harus YYYY/YYYY"),
  mataUjian: z.string().min(3, "Mata ujian minimal 3 karakter"),
  
  hari: z.string().min(1, "Hari harus diisi"),
  tanggal: z.coerce.number().min(1).max(31),
  bulan: z.string().min(1, "Bulan harus diisi"),
  tahun: z.coerce.number().min(new Date().getFullYear() - 5),

  waktuMulai: z.string().regex(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, "Format waktu tidak valid (HH:MM)"),
  waktuSelesai: z.string().regex(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, "Format waktu tidak valid (HH:MM)"),
  ruangUjian: z.string().min(1, "Ruang ujian harus diisi"),
  
  kelasDigabung: z.string().optional(),

  jumlahPesertaX: z.coerce.number().min(0).default(0),
  jumlahPesertaXI: z.coerce.number().min(0).default(0),
  jumlahPesertaXII: z.coerce.number().min(0).default(0),
  
  jumlahTidakHadirManual: z.coerce.number().min(0, "Jumlah tidak boleh negatif").default(0),
  
  pesertaHadirNomor: z.string().optional(),
  pesertaTidakHadirNomor: z.string().optional(),
  
  jumlahDaftarHadir: z.coerce.number().min(0).default(0),
  jumlahBeritaAcara: z.coerce.number().min(0).default(0),

  catatanUjian: z.string().optional(),
  pengawasNama: z.string().min(3, "Nama pengawas harus diisi"),
  pengawasTandaTanganUrl: z.string().optional(),
});

type BeritaAcaraFormData = z.infer<typeof beritaAcaraSchema>;

function getIndonesianMonthName(monthNumber: number): string {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return months[monthNumber - 1] || '';
}

function getDayName(date: Date): string {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[date.getDay()];
}

export default function BeritaAcaraPage() {
    const { toast } = useToast();
    const { userProfile, isKurikulum } = useAuth();
    const router = useRouter();

    const [riwayat, setRiwayat] = useState<BeritaAcaraUjian[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingBeritaAcara, setEditingBeritaAcara] = useState<BeritaAcaraUjian | null>(null);
    const [beritaAcaraToDelete, setBeritaAcaraToDelete] = useState<BeritaAcaraUjian | null>(null);

    const form = useForm<BeritaAcaraFormData>({
        resolver: zodResolver(beritaAcaraSchema),
        defaultValues: {
          jenisUjian: "Sumatif Akhir Semester (SAS)",
          tahunPelajaran: "2025/2026",
          mataUjian: "",
          tanggal: new Date().getDate(),
          bulan: getIndonesianMonthName(new Date().getMonth() + 1),
          tahun: new Date().getFullYear(),
          hari: getDayName(new Date()),
          waktuMulai: "07:30",
          waktuSelesai: "09:30",
          ruangUjian: "R-01",
          kelasDigabung: "",
          jumlahPesertaX: 0,
          jumlahPesertaXI: 0,
          jumlahPesertaXII: 0,
          jumlahTidakHadirManual: 0,
          pesertaHadirNomor: "",
          pesertaTidakHadirNomor: "",
          jumlahDaftarHadir: 1,
          jumlahBeritaAcara: 1,
          catatanUjian: "",
          pengawasNama: userProfile?.displayName || "",
          pengawasTandaTanganUrl: "",
        },
    });

    const fetchRiwayat = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (!userProfile) return;
            const data = await getBeritaAcara(userProfile);
            setRiwayat(data);
        } catch (err: any) {
            setError("Gagal memuat riwayat berita acara.");
            toast({ variant: "destructive", title: "Error", description: err.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast, userProfile]);

    useEffect(() => {
        if(userProfile) fetchRiwayat();
    }, [fetchRiwayat, userProfile]);

    useEffect(() => {
        if (userProfile && !editingBeritaAcara) {
           form.setValue('pengawasNama', userProfile.displayName || "");
        }
    }, [userProfile, editingBeritaAcara, form]);

    const { watch } = form;
    const watchedValues = watch(["jumlahPesertaX", "jumlahPesertaXI", "jumlahPesertaXII", "jumlahTidakHadirManual"]);

    const [totalPeserta, jumlahHadir] = useMemo(() => {
        const [jx, jxi, jxii, tidakHadirManual] = watchedValues;
        const total = (Number(jx) || 0) + (Number(jxi) || 0) + (Number(jxii) || 0);
        const hadirCount = total - (Number(tidakHadirManual) || 0);
        return [total, Math.max(0, hadirCount)];
    }, [watchedValues]);


    const onSubmit = async (data: BeritaAcaraFormData) => {
        if (!userProfile) return toast({ variant: "destructive", title: "Error", description: "Sesi Anda tidak valid." });
        
        const payload: Omit<BeritaAcaraUjian, 'id' | 'createdAt' | 'updatedAt'> = {
            ...data,
            createdByUid: userProfile.uid,
            createdByDisplayName: userProfile.displayName || 'Pengawas',
        };

        try {
            if (editingBeritaAcara) {
                await updateBeritaAcara(editingBeritaAcara.id!, payload);
                toast({ title: "Sukses", description: "Berita acara berhasil diperbarui." });
            } else {
                await addBeritaAcara(payload);
                toast({ title: "Sukses", description: "Berita acara berhasil disimpan." });
            }
            form.reset({
                ...form.getValues(),
                jenisUjian: "Sumatif Akhir Semester (SAS)",
                mataUjian: "",
                ruangUjian: "R-01",
                kelasDigabung: "",
                jumlahPesertaX: 0,
                jumlahPesertaXI: 0,
                jumlahPesertaXII: 0,
                jumlahTidakHadirManual: 0,
                pesertaHadirNomor: "",
                pesertaTidakHadirNomor: "",
                catatanUjian: "",
                pengawasTandaTanganUrl: "",
            });
            setEditingBeritaAcara(null);
            fetchRiwayat();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Gagal Menyimpan", description: err.message });
        }
    };
    
    const handleEdit = (data: BeritaAcaraUjian) => {
        setEditingBeritaAcara(data);
        form.reset({
            ...data,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async () => {
        if (!beritaAcaraToDelete || !userProfile) return;
        try {
            await deleteBeritaAcara(beritaAcaraToDelete.id!, userProfile);
            toast({ title: "Sukses", description: "Berita acara berhasil dihapus." });
            setBeritaAcaraToDelete(null);
            fetchRiwayat();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message });
        }
    };
    
    const handlePrint = (id: string) => {
        router.push(`/protected/administrasi-ujian/berita-acara/print/${id}`);
    };

    return (
        <div className="space-y-6">
            <div><h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Berita Acara Ujian</h1><p className="text-muted-foreground">Buat, kelola, dan cetak berita acara pelaksanaan ujian.</p></div>

            <Card>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardHeader><CardTitle>{editingBeritaAcara ? 'Edit Berita Acara' : 'Buat Berita Acara Baru'}</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="jenisUjian" render={({ field }) => (<FormItem><FormLabel>Jenis Ujian</FormLabel><FormControl><Input placeholder="cth: Sumatif Akhir Semester (SAS)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="tahunPelajaran" render={({ field }) => (<FormItem><FormLabel>Tahun Pelajaran</FormLabel><FormControl><Input placeholder="cth: 2025/2026" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                             <FormField control={form.control} name="mataUjian" render={({ field }) => (<FormItem><FormLabel>Mata Pelajaran</FormLabel><FormControl><Input placeholder="cth: Matematika" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <FormField control={form.control} name="hari" render={({ field }) => (<FormItem><FormLabel>Hari</FormLabel><FormControl><Input placeholder="cth: Senin" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="tanggal" render={({ field }) => (<FormItem><FormLabel>Tanggal</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="bulan" render={({ field }) => (<FormItem><FormLabel>Bulan</FormLabel><FormControl><Input placeholder="cth: Desember" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="tahun" render={({ field }) => (<FormItem><FormLabel>Tahun</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="waktuMulai" render={({ field }) => (<FormItem><FormLabel>Waktu Mulai</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="waktuSelesai" render={({ field }) => (<FormItem><FormLabel>Waktu Selesai</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="ruangUjian" render={({ field }) => (<FormItem><FormLabel>Ruang Ujian</FormLabel><FormControl><Input placeholder="cth: R-01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                             <FormField control={form.control} name="kelasDigabung" render={({ field }) => (<FormItem><FormLabel>Kelas Digabung (Opsional)</FormLabel><FormControl><Input placeholder="cth: X-1, X-2, X-3" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="jumlahPesertaX" render={({ field }) => (<FormItem><FormLabel>Jumlah Peserta Kelas X</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="jumlahPesertaXI" render={({ field }) => (<FormItem><FormLabel>Jumlah Peserta Kelas XI</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="jumlahPesertaXII" render={({ field }) => (<FormItem><FormLabel>Jumlah Peserta Kelas XII</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md">
                                <div className="font-medium">Total Seharusnya: <span className="font-bold">{totalPeserta}</span> orang</div>
                                <FormField control={form.control} name="jumlahTidakHadirManual" render={({ field }) => (<FormItem><FormLabel>Jumlah Tidak Hadir</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <div className="font-medium">Jumlah Hadir: <span className="font-bold text-green-600">{jumlahHadir}</span> orang</div>
                            </div>
                            <FormField control={form.control} name="pesertaHadirNomor" render={({ field }) => (<FormItem><FormLabel>Nomor / Nama Peserta Hadir (Opsional)</FormLabel><FormControl><Textarea placeholder="Pisahkan dengan koma, cth: 001, 002, Budi, Ani" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="pesertaTidakHadirNomor" render={({ field }) => (<FormItem><FormLabel>Nomor / Nama Peserta Tidak Hadir (Opsional)</FormLabel><FormControl><Textarea placeholder="Pisahkan dengan koma, cth: 003 (Sakit), Susi (Izin)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="jumlahDaftarHadir" render={({ field }) => (<FormItem><FormLabel>Jumlah Daftar Hadir</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="jumlahBeritaAcara" render={({ field }) => (<FormItem><FormLabel>Jumlah Berita Acara</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                             <FormField control={form.control} name="pengawasNama" render={({ field }) => (<FormItem><FormLabel>Nama Pengawas</FormLabel><FormControl><Input placeholder="Nama lengkap pengawas..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="pengawasTandaTanganUrl" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><ImageIcon className="h-4 w-4"/> Tanda Tangan Pengawas (Opsional)</FormLabel><FormControl><ImageUploadField value={field.value} onChange={field.onChange} folderPath="tanda-tangan-pengawas" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="catatanUjian" render={({ field }) => (<FormItem><FormLabel>Catatan Selama Ujian (Opsional)</FormLabel><FormControl><Textarea placeholder="Catatan kejadian penting selama ujian..." {...field} rows={5} /></FormControl><FormMessage /></FormItem>)} />
                        </CardContent>
                        <CardFooter className="gap-2">
                            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}{editingBeritaAcara ? 'Simpan Perubahan' : 'Simpan Berita Acara'}</Button>
                            {editingBeritaAcara && (<Button variant="outline" onClick={() => { setEditingBeritaAcara(null); form.reset(); }}>Batal Edit</Button>)}
                        </CardFooter>
                    </form>
                </Form>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Riwayat Berita Acara</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (<Skeleton className="h-40 w-full" />)
                    : error ? (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>)
                    : riwayat.length === 0 ? (
                        <div className="text-center py-10"><FileSignature className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-2 text-sm font-semibold">Belum Ada Riwayat</h3><p className="mt-1 text-sm text-muted-foreground">Anda belum membuat berita acara.</p></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table><TableHeader><TableRow><TableHead>Jenis Ujian</TableHead><TableHead>Mata Ujian</TableHead><TableHead>Tanggal</TableHead><TableHead>Oleh</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {riwayat.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.jenisUjian}</TableCell>
                                        <TableCell>{item.mataUjian}</TableCell>
                                        <TableCell>{`${item.tanggal} ${item.bulan} ${item.tahun}`}</TableCell>
                                        <TableCell>{item.createdByDisplayName}</TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Button variant="outline" size="icon" onClick={() => handlePrint(item.id!)}><Printer className="h-4 w-4"/></Button>
                                            {(userProfile?.role === 'admin' || userProfile?.uid === item.createdByUid || isKurikulum) && (
                                                <>
                                                <Button variant="outline" size="icon" onClick={() => handleEdit(item)}><Edit className="h-4 w-4"/></Button>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setBeritaAcaraToDelete(item)}><Trash2 className="h-4 w-4"/></Button>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
            
            {beritaAcaraToDelete && (
                <AlertDialog open={!!beritaAcaraToDelete} onOpenChange={() => setBeritaAcaraToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle><AlertDialogDescription>Apakah Anda yakin ingin menghapus berita acara untuk mata ujian <span className="font-bold">{beritaAcaraToDelete.mataUjian}</span>? Tindakan ini tidak dapat diurungkan.</AlertDialogDescription></AlertDialogHeader>
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
