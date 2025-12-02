"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle, Link as LinkIcon, Info, FolderKanban } from "lucide-react";
import { getArsipCategories } from '@/lib/firestoreService';
import type { ArsipLinkCategory } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function ArsipLinkPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [categories, setCategories] = useState<ArsipLinkCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const dashboardLink = userProfile?.role === 'admin' ? '/protected/admin' : '/protected/guru';

  const fetchLinks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getArsipCategories();
      setCategories(data || []);
    } catch (e: any) {
      setError("Gagal memuat daftar link arsip. Silakan coba lagi nanti.");
      toast({ variant: "destructive", title: "Error Memuat Data", description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={dashboardLink}>
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Arsip Link Penting</h1>
          <p className="text-muted-foreground">
            Kumpulan tautan penting, dokumen, dan sumber daya yang relevan.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : error ? (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6 border-2 border-dashed rounded-lg">
            <Info className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">Belum Ada Arsip Link</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                Saat ini belum ada link yang diarsipkan. Admin dapat menambahkannya melalui menu "Kelola Arsip".
            </p>
        </div>
      ) : (
        <Accordion type="single" collapsible className="w-full space-y-4">
            {categories.map((category) => (
                <Card key={category.id} className="overflow-hidden">
                    <AccordionItem value={category.id!} className="border-b-0">
                        <AccordionTrigger className="p-6 hover:no-underline hover:bg-muted/50">
                             <div className="flex items-center gap-4 text-left">
                                <FolderKanban className="h-8 w-8 text-primary flex-shrink-0" />
                                <div>
                                    <h3 className="text-lg font-semibold">{category.title}</h3>
                                    {category.description && <p className="text-sm text-muted-foreground">{category.description}</p>}
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                           <div className="border-t">
                                {category.links && category.links.length > 0 ? (
                                    <div className="divide-y">
                                        {category.links.map(link => (
                                            <div key={link.id} className="p-4 grid grid-cols-[auto_1fr_auto] items-center gap-4 hover:bg-muted/30">
                                                <LinkIcon className="h-5 w-5 text-muted-foreground"/>
                                                <div className="flex-grow">
                                                    <p className="font-medium text-foreground">{link.judul}</p>
                                                    {link.deskripsi && <p className="text-xs text-muted-foreground">{link.deskripsi}</p>}
                                                </div>
                                                <a href={link.url} target="_blank" rel="noopener noreferrer">
                                                    <Button size="sm">Buka Link</Button>
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="p-4 text-sm text-center text-muted-foreground">Tidak ada link dalam kategori ini.</p>
                                )}
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                </Card>
            ))}
        </Accordion>
      )}
    </div>
  );
}