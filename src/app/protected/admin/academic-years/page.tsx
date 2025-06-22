
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CalendarCog, Loader2, AlertCircle, Info } from "lucide-react";
import { getAcademicYearSettings, setAcademicYearActiveStatus, addActivityLog } from '@/lib/firestoreService';
import { getAcademicYears, getCurrentAcademicYear } from '@/lib/utils'; // getAcademicYears for master list
import type { AcademicYearSetting } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';

interface DisplayableYear extends AcademicYearSetting {
  isExplicitlySet: boolean;
}

export default function ManageAcademicYearsPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [allPossibleYears, setAllPossibleYears] = useState<string[]>([]);
  const [yearSettings, setYearSettings] = useState<DisplayableYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});


  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const possibleYears = getAcademicYears(); // Master list of all years we might want to manage
      setAllPossibleYears(possibleYears);

      const savedSettings = await getAcademicYearSettings();
      const settingsMap = new Map(savedSettings.map(s => [s.year, s]));

      const displayableYears: DisplayableYear[] = possibleYears.map(year => {
        const setting = settingsMap.get(year);
        return {
          id: setting?.id || year.replace(/\//g, '_'),
          year: year,
          isActive: setting?.isActive || false,
          isExplicitlySet: !!setting,
        };
      });
      
      // Sort to ensure current and recent years are easily accessible, or by year string
      displayableYears.sort((a, b) => b.year.localeCompare(a.year)); // newest first
      setYearSettings(displayableYears);

    } catch (err: any) {
      console.error("Error fetching academic year settings:", err);
      setError("Gagal memuat pengaturan tahun ajaran. Silakan coba lagi nanti.");
      toast({
        variant: "destructive",
        title: "Error Memuat Data",
        description: err.message || "Terjadi kesalahan saat mengambil data.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleToggleActive = async (year: string, currentIsActive: boolean) => {
    if (!userProfile) {
      toast({ variant: "destructive", title: "Error", description: "Sesi admin tidak ditemukan." });
      return;
    }
    setIsUpdating(prev => ({...prev, [year]: true}));
    const newIsActive = !currentIsActive;
    try {
      await setAcademicYearActiveStatus(year, newIsActive);
      toast({
        title: "Sukses",
        description: `Tahun ajaran ${year} telah ${newIsActive ? 'diaktifkan' : 'dinonaktifkan'}.`,
      });
      
      await addActivityLog(
        `Status Tahun Ajaran Diubah`,
        `Tahun Ajaran: ${year} menjadi ${newIsActive ? 'Aktif' : 'Tidak Aktif'} oleh Admin: ${userProfile.displayName || userProfile.email}`,
        userProfile.uid,
        userProfile.displayName || userProfile.email || "Admin"
      );

      // Refetch to update the UI correctly, especially isExplicitlySet
      fetchSettings(); 

    } catch (err: any) {
      console.error(`Error updating status for ${year}:`, err);
      toast({
        variant: "destructive",
        title: "Gagal Memperbarui",
        description: `Gagal mengubah status untuk tahun ajaran ${year}.`,
      });
    } finally {
       setIsUpdating(prev => ({...prev, [year]: false}));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Admin">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Kelola Tahun Ajaran Aktif</h1>
          <p className="text-muted-foreground">
            Atur tahun ajaran mana saja yang akan muncul di pilihan filter dan form input nilai.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Tahun Ajaran</CardTitle>
          <CardDescription>
            Aktifkan atau nonaktifkan tahun ajaran. Tahun ajaran yang tidak aktif tidak akan muncul di dropdown.
            Jika tidak ada yang aktif, tahun ajaran saat ini akan digunakan sebagai default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-md">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Gagal Memuat Data</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              <Button onClick={fetchSettings} variant="outline" className="mt-4">
                Coba Lagi
              </Button>
            </Alert>
          ) : yearSettings.length === 0 ? (
             <Alert variant="default">
                <Info className="h-4 w-4" />
                <AlertTitle>Informasi</AlertTitle>
                <AlertDescription>Tidak ada data tahun ajaran yang dapat dikelola saat ini. Ini seharusnya tidak terjadi jika utilitas tahun ajaran berfungsi.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {yearSettings.map((setting) => (
                <div 
                  key={setting.year} 
                  className={`flex items-center justify-between p-3 border rounded-md transition-colors hover:bg-muted/50 
                              ${setting.year === getCurrentAcademicYear() ? 'bg-primary/5 border-primary/30' : ''}`}
                >
                  <Label htmlFor={`switch-${setting.year.replace(/\//g, '_')}`} className="text-base flex items-center gap-2">
                    <CalendarCog className="h-5 w-5 text-muted-foreground" />
                    {setting.year}
                    {setting.year === getCurrentAcademicYear() && (
                      <span className="text-xs px-2 py-0.5 bg-primary text-primary-foreground rounded-full">Saat Ini</span>
                    )}
                  </Label>
                  <div className="flex items-center gap-2">
                    {isUpdating[setting.year] && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Switch
                      id={`switch-${setting.year.replace(/\//g, '_')}`}
                      checked={setting.isActive}
                      onCheckedChange={() => handleToggleActive(setting.year, setting.isActive)}
                      disabled={isUpdating[setting.year]}
                      aria-label={`Aktifkan tahun ajaran ${setting.year}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
