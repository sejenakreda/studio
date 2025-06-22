
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
import { ArrowLeft, PlusCircle, Loader2, AlertCircle, BookOpen, Trash2 } from "lucide-react";
import { addMataPelajaranMaster, getMataPelajaranMaster, deleteMataPelajaranMaster, addActivityLog } from '@/lib/firestoreService';
import type { MataPelajaranMaster } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';


const addMapelSchema = z.object({
  namaMapel: z.string().min(3, "Nama mata pelajaran minimal 3 karakter").max(100, "Nama mata pelajaran maksimal 100 karakter"),
});

type AddMapelFormData = z.infer<typeof addMapelSchema>;

export default function ManageMataPelajaranPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [mapelList, setMapelList] = useState<MataPelajaranMaster[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [mapelToDelete, setMapelToDelete] = useState<MataPelajaranMaster | null>(null);

  const form = useForm<AddMapelFormData>({
    resolver: zodResolver(addMapelSchema),
    defaultValues: {
      namaMapel: "",
    },
  });

  const fetchMapel = useCallback(async () => {
    setIsLoadingData(true);
    setFetchError(null);
    try {
      const mapelData = await getMataPelajaranMaster();
      setMapelList(mapelData || []);
    } catch (error: any) {
      console.error("Error fetching mata pelajaran:", error);
      setFetchError("Gagal memuat daftar mata pelajaran. Silakan coba lagi.");
      toast({ variant: "destructive", title: "Error", description: "Gagal memuat daftar mata pelajaran." });
      setMapelList([]);
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMapel();
  }, [fetchMapel]);

  const onSubmit = async (data: AddMapelFormData) => {
    setIsSubmitting(true);
    if (!userProfile) {
      toast({ variant: "destructive", title: "Error", description: "Sesi admin tidak ditemukan." });
      setIsSubmitting(false);
      return;
    }
    try {
      await addMataPelajaranMaster(data.namaMapel);
      await addActivityLog(
        "Mata Pelajaran Ditambahkan",
        "Mapel: " + data.namaMapel + " oleh Admin: " + (userProfile.displayName || userProfile.email),
        userProfile.uid,
        userProfile.displayName || userProfile.email || "Admin"
      );
      toast({ title: "Sukses", description: "Mata pelajaran \"" + data.namaMapel + "\" berhasil ditambahkan." });
      form.reset();
      fetchMapel();
    } catch (error: any) {
      console.error("Error adding mata pelajaran:", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "Gagal menambahkan mata pelajaran." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirmation = (mapel: MataPelajaranMaster) => {
    setMapelToDelete(mapel);
  };

  const handleActualDelete = async () => {
    if (!mapelToDelete || !mapelToDelete.id || !userProfile) {
      toast({ variant: "destructive", title: "Error", description: "Data tidak lengkap untuk penghapusan." });
      setMapelToDelete(null);
      return;
    }
    setIsDeleting(true);
    try {
      await deleteMataPelajaranMaster(mapelToDelete.id);
      await addActivityLog(
        "Mata Pelajaran Dihapus",
        "Mapel: " + mapelToDelete.namaMapel + " dihapus oleh Admin: " + (userProfile.displayName || userProfile.email),
        userProfile.uid,
        userProfile.displayName || userProfile.email || "Admin"
      );
      toast({ title: "Sukses", description: "Mata pelajaran \"" + mapelToDelete.namaMapel + "\" berhasil dihapus." });
      setMapelToDelete(null);
      fetchMapel();
    } catch (error: any) {
      console.error("Error deleting mata pelajaran:", error);
      toast({ variant: "destructive", title: "Error Hapus", description: "Gagal menghapus mata pelajaran." });
    } finally {
      setIsDeleting(false);
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Kelola Mata Pelajaran</h1>
          <p className="text-muted-foreground">
            Tambah atau hapus mata pelajaran yang tersedia untuk ditugaskan kepada guru.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Mata Pelajaran Baru</CardTitle>
          <CardDescription>Masukkan nama mata pelajaran yang akan ditambahkan ke daftar master.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent>
              <FormField
                control={form.control}
                name="namaMapel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Mata Pelajaran</FormLabel>
                    <FormControl>
                      <Input placeholder="cth: Matematika Peminatan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menambahkan...</>
                ) : (
                  <><PlusCircle className="mr-2 h-4 w-4" /> Tambah Mata Pelajaran</>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Mata Pelajaran Tersedia</CardTitle>
          <CardDescription>Berikut adalah daftar semua mata pelajaran yang dapat ditugaskan.</CardDescription>
        </CardHeader>
        <CardContent>
          {fetchError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Memuat Data</AlertTitle>
              <AlertDescription>{fetchError}</AlertDescription>
            </Alert>
          )}
          {isLoadingData ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (<Skeleton key={i} className="h-10 w-full rounded-md" />))}
            </div>
          ) : mapelList.length === 0 && !fetchError ? (
            <div className="flex flex-col items-center justify-center min-h-[150px] text-center p-6 border-2 border-dashed rounded-lg">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">Belum Ada Mata Pelajaran</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Belum ada mata pelajaran yang terdaftar. Silakan tambahkan menggunakan formulir di atas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Mata Pelajaran</TableHead>
                    <TableHead>Tanggal Dibuat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mapelList.map((mapel) => (
                    <TableRow key={mapel.id}>
                      <TableCell className="font-medium">{mapel.namaMapel}</TableCell>
                       <TableCell>
                        {mapel.createdAt instanceof Timestamp 
                          ? formatDistanceToNow(mapel.createdAt.toDate(), { addSuffix: true, locale: indonesiaLocale }) 
                          : mapel.createdAt ? String(mapel.createdAt) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteConfirmation(mapel)}
                          disabled={isDeleting && mapelToDelete?.id === mapel.id}
                          title={"Hapus " + mapel.namaMapel}
                        >
                          {isDeleting && mapelToDelete?.id === mapel.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          <span className="sr-only">Hapus</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {mapelToDelete && (
        <AlertDialog open={!!mapelToDelete} onOpenChange={(isOpen) => !isOpen && setMapelToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Anda Yakin Ingin Menghapus Mata Pelajaran Ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini akan menghapus mata pelajaran <span className="font-semibold">{mapelToDelete.namaMapel}</span> dari daftar master.
                Pastikan tidak ada guru yang sedang ditugaskan mapel ini atau data nilai yang terkait, karena ini dapat menyebabkan inkonsistensi.
                Tindakan ini tidak dapat diurungkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setMapelToDelete(null)} disabled={isDeleting}>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleActualDelete}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Ya, Hapus Mata Pelajaran
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
