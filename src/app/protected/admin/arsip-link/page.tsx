"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, PlusCircle, Loader2, AlertCircle, Link as LinkIcon, Trash2, Edit, Info, FolderPlus, FolderKanban, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { addArsipCategory, getArsipCategories, deleteArsipCategory, updateArsipCategory, addActivityLog, reorderArsipCategories } from '@/lib/firestoreService';
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
import { Badge } from '@/components/ui/badge';

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

export default function ManageArsipLinkPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [categories, setCategories] = useState<ArsipLinkCategory[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isOrdering, setIsOrdering] = useState(false);

  // State for Modals
  const [categoryToDelete, setCategoryToDelete] = useState<ArsipLinkCategory | null>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoadingData(true);
    setFetchError(null);
    try {
      const data = await getArsipCategories();
      setCategories(data || []);
    } catch (error: any) {
      setFetchError("Gagal memuat daftar kategori arsip.");
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // --- Handlers for Ordering ---
  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    if (isOrdering) return;
    const newCategories = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newCategories.length) return;
    
    [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
    
    setCategories(newCategories);
    setIsOrdering(true);
    try {
      await reorderArsipCategories(newCategories);
      toast({ title: "Urutan Diperbarui", description: "Urutan kategori berhasil disimpan." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal Mengurutkan", description: error.message });
      fetchCategories(); // Rollback
    } finally {
      setIsOrdering(false);
    }
  };

  const handleMoveLink = async (category: ArsipLinkCategory, linkIndex: number, direction: 'up' | 'down') => {
    const newLinks = [...category.links];
    const targetIndex = direction === 'up' ? linkIndex - 1 : linkIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= newLinks.length) return;
    
    [newLinks[linkIndex], newLinks[targetIndex]] = [newLinks[targetIndex], newLinks[linkIndex]];
    
    try {
      await updateArsipCategory(category.id!, { links: newLinks });
      fetchCategories();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal Mengurutkan Link", description: error.message });
    }
  };

  // --- Handlers for CRUD ---
  const handleSaveCategory = async (data: CategoryFormData, categoryId?: string) => {
    if (!userProfile) return false;
    const isEditing = !!categoryId;
    
    try {
      if (isEditing) {
        await updateArsipCategory(categoryId, { title: data.title, description: data.description });
        toast({ title: "Sukses", description: "Kategori berhasil diperbarui." });
      } else {
        await addArsipCategory(data);
        toast({ title: "Sukses", description: "Kategori baru berhasil ditambahkan." });
      }
      fetchCategories();
      return true;
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
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

  const handleSaveLink = async (data: LinkFormData, category: ArsipLinkCategory, isEditing: boolean) => {
    if (!userProfile || !category) return false;
    let newLinksArray: ArsipLinkItem[];

    if (isEditing) {
      newLinksArray = category.links.map(l => l.id === data.id ? data : l);
    } else {
      newLinksArray = [...category.links, data];
    }
    
    try {
      await updateArsipCategory(category.id!, { links: newLinksArray });
      toast({ title: "Sukses", description: `Link berhasil disimpan.` });
      fetchCategories();
      return true;
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal Menyimpan Link", description: error.message });
      return false;
    }
  };

  const handleDeleteLink = async (category: ArsipLinkCategory, linkId: string) => {
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/protected/admin"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Kelola Arsip Link</h1>
            <p className="text-muted-foreground text-sm">Atur kategori dan link penting untuk semua pengguna.</p>
          </div>
        </div>
        <CategoryFormDialog
            onSave={handleSaveCategory}
            triggerButton={<Button className="w-full sm:w-auto shadow-sm"><PlusCircle className="mr-2 h-4 w-4" /> Tambah Kategori</Button>}
        />
      </div>

      {fetchError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{fetchError}</AlertDescription></Alert>}
      
      {isLoadingData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6 border-2 border-dashed rounded-xl bg-card/50">
            <FolderKanban className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">Belum Ada Arsip Link</h3>
            <p className="text-sm text-muted-foreground mb-6">Silakan tambahkan kategori baru untuk mulai mengarsipkan tautan.</p>
            <CategoryFormDialog onSave={handleSaveCategory} triggerButton={<Button variant="outline"><FolderPlus className="mr-2 h-4 w-4" /> Mulai Sekarang</Button>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((category, catIndex) => (
            <Card key={category.id} className="flex flex-col shadow-sm hover:shadow-md transition-shadow duration-200 border-t-4 border-t-primary">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold h-5">Urutan {catIndex + 1}</Badge>
                      <CardTitle className="text-xl flex items-center gap-2 font-headline">{category.title}</CardTitle>
                    </div>
                    {category.description && <CardDescription className="line-clamp-2">{category.description}</CardDescription>}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMoveCategory(catIndex, 'up')} disabled={catIndex === 0 || isOrdering}><ChevronUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMoveCategory(catIndex, 'down')} disabled={catIndex === categories.length - 1 || isOrdering}><ChevronDown className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex gap-1 border-t pt-1 mt-1">
                      <CategoryFormDialog onSave={handleSaveCategory} category={category} triggerButton={<Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"><Edit className="h-4 w-4" /></Button>} />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10" onClick={() => setCategoryToDelete(category)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-2 px-4 pb-4">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2">Daftar Link</h4>
                {category.links && category.links.length > 0 ? (
                  <div className="space-y-2">
                    {category.links.map((link, linkIndex) => (
                      <div key={link.id} className="group flex items-center gap-3 p-3 border rounded-xl bg-muted/20 hover:bg-background hover:border-primary/30 transition-all duration-200 shadow-sm hover:shadow">
                        <GripVertical className="h-4 w-4 text-muted-foreground/30 flex-shrink-0 cursor-default" />
                        <div className="flex-grow min-w-0">
                          <p className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">{link.judul}</p>
                          <p className="text-[11px] text-muted-foreground truncate" title={link.url}>{link.url}</p>
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMoveLink(category, linkIndex, 'up')} disabled={linkIndex === 0}><ChevronUp className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMoveLink(category, linkIndex, 'down')} disabled={linkIndex === category.links.length - 1}><ChevronDown className="h-3 w-3" /></Button>
                          <LinkFormDialog onSave={(data, isEdit) => handleSaveLink(data, category, isEdit)} category={category} link={link} triggerButton={<Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-50"><Edit className="h-3.5 w-3.5" /></Button>} />
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteLink(category, link.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed rounded-xl bg-muted/10">
                    <p className="text-xs text-muted-foreground">Belum ada link di kategori ini.</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-muted/30 py-3 rounded-b-lg border-t">
                <LinkFormDialog
                    onSave={(data, isEdit) => handleSaveLink(data, category, isEdit)}
                    category={category}
                    triggerButton={<Button variant="link" size="sm" className="w-full text-primary hover:text-primary/80 font-bold"><PlusCircle className="mr-2 h-4 w-4" />Tambah Link Baru</Button>}
                />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {categoryToDelete && (
        <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Kategori Arsip?</AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini akan menghapus kategori <span className="font-bold text-foreground">"{categoryToDelete.title}"</span> beserta <span className="font-bold text-foreground">{categoryToDelete.links.length} link</span> di dalamnya. Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleActualDeleteCategory} className="bg-destructive hover:bg-destructive/90 text-white rounded-xl">Hapus Permanen</AlertDialogAction>
            </AlertDialogFooter>
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
        if (open) {
            form.reset({
                title: category?.title || "",
                description: category?.description || "",
            });
        }
    }, [open, category, form]);

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
            <DialogContent className="rounded-2xl">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)}>
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-headline">{isEditing ? 'Edit Kategori' : 'Kategori Baru'}</DialogTitle>
                            <DialogDescription>Kategori membantu mengelompokkan link penting sesuai fungsinya.</DialogDescription>
                        </DialogHeader>
                        <div className="py-6 space-y-4">
                            <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Nama Kategori</FormLabel><FormControl><Input placeholder="cth: Administrasi Kurikulum" {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Deskripsi Singkat</FormLabel><FormControl><Textarea placeholder="Berikan penjelasan singkat tentang isi kategori ini..." {...field} className="rounded-xl min-h-[100px]" /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto rounded-xl">
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
    onSave: (data: LinkFormData, isEdit: boolean) => Promise<boolean>;
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
        if (open) {
            form.reset({
                id: link?.id || uuidv4(),
                judul: link?.judul || "",
                url: link?.url || "",
                deskripsi: link?.deskripsi || "",
            });
        }
    }, [open, link, form]);
    
    const handleFormSubmit = async (data: LinkFormData) => {
        const success = await onSave(data, isEditing);
        if (success) {
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{triggerButton}</DialogTrigger>
            <DialogContent className="rounded-2xl max-w-md">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)}>
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-headline">{isEditing ? 'Edit Tautan' : 'Tambah Tautan Baru'}</DialogTitle>
                            <DialogDescription>Menambahkan link ke kategori <span className="font-bold text-primary">{category.title}</span></DialogDescription>
                        </DialogHeader>
                        <div className="py-6 space-y-4">
                             <FormField control={form.control} name="judul" render={({ field }) => ( <FormItem><FormLabel>Judul Tautan</FormLabel><FormControl><Input placeholder="cth: Portal Dapodik Pusat" {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="url" render={({ field }) => ( <FormItem><FormLabel>Alamat URL (Link)</FormLabel><FormControl><Input placeholder="https://dapodik.kemdikbud.go.id" {...field} type="url" className="rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="deskripsi" render={({ field }) => ( <FormItem><FormLabel>Catatan (Opsional)</FormLabel><FormControl><Textarea placeholder="Keterangan singkat tentang link ini..." {...field} rows={3} className="rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto rounded-xl">
                                 {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? 'Simpan Tautan' : 'Tambahkan Tautan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
