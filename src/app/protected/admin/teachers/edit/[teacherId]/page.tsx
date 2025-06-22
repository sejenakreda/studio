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
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Loader2, AlertCircle, UserCog, BookOpen, Briefcase } from "lucide-react";
import { getUserProfile, updateUserProfile, addActivityLog, getMataPelajaranMaster } from '@/lib/firestoreService';
import type { UserProfile, MataPelajaranMaster, TugasTambahan } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';

const editTeacherSchema = z.object({
  displayName: z.string().min(3, "Nama tampilan minimal 3 karakter"),
  assignedMapel: z.array(z.string()).optional().default([]),
  tugasTambahan: z.array(z.string()).optional().default([]),
});

type EditTeacherFormData = z.infer<typeof editTeacherSchema>;

const strukturalOptions: { id: TugasTambahan; label: string }[] = [
    { id: 'kepala_sekolah', label: 'Kepala Sekolah' },
    { id: 'kurikulum', label: 'Wakasek Kurikulum' },
    { id: 'kesiswaan', label: 'Wakasek Kesiswaan' },
    { id: 'bendahara', label: 'Bendahara' },
];

const stafOptions: { id: TugasTambahan; label: string }[] = [
    { id: 'operator', label: 'Operator' },
    { id: 'bk', label: 'Guru BK' },
    { id: 'kepala_tata_usaha', label: 'Kepala Tata Usaha' },
    { id: 'staf_tu', label: 'Staf Tata Usaha' },
];

const keamananOptions: { id: TugasTambahan; label: string }[] = [
    { id: 'satpam', label: 'Satpam' },
    { id: 'penjaga_sekolah', label: 'Penjaga Sekolah' },
];

const pembinaOptions: { id: TugasTambahan; label: string }[] = [
    { id: 'pembina_osis', label: 'Pembina OSIS' },
    { id: 'pembina_eskul_pmr', label: 'Pembina Eskul PMR' },
    { id: 'pembina_eskul_paskibra', label: 'Pembina Eskul Paskibra' },
    { id: 'pembina_eskul_pramuka', label: 'Pembina Eskul Pramuka' },
    { id: 'pembina_eskul_karawitan', label: 'Pembina Eskul Karawitan' },
    { id: 'pembina_eskul_pencak_silat', label: 'Pembina Eskul Pencak Silat' },
    { id: 'pembina_eskul_volly_ball', label: 'Pembina Eskul Volly Ball' },
];

