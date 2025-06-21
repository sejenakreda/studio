
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Save, Loader2, AlertCircle, Users, UserSquare, Briefcase, GraduationCap, School, PlusCircle, Trash2 } from "lucide-react";
import { getSchoolProfile, updateSchoolProfile, addActivityLog } from '@/lib/firestoreService';
import type { SchoolProfile, ClassDetail, SaranaDetail } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';

const classDetailSchema = z.object({
  className: z.string(),
  male: z.coerce.number().min(0, "Min 0").default(0),
  female: z.coerce.number().min(0, "Min 0").default(0),
});

const saranaDetailSchema = z.object({
  name: z.string().min(1, "Nama sarana tidak boleh kosong"),
  quantity: z.coerce.number().min(0, "Min 0").default(0),
  isCustom: z.boolean().optional().default(false),
});

const schoolProfileSchema = z.object({
  totalAlumni: z.coerce.number().min(0, "Nilai tidak boleh negatif").default(0),
  totalGuru: z.coerce.number().min(0, "Nilai tidak boleh negatif").default(0),
  totalTendik: z.coerce.number().min(0, "Nilai tidak boleh negatif").default(0),
  classDetails: z.array(classDetailSchema),
  sarana: z.array(saranaDetailSchema),
});

type SchoolProfileFormData = z.infer<typeof schoolProfileSchema>;

const PREDEFINED_CLASSES = ["X-1", "X-2", "X-3", "X-4", "XI-1", "XI-2", "XI-3", "XII-1", "XII-2", "XII-3"];
const DEFAULT_SARANA: SaranaDetail[] = [
    { name: "Ruang Kelas", quantity: 0, isCustom: false },
    { name: "Laboratorium", quantity: 0, isCustom: false },
    { name: "Perpustakaan", quantity: 0, isCustom: false },
    { name: "Toilet", quantity: 0, isCustom: false },
];

