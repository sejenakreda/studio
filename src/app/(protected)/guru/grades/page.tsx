
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, AlertCircle, BookOpenCheck, BarChartHorizontalBig } from "lucide-react";
import { getStudents, getWeights, getGrade, addOrUpdateGrade } from '@/lib/firestoreService';
import { calculateFinalGrade, getAcademicYears, SEMESTERS } from '@/lib/utils';
import type { Siswa, Bobot, Nilai } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const gradeSchema = z.object({
  selectedStudentId: z.string().min(1, "Siswa harus dipilih"),
  selectedAcademicYear: z.string().min(1, "Tahun ajaran harus dipilih"),
  selectedSemester: z.coerce.number().min(1, "Semester harus dipilih").max(2),
  tugas1: z.coerce.number().min(0, "Min 0").max(100, "Maks 100").optional().default(0),
  tugas2: z.coerce.number().min(0, "Min 0").max(100, "Maks 100").optional().default(0),
  tugas3: z.coerce.number().min(0, "Min 0").max(100, "Maks 100").optional().default(0),
  tugas4: z.coerce.number().min(0, "Min 0").max(100, "Maks 100").optional().default(0),
  tugas5: z.coerce.number().min(0, "Min 0").max(100, "Maks 100").optional().default(0),
  tes: z.coerce.number().min(0, "Min 0").max(100, "Maks 100").optional().default(0),
  pts: z.coerce.number().min(0, "Min 0").max(100, "Maks 100").optional().default(0),
  pas: z.coerce.number().min(0, "Min 0").max(100, "Maks 100").optional().default(0),
  kehadiran: z.coerce.number().min(0, "Min 0").max(100, "Maks 100").optional().default(0),
  eskul: z.coerce.number().min(0, "Min 0").max(100, "Maks 100").optional().default(0),
  osis: z.coerce.number().min(0, "Min 0").max(100, "Maks 100").optional().default(0),
});

type GradeFormData = z.infer<typeof gradeSchema>;

const ACADEMIC_YEARS = getAcademicYears();

