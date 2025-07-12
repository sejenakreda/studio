"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Save, Loader2, AlertCircle, Image as ImageIcon, Upload } from "lucide-react";
import { getPrintSettings, updatePrintSettings, uploadPrintHeaderImage, addActivityLog } from '@/lib/firestoreService';
import type { PrintSettings } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

const printSettingsSchema = z.object({
  place: z.string().max(100, "Maksimal 100 karakter").optional(),
  signerOneName: z.string().max(100, "Maksimal 100 karakter").optional(),
  signerOnePosition: z.string().max(100, "Maksimal 100 karakter").optional(),
  signerTwoName: z.string().max(100, "Maksimal 100 karakter").optional(),
  signerTwoPosition: z.string().max(100, "Maksimal 100 karakter").optional(),
});

type PrintSettingsFormData = z.infer<typeof printSettingsSchema>;

export default function ManagePrintSettingsPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  
  const [currentSettings, setCurrentSettings] = useState<PrintSettings | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<PrintSettingsFormData>({
    resolver: zodResolver(printSettingsSchema),
    defaultValues: {
      place: "Cianjur",
      signerOneName: "",
      signerOnePosition: "",
      signerTwoName: "",
      signerTwoPosition: "",
    },
  });

  const fetchSettings = useCallback(async (forceReload: boolean = false) => {
    if (!forceReload) setIsLoadingData(true);
    setFetchError(null);
    try {
      const settings = await getPrintSettings();
      setCurrentSettings(settings);
      setImagePreview(settings.headerImageUrl || null);
      form.reset({
        place: settings.place || "Cianjur",
        signerOneName: settings.signerOneName || "",
        signerOnePosition: settings.signerOnePosition || "",
        signerTwoName: settings.signerTwoName || "",
        signerTwoPosition: settings.signerTwoPosition || "",
      });
    } catch (error: any) {
      setFetchError("Gagal memuat pengaturan cetak. Silakan coba lagi.");
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      if (!forceReload) setIsLoadingData(false);
    }
  }, [form, toast]);

  useEffect(() => {
    fetchSettings();
  }, []); // Remove fetchSettings from dependency array to prevent re-running on every render

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ variant: "destructive", title: "Ukuran File Terlalu Besar", description: "Ukuran gambar maksimal adalah 2MB." });
        return;
      }
      setSelectedImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadImage = async () => {
    if (!selectedImageFile) {
      toast({ variant: "destructive", title: "Error", description: "Pilih file gambar terlebih dahulu." });
      return;
    }
    setIsUploading(true);
    try {
      const downloadURL = await uploadPrintHeaderImage(selectedImageFile);
      await updatePrintSettings({ headerImageUrl: downloadURL });
      toast({ title: "Sukses", description: "Gambar kop surat berhasil diunggah." });
      if (userProfile) {
        addActivityLog("Gambar Kop Surat Diperbarui", `Admin ${userProfile.displayName} memperbarui gambar kop surat.`, userProfile.uid, userProfile.displayName);
      }
      setSelectedImageFile(null); // Clear selected file after successful upload
      fetchSettings(true); // Force reload settings to show new image from URL
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal Unggah", description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: PrintSettingsFormData) => {
    setIsSubmitting(true);
    try {
      await updatePrintSettings(data);
      toast({ title: "Sukses", description: "Pengaturan tanda tangan berhasil disimpan." });
       if (userProfile) {
        addActivityLog("Pengaturan Cetak Diperbarui", `Admin ${userProfile.displayName} memperbarui pengaturan tanda tangan.`, userProfile.uid, userProfile.displayName);
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

      <Card>
        <CardHeader>
          <CardTitle>Kop Surat</CardTitle>
          <CardDescription>Unggah gambar kop surat sekolah. Gunakan gambar dengan format landscape (memanjang) dan resolusi tinggi untuk hasil terbaik (maks. 2MB).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border-2 border-dashed rounded-lg flex justify-center items-center min-h-[150px]">
            {imagePreview ? (
              <Image src={imagePreview} alt="Pratinjau Kop Surat" width={800} height={200} className="max-w-full h-auto" unoptimized />
            ) : (
              <div className="text-center text-muted-foreground">
                <ImageIcon className="mx-auto h-12 w-12" />
                <p>Belum ada gambar kop surat.</p>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Input id="kop-surat-file" type="file" accept="image/png, image/jpeg" onChange={handleFileChange} className="flex-grow" />
            <Button onClick={handleUploadImage} disabled={isUploading || !selectedImageFile}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isUploading ? 'Mengunggah...' : 'Unggah & Simpan Gambar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Pengaturan Tanda Tangan</CardTitle>
              <CardDescription>Isi nama dan jabatan untuk dua penanda tangan yang akan muncul di bagian bawah laporan. Tanggal akan ditambahkan secara otomatis.</CardDescription>
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
                </div>
                <div className="space-y-4 p-4 border rounded-md">
                  <h4 className="font-semibold text-center">Penanda Tangan 2 (Kanan)</h4>
                  <FormField control={form.control} name="signerTwoName" render={({ field }) => (<FormItem><FormLabel>Nama Lengkap</FormLabel><FormControl><Input placeholder="Nama Wali Kelas / Wakasek" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="signerTwoPosition" render={({ field }) => (<FormItem><FormLabel>Jabatan</FormLabel><FormControl><Input placeholder="Wali Kelas" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Simpan Pengaturan Tanda Tangan
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

    </div>
  );
}
