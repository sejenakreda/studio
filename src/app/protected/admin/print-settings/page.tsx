
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { ArrowLeft, Save, Loader2, AlertCircle, Image as ImageIcon, Link2 } from "lucide-react";
import { getPrintSettings, updatePrintSettings, addActivityLog } from '@/lib/firestoreService';
import type { PrintSettings } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

const printSettingsSchema = z.object({
  headerImageUrl: z.string().url("URL tidak valid. Pastikan formatnya benar (contoh: https://...)").or(z.literal("")).optional(),
  place: z.string().max(100, "Maksimal 100 karakter").optional(),
  signerOneName: z.string().max(100, "Maksimal 100 karakter").optional(),
  signerOnePosition: z.string().max(100, "Maksimal 100 karakter").optional(),
  signerOneNpa: z.string().max(100, "Maksimal 100 karakter").optional(),
  signerTwoName: z.string().max(100, "Maksimal 100 karakter").optional(),
  signerTwoPosition: z.string().max(100, "Maksimal 100 karakter").optional(),
  signerTwoNpa: z.string().max(100, "Maksimal 100 karakter").optional(),
});

type PrintSettingsFormData = z.infer<typeof printSettingsSchema>;

export default function ManagePrintSettingsPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const form = useForm<PrintSettingsFormData>({
    resolver: zodResolver(printSettingsSchema),
    defaultValues: {
      headerImageUrl: "",
      place: "Cianjur",
      signerOneName: "",
      signerOnePosition: "",
      signerOneNpa: "",
      signerTwoName: "",
      signerTwoPosition: "",
      signerTwoNpa: "",
    },
  });
  
  const imageUrl = form.watch("headerImageUrl");

  useEffect(() => {
    async function fetchSettings() {
      setIsLoadingData(true);
      setFetchError(null);
      try {
        const settings = await getPrintSettings();
        if (settings) {
          form.reset({
            headerImageUrl: settings.headerImageUrl || "",
            place: settings.place || "Cianjur",
            signerOneName: settings.signerOneName || "",
            signerOnePosition: settings.signerOnePosition || "",
            signerOneNpa: settings.signerOneNpa || "",
            signerTwoName: settings.signerTwoName || "",
            signerTwoPosition: settings.signerTwoPosition || "",
            signerTwoNpa: settings.signerTwoNpa || "",
          });
        }
      } catch (error: any) {
        setFetchError("Gagal memuat pengaturan cetak. Silakan coba lagi.");
        toast({ variant: "destructive", title: "Error", description: error.message });
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchSettings();
  }, [form, toast]);

  const onSubmit = async (data: PrintSettingsFormData) => {
    setIsSubmitting(true);
    try {
      await updatePrintSettings(data);
      toast({ title: "Sukses", description: "Pengaturan cetak berhasil diperbarui." });
       if (userProfile) {
        addActivityLog("Pengaturan Cetak Diperbarui", `Admin ${userProfile.displayName} memperbarui pengaturan cetak.`, userProfile.uid, userProfile.displayName);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4"><Skeleton className="h-10 w-10" /><Skeleton className="h-8 w-64" /></div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/protected/admin"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pengaturan Cetak Laporan</h1>
          <p className="text-muted-foreground">Atur kop surat dan tanda tangan untuk semua laporan yang dicetak.</p>
        </div>
      </div>
      
      {fetchError && (
        <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{fetchError}</AlertDescription></Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
                <CardHeader>
                <CardTitle>Kop Surat</CardTitle>
                <CardDescription>
                    Tempelkan URL gambar kop surat di sini. Anda bisa mengunggah gambar ke layanan hosting gratis seperti <a href="https://postimages.org/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Postimages</a> atau <a href="https://imgbb.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">ImgBB</a> untuk mendapatkan URL.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <FormField
                    control={form.control}
                    name="headerImageUrl"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center gap-2"><Link2 className="h-4 w-4"/> URL Gambar Kop Surat</FormLabel>
                        <FormControl><Input placeholder="https://i.postimg.cc/contoh-gambar.png" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="p-4 border-2 border-dashed rounded-lg flex justify-center items-center min-h-[150px]">
                    {imageUrl ? (
                    <Image src={imageUrl} alt="Pratinjau Kop Surat" width={800} height={200} className="max-w-full h-auto" unoptimized />
                    ) : (
                    <div className="text-center text-muted-foreground">
                        <ImageIcon className="mx-auto h-12 w-12" />
                        <p>Pratinjau akan muncul di sini.</p>
                    </div>
                    )}
                </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                <CardTitle>Pengaturan Tanda Tangan</CardTitle>
                <CardDescription>Isi nama, jabatan, dan NPA untuk dua penanda tangan. Tanggal akan ditambahkan secara otomatis saat mencetak.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                <FormField control={form.control} name="place" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Tempat Cetak (Titi Mangsa)</FormLabel>
                    <FormControl><Input placeholder="Contoh: Cianjur" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4 p-4 border rounded-md">
                    <h4 className="font-semibold text-center">Penanda Tangan 1 (Kiri)</h4>
                    <FormField control={form.control} name="signerOneName" render={({ field }) => (<FormItem><FormLabel>Nama Lengkap</FormLabel><FormControl><Input placeholder="Nama Kepala Sekolah" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="signerOnePosition" render={({ field }) => (<FormItem><FormLabel>Jabatan</FormLabel><FormControl><Input placeholder="Kepala Sekolah" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="signerOneNpa" render={({ field }) => (<FormItem><FormLabel>NPA</FormLabel><FormControl><Input placeholder="NPA. XXXXXXX" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <div className="space-y-4 p-4 border rounded-md">
                    <h4 className="font-semibold text-center">Penanda Tangan 2 (Kanan)</h4>
                    <FormField control={form.control} name="signerTwoName" render={({ field }) => (<FormItem><FormLabel>Nama Lengkap</FormLabel><FormControl><Input placeholder="Nama Wali Kelas / Wakasek" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="signerTwoPosition" render={({ field }) => (<FormItem><FormLabel>Jabatan</FormLabel><FormControl><Input placeholder="Wali Kelas" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="signerTwoNpa" render={({ field }) => (<FormItem><FormLabel>NPA</FormLabel><FormControl><Input placeholder="NPA. YYYYYYY" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </div>
                </CardContent>
            </Card>
            
            <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Simpan Semua Pengaturan
                </Button>
            </div>
        </form>
      </Form>
    </div>
  );
}
