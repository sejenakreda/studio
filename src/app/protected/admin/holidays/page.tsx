
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ArrowLeft, Loader2, CalendarOff, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { getSchoolHolidays, setSchoolHoliday, deleteSchoolHoliday, addActivityLog } from '@/lib/firestoreService';
import type { SchoolHoliday } from '@/types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ManageHolidaysPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const [holidays, setHolidays] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchHolidays = useCallback(async (month: Date) => {
    setIsLoading(true);
    try {
      const from = startOfMonth(month);
      const to = endOfMonth(month);
      const holidayDocs = await getSchoolHolidays(from, to);
      const holidayDates = holidayDocs.map(doc => new Date(doc.dateString));
      setHolidays(holidayDates);
    } catch (error: any) {
      console.error('Error fetching holidays:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Gagal memuat daftar hari libur.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchHolidays(currentMonth);
  }, [currentMonth, fetchHolidays]);

  const handleDayClick = async (day: Date, { selected }: { selected: boolean }) => {
    if (isUpdating || !userProfile) return;
    setIsUpdating(true);
    
    const dateString = format(day, 'yyyy-MM-dd');
    const isCurrentlyHoliday = holidays.some(d => format(d, 'yyyy-MM-dd') === dateString);

    try {
      if (isCurrentlyHoliday) {
        await deleteSchoolHoliday(dateString);
        await addActivityLog(`Hari Libur Dihapus`, `Tanggal: ${dateString} oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName);
        toast({ title: 'Sukses', description: `${format(day, 'd MMM yyyy')} tidak lagi ditandai sebagai hari libur.` });
      } else {
        await setSchoolHoliday({ dateString: dateString, description: 'Hari Libur Ditetapkan Admin' });
        await addActivityLog(`Hari Libur Ditambahkan`, `Tanggal: ${dateString} oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName);
        toast({ title: 'Sukses', description: `${format(day, 'd MMM yyyy')} telah ditandai sebagai hari libur.` });
      }
      fetchHolidays(currentMonth); // Refresh holidays for the current month
    } catch (error: any) {
      console.error('Error updating holiday:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Gagal memperbarui status hari libur.' });
    } finally {
      setIsUpdating(false);
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Kelola Kalender Libur Sekolah</h1>
          <p className="text-muted-foreground">Tandai hari libur nasional atau cuti bersama untuk penyesuaian perhitungan kehadiran.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kalender Interaktif</CardTitle>
          <CardDescription>
            Pilih tanggal untuk menandainya sebagai hari libur, atau klik lagi untuk menghapus status libur.
            Tanggal yang ditandai akan dikecualikan dari perhitungan hari kerja efektif.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Informasi</AlertTitle>
            <AlertDescription>
                Hari Sabtu dan Minggu secara otomatis dianggap libur dan tidak perlu ditandai. Tandai hanya hari libur yang jatuh pada hari kerja (Senin-Jumat).
            </AlertDescription>
          </Alert>
          <div className="relative">
            <Calendar
              mode="multiple"
              min={0}
              selected={holidays}
              onDayClick={handleDayClick}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              disabled={isUpdating}
              footer={
                <p className="text-sm text-center text-muted-foreground pt-2">
                    Anda melihat bulan: {format(currentMonth, 'MMMM yyyy', { locale: indonesiaLocale })}
                </p>
              }
              modifiersClassNames={{
                selected: "bg-red-500 text-white hover:bg-red-600 focus:bg-red-600",
              }}
            />
            {(isLoading || isUpdating) && (
              <div className="absolute inset-0 bg-background/70 flex items-center justify-center rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
           
        </CardContent>
      </Card>
    </div>
  );
}
