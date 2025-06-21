
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, AlertCircle, Users, School, GraduationCap, UserSquare, Briefcase, Users2 } from "lucide-react";
import { getSchoolProfile } from '@/lib/firestoreService';
import type { SchoolProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function GuruViewSchoolProfilePage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<SchoolProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfileData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedProfile = await getSchoolProfile();
      setProfile(fetchedProfile);
    } catch (err: any) {
      console.error("Error fetching school profile for guru:", err);
      setError("Gagal memuat data profil sekolah.");
      toast({
        variant: "destructive",
        title: "Error Memuat Data",
        description: err.message || "Gagal memuat profil sekolah.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);
  
  const totalSiswaRil = React.useMemo(() => {
      if (!profile || !profile.classDetails) return 0;
      return profile.classDetails.reduce((sum, detail) => {
          const maleCountRil = detail.male?.ril ?? 0;
          const femaleCountRil = detail.female?.ril ?? 0;
          return sum + maleCountRil + femaleCountRil;
      }, 0);
  }, [profile]);
  
  const totalSiswaDapodik = React.useMemo(() => {
      if (!profile || !profile.classDetails) return 0;
      return profile.classDetails.reduce((sum, detail) => {
          const maleCountDapodik = detail.male?.dapodik ?? 0;
          const femaleCountDapodik = detail.female?.dapodik ?? 0;
          return sum + maleCountDapodik + femaleCountDapodik;
      }, 0);
  }, [profile]);

  const sdmStats = profile ? [
    { label: "Alumni", icon: GraduationCap, ril: profile.stats.alumni.ril, dapodik: profile.stats.alumni.dapodik },
    { label: "Guru", icon: UserSquare, ril: profile.stats.guru.ril, dapodik: profile.stats.guru.dapodik },
    { label: "Staf/Tendik", icon: Briefcase, ril: profile.stats.tendik.ril, dapodik: profile.stats.tendik.dapodik },
  ] : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4"><Skeleton className="h-10 w-10" /><div className="w-full"><Skeleton className="h-8 w-64" /><Skeleton className="h-5 w-80" /></div></div>
        <Card><CardHeader><Skeleton className="h-7 w-48" /></CardHeader><CardContent className="grid md:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</CardContent></Card>
        <Card><CardHeader><Skeleton className="h-7 w-56" /></CardHeader><CardContent><Skeleton className="h-40" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-7 w-64" /></CardHeader><CardContent><Skeleton className="h-32" /></CardContent></Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4"><Link href="/guru"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link><div><h1 className="text-3xl font-bold">Error</h1></div></div>
        <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Gagal Memuat Data</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/guru"><Button variant="outline" size="icon" aria-label="Kembali ke Dasbor"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Profil Sekolah</h1>
          <p className="text-muted-foreground">Informasi umum dan statistik mengenai sekolah.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users2 className="h-6 w-6 text-primary" /> Statistik Sumber Daya Manusia</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center justify-between text-primary">Siswa Aktif (Ril) <Users className="h-5 w-5" /></CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold text-primary">{totalSiswaRil}</p><p className="text-xs text-muted-foreground">(Berdasarkan data ril per kelas)</p></CardContent>
          </Card>
          {sdmStats.map(stat => (
            <Card key={stat.label}>
              <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center justify-between">{stat.label}<stat.icon className="h-5 w-5 text-muted-foreground" /></CardTitle></CardHeader>
              <CardContent>
                  <p className="text-3xl font-bold">{stat.ril}</p>
                  <p className="text-sm text-muted-foreground">Data Ril</p>
                  <div className="mt-2 border-t pt-2">
                    <p className="text-xl font-semibold">{stat.dapodik}</p>
                    <p className="text-xs text-muted-foreground">Data Dapodik</p>
                  </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Rincian Jumlah Siswa per Kelas</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Kelas</TableHead><TableHead className="text-center">Laki-laki (Ril)</TableHead><TableHead className="text-center">Perempuan (Ril)</TableHead><TableHead className="text-center font-bold text-primary">Total (Ril)</TableHead><TableHead className="text-center">Laki-laki (Dapodik)</TableHead><TableHead className="text-center">Perempuan (Dapodik)</TableHead><TableHead className="text-center font-semibold">Total (Dapodik)</TableHead></TableRow></TableHeader>
              <TableBody>
                {(profile?.classDetails || []).map(cd => {
                    const totalRil = (cd.male?.ril ?? 0) + (cd.female?.ril ?? 0);
                    const totalDapodik = (cd.male?.dapodik ?? 0) + (cd.female?.dapodik ?? 0);
                    return (<TableRow key={cd.className}><TableCell className="font-medium">{cd.className}</TableCell><TableCell className="text-center">{cd.male?.ril ?? 0}</TableCell><TableCell className="text-center">{cd.female?.ril ?? 0}</TableCell><TableCell className="text-center font-bold text-primary">{totalRil}</TableCell><TableCell className="text-center">{cd.male?.dapodik ?? 0}</TableCell><TableCell className="text-center">{cd.female?.dapodik ?? 0}</TableCell><TableCell className="text-center font-semibold">{totalDapodik}</TableCell></TableRow>);
                })}
                <TableRow className="bg-muted hover:bg-muted font-bold"><TableCell>TOTAL</TableCell><TableCell className="text-center">{(profile?.classDetails || []).reduce((s, c) => s + (c.male?.ril ?? 0), 0)}</TableCell><TableCell className="text-center">{(profile?.classDetails || []).reduce((s, c) => s + (c.female?.ril ?? 0), 0)}</TableCell><TableCell className="text-center text-primary text-lg">{totalSiswaRil}</TableCell><TableCell className="text-center">{(profile?.classDetails || []).reduce((s, c) => s + (c.male?.dapodik ?? 0), 0)}</TableCell><TableCell className="text-center">{(profile?.classDetails || []).reduce((s, c) => s + (c.female?.dapodik ?? 0), 0)}</TableCell><TableCell className="text-center text-base">{totalSiswaDapodik}</TableCell></TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><School className="h-6 w-6 text-primary" /> Sarana & Prasarana</CardTitle></CardHeader>
        <CardContent>
            {profile?.sarana && profile.sarana.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {profile.sarana.map(item => (
                        <div key={item.name} className="p-4 rounded-lg bg-muted/50 text-center">
                            <p className="text-2xl font-bold">{item.quantity}</p>
                            <p className="text-sm text-muted-foreground">{item.name}</p>
                        </div>
                    ))}
                </div>
            ) : (<Alert><AlertCircle className="h-4 w-4" /><AlertTitle>Informasi</AlertTitle><AlertDescription>Data sarana dan prasarana belum diinput oleh Admin.</AlertDescription></Alert>)}
        </CardContent>
      </Card>

    </div>
  );
}
