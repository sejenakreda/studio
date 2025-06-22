"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, PlusCircle, Loader2, AlertCircle, Megaphone, Trash2, Info } from "lucide-react";
import { addPengumuman, getAllPengumuman, deletePengumuman, addActivityLog } from '@/lib/firestoreService';
import type { Pengumuman, PrioritasPengumuman } from '@/types';
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

const prioritasOptions: PrioritasPengumuman[] = ['Tinggi', 'Sedang', 'Rendah'];

const addPengumumanSchema = z.object({
  judul: z.string().min(5, "Judul minimal 5 karakter").max(150, "Judul maksimal 150 karakter"),
  isi: z.string().min(10, "Isi pengumuman minimal 10 karakter").max(2000, "Isi pengumuman maksimal 2000 karakter"),
  prioritas: z.enum(prioritasOptions, { required_error: "Prioritas harus dipilih" }),
  infoTambahan: z.string().max(100, "Info tambahan maksimal 100 karakter").optional(),
});

type AddPengumumanFormData = z.infer<typeof addPengumumanSchema>;

export default function ManageAnnouncementsPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [announcements, setAnnouncements] = useState<Pengumuman[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Pengumuman | null>(null);

  const form = useForm<AddPengumumanFormData>({
    resolver: zodResolver(addPengumumanSchema),
    defaultValues: {
      judul: "",
      isi: "",
      prioritas: "Sedang",
      infoTambahan: "",
    },
  });

  const fetchAnnouncements = useCallback(async () => {
    setIsLoadingData(true);
    setFetchError(null);
    try {
      const data = await getAllPengumuman();
      setAnnouncements(data || []);
    } catch (error: any) {
      console.error("Error fetching announcements:", error);
      setFetchError("Gagal memuat daftar pengumuman. Silakan coba lagi.");
      toast({ variant: "destructive", title: "Error", description: "Gagal memuat daftar pengumuman." });
      setAnnouncements([]);
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const onSubmit = async (data: AddPengumumanFormData) => {
    setIsSubmitting(true);
    if (!userProfile) {
      toast({ variant: "destructive", title: "Error", description: "Sesi admin tidak ditemukan." });
      setIsSubmitting(false);
      return;
    }
    try {
      await addPengumuman({
        ...data,
        createdByUid: userProfile.uid,
        createdByDisplayName: userProfile.displayName || userProfile.email || "Admin",
        createdAt: Timestamp.now(), // Will be overridden by serverTimestamp in service
      });
      await addActivityLog(
        "Pengumuman Baru Ditambahkan",
        `Judul: "${data.judul}" oleh Admin: ${userProfile.displayName || userProfile.email}`,
        userProfile.uid,
        userProfile.displayName || userProfile.email || "Admin"
      );
      toast({ title: "Sukses", description: `Pengumuman "${data.judul}" berhasil ditambahkan.` });
      form.reset();
      fetchAnnouncements();
    } catch (error: any) {
      console.error("Error adding announcement:", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "Gagal menambahkan pengumuman." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirmation = (announcement: Pengumuman) => {
    setAnnouncementToDelete(announcement);
  };

  const handleActualDelete = async () => {
    if (!announcementToDelete || !announcementToDelete.id || !userProfile) {
      toast({ variant: "destructive", title: "Error", description: "Data tidak lengkap untuk penghapusan." });
      setAnnouncementToDelete(null);
      return;
    }
    setIsDeleting(true);
    try {
      await deletePengumuman(announcementToDelete.id);
      await addActivityLog(
        "Pengumuman Dihapus",
        `Judul: "${announcementToDelete.judul}" dihapus oleh Admin: ${userProfile.displayName || userProfile.email}`,
        userProfile.uid,
        userProfile.displayName || userProfile.email || "Admin"
      );
      toast({ title: "Sukses", description: `Pengumuman "${announcementToDelete.judul}" berhasil dihapus.` });
      setAnnouncementToDelete(null);
      fetchAnnouncements();
    } catch (error: any) {
      console.error("Error deleting announcement:", error);
      toast({ variant: "destructive", title: "Error Hapus", description: "Gagal menghapus pengumuman." });
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Kelola Pengumuman</h1>
          <p className="text-muted-foreground">
            Buat, lihat, dan hapus pengumuman untuk guru.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Pengumuman Baru</CardTitle>
          <CardDescription>Isi detail pengumuman yang akan ditampilkan di dasbor guru.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="judul"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Judul Pengumuman</FormLabel>
                    <FormControl>
                      <Input placeholder="cth: Rapat Koordinasi Persiapan PAS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Isi Pengumuman</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Detail pengumuman..." {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="prioritas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioritas</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih prioritas..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {prioritasOptions.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="infoTambahan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Info Tambahan (Target/Konteks)</FormLabel>
                      <FormControl>
                        <Input placeholder="cth: Semua Guru, Wali Kelas XII" {...field} />
                      </FormControl>
                      <FormDescription>Misal: Untuk siapa, atau konteks singkat.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menambahkan...</>
                ) : (
                  <><PlusCircle className="mr-2 h-4 w-4" /> Tambah Pengumuman</>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengumuman Tersedia</CardTitle>
          <CardDescription>Pengumuman terbaru akan muncul paling atas di dasbor guru.</CardDescription>
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
              {[...Array(3)].map((_, i) => (<Skeleton key={i} className="h-16 w-full rounded-md" />))}
            </div>
          ) : announcements.length === 0 && !fetchError ? (
            <div className="flex flex-col items-center justify-center min-h-[150px] text-center p-6 border-2 border-dashed rounded-lg">
              <Megaphone className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">Belum Ada Pengumuman</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Belum ada pengumuman yang dibuat. Silakan tambahkan menggunakan formulir di atas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>Info Tambahan</TableHead>
                    <TableHead>Prioritas</TableHead>
                    <TableHead>Dibuat Oleh</TableHead>
                    <TableHead>Tanggal Dibuat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium max-w-xs truncate" title={item.judul}>{item.judul}</TableCell>
                      <TableCell className="max-w-xs truncate" title={item.infoTambahan}>{item.infoTambahan || '-'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                          ${item.prioritas === 'Tinggi' ? 'bg-red-100 text-red-700' :
                            item.prioritas === 'Sedang' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'}`}>
                          {item.prioritas}
                        </span>
                      </TableCell>
                      <TableCell>{item.createdByDisplayName || 'N/A'}</TableCell>
                      <TableCell>
                        {item.createdAt instanceof Timestamp 
                          ? formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true, locale: indonesiaLocale }) 
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteConfirmation(item)}
                          disabled={isDeleting && announcementToDelete?.id === item.id}
                          title={"Hapus " + item.judul}
                        >
                          {isDeleting && announcementToDelete?.id === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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

      {announcementToDelete && (
        <AlertDialog open={!!announcementToDelete} onOpenChange={(isOpen) => !isOpen && setAnnouncementToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Anda Yakin Ingin Menghapus Pengumuman Ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini akan menghapus pengumuman <span className="font-semibold">"{announcementToDelete.judul}"</span>.
                Pengumuman ini tidak akan lagi tampil di dasbor guru.
                Tindakan ini tidak dapat diurungkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setAnnouncementToDelete(null)} disabled={isDeleting}>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleActualDelete}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Ya, Hapus Pengumuman
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
