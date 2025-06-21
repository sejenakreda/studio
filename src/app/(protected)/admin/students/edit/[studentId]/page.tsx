
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { useRouter, useParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription as FormDesc } from "@/components/ui/form";
import { ArrowLeft, Save, Loader2, AlertCircle, Users } from "lucide-react";
import { getStudentById, updateStudent, addActivityLog } from '@/lib/firestoreService';
import type { Siswa, TugasTambahan } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

const kegiatanOptions: { id: TugasTambahan; label: string }[] = [
    { id: 'pembina_osis', label: 'OSIS' },
    { id: 'pembina_eskul_pmr', label: 'Ekstrakurikuler PMR' },
    { id: 'pembina_eskul_paskibra', label: 'Ekstrakurikuler Paskibra' },
    { id: 'pembina_eskul_pramuka', label: 'Ekstrakurikuler Pramuka' },
    { id: 'pembina_eskul_karawitan', label: 'Ekstrakurikuler Karawitan' },
    { id: 'pembina_eskul_pencak_silat', label: 'Ekstrakurikuler Pencak Silat' },
    { id: 'pembina_eskul_volly_ball', label: 'Ekstrakurikuler Volly Ball' },
];

const editStudentSchema = z.object({
  nama: z.string().min(3, "Nama minimal 3 karakter"),
  kelas: z.string().min(1, "Kelas tidak boleh kosong"),
  kegiatan: z.array(z.string()).optional().default([]),
});

type EditStudentFormData = z.infer<typeof editStudentSchema>;

