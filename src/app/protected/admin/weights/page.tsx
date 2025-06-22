
"use client";

import React, { useEffect, useState } from 'react';
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { ArrowLeft, Save, Loader2, AlertCircle, CalendarDays, Info } from "lucide-react";
import { getWeights, updateWeights, addActivityLog } from '@/lib/firestoreService';
import type { Bobot } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';

const weightsSchema = z.object({
  tugas: z.coerce.number().min(0, "Min 0").max(100, "Maks 100"),
  tes: z.coerce.number().min(0, "Min 0").max(100, "Maks 100"),
  pts: z.coerce.number().min(0, "Min 0").max(100, "Maks 100"),
  pas: z.coerce.number().min(0, "Min 0").max(100, "Maks 100"),
  kehadiran: z.coerce.number().min(0, "Min 0").max(100, "Maks 100"),
  // Eskul & OSIS are now max bonus points, not part of the 100% sum for academic weights
  eskul: z.coerce.number().min(0, "Min 0").max(100, "Maks 100").optional().default(0),
  osis: z.coerce.number().min(0, "Min 0").max(100, "Maks 100").optional().default(0),
  totalHariEfektifGanjil: z.coerce.number().min(1, "Minimal 1 hari").max(200, "Maksimal 200 hari").optional().default(90),
  totalHariEfektifGenap: z.coerce.number().min(1, "Minimal 1 hari").max(200, "Maksimal 200 hari").optional().default(90),
}).refine(
  (data) => {
    const { tugas, tes, pts, pas, kehadiran } = data;
    // Only sum academic components for the 100% check
    const totalAcademicWeights = (tugas || 0) + (tes || 0) + (pts || 0) + (pas || 0) + (kehadiran || 0);
    return totalAcademicWeights === 100;
  },
  {
    message: "Total bobot dari komponen penilaian akademik (Tugas, Tes, PTS, PAS, Kehadiran) harus 100%.",
    // Path can point to a relevant field or a general form error
    path: ["tugas"], 
  }
);

type WeightsFormData = z.infer<typeof weightsSchema>;

const defaultWeights: WeightsFormData = {
  tugas: 20, 
  tes: 20,
  pts: 20,
  pas: 25,
  kehadiran: 15, // These 5 sum to 100
  eskul: 5, // Default max bonus points
  osis: 5,  // Default max bonus points
  totalHariEfektifGanjil: 90,
  totalHariEfektifGenap: 90,
};

