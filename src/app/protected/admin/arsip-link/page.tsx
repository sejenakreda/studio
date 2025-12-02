"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, PlusCircle, Loader2, AlertCircle, Link as LinkIcon, Trash2, Edit, Info, FolderPlus, FolderKanban } from "lucide-react";
import { addArsipCategory, getArsipCategories, deleteArsipCategory, updateArsipCategory, addActivityLog } from '@/lib/firestoreService';
import type { ArsipLinkCategory, ArsipLinkItem } from '@/types';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";


// --- Zod Schemas ---
const linkItemSchema = z.object({
  id: z.string(),
  judul: z.string().min(3, "Judul minimal 3 karakter").max(100, "Judul maksimal 100 karakter"),
  url: z.string().url("URL tidak valid. Pastikan diawali dengan http:// atau https://"),
  deskripsi: z.string().max(200, "Deskripsi maksimal 200 karakter").optional().default(''),
});

const categorySchema = z.object({
  title: z.string().min(3, "Judul kategori minimal 3 karakter").max(50, "Judul maksimal 50 karakter"),
  description: z.string().max(200, "Deskripsi maksimal 200 karakter").optional().default(''),
});

type CategoryFormData = z.infer<typeof categorySchema>;
type LinkFormData = z.infer<typeof linkItemSchema>;


