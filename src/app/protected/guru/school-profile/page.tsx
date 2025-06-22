
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle, Building, Users2, School } from "lucide-react";
import { getSchoolProfile } from '@/lib/firestoreService';
import type { SchoolProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function GuruSchoolProfilePage() {
  const { toast } = useToast();
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedProfile = await getSchoolProfile();
      setSchoolProfile(fetchedProfile);
    } catch (err: any) {
      setError("Gagal memuat data profil sekolah.");
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalSiswaAktif = React.useMemo(() => {
      if (!schoolProfile || !schoolProfile.classDetails) return 0;
      return schoolProfile.classDetails.reduce((sum, detail) => {
          const maleCountRil = detail.male?.ril ?? 0;
          const femaleCountRil = detail.female?.ril ?? 0;
          return sum + maleCountRil + femaleCountRil;
      }, 0);
  }, [schoolProfile]);

  const totalSiswaDapodik = React.useMemo(() => {
      if (!schoolProfile || !schoolProfile.classDetails) return 0;
      return schoolProfile.classDetails.reduce((sum, detail) => {
          const maleCountDapodik = detail.male?.dapodik ?? 0;
          const femaleCountDapodik = detail.female?.dapodik ?? 0;
          return sum + maleCountDapodik + femaleCountDapodik;
      }, 0);
  }, [schoolProfile]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/protected/guru">
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Profil Sekolah</h1>
          <p className="text-muted-foreground">
            Informasi dan statistik umum SMA PGRI Naringgul.
          </p>
        </div>
      </div>

       <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><School className="h-5 w-5 text-primary" /> Statistik Sekolah</CardTitle>
            <CardDescription>Data statistik umum sekolah berdasarkan data ril dan Dapodik.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            ) : error ? (
                 <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Gagal Memuat Data</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
            ) : !schoolProfile ? (
                 <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Data Kosong</AlertTitle>
                  <AlertDescription>Data profil sekolah belum diisi oleh Admin.</AlertDescription>
                </Alert>
            ): (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-lg font-medium mb-2 flex items-center gap-1.5"><Users2 className="h-5 w-5 text-muted-foreground" /> Sumber Daya Manusia</h4>
                        <div className="grid grid-cols-1 gap-2 text-sm">
                           <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-primary">Siswa Aktif (Ril)</span> 
                                    <span className="font-bold text-xl text-primary">{totalSiswaAktif}</span>
                                </div>
                                <div className="flex justify-between items-center text-primary/80 text-xs pt-1 mt-1 border-t border-dashed border-primary/30">
                                    <span>(Sesuai Dapodik)</span>
                                    <span className="font-semibold">{totalSiswaDapodik}</span>
                                </div>
                            </div>

                            <div className="p-3 rounded-lg bg-muted/50 border">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">Alumni (Ril)</span> 
                                    <span className="font-bold">{schoolProfile?.stats.alumni.ril ?? 0}</span>
                                </div>
                                <div className="flex justify-between items-center text-muted-foreground text-xs pt-1 mt-1 border-t border-dashed">
                                    <span>(Sesuai Dapodik)</span>
                                    <span>{schoolProfile?.stats.alumni.dapodik ?? 0}</span>
                                </div>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 border">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">Guru (Ril)</span> 
                                    <span className="font-bold">{schoolProfile?.stats.guru.ril ?? 0}</span>
                                </div>
                                 <div className="flex justify-between items-center text-muted-foreground text-xs pt-1 mt-1 border-t border-dashed">
                                    <span>(Sesuai Dapodik)</span>
                                    <span>{schoolProfile?.stats.guru.dapodik ?? 0}</span>
                                </div>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 border">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">Staf/Tendik (Ril)</span>
                                    <span className="font-bold">{schoolProfile?.stats.tendik.ril ?? 0}</span>
                                </div>
                                <div className="flex justify-between items-center text-muted-foreground text-xs pt-1 mt-1 border-t border-dashed">
                                    <span>(Sesuai Dapodik)</span>
                                    <span>{schoolProfile?.stats.tendik.dapodik ?? 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-lg font-medium mb-2 flex items-center gap-1.5"><Building className="h-5 w-5 text-muted-foreground" />Sarana & Prasarana</h4>
                        {isLoading ? (
                            <div className="grid grid-cols-2 gap-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full"/>)}</div>
                        ) : !schoolProfile || !schoolProfile.sarana || schoolProfile.sarana.length === 0 ? (
                            <p className="text-sm text-muted-foreground mt-4 text-center">Data sarana belum diisi oleh Admin.</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                {(schoolProfile.sarana || []).map((item) => (
                                     <div key={item.name} className="p-3 rounded-lg bg-muted/50 border flex flex-col items-center justify-center">
                                        <p className="text-2xl font-bold">{item.quantity}</p>
                                        <p className="text-sm text-muted-foreground text-center">{item.name}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
             )}
          </CardContent>
        </Card>
    </div>
  );
}
