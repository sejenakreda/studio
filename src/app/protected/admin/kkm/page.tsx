
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { 
    getMataPelajaranMaster, 
    getActiveAcademicYears, 
    setKkmSetting, 
    getAllKkmSettings,
    addActivityLog
} from '@/lib/firestoreService';
import type { MataPelajaranMaster, KkmSetting } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';
import { getCurrentAcademicYear } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';

const kkmSchema = z.object({
  mapel: z.string().min(1, "Mata pelajaran harus dipilih"),
  tahun_ajaran: z.string().min(1, "Tahun ajaran harus dipilih"),
  kkmValue: z.coerce.number().min(0, "KKM minimal 0").max(100, "KKM maksimal 100"),
});

type KkmFormData = z.infer<typeof kkmSchema>;

export default function ManageKkmPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  
  const [mapelList, setMapelList] = useState<MataPelajaranMaster[]>([]);
  const [activeYears, setActiveYears] = useState<string[]>([]);
  const [allKkmSettings, setAllKkmSettings] = useState<KkmSetting[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const form = useForm<KkmFormData>({
    resolver: zodResolver(kkmSchema),
    defaultValues: {
      mapel: "",
      tahun_ajaran: getCurrentAcademicYear(),
      kkmValue: 75,
    },
  });

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [mapelData, yearsData, kkmData] = await Promise.all([
        getMataPelajaranMaster(),
        getActiveAcademicYears(),
        getAllKkmSettings()
      ]);
      setMapelList(mapelData || []);
      setActiveYears(yearsData.length > 0 ? yearsData : [getCurrentAcademicYear()]);
      setAllKkmSettings(kkmData || []);
    } catch (error: any) {
      console.error("Error fetching KKM initial data:", error);
      setFetchError("Gagal memuat data. Silakan coba lagi.");
      toast({ variant: "destructive", title: "Error", description: "Gagal memuat data awal." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const onSubmit = async (data: KkmFormData) => {
    setIsSubmitting(true);
    if (!userProfile) {
      toast({ variant: "destructive", title: "Error", description: "Sesi admin tidak ditemukan." });
      setIsSubmitting(false);
      return;
    }
    try {
      await setKkmSetting(data);
      await addActivityLog(
        "KKM Diperbarui",
        `KKM untuk ${data.mapel} TA ${data.tahun_ajaran} menjadi ${data.kkmValue} oleh Admin: ${userProfile.displayName || userProfile.email}`,
        userProfile.uid,
        userProfile.displayName || userProfile.email || "Admin"
      );
      toast({ title: "Sukses", description: `KKM untuk ${data.mapel} berhasil disimpan.` });
      fetchInitialData(); // Refresh list
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: error.message || "Terjadi kesalahan." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/protected/admin">
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Admin">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Kelola KKM Mata Pelajaran</h1>
          <p className="text-muted-foreground">
            Atur Kriteria Ketuntasan Minimal (KKM) untuk setiap mata pelajaran per tahun ajaran.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atur KKM Baru atau Perbarui</CardTitle>
          <CardDescription>Pilih mapel dan tahun ajaran, lalu masukkan nilai KKM yang diinginkan.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <FormField
                  control={form.control}
                  name="mapel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mata Pelajaran</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={mapelList.length === 0}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder={mapelList.length === 0 ? "Belum ada mapel" : "Pilih mata pelajaran..."} /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mapelList.map(m => <SelectItem key={m.id} value={m.namaMapel}>{m.namaMapel}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tahun_ajaran"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tahun Ajaran</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Pilih tahun ajaran..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="kkmValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nilai KKM</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="cth: 75" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting || mapelList.length === 0}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : <><Save className="mr-2 h-4 w-4" /> Simpan KKM</>}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Daftar KKM Tersimpan</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (<Skeleton key={i} className="h-10 w-full rounded-md" />))}
            </div>
          ) : fetchError ? (
            <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{fetchError}</AlertDescription></Alert>
          ) : allKkmSettings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada KKM yang diatur.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead>Tahun Ajaran</TableHead>
                    <TableHead>Nilai KKM</TableHead>
                    <TableHead>Terakhir Diperbarui</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allKkmSettings.map((kkm) => (
                    <TableRow key={kkm.id}>
                      <TableCell className="font-medium">{kkm.mapel}</TableCell>
                      <TableCell>{kkm.tahun_ajaran}</TableCell>
                      <TableCell className="font-semibold text-primary">{kkm.kkmValue}</TableCell>
                      <TableCell>{kkm.updatedAt ? formatDistanceToNow(kkm.updatedAt.toDate(), { addSuffix: true, locale: indonesiaLocale }) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