export default function ManageSchoolProfilePage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const form = useForm<SchoolProfileFormData>({
    resolver: zodResolver(schoolProfileSchema),
    defaultValues: {
      totalAlumni: 0, totalGuru: 0, totalTendik: 0,
      classDetails: PREDEFINED_CLASSES.map(name => ({ className: name, male: 0, female: 0 })),
      sarana: [...DEFAULT_SARANA],
    },
  });

  const { fields: saranaFields, append: appendSarana, remove: removeSarana } = useFieldArray({
    control: form.control,
    name: "sarana",
  });
  
  const watchedClassDetails = useWatch({ control: form.control, name: "classDetails" });
  const totalSiswaAktif = React.useMemo(() => {
    return (watchedClassDetails || []).reduce((sum, current) => sum + (current.male || 0) + (current.female || 0), 0);
  }, [watchedClassDetails]);

  useEffect(() => {
    async function fetchProfile() {
      setIsLoadingData(true);
      setFetchError(null);
      try {
        const currentProfile = await getSchoolProfile();
        if (currentProfile) {
          const classDetailsMap = new Map(currentProfile.classDetails.map(cd => [cd.className, cd]));
          const mergedClassDetails = PREDEFINED_CLASSES.map(name =>
            classDetailsMap.get(name) || { className: name, male: 0, female: 0 }
          );

          form.reset({
              totalAlumni: currentProfile.totalAlumni || 0,
              totalGuru: currentProfile.totalGuru || 0,
              totalTendik: currentProfile.totalTendik || 0,
              classDetails: mergedClassDetails,
              sarana: (currentProfile.sarana && currentProfile.sarana.length > 0) ? currentProfile.sarana : [...DEFAULT_SARANA],
          });
        }
      } catch (error: any) {
        console.error("Error fetching school profile:", error);
        setFetchError("Gagal memuat data profil sekolah. Silakan coba lagi.");
        toast({ variant: "destructive", title: "Error", description: "Gagal memuat data profil sekolah." });
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchProfile();
  }, [form, toast]);

  const onSubmit = async (data: SchoolProfileFormData) => {
    setIsSubmitting(true);
    try {
      const dataToSave = {
        ...data,
        totalSiswa: totalSiswaAktif, // Add the calculated total
      };
      await updateSchoolProfile(dataToSave);
      toast({ title: "Sukses", description: "Profil sekolah berhasil diperbarui." });
      if (userProfile) {
        await addActivityLog(
            "Profil Sekolah Diperbarui", 
            `Data statistik sekolah diperbarui oleh Admin: ${userProfile.displayName || userProfile.email}`,
            userProfile.uid,
            userProfile.displayName || userProfile.email || "Admin"
        );
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Gagal memperbarui profil sekolah." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoadingData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-md" /><div><Skeleton className="h-8 w-64 mb-2 rounded-md" /><Skeleton className="h-5 w-80 rounded-md" /></div></div>
        <Card><CardHeader><Skeleton className="h-7 w-48 mb-2 rounded-md" /><Skeleton className="h-4 w-72 rounded-md" /></CardHeader>
          <CardContent className="space-y-8">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-md" />)}</CardContent>
          <CardFooter><Skeleton className="h-10 w-28 rounded-md" /></CardFooter>
        </Card>
      </div>
    );
  }

  if (fetchError) {
     return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{fetchError}</AlertDescription></Alert>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><Link href="/admin"><Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Admin"><ArrowLeft className="h-4 w-4" /></Button></Link><div><h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Kelola Profil Sekolah</h1><p className="text-muted-foreground">Atur data statistik sekolah yang akan ditampilkan secara publik atau kepada guru.</p></div></div>
      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader><CardTitle>Form Statistik Sekolah</CardTitle><CardDescription>Masukkan angka untuk setiap item. Total siswa aktif akan dihitung otomatis.</CardDescription></CardHeader>
            <CardContent className="space-y-8">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-4 border-b pb-2">Statistik Sumber Daya Manusia</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <FormField control={form.control} name="totalAlumni" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-muted-foreground" />Jumlah Alumni</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="totalGuru" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><UserSquare className="h-4 w-4 text-muted-foreground" />Jumlah Guru</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="totalTendik" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" />Jumlah Tenaga Pendidik</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                
                <h4 className="text-md font-medium text-foreground mb-2">Rincian Jumlah Siswa per Kelas</h4>
                <div className="p-4 border rounded-lg bg-muted/30">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                    {PREDEFINED_CLASSES.map((className, index) => {
                      const watchedMale = form.watch(`classDetails.${index}.male`) || 0;
                      const watchedFemale = form.watch(`classDetails.${index}.female`) || 0;
                      return (
                        <div key={className} className="p-3 border rounded-md bg-background">
                          <h5 className="font-semibold text-center mb-2">Kelas {className}</h5>
                          <div className="flex justify-around gap-2">
                              <FormField control={form.control} name={`classDetails.${index}.male`} render={({ field }) => (<FormItem className="flex-1"><FormLabel className="text-xs">Laki-laki</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={form.control} name={`classDetails.${index}.female`} render={({ field }) => (<FormItem className="flex-1"><FormLabel className="text-xs">Perempuan</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          </div>
                           <p className="text-center text-sm font-medium mt-2 text-primary">Total: {watchedMale + watchedFemale}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="mt-4 p-4 border-2 border-dashed rounded-lg flex items-center justify-center gap-4">
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Siswa Aktif (Otomatis)</p>
                    <p className="text-2xl font-bold text-primary">{totalSiswaAktif}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-4 border-b pb-2">Data Sarana & Prasarana</h3>
                <div className="space-y-4">
                  {saranaFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2 p-3 border rounded-md">
                      <FormField control={form.control} name={`sarana.${index}.name`} render={({ field: nameField }) => (<FormItem className="flex-grow"><FormLabel>Nama Sarana</FormLabel><FormControl><Input {...nameField} readOnly={!field.isCustom} className={!field.isCustom ? "bg-muted/50 cursor-not-allowed" : ""} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name={`sarana.${index}.quantity`} render={({ field: quantityField }) => (<FormItem><FormLabel>Jumlah</FormLabel><FormControl><Input type="number" {...quantityField} /></FormControl><FormMessage /></FormItem>)} />
                      {field.isCustom && <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeSarana(index)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => appendSarana({ name: '', quantity: 0, isCustom: true })} className="mt-4"><PlusCircle className="mr-2 h-4 w-4" />Tambah Jenis Sarana</Button>
              </div>

            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}><>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</></Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
