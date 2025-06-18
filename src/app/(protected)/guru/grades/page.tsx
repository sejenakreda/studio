
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, AlertCircle, BookOpenCheck, BarChartHorizontalBig } from "lucide-react";
import { getStudents, getWeights, getGrade, addOrUpdateGrade, getActiveAcademicYears } from '@/lib/firestoreService';
import { calculateFinalGrade, SEMESTERS, getCurrentAcademicYear } from '@/lib/utils';
import type { Siswa, Bobot, Nilai } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const gradeSchema = z.object({
  selectedStudentId: z.string().min(1, "Siswa harus dipilih"),
  selectedAcademicYear: z.string().min(1, "Tahun ajaran harus dipilih"),
  selectedSemester: z.coerce.number().min(1, "Semester harus dipilih").max(2),
  tugas1: z.coerce.number().min(0).max(100).optional().default(0),
  tugas2: z.coerce.number().min(0).max(100).optional().default(0),
  tugas3: z.coerce.number().min(0).max(100).optional().default(0),
  tugas4: z.coerce.number().min(0).max(100).optional().default(0),
  tugas5: z.coerce.number().min(0).max(100).optional().default(0),
  tes: z.coerce.number().min(0).max(100).optional().default(0),
  pts: z.coerce.number().min(0).max(100).optional().default(0),
  pas: z.coerce.number().min(0).max(100).optional().default(0),
  jumlahHariHadir: z.coerce.number().min(0, "Min 0 hari").max(200, "Maks 200 hari").optional().default(0),
  eskul: z.coerce.number().min(0).max(100).optional().default(0),
  osis: z.coerce.number().min(0).max(100).optional().default(0),
});

type GradeFormData = z.infer<typeof gradeSchema>;

const CURRENT_ACADEMIC_YEAR = getCurrentAcademicYear();

