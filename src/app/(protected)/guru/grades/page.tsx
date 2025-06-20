
"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from "next/link";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as XLSX from 'xlsx';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, AlertCircle, BookOpenCheck, BarChartHorizontalBig, Download, FileUp, FileDown, Target, Info, CheckCircle2, XCircle, PlusCircle, Trash2 } from "lucide-react";
import { getStudents, getWeights, getGrade, addOrUpdateGrade, getActiveAcademicYears, getKkmSetting, setKkmSetting, addActivityLog } from '@/lib/firestoreService';
import { calculateFinalGrade, SEMESTERS, getCurrentAcademicYear, calculateAverage } from '@/lib/utils';
import type { Siswa, Bobot, Nilai, KkmSetting } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';

const gradeSchema = z.object({
  selectedClass: z.string().optional(),
  selectedStudentId: z.string().min(1, "Siswa harus dipilih"),
  selectedAcademicYear: z.string().min(1, "Tahun ajaran harus dipilih"),
  selectedSemester: z.coerce.number().min(1, "Semester harus dipilih").max(2),
  selectedMapel: z.string().min(1, "Mata pelajaran harus dipilih"),
  kkmValue: z.coerce.number().min(0, "KKM minimal 0").max(100, "KKM maksimal 100").optional().default(70),
  tugas: z.array(
    z.coerce.number().min(0, "Min 0").max(100, "Maks 100").optional().default(0)
  ).min(1, "Minimal harus ada satu input nilai tugas"),
  tes: z.coerce.number().min(0).max(100).optional().default(0),
  pts: z.coerce.number().min(0).max(100).optional().default(0),
  pas: z.coerce.number().min(0).max(100).optional().default(0),
  jumlahHariHadir: z.coerce.number().min(0, "Min 0 hari").max(200, "Maks 200 hari").optional().default(0),
  eskul: z.coerce.number().min(0).max(100).optional().default(0),
  osis: z.coerce.number().min(0).max(100).optional().default(0),
});

type GradeFormData = z.infer<typeof gradeSchema>;

interface GradeImportDataRow {
  id_siswa: string;
  nama_siswa?: string;
  nis?: string;
  kelas?: string;
  tahun_ajaran: string;
  mapel: string;
  semester: number | string;
  tes?: number;
  pts?: number;
  pas?: number;
  jumlah_hari_hadir?: number;
  eskul?: number;
  osis?: number;
  [key: string]: any; // For tugas1, tugas2, ...
}

const CURRENT_ACADEMIC_YEAR = getCurrentAcademicYear();

