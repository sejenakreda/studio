"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle, Link as LinkIcon, Info, FolderKanban, ExternalLink, Search } from "lucide-react";
import { getArsipCategories } from '@/lib/firestoreService';
import type { ArsipLinkCategory } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function ArsipLinkPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [categories, setCategories] = useState<ArsipLinkCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchSearchQuery] = useState("");
  
  const dashboardLink = userProfile?.role === 'admin' ? '/protected/admin' : '/protected/guru';

  const fetchLinks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getArsipCategories();
      setCategories(data || []);
    } catch (e: any) {
      setError("Gagal memuat daftar link arsip.");
      toast({ variant: "destructive", title: "Error Memuat Data", description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const filteredCategories = React.useMemo(() => {
    if (!searchQuery) return categories;
    const query = searchQuery.toLowerCase();
    
    return categories.map(cat => ({
      ...cat,
      links: cat.links.filter(link => 
        link.judul.toLowerCase().includes(query) || 
        link.deskripsi.toLowerCase().includes(query) ||
        cat.title.toLowerCase().includes(query)
      )
    })).filter(cat => cat.links.length > 0 || cat.title.toLowerCase().includes(query));
  }, [categories, searchQuery]);

  const totalLinks = React.useMemo(() => {
    return categories.reduce((sum, cat) => sum + cat.links.length, 0);
  }, [categories]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Link href={dashboardLink}>
            <Button variant="outline" size="icon" className="rounded-full shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-headline flex items-center gap-3">
              <FolderKanban className="h-8 w-8 text-primary" /> Arsip Link Penting
            </h1>
            <p className="text-muted-foreground text-sm">
              Temukan tautan penting, dokumen, dan aplikasi sekolah dengan mudah.
            </p>
          </div>
        </div>
        
        <div className="relative w-full md:w-72 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Cari tautan..." 
            className="pl-10 rounded-full border-2 focus-visible:ring-primary shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {!isLoading && !error && categories.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-xs bg-primary/10 text-primary border-none whitespace-nowrap">
            {categories.length} Kategori
          </Badge>
          <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-xs bg-accent/10 text-accent border-none whitespace-nowrap">
            {totalLinks} Tautan Tersedia
          </Badge>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)}
        </div>
      ) : error ? (
        <Alert variant="destructive" className="rounded-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Gagal Memuat</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-12 border-2 border-dashed rounded-3xl bg-card/50">
            <div className="bg-muted p-6 rounded-full mb-6">
              <LinkIcon className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Tautan Tidak Ditemukan</h3>
            <p className="text-muted-foreground max-w-sm">
                {searchQuery ? `Tidak ada hasil untuk pencarian "${searchQuery}". Coba kata kunci lain.` : "Saat ini belum ada link yang diarsipkan oleh Admin."}
            </p>
            {searchQuery && (
              <Button variant="link" onClick={() => setSearchSearchQuery("")} className="mt-4">Bersihkan Pencarian</Button>
            )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredCategories.map((category) => (
                <Card key={category.id} className="overflow-hidden rounded-2xl border-none shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-card to-muted/20">
                    <CardHeader className="bg-primary/5 border-b border-primary/10 py-6">
                        <div className="flex items-start gap-4">
                            <div className="bg-primary text-primary-foreground p-3 rounded-xl shadow-sm">
                              <FolderKanban className="h-6 w-6" />
                            </div>
                            <div className="flex-grow">
                                <CardTitle className="text-xl font-bold font-headline">{category.title}</CardTitle>
                                {category.description && <CardDescription className="text-sm mt-1">{category.description}</CardDescription>}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        {category.links && category.links.length > 0 ? (
                            <div className="space-y-3">
                                {category.links.map(link => (
                                    <div key={link.id} className="group relative">
                                      <a 
                                        href={link.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="block p-4 rounded-xl border-2 border-transparent bg-background/50 hover:bg-background hover:border-primary/20 hover:shadow-sm transition-all duration-200"
                                      >
                                        <div className="flex items-center gap-4">
                                            <div className="flex-shrink-0 bg-muted group-hover:bg-primary/10 p-2.5 rounded-lg transition-colors">
                                              <LinkIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary"/>
                                            </div>
                                            <div className="flex-grow min-w-0 pr-8">
                                                <p className="font-bold text-sm text-foreground mb-0.5">{link.judul}</p>
                                                {link.deskripsi && <p className="text-[11px] text-muted-foreground line-clamp-1">{link.deskripsi}</p>}
                                            </div>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                                              <ExternalLink className="h-4 w-4 text-primary" />
                                            </div>
                                        </div>
                                      </a>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-center text-muted-foreground py-8 italic">Tidak ada link dalam kategori ini.</p>
                        )}
                    </CardContent>
                    <CardFooter className="px-6 py-3 bg-muted/30 border-t flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{category.links.length} Tautan</span>
                      <Badge variant="ghost" className="text-[10px] font-medium text-muted-foreground opacity-50">AR-V2</Badge>
                    </CardFooter>
                </Card>
            ))}
        </div>
      )}
    </div>
  );
}