export default function InputGradesPage() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Siswa[]>([]);
  const [weights, setWeights] = useState<Bobot | null>(null);
  const [selectableYears, setSelectableYears] = useState<string[]>([]);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [isLoadingGradeData, setIsLoadingGradeData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [calculatedFinalGrade, setCalculatedFinalGrade] = useState<number | null>(null);
  const [attendancePercentage, setAttendancePercentage] = useState<number | null>(null);

  const form = useForm<GradeFormData>({
    resolver: zodResolver(gradeSchema),
    // Default values will be set after fetching active academic years
  });

  const watchedFormValues = form.watch();
  const { selectedStudentId, selectedAcademicYear, selectedSemester } = watchedFormValues;

  const totalDaysForCurrentSemester = useMemo(() => {
    if (!weights || !selectedSemester) return undefined;
    return selectedSemester === 1 ? weights.totalHariEfektifGanjil : weights.totalHariEfektifGenap;
  }, [weights, selectedSemester]);

  useEffect(() => {
    async function fetchInitialData() {
      setIsLoadingInitialData(true);
      setFetchError(null);
      try {
        const [studentList, weightData, activeYears] = await Promise.all([
          getStudents(),
          getWeights(),
          getActiveAcademicYears()
        ]);
        
        setStudents(studentList || []);
        setWeights(weightData);
        setSelectableYears(activeYears);

        let defaultYear = "";
        if (activeYears.includes(CURRENT_ACADEMIC_YEAR)) {
          defaultYear = CURRENT_ACADEMIC_YEAR;
        } else if (activeYears.length > 0) {
          defaultYear = activeYears[0]; // Default to the first active year if current is not active
        }
        
        form.reset({
          selectedStudentId: studentList && studentList.length > 0 ? studentList[0].id_siswa : "",
          selectedAcademicYear: defaultYear,
          selectedSemester: SEMESTERS[0]?.value || 1,
          tugas1: 0, tugas2: 0, tugas3: 0, tugas4: 0, tugas5: 0,
          tes: 0, pts: 0, pas: 0, jumlahHariHadir: 0, eskul: 0, osis: 0,
        });

      } catch (error) {
        console.error("Error fetching initial data:", error);
        setFetchError("Gagal memuat data siswa, bobot, atau tahun ajaran. Silakan coba lagi.");
        toast({ variant: "destructive", title: "Error", description: "Gagal memuat data awal." });
      } finally {
        setIsLoadingInitialData(false);
      }
    }
    fetchInitialData();
  }, [form, toast]);

  useEffect(() => {
    async function fetchGrade() {
      if (!selectedStudentId || !selectedAcademicYear || !selectedSemester || !weights || isLoadingInitialData) {
        // Reset fields if dependent selections are missing or initial data still loading
        if (!isLoadingInitialData) { // only reset if initial load is done
            form.reset({
                ...form.getValues(), 
                tugas1: 0, tugas2: 0, tugas3: 0, tugas4: 0, tugas5: 0,
                tes: 0, pts: 0, pas: 0, jumlahHariHadir: 0, eskul: 0, osis: 0,
            });
            setCalculatedFinalGrade(null);
            setAttendancePercentage(null);
        }
        return;
      }
      setIsLoadingGradeData(true);
      setFetchError(null);
      try {
        const gradeData = await getGrade(selectedStudentId, selectedSemester, selectedAcademicYear);
        const totalDaysForSemester = selectedSemester === 1 ? weights.totalHariEfektifGanjil : weights.totalHariEfektifGenap;
        let calculatedJumlahHariHadir = 0;

        if (gradeData) {
          if (typeof gradeData.kehadiran === 'number' && typeof totalDaysForSemester === 'number' && totalDaysForSemester > 0) {
            calculatedJumlahHariHadir = Math.round((gradeData.kehadiran / 100) * totalDaysForSemester);
          }
          form.reset({
            ...form.getValues(), // Keep selected student, year, semester
            tugas1: gradeData.tugas?.[0] || 0,
            tugas2: gradeData.tugas?.[1] || 0,
            tugas3: gradeData.tugas?.[2] || 0,
            tugas4: gradeData.tugas?.[3] || 0,
            tugas5: gradeData.tugas?.[4] || 0,
            tes: gradeData.tes || 0,
            pts: gradeData.pts || 0,
            pas: gradeData.pas || 0,
            jumlahHariHadir: calculatedJumlahHariHadir,
            eskul: gradeData.eskul || 0,
            osis: gradeData.osis || 0,
          });
        } else {
           form.reset({
            ...form.getValues(),
            tugas1: 0, tugas2: 0, tugas3: 0, tugas4: 0, tugas5: 0,
            tes: 0, pts: 0, pas: 0, jumlahHariHadir: 0, eskul: 0, osis: 0,
          });
        }
      } catch (error) {
        console.error("Error fetching grade data:", error);
        setFetchError("Gagal memuat data nilai siswa. Silakan coba lagi.");
        toast({ variant: "destructive", title: "Error", description: "Gagal memuat data nilai." });
      } finally {
        setIsLoadingGradeData(false);
      }
    }
    
    if (selectedStudentId && selectedAcademicYear && selectedSemester && weights && !isLoadingInitialData) {
       fetchGrade();
    }
  }, [selectedStudentId, selectedAcademicYear, selectedSemester, form, weights, toast, isLoadingInitialData]);


  useEffect(() => {
    if (weights && !isLoadingInitialData) { // ensure weights are loaded and form values are stable
      const totalDaysForSemester = watchedFormValues.selectedSemester === 1 
        ? weights.totalHariEfektifGanjil 
        : weights.totalHariEfektifGenap;
      
      let currentAttendancePercentage = 0;
      if (typeof totalDaysForSemester === 'number' && totalDaysForSemester > 0 && typeof watchedFormValues.jumlahHariHadir === 'number') {
        currentAttendancePercentage = (watchedFormValues.jumlahHariHadir / totalDaysForSemester) * 100;
        currentAttendancePercentage = Math.min(Math.max(currentAttendancePercentage, 0), 100);
      }
      setAttendancePercentage(currentAttendancePercentage);

      const tugasScores = [
        watchedFormValues.tugas1, watchedFormValues.tugas2, watchedFormValues.tugas3, watchedFormValues.tugas4, watchedFormValues.tugas5
      ].filter(score => typeof score === 'number' && !isNaN(score)) as number[];

      const currentNilai: Nilai = {
        id_siswa: watchedFormValues.selectedStudentId,
        semester: watchedFormValues.selectedSemester,
        tahun_ajaran: watchedFormValues.selectedAcademicYear,
        tugas: tugasScores,
        tes: watchedFormValues.tes || 0,
        pts: watchedFormValues.pts || 0,
        pas: watchedFormValues.pas || 0,
        kehadiran: currentAttendancePercentage,
        eskul: watchedFormValues.eskul || 0,
        osis: watchedFormValues.osis || 0,
      };
      const finalGrade = calculateFinalGrade(currentNilai, weights);
      setCalculatedFinalGrade(finalGrade);
    }
  }, [watchedFormValues, weights, isLoadingInitialData]);


  const onSubmit = async (data: GradeFormData) => {
    setIsSubmitting(true);
    setFetchError(null);
    if (!weights) {
      toast({ variant: "destructive", title: "Error", description: "Konfigurasi bobot & hari efektif belum dimuat." });
      setIsSubmitting(false);
      return;
    }

    const totalDaysForSemester = data.selectedSemester === 1 ? weights.totalHariEfektifGanjil : weights.totalHariEfektifGenap;
    let calculatedKehadiranPercentage = 0;

    if (typeof totalDaysForSemester === 'number' && totalDaysForSemester > 0 && typeof data.jumlahHariHadir === 'number') {
      calculatedKehadiranPercentage = (data.jumlahHariHadir / totalDaysForSemester) * 100;
      calculatedKehadiranPercentage = Math.min(Math.max(calculatedKehadiranPercentage, 0), 100);
    } else if (typeof totalDaysForSemester !== 'number' || totalDaysForSemester <= 0) {
        toast({ variant: "destructive", title: "Peringatan", description: "Total hari efektif belum diatur oleh Admin untuk semester ini. Kehadiran tidak dapat dihitung." });
    }

    const tugasScores = [
      data.tugas1, data.tugas2, data.tugas3, data.tugas4, data.tugas5
    ].filter(score => typeof score === 'number' && !isNaN(score)) as number[];

    const nilaiToSave: Omit<Nilai, 'id' | 'nilai_akhir'> = {
      id_siswa: data.selectedStudentId,
      semester: data.selectedSemester,
      tahun_ajaran: data.selectedAcademicYear,
      tugas: tugasScores,
      tes: data.tes || 0,
      pts: data.pts || 0,
      pas: data.pas || 0,
      kehadiran: calculatedKehadiranPercentage, 
      eskul: data.eskul || 0,
      osis: data.osis || 0,
    };
    
    const finalGradeValue = calculateFinalGrade(nilaiToSave as Nilai, weights); 
    const nilaiWithFinal: Omit<Nilai, 'id'> = {...nilaiToSave, nilai_akhir: finalGradeValue};

    try {
      await addOrUpdateGrade(nilaiWithFinal);
      toast({ title: "Sukses", description: "Data nilai siswa berhasil disimpan." });
    } catch (error) {
      console.error("Error saving grade data:", error);
      setFetchError("Gagal menyimpan data nilai. Silakan coba lagi.");
      toast({ variant: "destructive", title: "Error", description: "Gagal menyimpan data nilai." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const gradeInputFields: { name: keyof Omit<GradeFormData, 'selectedStudentId' | 'selectedAcademicYear' | 'selectedSemester' | 'kehadiran'>; label: string, type?: string, desc?: string }[] = [
    { name: "tugas1", label: "Nilai Tugas 1" }, { name: "tugas2", label: "Nilai Tugas 2" },
    { name: "tugas3", label: "Nilai Tugas 3" }, { name: "tugas4", label: "Nilai Tugas 4" },
    { name: "tugas5", label: "Nilai Tugas 5" }, { name: "tes", label: "Nilai Tes / Ulangan" },
    { name: "pts", label: "Nilai PTS" }, { name: "pas", label: "Nilai PAS" },
    { name: "jumlahHariHadir", label: "Jumlah Hari Hadir", desc: "Akan dikonversi ke persentase otomatis."},
    { name: "eskul", label: "Nilai Ekstrakurikuler" }, { name: "osis", label: "Nilai OSIS/Kegiatan" },
  ];

  if (isLoadingInitialData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-md" /><div><Skeleton className="h-8 w-64 mb-2 rounded-md" /><Skeleton className="h-5 w-80 rounded-md" /></div></div>
        <Card><CardHeader><Skeleton className="h-7 w-48 mb-2 rounded-md" /><Skeleton className="h-4 w-72 rounded-md" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-10 w-full rounded-md" /><Skeleton className="h-10 w-full rounded-md" /><Skeleton className="h-10 w-full rounded-md" /><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}</div></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/guru"><Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Guru"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div><h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Input & Lihat Nilai Siswa</h1><p className="text-muted-foreground">Pilih siswa, periode, lalu input atau perbarui nilai.</p></div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader><CardTitle>Filter Data Nilai</CardTitle><CardDescription>Pilih siswa dan periode untuk melihat atau menginput nilai.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {fetchError && (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{fetchError}</AlertDescription></Alert>)}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="selectedStudentId" render={({ field }) => (<FormItem><FormLabel>Pilih Siswa</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={students.length === 0}><FormControl><SelectTrigger><SelectValue placeholder="Pilih siswa..." /></SelectTrigger></FormControl><SelectContent>{students.length === 0 ? (<SelectItem value="-" disabled>Belum ada siswa</SelectItem>) : (students.map(student => (<SelectItem key={student.id_siswa} value={student.id_siswa}>{student.nama} ({student.nis})</SelectItem>)))}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="selectedAcademicYear" render={({ field }) => (<FormItem><FormLabel>Tahun Ajaran</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={selectableYears.length === 0}><FormControl><SelectTrigger><SelectValue placeholder="Pilih tahun ajaran..." /></SelectTrigger></FormControl><SelectContent>{selectableYears.length === 0 ? (<SelectItem value="-" disabled>Tidak ada tahun aktif</SelectItem>) : (selectableYears.map(year => (<SelectItem key={year} value={year}>{year}</SelectItem>)))}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="selectedSemester" render={({ field }) => (<FormItem><FormLabel>Semester</FormLabel><Select onValueChange={(value) => field.onChange(parseInt(value))} value={String(field.value || SEMESTERS[0]?.value)}><FormControl><SelectTrigger><SelectValue placeholder="Pilih semester..." /></SelectTrigger></FormControl><SelectContent>{SEMESTERS.map(semester => (<SelectItem key={semester.value} value={String(semester.value)}>{semester.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
              </div>
            </CardContent>
          </Card>

          {isLoadingGradeData ? (
             <Card className="mt-6"><CardHeader><CardTitle>Memuat Data Nilai...</CardTitle></CardHeader><CardContent className="flex items-center justify-center min-h-[200px]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></CardContent></Card>
          ) : (
            <Card className="mt-6">
              <CardHeader><CardTitle>Form Input Nilai</CardTitle><CardDescription>Masukkan nilai (0-100) atau jumlah hari hadir.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {gradeInputFields.map(fieldInfo => (
                    <FormField
                      key={fieldInfo.name}
                      control={form.control}
                      name={fieldInfo.name as keyof GradeFormData} // Explicit cast
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{fieldInfo.label}</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder={fieldInfo.name === "jumlahHariHadir" ? `0 - ${totalDaysForCurrentSemester || 'N/A'}` : "0-100"}
                              {...field} 
                              value={field.value ?? ""} 
                              onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                              disabled={!selectedStudentId || (fieldInfo.name === "jumlahHariHadir" && (typeof totalDaysForCurrentSemester !== 'number' || totalDaysForCurrentSemester <=0))}
                            />
                          </FormControl>
                          {fieldInfo.name === "jumlahHariHadir" && (
                             <FormDescription className="text-xs">
                                {typeof totalDaysForCurrentSemester === 'number' && totalDaysForCurrentSemester > 0 
                                  ? `Total hari efektif: ${totalDaysForCurrentSemester} hari. Persentase: `
                                  : "Total hari efektif belum diatur Admin. "}
                                {attendancePercentage !== null && typeof totalDaysForCurrentSemester === 'number' && totalDaysForCurrentSemester > 0 && (
                                  <span className="font-semibold text-primary">{attendancePercentage.toFixed(1)}%</span>
                                )}
                             </FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                {calculatedFinalGrade !== null && selectedStudentId && (
                  <div className="mt-6 p-4 border-2 border-dashed rounded-lg bg-muted/50 text-center">
                    <BarChartHorizontalBig className="mx-auto h-10 w-10 text-primary mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">Nilai Akhir (Rapor)</p>
                    <p className="text-4xl font-bold text-primary">{calculatedFinalGrade.toFixed(2)}</p>
                    {!weights && <p className="text-xs text-destructive mt-1">Bobot/Hari Efektif belum dimuat, nilai akhir mungkin tidak akurat.</p>}
                    {weights && <p className="text-xs text-muted-foreground mt-1">Dihitung berdasarkan bobot yang diatur oleh Admin.</p>}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSubmitting || !selectedStudentId || !weights || !selectedAcademicYear}>
                  {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</>) : (<><Save className="mr-2 h-4 w-4" />Simpan Nilai</>)}
                </Button>
              </CardFooter>
            </Card>
          )}
        </form>
      </Form>
    </div>
  );
}
