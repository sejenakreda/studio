
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, PlusCircle, Loader2, AlertCircle, ShieldAlert } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { getStudents, addPelanggaran, addActivityLog } from '@/lib/firestoreService';
import type { Siswa } from '@/types';
import { Combobox } from '@/components/ui/combobox';
import { format } from 'date-fns';

const pelanggaranSchema = z.object({
  id_siswa: z.string({ required_error: "Siswa harus dipilih." }).min(1, "Siswa harus dipilih."),
  tanggal: z.date({ required_error: "Tanggal harus diisi." }),
  pelanggaran: z.string().min(5, "Deskripsi pelanggaran minimal 5 karakter").max(200, "Maksimal 200 karakter"),
  poin: z.coerce.number().min(1, "Poin minimal 1").max(100, "Poin maksimal 100"),
  catatan: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
});

type PelanggaranFormData = z.infer<typeof pelanggaranSchema>;

export default function CatatPelanggaranPage() {
    const { toast } = useToast();
    const { userProfile } = useAuth();
    const [students, setStudents] = useState<Siswa[]>([]);
    const [isLoadingStudents, setIsLoadingStudents] = useState(true);

    const form = useForm<PelanggaranFormData>({
        resolver: zodResolver(pelanggaranSchema),
        defaultValues: {
            id_siswa: "",
            tanggal: new Date(),
            pelanggaran: "",
            poin: 1,
            catatan: "",
        },
    });

    const fetchStudentsList = useCallback(async () => {
        setIsLoadingStudents(true);
        try {
            const studentList = await getStudents();
            setStudents(studentList);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Gagal memuat daftar siswa." });
        } finally {
            setIsLoadingStudents(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchStudentsList();
    }, [fetchStudentsList]);

    const studentOptions = useMemo(() => {
        return students.map(s => ({ value: s.id_siswa, label: `${s.nama} - ${s.kelas} (NIS: ${s.nis})` }));
    }, [students]);

    const onSubmit = async (data: PelanggaranFormData) => {
        if (!userProfile) return toast({ variant: "destructive", title: "Error", description: "Sesi Anda tidak valid." });
        
        const selectedStudent = students.find(s => s.id_siswa === data.id_siswa);
        if (!selectedStudent) return toast({ variant: "destructive", title: "Error", description: "Siswa tidak ditemukan." });

        try {
            await addPelanggaran({
                id_siswa: selectedStudent.id_siswa,
                namaSiswa: selectedStudent.nama,
                kelasSiswa: selectedStudent.kelas,
                tanggal: data.tanggal as any,
                pelanggaran: data.pelanggaran,
                poin: data.poin,
                catatan: data.catatan || "",
                recordedByUid: userProfile.uid,
                recordedByName: userProfile.displayName || "Guru",
            });

            await addActivityLog("Pelanggaran Siswa Dicatat", `Siswa: ${selectedStudent.nama}, Pelanggaran: ${data.pelanggaran} (Poin: ${data.poin}) oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName!);
            toast({ title: "Sukses", description: "Catatan pelanggaran berhasil disimpan." });
            form.reset();

        } catch (err: any) {
             toast({ variant: "destructive", title: "Gagal Menyimpan", description: err.message });
        }
    };

    const dashboardLink = userProfile?.tugasTambahan?.includes('kesiswaan') ? '/protected/guru/kesiswaan' : '/protected/guru/bk';

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href={dashboardLink}>
                    <Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Catat Pelanggaran Siswa</h1>
                    <p className="text-muted-foreground">Formulir untuk mencatat pelanggaran yang dilakukan oleh siswa.</p>
                </div>
            </div>

             <Card>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardHeader>
                            <CardTitle>Formulir Pelanggaran</CardTitle>
                            <CardDescription>Isi semua detail yang diperlukan untuk mencatat pelanggaran.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="id_siswa"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Pilih Siswa</FormLabel>
                                        <Combobox
                                            options={studentOptions}
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="Cari nama atau NIS siswa..."
                                            loading={isLoadingStudents}
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="tanggal"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Tanggal Pelanggaran</FormLabel>
                                            <Input type="date" value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} onChange={(e) => field.onChange(e.target.valueAsDate)} />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="poin"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Poin Pelanggaran</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="pelanggaran"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Jenis/Deskripsi Pelanggaran</FormLabel>
                                        <FormControl><Textarea placeholder="cth: Tidak memakai atribut lengkap saat upacara" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="catatan"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Catatan/Tindak Lanjut (Opsional)</FormLabel>
                                        <FormControl><Textarea placeholder="cth: Diberi teguran lisan dan diminta melengkapi atribut" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                         <CardFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
                                Simpan Catatan
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
        </div>
    )
}
