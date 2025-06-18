
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
import { ArrowLeft, Save, Loader2, AlertCircle, CalendarDays } from "lucide-react";
import { getWeights, updateWeights } from '@/lib/firestoreService';
import type { Bobot } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const weightsSchema = z.object({
  tugas: z.coerce.number().min(0, "Min 0").max(100, "Maks 100"),
  tes: z.coerce.number().min(0, "Min 0").max(100, "Maks 100"),
  pts: z.coerce.number().min(0, "Min 0").max(100, "Maks 100"),
  pas: z.coerce.number().min(0, "Min 0").max(100, "Maks 100"),
  kehadiran: z.coerce.number().min(0, "Min 0").max(100, "Maks 100"), // This is the weight for attendance component
  eskul: z.coerce.number().min(0, "Min 0").max(100, "Maks 100"),
  osis: z.coerce.number().min(0, "Min 0").max(100, "Maks 100"),
  totalHariEfektifGanjil: z.coerce.number().min(1, "Minimal 1 hari").max(200, "Maksimal 200 hari").optional().default(90),
  totalHariEfektifGenap: z.coerce.number().min(1, "Minimal 1 hari").max(200, "Maksimal 200 hari").optional().default(90),
}).refine(
  (data) => {
    const { totalHariEfektifGanjil, totalHariEfektifGenap, ...percentageWeights } = data;
    const total = Object.values(percentageWeights).reduce((sum, value) => sum + (value || 0), 0);
    return total === 100;
  },
  {
    message: "Total bobot dari komponen penilaian (Tugas, Tes, dll.) harus 100%.",
    path: ["tugas"], // Point to a specific field or leave empty for form-level
  }
);

type WeightsFormData = z.infer<typeof weightsSchema>;

const defaultWeights: WeightsFormData = {
  tugas: 0,
  tes: 0,
  pts: 0,
  pas: 0,
  kehadiran: 0,
  eskul: 0,
  osis: 0,
  totalHariEfektifGanjil: 90,
  totalHariEfektifGenap: 90,
};

export default function ManageWeightsPage() {
  const { toast } = useToast();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const form = useForm<WeightsFormData>({
    resolver: zodResolver(weightsSchema),
    defaultValues: defaultWeights,
  });

  const watchedPercentageWeights = form.watch([
    "tugas", "tes", "pts", "pas", "kehadiran", "eskul", "osis"
  ]);

  const totalPercentage = React.useMemo(() => {
    return watchedPercentageWeights.reduce((sum, value) => sum + (Number(value) || 0), 0);
  }, [watchedPercentageWeights]);


  useEffect(() => {
    async function fetchWeights() {
      setIsLoadingData(true);
      setFormError(null);
      try {
        const currentWeights = await getWeights(); // getWeights now returns defaults if null
        if (currentWeights) {
           // Ensure all fields from WeightsFormData are present
           const formData: WeightsFormData = {
            tugas: currentWeights.tugas || 0,
            tes: currentWeights.tes || 0,
            pts: currentWeights.pts || 0,
            pas: currentWeights.pas || 0,
            kehadiran: currentWeights.kehadiran || 0,
            eskul: currentWeights.eskul || 0,
            osis: currentWeights.osis || 0,
            totalHariEfektifGanjil: currentWeights.totalHariEfektifGanjil || 90,
            totalHariEfektifGenap: currentWeights.totalHariEfektifGenap || 90,
          };
          form.reset(formData);
        } else {
           // This case should ideally not be hit if getWeights provides defaults
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
    form.clearErrors("root");

    const { totalHariEfektifGanjil, totalHariEfektifGenap, ...percentageWeights } = data;
    const currentTotalPercentage = Object.values(percentageWeights).reduce((sum, value) => sum + (value || 0), 0);

    if (currentTotalPercentage !== 100) {
      form.setError("root.serverError", { 
        type: "manual", 
        message: "Total bobot dari semua komponen penilaian (Tugas, Tes, dll.) harus 100%." 
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // data already matches Bobot structure more closely now
      await updateWeights(data);
      toast({ title: "Sukses", description: "Bobot dan hari efektif berhasil diperbarui." });
    } catch (error) {
      console.error("Error updating weights:", error);
      setFormError("Gagal menyimpan perubahan. Silakan coba lagi.");
      toast({ variant: "destructive", title: "Error", description: "Gagal memperbarui konfigurasi." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const weightFields: { name: keyof Omit<WeightsFormData, 'totalHariEfektifGanjil' | 'totalHariEfektifGenap'>; label: string }[] = [
    { name: "tugas", label: "Tugas / Harian (%)" },
    { name: "tes", label: "Tes / Ulangan (%)" },
    { name: "pts", label: "PTS (Penilaian Tengah Semester) (%)" },
    { name: "pas", label: "PAS (Penilaian Akhir Semester) (%)" },
    { name: "kehadiran", label: "Kehadiran (Bobot Komponen) (%)" },
    { name: "eskul", label: "Ekstrakurikuler (%)" },
    { name: "osis", label: "OSIS / Kegiatan Sekolah (%)" },
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
            {[...Array(9)].map((_, i) => ( // Increased for new fields
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
        <Link href="/admin">
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Admin">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Atur Bobot & Hari Efektif</h1>
          <p className="text-muted-foreground">
            Sesuaikan persentase bobot penilaian dan total hari efektif per semester.
          </p>
        </div>
      </div>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Konfigurasi Global</CardTitle>
              <CardDescription>
                Masukkan persentase untuk komponen penilaian (total harus 100%) dan jumlah hari efektif.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {formError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
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
              {form.formState.errors.root && !form.formState.errors.root.serverError && (
                 <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Validasi Gagal</AlertTitle>
                  <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                </Alert>
              )}
              
              <div>
                <h3 className="text-lg font-medium text-foreground mb-4 border-b pb-2">Bobot Komponen Penilaian</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {weightFields.map((fieldInfo) => (
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
                    Total Bobot Komponen: <span className={`font-bold ${totalPercentage === 100 ? 'text-green-600' : 'text-red-600'}`}>{totalPercentage}%</span>
                  </p>
                  {totalPercentage !== 100 && (
                    <p className="text-sm text-red-600 mt-1">Total bobot komponen harus 100% untuk dapat menyimpan.</p>
                  )}
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
              <Button type="submit" disabled={isSubmitting || totalPercentage !== 100}>
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
