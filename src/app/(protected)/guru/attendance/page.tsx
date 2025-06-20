
"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { id as indonesiaLocale } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { ArrowLeft, Save, Loader2, AlertCircle, CalendarIcon, CheckCircle2, Info, Edit, Lock } from "lucide-react";

import { addOrUpdateTeacherDailyAttendance, getTeacherDailyAttendanceForDate, addActivityLog } from '@/lib/firestoreService';
import type { TeacherDailyAttendance, TeacherDailyAttendanceStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const dailyAttendanceStatusOptions: TeacherDailyAttendanceStatus[] = ['Hadir', 'Izin', 'Sakit', 'Alpa'];

const dailyAttendanceSchema = z.object({
  date: z.date({ required_error: "Tanggal harus dipilih" }),
  status: z.enum(dailyAttendanceStatusOptions, { required_error: "Status kehadiran harus dipilih" }),
  notes: z.string().max(300, "Catatan maksimal 300 karakter").optional(),
});

type DailyAttendanceFormData = z.infer<typeof dailyAttendanceSchema>;

export default function GuruDailyAttendancePage() {
  const { toast } = useToast();
  const { userProfile, loading: authLoading } = useAuth();
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentAttendance, setCurrentAttendance] = useState<TeacherDailyAttendance | null>(null);
  const isFetchingRef = useRef(false);
  const [isFormDisabled, setIsFormDisabled] = useState(false);

  const form = useForm<DailyAttendanceFormData>({
    resolver: zodResolver(dailyAttendanceSchema),
    defaultValues: {
      date: new Date(),
      status: "Hadir",
      notes: "",
    },
  });

  const watchedDate = form.watch("date");
  const watchedStatus = form.watch("status");

  const fetchAttendanceForDate = useCallback(async (dateToFetch: Date) => {
    if (!userProfile?.uid || !dateToFetch) {
      setIsLoadingData(false); 
      isFetchingRef.current = false;
      setIsFormDisabled(false);
      return;
    }
    
    setFetchError(null);
    setCurrentAttendance(null); 
    try {
      const attendanceRecord = await getTeacherDailyAttendanceForDate(userProfile.uid, dateToFetch);
      if (attendanceRecord) {
        setCurrentAttendance(attendanceRecord);
        setIsFormDisabled(true); // Disable form if record exists
        form.setValue('status', attendanceRecord.status);
        form.setValue('notes', attendanceRecord.notes || "");
        
        // Only update the date in the form if it's TRULY different, to avoid re-triggering useEffect
        if (attendanceRecord.date.toDate().getTime() !== dateToFetch.getTime()) {
            form.setValue('date', attendanceRecord.date.toDate()); // This might re-trigger useEffect if not handled carefully
        }
      } else {
        setIsFormDisabled(false); // Enable form if no record
        // Only reset if the logical date actually changed (e.g. user picked a new date)
        // This check helps prevent resetting status/notes if useEffect re-runs for other reasons
        if (form.getValues('date').getTime() !== dateToFetch.getTime()){
             form.setValue('date', dateToFetch, { shouldDirty: true, shouldValidate: true }); // Set new date first
        }
        // Then reset status and notes, or set to default
        form.setValue('status', "Hadir", { shouldDirty: true, shouldValidate: true });
        form.setValue('notes', "", { shouldDirty: true, shouldValidate: true });
      }
    } catch (error: any) {
      setFetchError("Gagal memuat data kehadiran untuk tanggal ini.");
      toast({ variant: "destructive", title: "Error", description: error.message || "Gagal memuat data." });
      setIsFormDisabled(false);
    } finally {
      setIsLoadingData(false);
      isFetchingRef.current = false; 
    }
  }, [userProfile?.uid, form, toast]); // form and toast are stable references

  useEffect(() => {
    if (authLoading) {
      isFetchingRef.current = false; // Ensure flag is reset if auth is still loading
      return;
    }

    if (!userProfile || typeof userProfile.uid !== 'string' || userProfile.uid.trim() === '') {
      setFetchError("Sesi guru tidak ditemukan atau profil tidak valid. Silakan login ulang.");
      setCurrentAttendance(null);
      setIsFormDisabled(true);
      form.reset({ date: watchedDate || new Date(), status: "Hadir", notes: "" }); // Reset form to a sensible default or current date
      setIsLoadingData(false); // Ensure loading is false
      isFetchingRef.current = false; // Reset fetch flag
      return;
    }

    if (!watchedDate) { // If date is somehow null/undefined
      setCurrentAttendance(null); // Clear any existing attendance data
      setIsLoadingData(false);
      setIsFormDisabled(false); // Form should be enabled to pick a date
      isFetchingRef.current = false;
      return;
    }
    
    // Core fetching logic
    if (isFetchingRef.current) { // If a fetch is already in progress, don't start another
      return;
    }
    
    isFetchingRef.current = true; // Set flag before starting fetch
    setIsLoadingData(true); // Set loading state for UI
    fetchAttendanceForDate(watchedDate);

    // Cleanup function for the effect is not strictly necessary here as isFetchingRef handles re-entry
  }, [watchedDate, userProfile?.uid, userProfile, authLoading, fetchAttendanceForDate, form]);


  const onSubmit = async (data: DailyAttendanceFormData) => {
    if (!userProfile?.uid || !userProfile.displayName) {
      toast({ variant: "destructive", title: "Error", description: "Sesi guru tidak valid." });
      return;
    }
    if (isFormDisabled) {
        toast({ variant: "default", title: "Info", description: "Kehadiran untuk tanggal ini sudah dicatat dan tidak dapat diubah." });
        return;
    }
    setIsSubmitting(true);
    try {
      const attendancePayload: Omit<TeacherDailyAttendance, 'id' | 'recordedAt' | 'updatedAt' | 'lastUpdatedByUid'> & {lastUpdatedByUid: string} = {
        teacherUid: userProfile.uid,
        teacherName: userProfile.displayName,
        date: Timestamp.fromDate(data.date), 
        status: data.status,
        notes: data.notes || "",
        lastUpdatedByUid: userProfile.uid,
      };
      
      const savedRecord = await addOrUpdateTeacherDailyAttendance(attendancePayload);
      setCurrentAttendance(savedRecord); 
      setIsFormDisabled(true); // Disable form after successful submission
      
      toast({ title: "Sukses", description: `Kehadiran untuk tanggal ${format(data.date, "PPP", { locale: indonesiaLocale })} berhasil dicatat sebagai ${data.status}.` });
      
      await addActivityLog(
        `Kehadiran Harian Dicatat Guru`,
        `Guru: ${userProfile.displayName}, Tgl: ${format(data.date, "yyyy-MM-dd")}, Status: ${data.status}${data.notes ? ', Ket: ' + data.notes : ''}`,
        userProfile.uid,
        userProfile.displayName
      );
      
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Simpan", description: error.message || `Gagal mencatat kehadiran.` });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (authLoading && !userProfile) {
    return <div className="flex justify-center items-center min-h-[300px]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/guru">
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Guru">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Catat Kehadiran Harian</h1>
          <p className="text-muted-foreground">
            Pilih tanggal dan catat status kehadiran Anda. Data yang sudah disimpan tidak dapat diubah.
          </p>
        </div>
      </div>

      {!userProfile && !authLoading && (
         <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sesi Tidak Ditemukan</AlertTitle>
          <AlertDescription>Tidak dapat memuat profil guru. Silakan login ulang.</AlertDescription>
        </Alert>
      )}

      {userProfile && (
        <Card>
          <CardHeader>
            <CardTitle>Form Kehadiran Harian</CardTitle>
            <CardDescription>
              Status kehadiran terakhir yang tercatat untuk tanggal yang dipilih akan ditampilkan.
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Pilih Tanggal</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full justify-start text-left font-normal ${
                                !field.value && "text-muted-foreground"
                              }`}
                              disabled={isLoadingData || isSubmitting || isFormDisabled}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "PPP", { locale: indonesiaLocale })
                              ) : (
                                <span>Pilih tanggal</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                                if(date) field.onChange(date);
                                setIsFormDisabled(false); // Re-enable form briefly to allow new fetch
                            }}
                            disabled={(date) =>
                              date > new Date() || date < new Date("2020-01-01")
                            }
                            initialFocus
                            locale={indonesiaLocale}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {isLoadingData && (
                    <div className="space-y-2 p-4 border rounded-md bg-muted/50">
                        <Skeleton className="h-5 w-1/3" />
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                )}

                {!isLoadingData && fetchError && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{fetchError}</AlertDescription>
                    </Alert>
                )}

                {!isLoadingData && !fetchError && currentAttendance && (
                    <Alert variant="default" className="bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <AlertTitle className="text-green-700 dark:text-green-400">Kehadiran Tercatat (Tidak Dapat Diubah)</AlertTitle>
                        <AlertDescription className="text-green-600 dark:text-green-300">
                            Status: <span className="font-semibold">{currentAttendance.status}</span>.
                            {currentAttendance.notes && <> Catatan: {currentAttendance.notes}</>}
                            <br />
                            Dicatat pada: {currentAttendance.recordedAt instanceof Timestamp ? format(currentAttendance.recordedAt.toDate(), "PPP, HH:mm", { locale: indonesiaLocale }) : 'N/A'}.
                        </AlertDescription>
                    </Alert>
                )}
                 {!isLoadingData && !fetchError && !currentAttendance && watchedDate && (
                    <Alert variant="default">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Belum Ada Catatan</AlertTitle>
                        <AlertDescription>Belum ada catatan kehadiran untuk tanggal {format(watchedDate, "PPP", { locale: indonesiaLocale })}. Silakan pilih status dan simpan.</AlertDescription>
                    </Alert>
                 )}


                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status Kehadiran</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingData || isSubmitting || isFormDisabled}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih status..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {dailyAttendanceStatusOptions.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catatan (Jika Izin/Sakit/Alpa)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Alasan izin, sakit, atau keterangan alpa..." 
                          {...field} 
                          rows={3} 
                          disabled={isLoadingData || isSubmitting || watchedStatus === "Hadir" || isFormDisabled}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSubmitting || isLoadingData || isFormDisabled}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isFormDisabled ? <Lock className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />)}
                  {isFormDisabled ? "Data Terkunci" : (currentAttendance ? "Perbarui Kehadiran" : "Simpan Kehadiran")}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      )}
    </div>
  );
}
    
