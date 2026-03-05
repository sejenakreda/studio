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
import { ArrowLeft, PlusCircle, Loader2, AlertCircle, Link as LinkIcon, Trash2, Edit, Info, FolderPlus, FolderKanban, ChevronUp, ChevronDown, GripVertical, ExternalLink } from "lucide-react";
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
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-4">
          <Link href="/protected/admin">
            <Button variant="outline" size="icon" className="rounded-full hover:bg-primary hover:text-white transition-all shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-headline flex items-center gap-2">
              <FolderKanban className="h-8 w-8 text-primary" /> Kelola Arsip Link
            </h1>
            <p className="text-muted-foreground text-sm font-medium">Susun kategori dan tautan penting sekolah dengan rapi.</p>
          </div>
        </div>
        <CategoryFormDialog
            onSave={handleSaveCategory}
            triggerButton={<Button className="w-full sm:w-auto shadow-md rounded-xl py-6 px-6 font-bold text-lg"><PlusCircle className="mr-2 h-5 w-5" /> Tambah Kategori</Button>}
        />
      </div>

      {fetchError && <Alert variant="destructive" className="rounded-2xl border-2"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{fetchError}</AlertDescription></Alert>}
      
      {isLoadingData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="h-80 w-full rounded-3xl" />
          <Skeleton className="h-80 w-full rounded-3xl" />
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-12 border-4 border-dashed rounded-[2.5rem] bg-card/30 backdrop-blur-sm">
            <div className="bg-primary/10 p-8 rounded-full mb-6">
              <FolderPlus className="h-16 w-16 text-primary/40" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">Belum Ada Arsip Link</h3>
            <p className="text-muted-foreground mb-8 max-w-md">Data Anda mungkin membutuhkan kategori awal. Tambahkan kategori baru untuk memulai.</p>
            <CategoryFormDialog onSave={handleSaveCategory} triggerButton={<Button variant="outline" className="rounded-xl px-8 py-6 font-bold"><PlusCircle className="mr-2 h-5 w-5" /> Mulai Sekarang</Button>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {categories.map((category, catIndex) => (
            <Card key={category.id} className="flex flex-col rounded-[2rem] overflow-hidden shadow-lg border-none bg-gradient-to-br from-card to-muted/20 hover:shadow-2xl transition-all duration-500 group">
              <div className="h-2 w-full bg-primary opacity-80" />
              <CardHeader className="pb-4 relative">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest">Urutan {catIndex + 1}</Badge>
                    </div>
                    <CardTitle className="text-2xl font-black text-foreground font-headline group-hover:text-primary transition-colors">{category.title}</CardTitle>
                    {category.description && <CardDescription className="line-clamp-2 text-sm mt-1 font-medium">{category.description}</CardDescription>}
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <div className="flex gap-1 bg-background/50 p-1 rounded-xl backdrop-blur-sm border shadow-sm">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary hover:text-white rounded-lg" onClick={() => handleMoveCategory(catIndex, 'up')} disabled={catIndex === 0 || isOrdering}><ChevronUp className="h-5 w-5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary hover:text-white rounded-lg" onClick={() => handleMoveCategory(catIndex, 'down')} disabled={catIndex === categories.length - 1 || isOrdering}><ChevronDown className="h-5 w-5" /></Button>
                    </div>
                    <div className="flex gap-1 justify-end">
                      <CategoryFormDialog onSave={handleSaveCategory} category={category} triggerButton={<Button variant="ghost" size="icon" className="h-9 w-9 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl"><Edit className="h-4 w-4" /></Button>} />
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive bg-destructive/5 hover:bg-destructive/10 rounded-xl" onClick={() => setCategoryToDelete(category)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-3 px-6 pb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px flex-grow bg-border" />
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] whitespace-nowrap">Daftar Tautan</span>
                  <div className="h-px flex-grow bg-border" />
                </div>
                {category.links && category.links.length > 0 ? (
                  <div className="space-y-3">
                    {category.links.map((link, linkIndex) => (
                      <div key={link.id} className="group/item flex items-center gap-4 p-4 border-2 border-transparent bg-background/60 hover:bg-background hover:border-primary/20 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md">
                        <div className="p-2 bg-muted rounded-xl group-hover/item:bg-primary/10 transition-colors">
                          <GripVertical className="h-4 w-4 text-muted-foreground/40 group-hover/item:text-primary/40" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-2">
                            <a 
                              href={link.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="font-bold text-sm text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 group/title"
                              title="Klik untuk membuka tautan langsung"
                            >
                              <span className="truncate">{link.judul}</span>
                              <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover/title:opacity-100 transition-opacity flex-shrink-0" />
                            </a>
                          </div>
                          <p className="text-[11px] font-medium text-muted-foreground truncate opacity-70" title={link.url}>{link.url}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-all translate-x-2 group-hover/item:translate-x-0">
                          <div className="flex flex-col">
                            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-primary hover:text-white" onClick={() => handleMoveLink(category, linkIndex, 'up')} disabled={linkIndex === 0}><ChevronUp className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-primary hover:text-white" onClick={() => handleMoveLink(category, linkIndex, 'down')} disabled={linkIndex === category.links.length - 1}><ChevronDown className="h-3 w-3" /></Button>
                          </div>
                          <LinkFormDialog onSave={(data, isEdit) => handleSaveLink(data, category, isEdit)} category={category} link={link} triggerButton={<Button variant="ghost" size="icon" className="h-9 w-9 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl"><Edit className="h-4 w-4" /></Button>} />
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive bg-destructive/5 hover:bg-destructive/10 rounded-xl" onClick={() => handleDeleteLink(category, link.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 border-2 border-dashed rounded-2xl bg-muted/10 opacity-60">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Belum ada link</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-primary/5 py-4 border-t flex justify-center">
                <LinkFormDialog
                    onSave={(data, isEdit) => handleSaveLink(data, category, isEdit)}
                    category={category}
                    triggerButton={<Button variant="ghost" size="sm" className="w-full text-primary hover:text-primary/80 font-black tracking-wide"><PlusCircle className="mr-2 h-4 w-4" />TAMBAH TAUTAN BARU</Button>}
                />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {categoryToDelete && (
        <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
          <AlertDialogContent className="rounded-3xl border-none shadow-2xl p-8">
            <AlertDialogHeader>
              <div className="mx-auto bg-destructive/10 p-4 rounded-full w-fit mb-4">
                <Trash2 className="h-8 w-8 text-destructive" />
              </div>
              <AlertDialogTitle className="text-2xl font-black text-center">Hapus Kategori Arsip?</AlertDialogTitle>
              <AlertDialogDescription className="text-center text-base mt-2">
                Tindakan ini akan menghapus kategori <span className="font-bold text-foreground">"{categoryToDelete.title}"</span> beserta <span className="font-bold text-foreground">{categoryToDelete.links.length} link</span> di dalamnya secara permanen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-8 flex-col sm:flex-row gap-3">
              <AlertDialogCancel className="rounded-2xl py-6 font-bold sm:flex-1">Batalkan</AlertDialogCancel>
              <AlertDialogAction onClick={handleActualDeleteCategory} className="bg-destructive hover:bg-destructive/90 text-white rounded-2xl py-6 font-bold sm:flex-1 shadow-lg shadow-destructive/30">Hapus Permanen</AlertDialogAction>
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
            <DialogContent className="rounded-[2rem] border-none shadow-2xl p-8 max-w-lg">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)}>
                        <DialogHeader>
                            <div className="bg-primary/10 p-4 rounded-full w-fit mb-4">
                              <FolderKanban className="h-8 w-8 text-primary" />
                            </div>
                            <DialogTitle className="text-3xl font-black font-headline text-foreground">{isEditing ? 'Edit Kategori' : 'Kategori Baru'}</DialogTitle>
                            <DialogDescription className="text-base font-medium">Berikan identitas yang jelas untuk kelompok tautan ini.</DialogDescription>
                        </DialogHeader>
                        <div className="py-8 space-y-5">
                            <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel className="text-xs font-black uppercase tracking-widest ml-1">Nama Kategori</FormLabel><FormControl><Input placeholder="cth: Administrasi Kurikulum" {...field} className="rounded-2xl border-2 py-6 px-5 focus-visible:ring-primary shadow-sm" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel className="text-xs font-black uppercase tracking-widest ml-1">Deskripsi (Opsional)</FormLabel><FormControl><Textarea placeholder="Berikan penjelasan singkat tentang isi kategori ini..." {...field} className="rounded-2xl border-2 py-4 px-5 focus-visible:ring-primary shadow-sm min-h-[120px] resize-none" /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full rounded-2xl py-7 text-lg font-black shadow-lg shadow-primary/20">
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                {isEditing ? 'SIMPAN PERUBAHAN' : 'BUAT KATEGORI'}
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
            <DialogContent className="rounded-[2rem] border-none shadow-2xl p-8 max-w-md">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)}>
                        <DialogHeader>
                            <div className="bg-primary/10 p-4 rounded-full w-fit mb-4">
                              <LinkIcon className="h-8 w-8 text-primary" />
                            </div>
                            <DialogTitle className="text-3xl font-black font-headline">{isEditing ? 'Edit Tautan' : 'Tambah Tautan'}</DialogTitle>
                            <DialogDescription className="text-base font-medium">Menyimpan ke kategori <span className="text-primary font-bold">{category.title}</span></DialogDescription>
                        </DialogHeader>
                        <div className="py-8 space-y-5">
                             <FormField control={form.control} name="judul" render={({ field }) => ( <FormItem><FormLabel className="text-xs font-black uppercase tracking-widest ml-1">Judul Tautan</FormLabel><FormControl><Input placeholder="cth: Portal Dapodik Pusat" {...field} className="rounded-2xl border-2 py-6 px-5 focus-visible:ring-primary shadow-sm" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="url" render={({ field }) => ( <FormItem><FormLabel className="text-xs font-black uppercase tracking-widest ml-1">Alamat URL</FormLabel><FormControl><Input placeholder="https://dapodik.kemdikbud.go.id" {...field} type="url" className="rounded-2xl border-2 py-6 px-5 focus-visible:ring-primary shadow-sm" /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="deskripsi" render={({ field }) => ( <FormItem><FormLabel className="text-xs font-black uppercase tracking-widest ml-1">Catatan</FormLabel><FormControl><Textarea placeholder="Keterangan singkat tentang link ini..." {...field} rows={3} className="rounded-2xl border-2 py-4 px-5 focus-visible:ring-primary shadow-sm resize-none" /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full rounded-2xl py-7 text-lg font-black shadow-lg shadow-primary/20">
                                 {form.formState.isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                {isEditing ? 'SIMPAN PERUBAHAN' : 'TAMBAHKAN TAUTAN'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
