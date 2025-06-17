
"use client";

import React, { useEffect, useState } from 'react';
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Save, Loader2, AlertCircle } from "lucide-react";
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
  kehadiran: z.coerce.number().min(0, "Min 0").max(100, "Maks 100"),
  eskul: z.coerce.number().min(0, "Min 0").max(100, "Maks 100"),
  osis: z.coerce.number().min(0, "Min 0").max(100, "Maks 100"),
}).refine(
  (data) => {
    const total = Object.values(data).reduce((sum, value) => sum + (value || 0), 0);
    return total === 100;
  },
  {
    message: "Total bobot dari semua komponen harus 100%.",
    // path: [], // Path kosong untuk error level formulir, atau path: ['tugas'] untuk field pertama
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

  const watchedWeights = form.watch();
  const totalPercentage = React.useMemo(() => {
    return Object.values(watchedWeights).reduce((sum, value) => sum + (Number(value) || 0), 0);
  }, [watchedWeights]);


  useEffect(() => {
    async function fetchWeights() {
      setIsLoadingData(true);
      setFormError(null);
      try {
        const currentWeights = await getWeights();
        if (currentWeights) {
          form.reset(currentWeights as WeightsFormData); // Cast as Bobot might have id
        } else {
          // This case should be handled by getWeights returning default values
          // but if it somehow returns null, we reset to our local default
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
    // Clear form-level error if any before submitting
    form.clearErrors("root");

    const total = Object.values(data).reduce((sum, value) => sum + (value || 0), 0);
    if (total !== 100) {
      form.setError("root.serverError", { 
        type: "manual", 
        message: "Total bobot dari semua komponen harus 100%." 
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // The 'id' field should not be part of data sent to updateWeights
      const { ...weightsToSave } = data;
      await updateWeights(weightsToSave as Bobot); // Bobot type might have 'id'
      toast({ title: "Sukses", description: "Bobot penilaian berhasil diperbarui." });
    } catch (error) {
      console.error("Error updating weights:", error);
      setFormError("Gagal menyimpan perubahan. Silakan coba lagi.");
      toast({ variant: "destructive", title: "Error", description: "Gagal memperbarui bobot." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const weightFields: { name: keyof WeightsFormData; label: string }[] = [
    { name: "tugas", label: "Tugas / Harian" },
    { name: "tes", label: "Tes / Ulangan" },
    { name: "pts", label: "PTS (Penilaian Tengah Semester)" },
    { name: "pas", label: "PAS (Penilaian Akhir Semester)" },
    { name: "kehadiran", label: "Kehadiran" },
    { name: "eskul", label: "Ekstrakurikuler" },
    { name: "osis", label: "OSIS / Kegiatan Sekolah" },
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
            {[...Array(7)].map((_, i) => (
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Atur Bobot Penilaian</h1>
          <p className="text-muted-foreground">
            Sesuaikan persentase bobot untuk setiap komponen penilaian. Total bobot harus 100%.
          </p>
        </div>
      </div>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Konfigurasi Bobot</CardTitle>
              <CardDescription>
                Masukkan persentase untuk setiap komponen. Pastikan totalnya mencapai 100%.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                  Total Bobot Saat Ini: <span className={`font-bold ${totalPercentage === 100 ? 'text-green-600' : 'text-red-600'}`}>{totalPercentage}%</span>
                </p>
                {totalPercentage !== 100 && (
                  <p className="text-sm text-red-600 mt-1">Total bobot harus 100% untuk dapat menyimpan.</p>
                )}
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