export default function ManageWeightsPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const form = useForm<WeightsFormData>({
    resolver: zodResolver(weightsSchema),
    defaultValues: defaultWeights,
  });

  const watchedAcademicWeights = form.watch([
    "tugas", "tes", "pts", "pas", "kehadiran"
  ]);

  const totalAcademicPercentage = React.useMemo(() => {
    return watchedAcademicWeights.reduce((sum, value) => sum + (Number(value) || 0), 0);
  }, [watchedAcademicWeights]);


  useEffect(() => {
    async function fetchWeights() {
      setIsLoadingData(true);
      setFormError(null);
      try {
        const currentWeights = await getWeights(); 
        if (currentWeights) {
           const formData: WeightsFormData = {
            tugas: currentWeights.tugas || 0,
            tes: currentWeights.tes || 0,
            pts: currentWeights.pts || 0,
            pas: currentWeights.pas || 0,
            kehadiran: currentWeights.kehadiran || 0,
            eskul: currentWeights.eskul || 0, // This is max bonus points
            osis: currentWeights.osis || 0,   // This is max bonus points
            totalHariEfektifGanjil: currentWeights.totalHariEfektifGanjil || 90,
            totalHariEfektifGenap: currentWeights.totalHariEfektifGenap || 90,
          };
          form.reset(formData);
        } else {
          form.reset(defaultWeights);
          toast({ title: "Info", description: "Tidak ada bobot tersimpan, menggunakan nilai default." });
        }
      } catch (error) {
        console.error("Error fetching weights:", error);
        setFormError("Gagal memuat data bobot. Silakan coba lagi.");
        toast({ variant: "destructive", title: "Error", description: "Gagal memuat data bobot." });
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchWeights();
  }, [form, toast]);

  const onSubmit = async (data: WeightsFormData) => {
    setIsSubmitting(true);
    setFormError(null);
    form.clearErrors("root"); // Clear previous root errors

    const { tugas, tes, pts, pas, kehadiran } = data;
    const currentTotalAcademicPercentage = (tugas || 0) + (tes || 0) + (pts || 0) + (pas || 0) + (kehadiran || 0);

    if (currentTotalAcademicPercentage !== 100) {
      form.setError("root.serverError", { 
        type: "manual", 
        message: "Total bobot dari komponen penilaian akademik (Tugas, Tes, PTS, PAS, Kehadiran) harus 100%." 
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await updateWeights(data);
      toast({ title: "Sukses", description: "Bobot dan hari efektif berhasil diperbarui." });
      if (userProfile) {
        await addActivityLog(
            "Konfigurasi Bobot Diperbarui", 
            `Bobot Akd: Tgs(${data.tugas}),Tes(${data.tes}),PTS(${data.pts}),PAS(${data.pas}),Keh(${data.kehadiran}). Poin Bonus Maks: Eskul(${data.eskul}),Osis(${data.osis}). HrGjl(${data.totalHariEfektifGanjil}),HrGnp(${data.totalHariEfektifGenap}).`,
            userProfile.uid,
            userProfile.displayName || userProfile.email || "Admin"
          );
      }
    } catch (error) {
      console.error("Error updating weights:", error);
      setFormError("Gagal menyimpan perubahan. Silakan coba lagi.");
      toast({ variant: "destructive", title: "Error", description: "Gagal memperbarui konfigurasi." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const academicWeightFields: { name: keyof Pick<WeightsFormData, 'tugas' | 'tes' | 'pts' | 'pas' | 'kehadiran'>; label: string }[] = [
    { name: "tugas", label: "Tugas / Harian (%)" },
    { name: "tes", label: "Tes / Ulangan (%)" },
    { name: "pts", label: "PTS (Penilaian Tengah Semester) (%)" },
    { name: "pas", label: "PAS (Penilaian Akhir Semester) (%)" },
    { name: "kehadiran", label: "Kehadiran (Bobot Komponen) (%)" },
  ];
  
  // Changed labels for clarity
  const bonusPointFields: { name: keyof Pick<WeightsFormData, 'eskul' | 'osis'>; label: string }[] = [
    { name: "eskul", label: "Poin Bonus Maks. Ekstrakurikuler" },
    { name: "osis", label: "Poin Bonus Maks. OSIS/Kegiatan" },
  ];


  if (isLoadingData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div>
            <Skeleton className="h-8 w-64 mb-2 rounded-md" />
            <Skeleton className="h-5 w-80 rounded-md" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-48 mb-2 rounded-md" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(7)].map((_, i) => ( // Reduced array size as Eskul & OSIS are separate
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-32 rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ))}
            <Skeleton className="h-6 w-40 mt-4 rounded-md" /> 
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-28 rounded-md" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/protected/admin">
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Admin">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Atur Bobot &amp; Hari Efektif</h1>
          <p className="text-muted-foreground">
            Sesuaikan persentase bobot penilaian akademik, poin bonus, dan total hari efektif per semester.
          </p>
        </div>
      </div>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Konfigurasi Global</CardTitle>
              <CardDescription>
                Total bobot komponen akademik (Tugas, Tes, PTS, PAS, Kehadiran) harus 100%. 
                Nilai untuk Eskul &amp; OSIS adalah poin bonus maksimal yang dapat ditambahkan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {formError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Menyimpan</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
               {form.formState.errors.root?.serverError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Validasi Gagal</AlertTitle>
                  <AlertDescription>{form.formState.errors.root.serverError.message}</AlertDescription>
                </Alert>
              )}
              {/* Check for other root errors that aren't serverError (like refine failing) */}
              {form.formState.errors.root && !form.formState.errors.root.serverError && (
                 <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Validasi Gagal</AlertTitle>
                  <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                </Alert>
              )}
              
              <div>
                <h3 className="text-lg font-medium text-foreground mb-4 border-b pb-2">Bobot Komponen Penilaian Akademik</h3>
                 <Alert variant="default" className="mb-4">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Informasi Bobot Akademik</AlertTitle>
                  <AlertDescription>
                    Total bobot dari 5 komponen akademik ini (Tugas, Tes, PTS, PAS, Kehadiran) harus mencapai 100%.
                    Ini akan menjadi dasar perhitungan nilai akademik siswa sebelum ditambahkan poin bonus.
                  </AlertDescription>
                </Alert>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {academicWeightFields.map((fieldInfo) => (
                    <FormField
                      key={fieldInfo.name}
                      control={form.control}
                      name={fieldInfo.name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{fieldInfo.label}</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0-100" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <div className="mt-4 p-4 border rounded-md bg-muted/50">
                  <p className="text-lg font-semibold">
                    Total Bobot Komponen Akademik: <span className={`font-bold ${totalAcademicPercentage === 100 ? 'text-green-600' : 'text-red-600'}`}>{totalAcademicPercentage}%</span>
                  </p>
                  {totalAcademicPercentage !== 100 && (
                    <p className="text-sm text-red-600 mt-1">Total bobot komponen akademik harus 100% untuk dapat menyimpan.</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-4 mt-8 border-b pb-2">Poin Bonus Tambahan</h3>
                 <Alert variant="default" className="mb-4">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Informasi Poin Bonus</AlertTitle>
                  <AlertDescription>
                    Nilai yang dimasukkan untuk Ekstrakurikuler dan OSIS/Kegiatan di sini adalah **poin bonus maksimal** yang dapat ditambahkan ke nilai akhir akademik siswa.
                    Contoh: Jika "Poin Bonus Maks. Eskul" diatur ke 5, dan siswa mendapat nilai 80 untuk Eskul di form input nilai guru, maka siswa akan mendapat tambahan `(80/100) * 5 = 4` poin pada nilai akhirnya.
                    Jika diatur ke 0, komponen tersebut tidak akan memberi bonus. Nilai akhir total tidak akan melebihi 100.
                  </AlertDescription>
                </Alert>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {bonusPointFields.map((fieldInfo) => (
                    <FormField
                      key={fieldInfo.name}
                      control={form.control}
                      name={fieldInfo.name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{fieldInfo.label}</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="cth: 5" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                          </FormControl>
                          <FormDescription>Masukkan angka antara 0-100.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-foreground mb-4 mt-8 border-b pb-2">Pengaturan Hari Efektif Sekolah</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="totalHariEfektifGanjil"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Total Hari Efektif Semester Ganjil</FormLabel>
                            <FormControl>
                            <Input type="number" placeholder="cth: 90" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="totalHariEfektifGenap"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Total Hari Efektif Semester Genap</FormLabel>
                            <FormControl>
                            <Input type="number" placeholder="cth: 90" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                 <FormDescription className="mt-2 flex items-center gap-1 text-xs">
                    <CalendarDays className="h-3 w-3" />
                    Jumlah hari ini akan digunakan untuk menghitung persentase kehadiran siswa.
                </FormDescription>
              </div>

            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting || totalAcademicPercentage !== 100}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Simpan Konfigurasi
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
