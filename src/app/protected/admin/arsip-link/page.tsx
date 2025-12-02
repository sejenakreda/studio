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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, PlusCircle, Loader2, AlertCircle, Link as LinkIcon, Trash2, Edit, Info } from "lucide-react";
import { addArsipLink, getArsipLinks, deleteArsipLink, updateArsipLink, addActivityLog } from '@/lib/firestoreService';
import type { ArsipLink } from '@/types';
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
import { Timestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';

const arsipLinkSchema = z.object({
  judul: z.string().min(3, "Judul minimal 3 karakter").max(100, "Judul maksimal 100 karakter"),
  url: z.string().url("URL tidak valid. Pastikan diawali dengan http:// atau https://"),
  deskripsi: z.string().min(5, "Deskripsi minimal 5 karakter").max(200, "Deskripsi maksimal 200 karakter"),
});

type ArsipLinkFormData = z.infer<typeof arsipLinkSchema>;

export default function ManageArsipLinkPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [arsipLinks, setArsipLinks] = useState<ArsipLink[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLink, setEditingLink] = useState<ArsipLink | null>(null);
  const [linkToDelete, setLinkToDelete] = useState<ArsipLink | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const form = useForm<ArsipLinkFormData>({
    resolver: zodResolver(arsipLinkSchema),
    defaultValues: {
      judul: "",
      url: "",
      deskripsi: "",
    },
  });

  const fetchLinks = useCallback(async () => {
    setIsLoadingData(true);
    setFetchError(null);
    try {
      const data = await getArsipLinks();
      setArsipLinks(data || []);
    } catch (error: any) {
      setFetchError("Gagal memuat daftar link arsip. Silakan coba lagi.");
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const onSubmit = async (data: ArsipLinkFormData) => {
    if (!userProfile) return toast({ variant: "destructive", title: "Sesi tidak valid" });
    setIsSubmitting(true);
    try {
      if (editingLink) {
        await updateArsipLink(editingLink.id!, data);
        await addActivityLog(`Arsip Link Diperbarui`, `Judul: "${data.judul}" oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName!);
        toast({ title: "Sukses", description: "Link berhasil diperbarui." });
      } else {
        await addArsipLink(data);
        await addActivityLog(`Arsip Link Ditambahkan`, `Judul: "${data.judul}" oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName!);
        toast({ title: "Sukses", description: "Link baru berhasil ditambahkan." });
      }
      form.reset({ judul: "", url: "", deskripsi: "" });
      setEditingLink(null);
      fetchLinks();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEditClick = (link: ArsipLink) => {
      setEditingLink(link);
      form.reset(link);
      window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
      setEditingLink(null);
      form.reset({ judul: "", url: "", deskripsi: "" });
  };

  const handleDeleteConfirmation = (link: ArsipLink) => {
    setLinkToDelete(link);
  };

  const handleActualDelete = async () => {
    if (!linkToDelete || !userProfile) return;
    try {
        await deleteArsipLink(linkToDelete.id!);
        await addActivityLog(`Arsip Link Dihapus`, `Judul: "${linkToDelete.judul}" oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName!);
        toast({ title: "Sukses", description: "Link berhasil dihapus." });
        setLinkToDelete(null);
        fetchLinks();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Gagal Menghapus", description: error.message });
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Kelola Arsip Link</h1>
          <p className="text-muted-foreground">
            Tambah, edit, atau hapus link penting yang dapat diakses oleh semua pengguna.
          </p>
        </div>
      </div>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>{editingLink ? "Edit Link" : "Tambah Link Baru"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="judul" render={({ field }) => ( <FormItem><FormLabel>Judul Link</FormLabel><FormControl><Input placeholder="cth: Panduan Kurikulum Merdeka" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="url" render={({ field }) => ( <FormItem><FormLabel>URL</FormLabel><FormControl><Input placeholder="https://example.com/dokumen.pdf" {...field} type="url" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="deskripsi" render={({ field }) => ( <FormItem><FormLabel>Deskripsi Singkat</FormLabel><FormControl><Textarea placeholder="Penjelasan singkat tentang isi link..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>)} />
            </CardContent>
            <CardFooter className="gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                {editingLink ? "Simpan Perubahan" : "Tambah Link"}
              </Button>
              {editingLink && <Button variant="outline" type="button" onClick={handleCancelEdit}>Batal Edit</Button>}
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Link Tersimpan</CardTitle>
        </CardHeader>
        <CardContent>
          {fetchError && (<Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{fetchError}</AlertDescription></Alert>)}
          {isLoadingData ? (<div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>)
            : arsipLinks.length === 0 ? (<Alert><Info className="h-4 w-4" /><AlertTitle>Belum Ada Link</AlertTitle><AlertDescription>Belum ada link yang ditambahkan. Gunakan formulir di atas.</AlertDescription></Alert>)
            : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arsipLinks.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell className="font-medium max-w-xs truncate" title={link.judul}>{link.judul}</TableCell>
                      <TableCell className="max-w-xs truncate"><a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{link.url}</a></TableCell>
                      <TableCell>{link.createdAt ? formatDistanceToNow(link.createdAt.toDate(), { addSuffix: true, locale: indonesiaLocale }) : '-'}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="outline" size="icon" onClick={() => handleEditClick(link)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteConfirmation(link)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            )}
        </CardContent>
      </Card>
      
      {linkToDelete && (
        <AlertDialog open={!!linkToDelete} onOpenChange={(isOpen) => !isOpen && setLinkToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
              <AlertDialogDescription>Tindakan ini akan menghapus link <span className="font-semibold">"{linkToDelete.judul}"</span> secara permanen.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleActualDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
