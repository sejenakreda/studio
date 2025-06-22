
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Save, Loader2, AlertCircle, UserCheck, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { addOrUpdateTeacherDailyAttendance, getTeacherDailyAttendanceForDate } from '@/lib/firestoreService';
import type { TeacherDailyAttendance, TeacherDailyAttendanceStatus } from '@/types';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Timestamp } from 'firebase/firestore';


const attendanceStatusOptions: TeacherDailyAttendanceStatus[] = ['Hadir', 'Izin', 'Sakit', 'Alpa'];

const attendanceSchema = z.object({
  status: z.enum(attendanceStatusOptions, { required_error: "Status kehadiran harus dipilih" }),
  notes: z.string().max(300, "Catatan maksimal 300 karakter").optional(),
});
type AttendanceFormData = z.infer<typeof attendanceSchema>;


export default function CatatKehadiranPage() {
    const { toast } = useToast();
    const { userProfile } = useAuth();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<AttendanceFormData>({
        resolver: zodResolver(attendanceSchema),
        defaultValues: { status: "Hadir", notes: "" },
    });

    const fetchAttendanceForDate = useCallback(async (date: Date) => {
        if (!userProfile) return;
        setIsLoading(true);
        try {
            const record = await getTeacherDailyAttendanceForDate(userProfile.uid, date);
            if (record) {
                form.reset({ status: record.status, notes: record.notes || "" });
            } else {
                form.reset({ status: "Hadir", notes: "" });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Gagal memuat data kehadiran." });
        } finally {
            setIsLoading(false);
        }
    }, [userProfile, form, toast]);

    useEffect(() => {
        fetchAttendanceForDate(selectedDate);
    }, [selectedDate, fetchAttendanceForDate]);

    const onSubmit = async (data: AttendanceFormData) => {
        if (!userProfile) return toast({ variant: "destructive", title: "Error", description: "Sesi Anda tidak valid." });
        setIsSaving(true);
        try {
            const payload: Omit<TeacherDailyAttendance, 'id' | 'recordedAt' | 'updatedAt'> = {
                teacherUid: userProfile.uid,
                teacherName: userProfile.displayName || "Guru",
                date: Timestamp.fromDate(selectedDate),
                status: data.status,
                notes: data.notes,
                lastUpdatedByUid: userProfile.uid,
            };
            await addOrUpdateTeacherDailyAttendance(payload);
            toast({ title: "Sukses", description: "Kehadiran Anda untuk tanggal " + format(selectedDate, "PPP", {locale: indonesiaLocale}) + " berhasil disimpan." });
        } catch (err: any) {
            toast({ variant: "destructive", title: "Gagal Menyimpan", description: err.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/protected/guru"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
                <div><h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Catat Kehadiran Harian</h1><p className="text-muted-foreground">Catat status kehadiran Anda setiap hari.</p></div>
            </div>

            <Card className="max-w-2xl mx-auto">
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardHeader>
                            <CardTitle>Form Kehadiran Harian</CardTitle>
                            <CardDescription>Pilih tanggal, status kehadiran, dan tambahkan catatan jika perlu.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormItem>
                                <FormLabel>Pilih Tanggal</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !selectedDate && "text-muted-foreground"
                                            )}
                                            >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {selectedDate ? format(selectedDate, "EEEE, dd MMMM yyyy", {locale: indonesiaLocale}) : <span>Pilih tanggal</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={selectedDate}
                                            onSelect={(date) => date && setSelectedDate(date)}
                                            disabled={(date) => date > new Date() || date < new Date("2024-01-01")}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </FormItem>
                            
                            {isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : (
                                <>
                                 <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>Status Kehadiran</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4"
                                                >
                                                {attendanceStatusOptions.map(status => (
                                                    <FormItem key={status} className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value={status} /></FormControl>
                                                        <FormLabel className="font-normal">{status}</FormLabel>
                                                    </FormItem>
                                                ))}
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Catatan (Opsional)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                placeholder="Tambahkan keterangan untuk Izin, Sakit, atau lainnya..."
                                                {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                </>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isSaving || isLoading}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {isSaving ? 'Menyimpan...' : 'Simpan Kehadiran'}
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
        </div>
    );
}
