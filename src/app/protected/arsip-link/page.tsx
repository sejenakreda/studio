"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle, Link as LinkIcon, Info, FolderKanban, ExternalLink, Search, Globe, FileText, Bookmark, Zap } from "lucide-react";
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
        (link.deskripsi && link.deskripsi.toLowerCase().includes(query)) ||
        cat.title.toLowerCase().includes(query)
      )
    })).filter(cat => cat.links.length > 0 || cat.title.toLowerCase().includes(query));
  }, [categories, searchQuery]);

  const totalLinks = React.useMemo(() => {
    return categories.reduce((sum, cat) => sum + (cat.links?.length || 0), 0);
  }, [categories]);

  // UI Helper for randomized icons to make it look "neat"
  const getIconForCategory = (index: number) => {
    const icons = [Globe, FileText, Bookmark, Zap, FolderKanban];
    const Icon = icons[index % icons.length];
    return <Icon className="h-6 w-6" />;
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Header Section */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <Link href={dashboardLink}>
              <Button variant="outline" size="icon" className="rounded-full shadow-lg h-12 w-12 hover:bg-primary hover:text-white transition-all border-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-foreground font-headline flex items-center gap-3">
                <FolderKanban className="h-10 w-10 text-primary" /> Arsip Link
              </h1>
              <p className="text-muted-foreground font-medium mt-1">
                Kumpulan portal, dokumen, dan aplikasi penting SMA PGRI Naringgul.
              </p>
            </div>
          </div>
          
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <Input 
              placeholder="Cari judul tautan atau kategori..." 
              className="pl-12 pr-4 h-14 rounded-2xl border-2 focus-visible:ring-primary shadow-lg bg-card/50 backdrop-blur-sm transition-all"
              value={searchQuery}
              onChange={(e) => setSearchSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {!isLoading && !error && categories.length > 0 && (
          <div className="flex flex-wrap gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
            <Badge className="px-5 py-2 rounded-full text-xs bg-primary/10 text-primary hover:bg-primary/20 border-none font-black tracking-widest">
              {categories.length} KATEGORI
            </Badge>
            <Badge className="px-5 py-2 rounded-full text-xs bg-accent/10 text-accent hover:bg-accent/20 border-none font-black tracking-widest">
              {totalLinks} TAUTAN AKTIF
            </Badge>
          </div>
        )}
      </div>

      {/* Content Section */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-[2.5rem]" />)}
        </div>
      ) : error ? (
        <Alert variant="destructive" className="rounded-3xl border-2 p-6">
            <AlertCircle className="h-6 w-6" />
            <AlertTitle className="text-lg font-bold">Gagal Memuat Data</AlertTitle>
            <AlertDescription className="text-base">{error}</AlertDescription>
        </Alert>
      ) : filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[450px] text-center p-12 border-4 border-dashed rounded-[3rem] bg-card/20 backdrop-blur-sm">
            <div className="bg-muted p-10 rounded-full mb-8 shadow-inner">
              <LinkIcon className="h-16 w-16 text-muted-foreground/30" />
            </div>
            <h3 className="text-3xl font-black text-foreground mb-3 font-headline">Tautan Tidak Ditemukan</h3>
            <p className="text-muted-foreground text-lg max-w-md font-medium">
                {searchQuery ? `Kami tidak menemukan apa pun untuk "${searchQuery}". Coba kata kunci yang lebih umum.` : "Belum ada link yang diarsipkan. Hubungi Admin jika Anda merasa ini adalah kesalahan."}
            </p>
            {searchQuery && (
              <Button variant="link" onClick={() => setSearchSearchQuery("")} className="mt-6 text-primary font-black text-lg">Hapus Semua Pencarian</Button>
            )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {filteredCategories.map((category, idx) => (
                <Card key={category.id} className="group relative overflow-hidden rounded-[2.5rem] border-none shadow-xl hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-card to-muted/10">
                    <div className="absolute top-0 left-0 w-2 h-full bg-primary opacity-20 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="bg-primary/5 border-b border-primary/5 py-8 px-8">
                        <div className="flex items-start gap-5">
                            <div className="bg-primary text-primary-foreground p-4 rounded-[1.25rem] shadow-lg shadow-primary/20 transform group-hover:scale-110 transition-transform">
                              {getIconForCategory(idx)}
                            </div>
                            <div className="flex-grow pt-1">
                                <CardTitle className="text-2xl font-black font-headline text-foreground tracking-tight group-hover:text-primary transition-colors">{category.title}</CardTitle>
                                {category.description && <CardDescription className="text-base mt-2 font-medium leading-relaxed opacity-80">{category.description}</CardDescription>}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        {category.links && category.links.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4">
                                {category.links.map(link => (
                                    <a 
                                      key={link.id}
                                      href={link.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="group/link block p-5 rounded-[1.5rem] border-2 border-transparent bg-background/40 hover:bg-background hover:border-primary/30 hover:translate-x-2 transition-all duration-300 shadow-sm"
                                    >
                                      <div className="flex items-center gap-5">
                                          <div className="flex-shrink-0 bg-muted group-hover/link:bg-primary/10 p-3 rounded-xl transition-colors">
                                            <LinkIcon className="h-5 w-5 text-muted-foreground group-hover/link:text-primary"/>
                                          </div>
                                          <div className="flex-grow min-w-0 pr-10 relative">
                                              <p className="font-black text-sm text-foreground mb-1 group-hover/link:text-primary transition-colors truncate">{link.judul}</p>
                                              {link.deskripsi && <p className="text-xs font-medium text-muted-foreground line-clamp-1 opacity-70">{link.deskripsi}</p>}
                                              <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover/link:opacity-100 transform translate-x-4 group-hover/link:translate-x-0 transition-all">
                                                <ExternalLink className="h-5 w-5 text-primary" />
                                              </div>
                                          </div>
                                      </div>
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                              <p className="text-sm font-bold text-muted-foreground/50 uppercase tracking-[0.3em] italic">Folder Kosong</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="px-8 py-5 bg-muted/20 border-t border-muted flex justify-between items-center">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">{category.links?.length || 0} ITEM TERSIMPAN</span>
                      <Badge variant="outline" className="text-[9px] font-bold text-muted-foreground opacity-40 border-muted uppercase tracking-widest">v2.0 Stable</Badge>
                    </CardFooter>
                </Card>
            ))}
        </div>
      )}
    </div>
  );
}