export default function EditTeacherPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const teacherId = params.teacherId as string; 
  const { userProfile: currentAdminProfile } = useAuth();

  const [teacherData, setTeacherData] = useState<UserProfile | null>(null);
  const [masterMapelList, setMasterMapelList] = useState<MataPelajaranMaster[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingMapel, setIsLoadingMapel] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const form = useForm<EditTeacherFormData>({
    resolver: zodResolver(editTeacherSchema),
    defaultValues: {
      displayName: "",
      assignedMapel: [],
      tugasTambahan: [],
    },
  });

  const fetchInitialData = useCallback(async (id: string) => {
    if (!id) {
      setIsLoadingData(false);
      setFetchError("ID Guru tidak valid.");
      toast({ variant: "destructive", title: "Error", description: "ID Guru tidak ditemukan." });
      router.push('/protected/admin/teachers'); 
      return;
    }
    setIsLoadingData(true);
    setIsLoadingMapel(true);
    setFetchError(null);
    try {
      const [fetchedTeacher, fetchedMasterMapel] = await Promise.all([
        getUserProfile(id),
        getMataPelajaranMaster()
      ]);
      
      if (fetchedTeacher && fetchedTeacher.role === 'guru') {
        setTeacherData(fetchedTeacher);
        form.reset({
          displayName: fetchedTeacher.displayName || "",
          assignedMapel: fetchedTeacher.assignedMapel || [],
          tugasTambahan: fetchedTeacher.tugasTambahan || [],
        });
      } else {
        setFetchError("Data guru tidak ditemukan atau peran tidak sesuai.");
        toast({ variant: "destructive", title: "Error", description: "Data guru tidak ditemukan." });
        router.push('/protected/admin/teachers');
      }
      setMasterMapelList(fetchedMasterMapel || []);
    } catch (error) {
      console.error("Error fetching initial data for edit teacher:", error);
      setFetchError("Gagal memuat data guru atau daftar mapel. Silakan coba lagi.");
      toast({ variant: "destructive", title: "Error", description: "Gagal memuat data." });
    } finally {
      setIsLoadingData(false);
      setIsLoadingMapel(false);
    }
  }, [toast, form, router]);

  useEffect(() => {
    if (teacherId) {
      fetchInitialData(teacherId);
    }
  }, [teacherId, fetchInitialData]);

  const onSubmit = async (data: EditTeacherFormData) => {
    if (!teacherId || !teacherData || !currentAdminProfile?.uid || !currentAdminProfile?.displayName) {
      toast({ variant: "destructive", title: "Error", description: "Data guru atau admin tidak lengkap untuk pembaruan." });
      return;
    }
    setIsSubmitting(true);
    try {
      // Filter out the old generic 'pembina_eskul' value before saving.
      const cleanedTugasTambahan = (data.tugasTambahan || []).filter(
        tugas => tugas !== 'pembina_eskul'
      );

      await updateUserProfile(teacherId, {
        displayName: data.displayName,
        assignedMapel: data.assignedMapel || [], 
        tugasTambahan: cleanedTugasTambahan as TugasTambahan[],
      });

      const oldMapel = teacherData.assignedMapel?.join(', ') || 'N/A';
      const newMapel = data.assignedMapel?.join(', ') || 'N/A';
      
      // Use the cleaned array for logging as well to avoid false positives.
      const oldTugas = teacherData.tugasTambahan?.filter(t => t !== 'pembina_eskul').join(', ') || 'N/A';
      const newTugas = cleanedTugasTambahan.join(', ') || 'N/A';
      
      let logDetails = `Profil Guru ${teacherData.email}: Nama -> ${data.displayName}.`;
      if (oldMapel !== newMapel) logDetails += ` Mapel: ${oldMapel} -> ${newMapel}.`;
      if (oldTugas !== newTugas) logDetails += ` Tugas: ${oldTugas} -> ${newTugas}.`;
      logDetails += ` Oleh Admin: ${currentAdminProfile.displayName}`;

      await addActivityLog(
        "Profil & Tugas Guru Diperbarui",
        logDetails,
        currentAdminProfile.uid,
        currentAdminProfile.displayName
      );

      toast({ title: "Sukses", description: "Data guru " + data.displayName + " berhasil diperbarui." });
      router.push('/protected/admin/teachers');
    } catch (error: any) {
      console.error("Error updating teacher:", error);
      toast({ variant: "destructive", title: "Error", description: "Gagal memperbarui data guru. Silakan coba lagi." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCheckboxGroup = (options: {id: TugasTambahan, label: string}[]) => {
     return options.map((tugasItem) => (
        <FormField
            key={tugasItem.id}
            control={form.control}
            name="tugasTambahan"
            render={({ field }) => (
                <FormItem
                key={tugasItem.id}
                className="flex flex-row items-start space-x-3 space-y-0"
                >
                <FormControl>
                    <Checkbox
                    checked={field.value?.includes(tugasItem.id)}
                    onCheckedChange={(checked) => {
                        return checked
                        ? field.onChange([...(field.value || []), tugasItem.id])
                        : field.onChange(
                            (field.value || []).filter(
                                (value) => value !== tugasItem.id
                            )
                            )
                    }}
                    />
                </FormControl>
                <FormLabel className="text-sm font-normal">
                    {tugasItem.label}
                </FormLabel>
                </FormItem>
            )}
        />
        ));
  }


  if (isLoadingData || isLoadingMapel) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div><Skeleton className="h-8 w-64 mb-2 rounded-md" /><Skeleton className="h-5 w-80 rounded-md" /></div>
        </div>
        <Card><CardHeader><Skeleton className="h-7 w-48 mb-2 rounded-md" /><Skeleton className="h-4 w-72 rounded-md" /></CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-5 w-32 rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ))}
            <Skeleton className="h-20 w-full rounded-md mt-4" /> 
          </CardContent>
          <CardFooter><Skeleton className="h-10 w-28 rounded-md" /></CardFooter>
        </Card>
      </div>
    );
  }

  if (fetchError || !teacherData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/protected/admin/teachers">
            <Button variant="outline" size="icon" aria-label="Kembali ke Daftar Guru">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div><h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Error Memuat Data</h1></div>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat</AlertTitle>
          <AlertDescription>{fetchError || "Data guru tidak ditemukan. Silakan kembali dan coba lagi."}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/protected/admin/teachers')}>Kembali ke Daftar Guru</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/protected/admin/teachers">
          <Button variant="outline" size="icon" aria-label="Kembali ke Daftar Guru">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Edit Data Guru & Tugas</h1>
          <p className="text-muted-foreground">
            Perbarui nama, mata pelajaran, dan tugas tambahan untuk guru <span className="font-semibold">{teacherData.displayName}</span>.
          </p>
        </div>
      </div>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-6 w-6 text-primary" /> Form Edit Profil Guru
              </CardTitle>
              <CardDescription>Ubah nama, mapel yang diajarkan, dan tugas tambahan. Email dan peran tidak dapat diubah.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className='space-y-6'>
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Tampilan Guru</FormLabel>
                      <FormControl>
                        <Input placeholder="cth: Budi Sudarsono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>Email Guru</FormLabel>
                  <FormControl>
                    <Input value={teacherData.email || ""} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
                  </FormControl>
                  <FormDesc>Email tidak dapat diubah.</FormDesc>
                </FormItem>
              </div>

              <FormField
                control={form.control}
                name="assignedMapel"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary"/>
                        Tugaskan Mata Pelajaran
                      </FormLabel>
                      <FormDesc>Pilih mata pelajaran yang akan diajarkan oleh guru ini. Daftar mapel diambil dari Pengaturan Master Mapel.</FormDesc>
                    </div>
                    {isLoadingMapel ? (
                         <Skeleton className="h-40 w-full rounded-md border p-4" />
                    ) : masterMapelList.length === 0 ? (
                        <Alert variant="default">
                            <BookOpen className="h-4 w-4"/>
                            <AlertTitle>Belum Ada Master Mapel</AlertTitle>
                            <AlertDescription>
                                Belum ada mata pelajaran yang terdaftar di sistem. Silakan tambahkan terlebih dahulu melalui menu "Kelola Mapel".
                                <Link href="/protected/admin/mapel" className="ml-2 text-primary hover:underline">
                                    Kelola Mapel Sekarang
                                </Link>
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <ScrollArea className="h-40 w-full rounded-md border p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(masterMapelList || []).map((mapelItem) => (
                            <FormField
                                key={mapelItem.id}
                                control={form.control}
                                name="assignedMapel"
                                render={({ field }) => (
                                    <FormItem
                                    key={mapelItem.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                    <FormControl>
                                        <Checkbox
                                        checked={field.value?.includes(mapelItem.namaMapel)}
                                        onCheckedChange={(checked) => {
                                            return checked
                                            ? field.onChange([...(field.value || []), mapelItem.namaMapel])
                                            : field.onChange(
                                                (field.value || []).filter(
                                                    (value) => value !== mapelItem.namaMapel
                                                )
                                                )
                                        }}
                                        />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal">
                                        {mapelItem.namaMapel}
                                    </FormLabel>
                                    </FormItem>
                                )}
                            />
                            ))}
                        </div>
                        </ScrollArea>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

               <FormField
                control={form.control}
                name="tugasTambahan"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary"/>
                        Tugaskan Tugas Tambahan
                      </FormLabel>
                      <FormDesc>Pilih tugas tambahan yang diemban oleh guru ini. Ini akan membuka akses ke menu khusus.</FormDesc>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <h4 className="font-semibold text-muted-foreground mb-2 text-sm">Struktural</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 p-4 border rounded-md">
                                {renderCheckboxGroup(strukturalOptions)}
                            </div>
                        </div>
                         <div>
                            <h4 className="font-semibold text-muted-foreground mb-2 text-sm">Staf</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 p-4 border rounded-md">
                                {renderCheckboxGroup(stafOptions)}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold text-muted-foreground mb-2 text-sm">Keamanan</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 p-4 border rounded-md">
                                {renderCheckboxGroup(keamananOptions)}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold text-muted-foreground mb-2 text-sm">Pembina Kegiatan & Ekstrakurikuler</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 p-4 border rounded-md">
                                {renderCheckboxGroup(pembinaOptions)}
                            </div>
                        </div>
                    </div>
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