export default function InputGradesPage() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Siswa[]>([]);
  const [weights, setWeights] = useState<Bobot | null>(null);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [isLoadingWeights, setIsLoadingWeights] = useState(true);
  const [isLoadingGradeData, setIsLoadingGradeData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [calculatedFinalGrade, setCalculatedFinalGrade] = useState<number | null>(null);

  const form = useForm<GradeFormData>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      selectedStudentId: "",
      selectedAcademicYear: ACADEMIC_YEARS[0] || "",
      selectedSemester: SEMESTERS[0]?.value || 1,
      tugas1: 0,
      tugas2: 0,
      tugas3: 0,
      tugas4: 0,
      tugas5: 0,
      tes: 0,
      pts: 0,
      pas: 0,
      kehadiran: 0,
      eskul: 0,
      osis: 0,
    },
  });

  const watchedFormValues = form.watch();

  // Fetch students and weights on mount
  useEffect(() => {
    async function fetchData() {
      setIsLoadingStudents(true);
      setIsLoadingWeights(true);
      setFetchError(null);
      try {
        const [studentList, weightData] = await Promise.all([
          getStudents(),
          getWeights()
        ]);
        setStudents(studentList || []);
        if (studentList && studentList.length > 0) {
          form.setValue("selectedStudentId", studentList[0].id_siswa);
        }
        setWeights(weightData);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        setFetchError("Gagal memuat data siswa atau bobot. Silakan coba lagi.");
        toast({ variant: "destructive", title: "Error", description: "Gagal memuat data awal." });
      } finally {
        setIsLoadingStudents(false);
        setIsLoadingWeights(false);
      }
    }
    fetchData();
  }, [form, toast]);

  // Fetch grade data when selections change
  const { selectedStudentId, selectedAcademicYear, selectedSemester } = watchedFormValues;

  useEffect(() => {
    async function fetchGrade() {
      if (!selectedStudentId || !selectedAcademicYear || !selectedSemester || !weights) {
        form.reset({
          ...form.getValues(), // keep student, year, semester
          tugas1: 0, tugas2: 0, tugas3: 0, tugas4: 0, tugas5: 0,
          tes: 0, pts: 0, pas: 0, kehadiran: 0, eskul: 0, osis: 0,
        });
        setCalculatedFinalGrade(null);
        return;
      }
      setIsLoadingGradeData(true);
      setFetchError(null);
      try {
        const gradeData = await getGrade(selectedStudentId, selectedSemester, selectedAcademicYear);
        if (gradeData) {
          form.reset({
            selectedStudentId,
            selectedAcademicYear,
            selectedSemester,
            tugas1: gradeData.tugas?.[0] || 0,
            tugas2: gradeData.tugas?.[1] || 0,
            tugas3: gradeData.tugas?.[2] || 0,
            tugas4: gradeData.tugas?.[3] || 0,
            tugas5: gradeData.tugas?.[4] || 0,
            tes: gradeData.tes || 0,
            pts: gradeData.pts || 0,
            pas: gradeData.pas || 0,
            kehadiran: gradeData.kehadiran || 0,
            eskul: gradeData.eskul || 0,
            osis: gradeData.osis || 0,
          });
        } else {
           form.reset({
            selectedStudentId,
            selectedAcademicYear,
            selectedSemester,
            tugas1: 0, tugas2: 0, tugas3: 0, tugas4: 0, tugas5: 0,
            tes: 0, pts: 0, pas: 0, kehadiran: 0, eskul: 0, osis: 0,
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
    fetchGrade();
  }, [selectedStudentId, selectedAcademicYear, selectedSemester, form, weights, toast]);


  // Calculate final grade whenever form values or weights change
  useEffect(() => {
    if (weights) {
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
        kehadiran: watchedFormValues.kehadiran || 0,
        eskul: watchedFormValues.eskul || 0,
        osis: watchedFormValues.osis || 0,
      };
      const finalGrade = calculateFinalGrade(currentNilai, weights);
      setCalculatedFinalGrade(finalGrade);
    }
  }, [watchedFormValues, weights]);


  const onSubmit = async (data: GradeFormData) => {
    setIsSubmitting(true);
    setFetchError(null);
    if (!weights) {
      toast({ variant: "destructive", title: "Error", description: "Bobot penilaian belum dimuat." });
      setIsSubmitting(false);
      return;
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
      kehadiran: data.kehadiran || 0,
      eskul: data.eskul || 0,
      osis: data.osis || 0,
    };
    
    // Recalculate final grade before saving
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
  
  const gradeInputFields: { name: keyof GradeFormData; label: string }[] = [
    { name: "tugas1", label: "Nilai Tugas 1" },
    { name: "tugas2", label: "Nilai Tugas 2" },
    { name: "tugas3", label: "Nilai Tugas 3" },
    { name: "tugas4", label: "Nilai Tugas 4" },
    { name: "tugas5", label: "Nilai Tugas 5" },
    { name: "tes", label: "Nilai Tes / Ulangan" },
    { name: "pts", label: "Nilai PTS" },
    { name: "pas", label: "Nilai PAS" },
    { name: "kehadiran", label: "Nilai Kehadiran (%)" },
    { name: "eskul", label: "Nilai Ekstrakurikuler" },
    { name: "osis", label: "Nilai OSIS/Kegiatan" },
  ];

  if (isLoadingStudents || isLoadingWeights) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div>
            <Skeleton className="h-8 w-64 mb-2 rounded-md" />
            <Skeleton className="h-5 w-80 rounded-md" />
          </div>
        </div>
        <Card>
          <CardHeader><Skeleton className="h-7 w-48 mb-2 rounded-md" /><Skeleton className="h-4 w-72 rounded-md" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Input & Lihat Nilai Siswa</h1>
          <p className="text-muted-foreground">
            Pilih siswa, semester, tahun ajaran, lalu input atau perbarui nilai.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Filter Data Nilai</CardTitle>
              <CardDescription>Pilih siswa dan periode untuk melihat atau menginput nilai.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fetchError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{fetchError}</AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="selectedStudentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pilih Siswa</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={students.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih siswa..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {students.length === 0 ? (
                            <SelectItem value="-" disabled>Belum ada siswa</SelectItem>
                          ) : (
                            students.map(student => (
                              <SelectItem key={student.id_siswa} value={student.id_siswa}>
                                {student.nama} ({student.nis})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="selectedAcademicYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tahun Ajaran</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih tahun ajaran..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ACADEMIC_YEARS.map(year => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="selectedSemester"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Semester</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih semester..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SEMESTERS.map(semester => (
                            <SelectItem key={semester.value} value={String(semester.value)}>{semester.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {isLoadingGradeData ? (
             <Card className="mt-6">
                <CardHeader><CardTitle>Memuat Data Nilai...</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md" />
                </CardContent>
             </Card>
          ) : (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Form Input Nilai</CardTitle>
                <CardDescription>
                  Masukkan nilai untuk komponen di bawah ini (0-100). Kosongkan jika tidak ada nilai.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {gradeInputFields.map(fieldInfo => (
                    <FormField
                      key={fieldInfo.name}
                      control={form.control}
                      name={fieldInfo.name as keyof GradeFormData}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{fieldInfo.label}</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0-100" 
                              {...field} 
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                              value={field.value ?? ""}
                              disabled={!selectedStudentId}
                            />
                          </FormControl>
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
                    <p className="text-4xl font-bold text-primary">
                      {calculatedFinalGrade.toFixed(2)}
                    </p>
                    {!weights && <p className="text-xs text-destructive mt-1">Bobot belum dimuat, nilai akhir mungkin tidak akurat.</p>}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSubmitting || !selectedStudentId || !weights}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Simpan Nilai
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}
        </form>
      </Form>
    </div>
  );
}


    