export default function AdminEditStudentPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const studentDocumentId = params.studentId as string; 
  const { userProfile: currentAdminProfile } = useAuth();

  const [studentData, setStudentData] = useState<Siswa | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const form = useForm<EditStudentFormData>({
    resolver: zodResolver(editStudentSchema),
    defaultValues: {
      nama: "",
      kelas: "",
      kegiatan: [],
    },
  });

  const fetchStudentData = useCallback(async (docId: string) => {
    if (!docId) {
      setIsLoadingData(false);
      setFetchError("ID Dokumen Siswa tidak valid.");
      toast({ variant: "destructive", title: "Error", description: "ID Dokumen Siswa tidak ditemukan." });
      router.push('/admin/students'); 
      return;
    }
    setIsLoadingData(true);
    setFetchError(null);
    try {
      const fetchedStudent = await getStudentById(docId);
      if (fetchedStudent) {
        setStudentData(fetchedStudent);
        form.reset({
          nama: fetchedStudent.nama,
          kelas: fetchedStudent.kelas,
          kegiatan: fetchedStudent.kegiatan || [],
        });
      } else {
        setFetchError("Data siswa tidak ditemukan.");
        toast({ variant: "destructive", title: "Error", description: "Data siswa tidak ditemukan." });
        router.push('/admin/students');
      }
    } catch (error) {
      console.error("Error fetching student data:", error);
      setFetchError("Gagal memuat data siswa. Silakan coba lagi.");
      toast({ variant: "destructive", title: "Error", description: "Gagal memuat data siswa." });
    } finally {
      setIsLoadingData(false);
    }
  }, [toast, form, router]);

  useEffect(() => {
    if (studentDocumentId) {
      fetchStudentData(studentDocumentId);
    }
  }, [studentDocumentId, fetchStudentData]);

  const onSubmit = async (data: EditStudentFormData) => {
    if (!studentDocumentId || !studentData || !currentAdminProfile) {
      toast({ variant: "destructive", title: "Error", description: "Data siswa atau admin tidak lengkap untuk pembaruan." });
      return;
    }
    setIsSubmitting(true);
    try {
      await updateStudent(studentDocumentId, {
        nama: data.nama,
        kelas: data.kelas,
        kegiatan: data.kegiatan,
      });

      const oldKegiatan = studentData.kegiatan?.join(', ') || 'N/A';
      const newKegiatan = data.kegiatan?.join(', ') || 'N/A';
      let logDetails = `Data Siswa ${studentData.nama} (NIS: ${studentData.nis}) diubah.`;
      if (studentData.nama !== data.nama) logDetails += ` Nama: ${studentData.nama} -> ${data.nama}.`;
      if (studentData.kelas !== data.kelas) logDetails += ` Kelas: ${studentData.kelas} -> ${data.kelas}.`;
      if (oldKegiatan !== newKegiatan) logDetails += ` Kegiatan: ${oldKegiatan} -> ${newKegiatan}.`;
      logDetails += ` Oleh Admin: ${currentAdminProfile.displayName || currentAdminProfile.email}`;

      await addActivityLog(
        "Data Siswa Diperbarui (Admin)",
        logDetails,
        currentAdminProfile.uid,
        currentAdminProfile.displayName || currentAdminProfile.email || "Admin"
      );
      toast({ title: "Sukses", description: `Data siswa ${data.nama} berhasil diperbarui.` });
      router.push('/admin/students');
    } catch (error: any) {
      console.error("Error updating student:", error);
      toast({ variant: "destructive", title: "Error", description: "Gagal memperbarui data siswa. Silakan coba lagi." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div><Skeleton className="h-8 w-64 mb-2 rounded-md" /><Skeleton className="h-5 w-80 rounded-md" /></div>
        </div>
        <Card><CardHeader><Skeleton className="h-7 w-48 mb-2 rounded-md" /><Skeleton className="h-4 w-72 rounded-md" /></CardHeader>
          <CardContent className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-5 w-32 rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ))}
          </CardContent>
          <CardFooter><Skeleton className="h-10 w-28 rounded-md" /></CardFooter>
        </Card>
      </div>
    );
  }

  if (fetchError || !studentData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/students">
            <Button variant="outline" size="icon" aria-label="Kembali ke Daftar Siswa">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div><h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Error Memuat Data</h1></div>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat</AlertTitle>
          <AlertDescription>{fetchError || "Data siswa tidak ditemukan. Silakan kembali dan coba lagi."}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/admin/students')}>Kembali ke Daftar Siswa</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/students">
          <Button variant="outline" size="icon" aria-label="Kembali ke Daftar Siswa">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Edit Data Siswa (Admin)</h1>
          <p className="text-muted-foreground">
            Perbarui detail siswa <span className="font-semibold">{studentData.nama}</span>.
          </p>
        </div>
      </div>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Form Edit Siswa</CardTitle>
              <CardDescription>Ubah nama, kelas, atau keanggotaan kegiatan siswa. NIS dan ID Siswa tidak dapat diubah.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="nama"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Lengkap Siswa</FormLabel>
                    <FormControl>
                      <Input placeholder="cth: Ayu Lestari" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>NIS (Nomor Induk Siswa)</FormLabel>
                <FormControl>
                  <Input value={studentData.nis} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
                </FormControl>
                <FormDesc>NIS tidak dapat diubah.</FormDesc>
              </FormItem>
              <FormField
                control={form.control}
                name="kelas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kelas</FormLabel>
                    <FormControl>
                      <Input placeholder="cth: X IPA 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>ID Siswa</FormLabel>
                <FormControl>
                  <Input value={studentData.id_siswa} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
                </FormControl>
                <FormDesc>ID Siswa tidak dapat diubah.</FormDesc>
              </FormItem>

              <FormField
                control={form.control}
                name="kegiatan"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary"/>
                        Keanggotaan Kegiatan Siswa
                      </FormLabel>
                      <FormDesc>Pilih kegiatan yang diikuti oleh siswa ini. Ini mungkin memengaruhi komponen nilai tambahan.</FormDesc>
                    </div>
                    <ScrollArea className="h-40 w-full rounded-md border p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {kegiatanOptions.map((item) => (
                          <FormField
                            key={item.id}
                            control={form.control}
                            name="kegiatan"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={item.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), item.id])
                                          : field.onChange(
                                              (field.value || []).filter(
                                                (value) => value !== item.id
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {item.label}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Simpan Perubahan
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}

    