
"use client";

import React, { useEffect, useState } from 'react';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Save, Loader2, AlertCircle, Users, GraduationCap, UserSquare, Briefcase, School, FlaskConical, Library, Bath } from "lucide-react";
import { getSchoolProfile, updateSchoolProfile, addActivityLog } from '@/lib/firestoreService';
import type { SchoolProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';

const schoolProfileSchema = z.object({
  totalSiswa: z.coerce.number().min(0, "Nilai tidak boleh negatif").default(0),
  totalAlumni: z.coerce.number().min(0, "Nilai tidak boleh negatif").default(0),
  totalGuru: z.coerce.number().min(0, "Nilai tidak boleh negatif").default(0),
  totalTendik: z.coerce.number().min(0, "Nilai tidak boleh negatif").default(0),
  ruangKelas: z.coerce.number().min(0, "Nilai tidak boleh negatif").default(0),
  laboratorium: z.coerce.number().min(0, "Nilai tidak boleh negatif").default(0),
  perpustakaan: z.coerce.number().min(0, "Nilai tidak boleh negatif").default(0),
  toilet: z.coerce.number().min(0, "Nilai tidak boleh negatif").default(0),
});

type SchoolProfileFormData = z.infer<typeof schoolProfileSchema>;

const sdmFields: { name: keyof SchoolProfileFormData, label: string, icon: React.ElementType }[] = [
    { name: "totalSiswa", label: "Jumlah Siswa Aktif", icon: Users },
    { name: "totalAlumni", label: "Jumlah Alumni", icon: GraduationCap },
    { name: "totalGuru", label: "Jumlah Guru", icon: UserSquare },
    { name: "totalTendik", label: "Jumlah Tenaga Pendidik", icon: Briefcase },
];

const sarprasFields: { name: keyof SchoolProfileFormData, label: string, icon: React.ElementType }[] = [
    { name: "ruangKelas", label: "Jumlah Ruang Kelas", icon: School },
    { name: "laboratorium", label: "Jumlah Laboratorium", icon: FlaskConical },
    { name: "perpustakaan", label: "Jumlah Perpustakaan", icon: Library },
    { name: "toilet", label: "Jumlah Toilet", icon: Bath },
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
      totalSiswa: 0, totalAlumni: 0, totalGuru: 0, totalTendik: 0,
      ruangKelas: 0, laboratorium: 0, perpustakaan: 0, toilet: 0,
    },
  });

  useEffect(() => {
    async function fetchProfile() {
      setIsLoadingData(true);
      setFetchError(null);
      try {
        const currentProfile = await getSchoolProfile();
        if (currentProfile) {
          form.reset(currentProfile);
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
      await updateSchoolProfile(data);
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
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div><Skeleton className="h-8 w-64 mb-2 rounded-md" /><Skeleton className="h-5 w-80 rounded-md" /></div>
        </div>
        <Card>
          <CardHeader><Skeleton className="h-7 w-48 mb-2 rounded-md" /><Skeleton className="h-4 w-72 rounded-md" /></CardHeader>
          <CardContent className="space-y-8">
            <div><Skeleton className="h-6 w-1/3 mb-4" /> <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}</div></div>
            <div><Skeleton className="h-6 w-1/3 mb-4" /> <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}</div></div>
          </CardContent>
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
      <div className="flex items-center gap-4">
        <Link href="/admin"><Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Admin"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div><h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Kelola Profil Sekolah</h1><p className="text-muted-foreground">Atur data statistik sekolah yang akan ditampilkan secara publik atau kepada guru.</p></div>
      </div>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader><CardTitle>Form Statistik Sekolah</CardTitle><CardDescription>Masukkan angka untuk setiap item. Data ini akan ditampilkan di dasbor guru.</CardDescription></CardHeader>
            <CardContent className="space-y-8">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-4 border-b pb-2">Statistik Sumber Daya Manusia</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {sdmFields.map((fieldInfo) => (
                    <FormField key={fieldInfo.name} control={form.control} name={fieldInfo.name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2"><fieldInfo.icon className="h-4 w-4 text-muted-foreground" />{fieldInfo.label}</FormLabel>
                          <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-4 border-b pb-2">Data Sarana & Prasarana</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {sarprasFields.map((fieldInfo) => (
                    <FormField key={fieldInfo.name} control={form.control} name={fieldInfo.name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2"><fieldInfo.icon className="h-4 w-4 text-muted-foreground" />{fieldInfo.label}</FormLabel>
                          <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : <><Save className="mr-2 h-4 w-4" />Simpan Perubahan</>}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