export default function InputGradesPage() {
  const { toast } = useToast();
  const { userProfile, loading: authIsLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [allStudents, setAllStudents] = useState<Siswa[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [studentMap, setStudentMap] = useState<Map<string, Siswa>>(new Map());
  const [weights, setWeights] = useState<Bobot | null>(null);
  const [selectableYears, setSelectableYears] = useState<string[]>([]);
  const [assignedMapelList, setAssignedMapelList] = useState<string[]>([]);
  
  const [pageIsLoading, setPageIsLoading] = useState(true); // Loading for core page data (students, weights, years)
  const [isLoadingGradeData, setIsLoadingGradeData] = useState(false); // Loading for individual student's grade
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingKkm, setIsSavingKkm] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [calculatedFinalGrade, setCalculatedFinalGrade] = useState<number | null>(null);
  const [attendancePercentage, setAttendancePercentage] = useState<number | null>(null);
  const [currentKkm, setCurrentKkm] = useState<number>(70);
  const [untuntasComponents, setUntuntasComponents] = useState<UntuntasComponent[]>([]);
  const [overallAcademicStatus, setOverallAcademicStatus] = useState<'Tuntas' | 'Belum Tuntas' | 'Menghitung...'>('Menghitung...');

  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [isImportingFile, setIsImportingFile] = useState(false);
  const fileImportInputRef = useRef<HTMLInputElement>(null);
  const [retryCounter, setRetryCounter] = useState(0);

  const form = useForm<GradeFormData>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
        selectedClass: "all", selectedStudentId: "", selectedAcademicYear: "",
        selectedSemester: SEMESTERS[0]?.value || 1, selectedMapel: "", kkmValue: 70,
        tugas: [0], tes: 0, pts: 0, pas: 0, jumlahHariHadir: 0, eskul: 0, osis: 0,
    }
  });

  const { fields: tugasFields, append: appendTugas, remove: removeTugas } = useFieldArray({
    control: form.control, name: "tugas"
  });

  const watchedFormValues = form.watch();
  const { 
    selectedClass, selectedStudentId, selectedAcademicYear, 
    selectedSemester, selectedMapel, kkmValue, 
    tugas, tes, pts, pas, jumlahHariHadir, eskul, osis
  } = watchedFormValues;

  const filteredStudentsForDropdown = useMemo(() => {
    if (!selectedClass || selectedClass === "all") return allStudents;
    return allStudents.filter(student => student.kelas === selectedClass);
  }, [allStudents, selectedClass]);

  const totalDaysForCurrentSemester = useMemo(() => {
    if (!weights || !selectedSemester) return undefined;
    return selectedSemester === 1 ? weights.totalHariEfektifGanjil : weights.totalHariEfektifGenap;
  }, [weights, selectedSemester]);

  const resetGradeFieldsToZero = useCallback(() => {
    form.setValue('tugas', [0]); form.setValue('tes', 0);
    form.setValue('pts', 0); form.setValue('pas', 0);
    form.setValue('jumlahHariHadir', 0); form.setValue('eskul', 0);
    form.setValue('osis', 0); setCalculatedFinalGrade(null);
    setAttendancePercentage(null); setUntuntasComponents([]);
    setOverallAcademicStatus('Menghitung...');
  }, [form]);

  const resetAllLocalStates = useCallback(() => {
    setAllStudents([]); setAvailableClasses([]); setStudentMap(new Map());
    setWeights(null); setSelectableYears([]); setAssignedMapelList([]);
    form.reset({
        selectedClass: "all", selectedStudentId: "", selectedAcademicYear: "",
        selectedSemester: SEMESTERS[0]?.value || 1, selectedMapel: "", kkmValue: 70,
        tugas: [0], tes: 0, pts: 0, pas: 0, jumlahHariHadir: 0, eskul: 0, osis: 0,
    });
    resetGradeFieldsToZero();
  }, [form, resetGradeFieldsToZero]);

  const setDefaultsBasedOnDataAndParams = useCallback((
      studentList: Siswa[], activeYearsData: string[],
      guruMapel: string[], uniqueStudentClasses: string[]
    ) => {
      const studentIdParam = searchParams.get('studentId');
      const academicYearParam = searchParams.get('academicYear');
      const semesterParam = searchParams.get('semester');
      const mapelParam = searchParams.get('mapel');
      const classParam = searchParams.get('class');
      
      let defaultClassVal = "all";
      if (classParam && uniqueStudentClasses.includes(classParam)) defaultClassVal = classParam;
      form.setValue('selectedClass', defaultClassVal);

      let defaultStudentIdVal = "";
      const newStudentMap = new Map((studentList || []).map(s => [s.id_siswa, s]));
      if (studentIdParam && newStudentMap.has(studentIdParam)) {
          defaultStudentIdVal = studentIdParam;
          const studentFromParam = newStudentMap.get(studentIdParam);
          if (studentFromParam && studentFromParam.kelas && uniqueStudentClasses.includes(studentFromParam.kelas)) {
            form.setValue('selectedClass', studentFromParam.kelas);
          }
      } else if (defaultClassVal !== "all") {
          const studentsInClass = (studentList || []).filter(s => s.kelas === defaultClassVal);
          if (studentsInClass.length > 0) defaultStudentIdVal = studentsInClass[0].id_siswa;
      } else if (studentList && studentList.length > 0) {
          defaultStudentIdVal = studentList[0].id_siswa;
      }
      form.setValue('selectedStudentId', defaultStudentIdVal);

      let defaultYearVal = "";
      if (academicYearParam && activeYearsData.includes(academicYearParam)) defaultYearVal = academicYearParam;
      else if (activeYearsData.includes(CURRENT_ACADEMIC_YEAR)) defaultYearVal = CURRENT_ACADEMIC_YEAR;
      else if (activeYearsData.length > 0) defaultYearVal = activeYearsData[0];
      form.setValue('selectedAcademicYear', defaultYearVal);
      
      let defaultSemesterVal = SEMESTERS[0]?.value || 1;
      if (semesterParam && SEMESTERS.some(s => String(s.value) === semesterParam)) defaultSemesterVal = parseInt(semesterParam, 10);
      form.setValue('selectedSemester', defaultSemesterVal);

      let defaultMapelVal = "";
      if (mapelParam && guruMapel.includes(mapelParam)) defaultMapelVal = mapelParam;
      else if (guruMapel.length > 0) defaultMapelVal = guruMapel[0];
      form.setValue('selectedMapel', defaultMapelVal);
      
      if (!studentIdParam || !academicYearParam || !semesterParam || !mapelParam) {
          resetGradeFieldsToZero();
      }
  }, [searchParams, form, resetGradeFieldsToZero]);


  useEffect(() => {
    const initPage = async () => {
      setFetchError(null);
      setPageIsLoading(true); // Start loading for the entire page setup sequence

      if (authIsLoading) {
        // Still waiting for AuthContext to resolve user status. UI should show a global loader.
        return; // useEffect will re-run when authIsLoading changes
      }

      // AuthContext has resolved. Now check userProfile.
      if (!userProfile || !userProfile.uid) {
        setFetchError("Sesi guru tidak ditemukan. Silakan login ulang.");
        resetAllLocalStates();
        setPageIsLoading(false);
        return;
      }

      if (!userProfile.assignedMapel || userProfile.assignedMapel.length === 0) {
        setFetchError("Anda belum memiliki mata pelajaran yang ditugaskan oleh Admin. Silakan hubungi Admin untuk menugaskan mapel agar Anda dapat menginput nilai.");
        setAssignedMapelList([]); // Explicitly set to empty
         // Attempt to load non-mapel specific data for UI consistency
        try {
            const activeYearsData = await getActiveAcademicYears();
            setSelectableYears(activeYearsData);
             if (activeYearsData.length > 0) {
                form.setValue('selectedAcademicYear', activeYearsData.includes(CURRENT_ACADEMIC_YEAR) ? CURRENT_ACADEMIC_YEAR : activeYearsData[0]);
            } else {
                form.setValue('selectedAcademicYear', "");
            }
            form.setValue('selectedSemester', SEMESTERS[0]?.value || 1);
        } catch (e) { /* Silently fail for non-critical data here */ }
        setPageIsLoading(false);
        return;
      }

      // If we reach here, userProfile is valid, and mapel are assigned.
      setAssignedMapelList(userProfile.assignedMapel);

      try {
        // Fetch core page data
        const [studentList, weightData, activeYearsData] = await Promise.all([
          getStudents(),
          getWeights(),
          getActiveAcademicYears(),
        ]);

        setAllStudents(studentList || []);
        const uniqueStudentClasses = [...new Set((studentList || []).map(s => s.kelas).filter(Boolean) as string[])].sort();
        setAvailableClasses(uniqueStudentClasses);
        const newStudentMap = new Map((studentList || []).map(s => [s.id_siswa, s]));
        setStudentMap(newStudentMap);
        setWeights(weightData);
        setSelectableYears(activeYearsData);
        
        // Set form defaults only after all necessary data is fetched
        setDefaultsBasedOnDataAndParams(studentList || [], activeYearsData, userProfile.assignedMapel, uniqueStudentClasses);

      } catch (error: any) {
        setFetchError("Gagal memuat data pendukung (siswa/bobot/tahun ajaran). Error: " + error.message);
        resetAllLocalStates();
      } finally {
        setPageIsLoading(false); // Core page data loading sequence finished (or failed)
      }
    };

    initPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authIsLoading, userProfile, retryCounter]); // Removed form, setDefaults, resetAllLocalStates to simplify deps
                                                    // Ensure those functions are stable (useCallback)


  useEffect(() => {
    async function fetchKkmData() {
      // Only run if core page data is loaded, auth is fine, and essential filters are set
      if (pageIsLoading || authIsLoading || !selectedMapel || !selectedAcademicYear || fetchError) {
        if (!pageIsLoading && !authIsLoading && !fetchError && selectedMapel && selectedAcademicYear) {
             form.setValue("kkmValue", 70); 
             setCurrentKkm(70);
        }
        return;
      }
      
      try {
        const kkmData = await getKkmSetting(selectedMapel, selectedAcademicYear);
        const kkmVal = kkmData ? kkmData.kkmValue : 70;
        form.setValue("kkmValue", kkmVal);
        setCurrentKkm(kkmVal);
      } catch (error) {
        toast({ variant: "destructive", title: "Error KKM", description: "Gagal memuat KKM. Menggunakan default 70." });
         form.setValue("kkmValue", 70);
         setCurrentKkm(70);
      }
    }
    fetchKkmData();
  }, [selectedMapel, selectedAcademicYear, pageIsLoading, authIsLoading, fetchError, form, toast]);

  useEffect(() => {
    async function fetchAndSetGrade() {
       // Ensure all prerequisites are met before fetching grade data
      if (pageIsLoading || authIsLoading || !userProfile?.uid || !selectedStudentId || !selectedAcademicYear || !selectedSemester || !selectedMapel || !weights || fetchError ) {
        if (!pageIsLoading && !authIsLoading && !fetchError) { 
           resetGradeFieldsToZero();
        }
        if (isLoadingGradeData) setIsLoadingGradeData(false);
        return;
      }
      setIsLoadingGradeData(true);
      try {
        const gradeData = await getGrade(selectedStudentId, selectedSemester, selectedAcademicYear, selectedMapel, userProfile.uid);
        const totalDaysForSemesterVal = selectedSemester === 1 ? weights.totalHariEfektifGanjil : weights.totalHariEfektifGenap;
        
        if (gradeData) {
          let calculatedJumlahHariHadir = 0;
          if (typeof gradeData.kehadiran === 'number' && typeof totalDaysForSemesterVal === 'number' && totalDaysForSemesterVal > 0) {
            calculatedJumlahHariHadir = Math.round((gradeData.kehadiran / 100) * totalDaysForSemesterVal);
          }
          form.setValue('tugas', gradeData.tugas && gradeData.tugas.length > 0 ? gradeData.tugas : [0]);
          form.setValue('tes', gradeData.tes || 0);
          form.setValue('pts', gradeData.pts || 0);
          form.setValue('pas', gradeData.pas || 0);
          form.setValue('jumlahHariHadir', calculatedJumlahHariHadir);
          form.setValue('eskul', gradeData.eskul || 0);
          form.setValue('osis', gradeData.osis || 0);
        } else {
           resetGradeFieldsToZero();
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Gagal memuat data nilai." });
        resetGradeFieldsToZero();
      } finally {
        setIsLoadingGradeData(false);
      }
    }
    fetchAndSetGrade();
  }, [selectedStudentId, selectedAcademicYear, selectedSemester, selectedMapel, weights, pageIsLoading, authIsLoading, userProfile?.uid, fetchError, form, resetGradeFieldsToZero, toast]);

 useEffect(() => {
    if (weights && !pageIsLoading && !authIsLoading && userProfile?.uid && selectedMapel && selectedStudentId && typeof kkmValue === 'number' && !fetchError) {
      const totalDaysForSemesterVal = selectedSemester === 1 ? weights.totalHariEfektifGanjil : weights.totalHariEfektifGenap;
      let currentAttendancePercentage = 0;
      if (typeof totalDaysForSemesterVal === 'number' && totalDaysForSemesterVal > 0 && typeof jumlahHariHadir === 'number') {
        currentAttendancePercentage = (jumlahHariHadir / totalDaysForSemesterVal) * 100;
        currentAttendancePercentage = Math.min(Math.max(currentAttendancePercentage, 0), 100);
      }
      setAttendancePercentage(currentAttendancePercentage);
      const allTugasScores = tugas && tugas.length > 0 ? tugas.map(t => t || 0) : [0];
      const currentNilai: Nilai = {
        id_siswa: selectedStudentId, mapel: selectedMapel, semester: selectedSemester, tahun_ajaran: selectedAcademicYear, 
        tugas: allTugasScores, tes: tes ?? 0, pts: pts ?? 0, pas: pas ?? 0, 
        kehadiran: currentAttendancePercentage, eskul: eskul ?? 0, osis: osis ?? 0, teacherUid: userProfile.uid 
      };
      const finalGrade = calculateFinalGrade(currentNilai, weights);
      setCalculatedFinalGrade(finalGrade);
      const kkmToUse = kkmValue; 
      const newUntuntasComponentsList: UntuntasComponent[] = [];
      let allAcademicComponentsAreTuntas = true;
      allTugasScores.forEach((score, index) => { if (score < kkmToUse) { newUntuntasComponentsList.push({ name: `Tugas Ke-${index + 1}`, value: score }); allAcademicComponentsAreTuntas = false; } });
      if ((tes ?? 0) < kkmToUse) { newUntuntasComponentsList.push({ name: "Tes/Ulangan", value: tes ?? 0 }); allAcademicComponentsAreTuntas = false; }
      if ((pts ?? 0) < kkmToUse) { newUntuntasComponentsList.push({ name: "PTS", value: pts ?? 0 }); allAcademicComponentsAreTuntas = false; }
      if ((pas ?? 0) < kkmToUse) { newUntuntasComponentsList.push({ name: "PAS", value: pas ?? 0 }); allAcademicComponentsAreTuntas = false; }
      setUntuntasComponents(newUntuntasComponentsList);
      const overallTuntas = (finalGrade !== null && finalGrade >= kkmToUse) && allAcademicComponentsAreTuntas;
      setOverallAcademicStatus(selectedStudentId && selectedMapel ? (overallTuntas ? 'Tuntas' : 'Belum Tuntas') : 'Menghitung...');
    } else if (!selectedStudentId || !selectedMapel || fetchError) {
        setOverallAcademicStatus('Menghitung...'); setUntuntasComponents([]); setCalculatedFinalGrade(null);
    }
  }, [selectedStudentId, selectedAcademicYear, selectedSemester, selectedMapel, kkmValue, tugas, tes, pts, pas, jumlahHariHadir, eskul, osis, weights, pageIsLoading, authIsLoading, userProfile?.uid, fetchError]);

  const handleSaveKkm = async () => { /* ... existing logic ... */ };
  const onSubmit = async (data: GradeFormData) => { /* ... existing logic ... */ };
  const otherGradeInputFields = [ /* ... existing array ... */ ];
  const handleDownloadGradeTemplate = async () => { /* ... existing logic ... */ };
  const handleExportCurrentGrade = () => { /* ... existing logic ... */ };
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => { /* ... existing logic ... */ };
  const handleImportGradesFromFile = async () => { /* ... existing logic ... */ };
  const retryInitialDataLoad = () => setRetryCounter(prev => prev + 1);
  const isFormEffectivelyDisabled = pageIsLoading || authIsLoading || fetchError !== null;

  const LoadingSkeletonComponent = () => (
     <div className="space-y-6">
        <div className="flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-md" /><div className="w-full"><Skeleton className="h-8 w-64 mb-2 rounded-md" /><Skeleton className="h-5 w-80 rounded-md" /></div></div>
        <Card><CardHeader><Skeleton className="h-7 w-48 mb-2 rounded-md" /><Skeleton className="h-4 w-72 rounded-md" /></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <Skeleton className="h-10 w-full rounded-md" /> <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" /> <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" /> <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </CardContent>
        </Card>
        <Card className="mt-6">
            <CardHeader><Skeleton className="h-7 w-48 mb-2 rounded-md" /><Skeleton className="h-4 w-72 rounded-md" /></CardHeader>
            <CardContent className="space-y-6"><div><Skeleton className="h-6 w-32 mb-2 rounded-md" /><div className="space-y-3 mt-2"><Skeleton className="h-10 w-full rounded-md" /></div><Skeleton className="h-9 w-40 mt-3 rounded-md" /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{[...Array(6)].map((_, i) => (<div key={i} className="space-y-1.5"><Skeleton className="h-5 w-24 rounded-md" /><Skeleton className="h-10 w-full rounded-md" /></div>))}</div>
                <Skeleton className="h-28 w-full mt-6 rounded-md" />
            </CardContent><CardFooter><Skeleton className="h-10 w-32 rounded-md" /></CardFooter>
        </Card>
      </div>
  );

  if (authIsLoading || (pageIsLoading && !fetchError)) {
    return <LoadingSkeletonComponent />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/guru"><Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Guru"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div><h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Input &amp; Lihat Nilai Siswa</h1><p className="text-muted-foreground">Pilih filter, mapel yang diampu &amp; KKM, lalu input atau perbarui nilai.</p></div>
      </div>

      {fetchError && (
        <Card>
          <CardHeader><CardTitle>Error Memuat Data</CardTitle></CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{fetchError}</AlertDescription>
            </Alert>
            <Button onClick={retryInitialDataLoad} variant="outline" className="mt-4">Coba Lagi</Button>
          </CardContent>
        </Card>
      )}

      {!fetchError && (
        <>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Card>
                <CardHeader><CardTitle>Filter Data &amp; Pengaturan Mapel</CardTitle><CardDescription>Pilih kelas, siswa, periode, mata pelajaran, dan atur KKM.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                    <FormField control={form.control} name="selectedClass" render={({ field }) => (<FormItem><FormLabel>Filter Kelas</FormLabel><Select onValueChange={(value) => { field.onChange(value); form.setValue('selectedStudentId', '', { shouldDirty: true }); }} value={field.value || "all"} disabled={availableClasses.length === 0 || isFormEffectivelyDisabled}><FormControl><SelectTrigger><SelectValue placeholder={pageIsLoading ? "Memuat..." : "Pilih kelas..."} /></SelectTrigger></FormControl><SelectContent>{availableClasses.length === 0 ? (<SelectItem value="no_class_data" disabled>{pageIsLoading ? "Memuat..." : "Belum ada data kelas"}</SelectItem>) : (<><SelectItem value="all">Semua Kelas</SelectItem>{availableClasses.map(kls => (<SelectItem key={kls} value={kls}>{kls}</SelectItem>))}</>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="selectedStudentId" render={({ field }) => (<FormItem><FormLabel>Pilih Siswa</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={filteredStudentsForDropdown.length === 0 || !selectedClass || isFormEffectivelyDisabled }><FormControl><SelectTrigger><SelectValue placeholder={pageIsLoading ? "Memuat..." : "Pilih siswa..."} /></SelectTrigger></FormControl><SelectContent>{filteredStudentsForDropdown.length === 0 ? (<SelectItem value="no_students" disabled>{pageIsLoading ? "Memuat..." : (selectedClass && selectedClass !== "all" ? "Tidak ada siswa di kelas ini" : "Pilih kelas dahulu atau tidak ada siswa")}</SelectItem>) : (filteredStudentsForDropdown.map(student => (<SelectItem key={student.id_siswa} value={student.id_siswa}>{student.nama} ({student.nis})</SelectItem>)))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="selectedAcademicYear" render={({ field }) => (<FormItem><FormLabel>Tahun Ajaran</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={selectableYears.length === 0 || isFormEffectivelyDisabled}><FormControl><SelectTrigger><SelectValue placeholder={pageIsLoading ? "Memuat..." : "Pilih tahun ajaran..."} /></SelectTrigger></FormControl><SelectContent>{selectableYears.length === 0 ? (<SelectItem value="no_active_years" disabled>{pageIsLoading ? "Memuat..." : "Tidak ada tahun aktif"}</SelectItem>) : (selectableYears.map(year => (<SelectItem key={year} value={year}>{year}</SelectItem>)))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="selectedSemester" render={({ field }) => (<FormItem><FormLabel>Semester</FormLabel><Select onValueChange={(value) => field.onChange(parseInt(value))} value={String(field.value || SEMESTERS[0]?.value)} disabled={isFormEffectivelyDisabled} ><FormControl><SelectTrigger><SelectValue placeholder={pageIsLoading ? "Memuat..." : "Pilih semester..."} /></SelectTrigger></FormControl><SelectContent>{SEMESTERS.map(semester => (<SelectItem key={semester.value} value={String(semester.value)}>{semester.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="selectedMapel" render={({ field }) => (<FormItem><FormLabel>Mata Pelajaran</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={assignedMapelList.length === 0 || isFormEffectivelyDisabled}><FormControl><SelectTrigger><SelectValue placeholder={pageIsLoading ? "Memuat..." : "Pilih mapel yang diampu..."} /></SelectTrigger></FormControl><SelectContent>{assignedMapelList.length === 0 ? (<SelectItem value="no_mapel" disabled>{pageIsLoading ? "Memuat..." : (userProfile?.assignedMapel && userProfile.assignedMapel.length > 0 ? "Tidak ada mapel yang valid" : "Anda belum ditugaskan mapel")}</SelectItem>) : (assignedMapelList.map(mapel => (<SelectItem key={mapel} value={mapel}>{mapel}</SelectItem>)))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="kkmValue" render={({ field }) => (<FormItem><FormLabel>KKM</FormLabel><div className="flex items-center gap-2"><FormControl><Input type="number" placeholder="cth: 75" {...field} value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} disabled={!selectedMapel || !selectedAcademicYear || isFormEffectivelyDisabled}/></FormControl><Button type="button" onClick={handleSaveKkm} variant="outline" size="icon" title="Simpan KKM" disabled={isSavingKkm || !selectedMapel || !selectedAcademicYear || form.getValues('kkmValue') === currentKkm || isFormEffectivelyDisabled}>{isSavingKkm ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}</Button></div><FormDescription>KKM saat ini untuk mapel &amp; TA ini: <span className="font-bold">{currentKkm}</span></FormDescription><FormMessage /></FormItem>)} />
                  </div>
                </CardContent>
              </Card>

              {(isLoadingGradeData && selectedMapel && !isFormEffectivelyDisabled && selectedStudentId ) ? (<Card className="mt-6"><CardHeader><CardTitle>Memuat Data Nilai &amp; KKM...</CardTitle></CardHeader><CardContent className="flex items-center justify-center min-h-[200px]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></CardContent></Card>) : 
              isFormEffectivelyDisabled ? null : (
                <Card className="mt-6">
                  <CardHeader><CardTitle>Form Input Nilai</CardTitle><CardDescription>Masukkan nilai (0-100) atau jumlah hari hadir. Nilai akhir akan dihitung otomatis.</CardDescription></CardHeader>
                  <CardContent className="space-y-6">
                    <div><FormLabel className="text-base font-medium">Nilai Tugas</FormLabel><div className="space-y-3 mt-2">{tugasFields.map((field, index) => (<FormField key={field.id} control={form.control} name={`tugas.${index}`} render={({ field: tugasField }) => (<FormItem className="flex items-center gap-2"><FormLabel className="w-28 shrink-0">Tugas Ke-{index + 1}</FormLabel><FormControl><Input type="number" placeholder="0-100" {...tugasField} value={tugasField.value ?? ""} onChange={e => tugasField.onChange(parseFloat(e.target.value) || 0)} disabled={!selectedStudentId || !selectedMapel || isFormEffectivelyDisabled}/></FormControl>{tugasFields.length > 1 && (<Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => removeTugas(index)} title={`Hapus Tugas Ke-${index+1}`} disabled={isFormEffectivelyDisabled}><Trash2 className="h-4 w-4" /></Button>)}<FormMessage /></FormItem>)} />))}</div><Button type="button" variant="outline" size="sm" onClick={() => appendTugas(0)} className="mt-3" disabled={!selectedStudentId || !selectedMapel || isFormEffectivelyDisabled}><PlusCircle className="mr-2 h-4 w-4" /> Tambah Input Tugas</Button></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{otherGradeInputFields.map(fieldInfo => (<FormField key={fieldInfo.name} control={form.control} name={fieldInfo.name as keyof GradeFormData} render={({ field }) => (<FormItem><FormLabel>{fieldInfo.label}</FormLabel><FormControl><Input type="number" placeholder={fieldInfo.name === "jumlahHariHadir" ? "0 - " + (totalDaysForCurrentSemester || 'N/A') : "0-100"} {...field} value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} disabled={!selectedStudentId || !selectedMapel || (fieldInfo.name === "jumlahHariHadir" && (typeof totalDaysForCurrentSemester !== 'number' || totalDaysForCurrentSemester <=0)) || isFormEffectivelyDisabled}/></FormControl>{fieldInfo.name === "jumlahHariHadir" && (<FormDescription className="text-xs">{typeof totalDaysForCurrentSemester === 'number' && totalDaysForCurrentSemester > 0 ? "Total hari efektif: " + totalDaysForCurrentSemester + " hari. Persentase: " : "Total hari efektif belum diatur Admin. "}{attendancePercentage !== null && typeof totalDaysForCurrentSemester === 'number' && totalDaysForCurrentSemester > 0 && (<span className="font-semibold text-primary">{attendancePercentage.toFixed(1)}%</span>)}</FormDescription>)}{fieldInfo.bonusKey && weights && (<FormDescription className="text-xs">Maks. bonus tambahan: +{weights[fieldInfo.bonusKey] ?? 0} poin. Input nilai 0-100.</FormDescription>)}{fieldInfo.desc && !fieldInfo.bonusKey && (<FormDescription className="text-xs">{fieldInfo.desc}</FormDescription>)}<FormMessage /></FormItem>)} />))}</div>
                    {calculatedFinalGrade !== null && selectedStudentId && selectedMapel && (<div className={"mt-6 p-4 border-2 border-dashed rounded-lg bg-muted/50 text-center " + (overallAcademicStatus === 'Tuntas' ? 'border-green-600/50' : overallAcademicStatus === 'Belum Tuntas' ? 'border-destructive' : 'border-border')}><BarChartHorizontalBig className="mx-auto h-10 w-10 text-primary mb-2" /><p className="text-sm font-medium text-muted-foreground">Nilai Akhir (Rapor) untuk {selectedMapel}</p><p className={"text-4xl font-bold " + (overallAcademicStatus === 'Tuntas' ? 'text-green-600' : overallAcademicStatus === 'Belum Tuntas' ? 'text-destructive' : 'text-foreground')}>{calculatedFinalGrade.toFixed(2)}</p><p className="text-base text-muted-foreground mt-1">KKM: {kkmValue} - Status: {overallAcademicStatus === 'Menghitung...' ? (<span className="italic">Menghitung...</span>) : overallAcademicStatus === 'Tuntas' ? (<span className="font-semibold text-green-600 inline-flex items-center"><CheckCircle2 className="mr-1 h-4 w-4"/>Tuntas</span>) : (<span className="font-semibold text-destructive inline-flex items-center"><XCircle className="mr-1 h-4 w-4"/>Belum Tuntas</span>)}</p>{untuntasComponents.length > 0 && overallAcademicStatus === 'Belum Tuntas' && (<div className="mt-2 text-sm text-destructive"><p className="font-medium">Komponen akademik inti yang belum tuntas (di bawah KKM {kkmValue}):</p><ul className="list-disc list-inside text-left max-w-md mx-auto">{untuntasComponents.map(comp => (<li key={comp.name}>{comp.name}: {comp.value}</li>))}</ul></div>)}{!weights && <p className="text-xs text-destructive mt-1">Bobot/Hari Efektif belum dimuat, nilai akhir mungkin tidak akurat.</p>}</div>)}
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2"><Button type="submit" disabled={isSubmitting || !selectedStudentId || !weights || !selectedAcademicYear || !selectedMapel || fetchError !== null || isFormEffectivelyDisabled}>{isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</>) : (<><Save className="mr-2 h-4 w-4" />Simpan Nilai</>)}</Button><Button type="button" variant="outline" onClick={handleExportCurrentGrade} disabled={!selectedStudentId || !selectedAcademicYear || !selectedSemester || !selectedMapel || fetchError !== null || isFormEffectivelyDisabled}><FileDown className="mr-2 h-4 w-4" /> Ekspor Nilai Ini</Button></CardFooter>
                </Card>
              )}
            </form>
          </Form>

          <Card className="mt-6">
            <CardHeader><CardTitle>Impor &amp; Ekspor Nilai Massal</CardTitle><CardDescription>Gunakan template Excel untuk impor nilai secara massal. Template akan menyertakan daftar siswa, serta tahun ajaran, semester, dan mapel yang terpilih di filter atas.</CardDescription></CardHeader>
            <CardContent className="space-y-4"><div className="flex flex-col sm:flex-row gap-2 items-center"><Input type="file" accept=".xlsx, .xls" onChange={handleFileChange} ref={fileImportInputRef} disabled={isFormEffectivelyDisabled || !watchedFormValues.selectedMapel} className="flex-grow text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/><Button onClick={handleImportGradesFromFile} disabled={isImportingFile || !selectedImportFile || isFormEffectivelyDisabled || !watchedFormValues.selectedMapel} className="w-full sm:w-auto">{isImportingFile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}{isImportingFile ? 'Mengimpor...' : 'Impor File Nilai'}</Button></div><p className="text-sm text-muted-foreground">Unduh template di bawah ini. Template akan berisi {"`id_siswa`, `nama_siswa`, `nis`, `kelas`, `tahun_ajaran`, `semester`, dan `mapel`"} yang sudah terisi sesuai filter. Guru tinggal mengisi komponen nilai. Sistem akan membaca kolom {"`tugas1` hingga `tugas5`"} (sesuai template) dan komponen lain. File impor harus berisi mapel yang telah ditugaskan kepada Anda dan cocok dengan filter mapel yang aktif.</p></CardContent>
            <CardFooter><Button type="button" variant="outline" onClick={handleDownloadGradeTemplate} disabled={isImportingFile || isFormEffectivelyDisabled || !watchedFormValues.selectedAcademicYear || !watchedFormValues.selectedSemester || !watchedFormValues.selectedMapel}><Download className="mr-2 h-4 w-4" /> Unduh Template Impor Nilai</Button></CardFooter>
          </Card>
        </>
      )}
    </div>
  );
}
    