// --- Main Component ---
export default function ManageArsipLinkPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [categories, setCategories] = useState<ArsipLinkCategory[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // State for Modals
  const [categoryToEdit, setCategoryToEdit] = useState<ArsipLinkCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ArsipLinkCategory | null>(null);
  const [linkToEdit, setLinkToEdit] = useState<{ category: ArsipLinkCategory, link: ArsipLinkItem } | null>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoadingData(true);
    setFetchError(null);
    try {
      const data = await getArsipCategories();
      setCategories(data || []);
    } catch (error: any) {
      setFetchError("Gagal memuat daftar kategori arsip. Silakan coba lagi.");
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // --- Handlers for Categories ---
  const handleSaveCategory = async (data: CategoryFormData, categoryId?: string) => {
    if (!userProfile) return toast({ variant: "destructive", title: "Sesi tidak valid" });
    const isEditing = !!categoryId;
    
    try {
      if (isEditing) {
        await updateArsipCategory(categoryId, { title: data.title, description: data.description });
        toast({ title: "Sukses", description: "Kategori berhasil diperbarui." });
      } else {
        await addArsipCategory(data);
        toast({ title: "Sukses", description: "Kategori baru berhasil ditambahkan." });
      }
      setCategoryToEdit(null);
      fetchCategories();
      return true; // Indicate success to close dialog
    } catch (error: any) {
      toast({ variant: "destructive", title: isEditing ? "Gagal Memperbarui" : "Gagal Menambah", description: error.message });
      return false;
    }
  };

  const handleActualDeleteCategory = async () => {
    if (!categoryToDelete || !userProfile) return;
    try {
      await deleteArsipCategory(categoryToDelete.id!);
      await addActivityLog(`Arsip Kategori Dihapus`, `Kategori: "${categoryToDelete.title}" oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName!);
      toast({ title: "Sukses", description: `Kategori "${categoryToDelete.title}" berhasil dihapus.` });
      setCategoryToDelete(null);
      fetchCategories();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal Menghapus", description: error.message });
    }
  };

  // --- Handlers for Links ---
  const handleSaveLink = async (data: LinkFormData, category: ArsipLinkCategory) => {
    if (!userProfile || !category) return toast({ variant: "destructive", title: "Data tidak lengkap" });
    const isEditing = !!linkToEdit && linkToEdit.link.id === data.id;
    let newLinksArray: ArsipLinkItem[];

    if (isEditing) {
      newLinksArray = category.links.map(l => l.id === data.id ? data : l);
    } else {
      newLinksArray = [...category.links, data];
    }
    
    try {
      await updateArsipCategory(category.id!, { links: newLinksArray });
      toast({ title: "Sukses", description: `Link "${data.judul}" berhasil disimpan.` });
      setLinkToEdit(null);
      fetchCategories();
      return true; // Success
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal Menyimpan Link", description: error.message });
      return false;
    }
  };

  const handleDeleteLink = async (category: ArsipLinkCategory, linkId: string) => {
    if (!userProfile || !category) return;
    const newLinksArray = category.links.filter(l => l.id !== linkId);
    try {
      await updateArsipCategory(category.id!, { links: newLinksArray });
      toast({ title: "Sukses", description: "Link berhasil dihapus." });
      fetchCategories();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal Menghapus Link", description: error.message });
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/protected/admin"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kelola Arsip Link</h1>
          <p className="text-muted-foreground">Buat kategori dan tambahkan link penting di dalamnya.</p>
        </div>
      </div>
      
      <div className="flex justify-end">
        <CategoryFormDialog
            onSave={handleSaveCategory}
            triggerButton={
                <Button>
                    <FolderPlus className="mr-2 h-4 w-4" />
                    Tambah Kategori Baru
                </Button>
            }
        />
      </div>

      {fetchError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{fetchError}</AlertDescription></Alert>}
      {isLoadingData ? (<div className="grid md:grid-cols-2 gap-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></div>)
        : categories.length === 0 ? (
          <Alert><Info className="h-4 w-4" /><AlertTitle>Belum Ada Kategori</AlertTitle><AlertDescription>Belum ada kategori link yang dibuat. Gunakan tombol "Tambah Kategori Baru" untuk memulai.</AlertDescription></Alert>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {categories.map((category) => (
              <Card key={category.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2"><FolderKanban className="h-5 w-5 text-primary" />{category.title}</CardTitle>
                      {category.description && <CardDescription>{category.description}</CardDescription>}
                    </div>
                    <div className="flex gap-1">
                       <CategoryFormDialog
                          onSave={handleSaveCategory}
                          category={category}
                          triggerButton={
                              <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                          }
                       />
                       <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => setCategoryToDelete(category)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                  {category.links && category.links.length > 0 ? (
                    category.links.map(link => (
                      <div key={link.id} className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted/50">
                        <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-grow">
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-primary hover:underline truncate" title={link.url}>{link.judul}</a>
                          {link.deskripsi && <p className="text-xs text-muted-foreground truncate">{link.deskripsi}</p>}
                        </div>
                        <LinkFormDialog
                           onSave={(data) => handleSaveLink(data, category)}
                           category={category}
                           link={link}
                           triggerButton={
                                <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                           }
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/90" onClick={() => handleDeleteLink(category, link.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))
                  ) : <p className="text-sm text-muted-foreground text-center py-4">Belum ada link di kategori ini.</p>}
                </CardContent>
                <CardFooter>
                    <LinkFormDialog
                        onSave={(data) => handleSaveLink(data, category)}
                        category={category}
                        triggerButton={
                           <Button variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4" />Tambah Link</Button>
                        }
                    />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      
      {categoryToDelete && (
        <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Hapus Kategori?</AlertDialogTitle><AlertDialogDescription>Yakin ingin menghapus kategori <span className="font-bold">"{categoryToDelete.title}"</span> beserta semua link di dalamnya? Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleActualDeleteCategory} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}


// --- Form Dialog Components ---
interface CategoryFormDialogProps {
    triggerButton: React.ReactNode;
    category?: ArsipLinkCategory | null;
    onSave: (data: CategoryFormData, categoryId?: string) => Promise<boolean>;
}

function CategoryFormDialog({ triggerButton, category, onSave }: CategoryFormDialogProps) {
    const [open, setOpen] = useState(false);
    const isEditing = !!category;

    const form = useForm<CategoryFormData>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            title: category?.title || "",
            description: category?.description || "",
        }
    });
    
    useEffect(() => {
        form.reset({
            title: category?.title || "",
            description: category?.description || "",
        });
    }, [category, form]);

    const handleFormSubmit = async (data: CategoryFormData) => {
        const success = await onSave(data, category?.id);
        if (success) {
            setOpen(false);
            form.reset();
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{triggerButton}</DialogTrigger>
            <DialogContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)}>
                        <DialogHeader>
                            <DialogTitle>{isEditing ? 'Edit Kategori' : 'Tambah Kategori Baru'}</DialogTitle>
                            <DialogDescription>Kategori membantu mengelompokkan link-link penting.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Judul Kategori</FormLabel><FormControl><Input placeholder="cth: Manajemen Ujian" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Deskripsi (Opsional)</FormLabel><FormControl><Textarea placeholder="Penjelasan singkat tentang kategori ini..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? 'Simpan Perubahan' : 'Tambah Kategori'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

interface LinkFormDialogProps {
    triggerButton: React.ReactNode;
    category: ArsipLinkCategory;
    link?: ArsipLinkItem | null;
    onSave: (data: LinkFormData, category: ArsipLinkCategory) => Promise<boolean>;
}

function LinkFormDialog({ triggerButton, category, link, onSave }: LinkFormDialogProps) {
    const [open, setOpen] = useState(false);
    const isEditing = !!link;
    
    const form = useForm<LinkFormData>({
        resolver: zodResolver(linkItemSchema),
        defaultValues: {
            id: link?.id || uuidv4(),
            judul: link?.judul || "",
            url: link?.url || "",
            deskripsi: link?.deskripsi || "",
        }
    });
    
    useEffect(() => {
        form.reset({
            id: link?.id || uuidv4(),
            judul: link?.judul || "",
            url: link?.url || "",
            deskripsi: link?.deskripsi || "",
        });
    }, [link, form]);
    
    const handleFormSubmit = async (data: LinkFormData) => {
        const success = await onSave(data, category);
        if (success) {
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{triggerButton}</DialogTrigger>
            <DialogContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)}>
                        <DialogHeader>
                            <DialogTitle>{isEditing ? 'Edit Link' : `Tambah Link di "${category.title}"`}</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                             <FormField control={form.control} name="judul" render={({ field }) => ( <FormItem><FormLabel>Judul Link</FormLabel><FormControl><Input placeholder="cth: Panduan Kurikulum Merdeka" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="url" render={({ field }) => ( <FormItem><FormLabel>URL</FormLabel><FormControl><Input placeholder="https://example.com/dokumen.pdf" {...field} type="url" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="deskripsi" render={({ field }) => ( <FormItem><FormLabel>Deskripsi Singkat</FormLabel><FormControl><Textarea placeholder="Penjelasan singkat tentang isi link..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                 {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? 'Simpan Perubahan' : 'Tambah Link'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}