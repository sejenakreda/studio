
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

const CURRENT_ACADEMIC_YEAR = getCurrentAcademicYear();

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
  
  const [pageIsLoading, setPageIsLoading] = useState(true); 
  const [isLoadingGradeData, setIsLoadingGradeData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingKkm, setIsSavingKkm] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [calculatedFinalGrade, setCalculatedFinalGrade] = useState<number | null>(null);
  const [attendancePercentage, setAttendancePercentage] = useState<number | null>(null);
  const [currentKkm, setCurrentKkm] = useState<number>(70);
  const [untuntasComponents, setUntuntasComponents] = useState<{name: string; value: number}[]>([]);
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


  const resetGradeFieldsToZero = useCallback(() => {
    form.setValue('tugas', [0], { shouldDirty: true });
    form.setValue('tes', 0, { shouldDirty: true });
    form.setValue('pts', 0, { shouldDirty: true });
    form.setValue('pas', 0, { shouldDirty: true });
    form.setValue('jumlahHariHadir', 0, { shouldDirty: true });
    form.setValue('eskul', 0, { shouldDirty: true });
    form.setValue('osis', 0, { shouldDirty: true });
    setCalculatedFinalGrade(null);
    setAttendancePercentage(null);
    setUntuntasComponents([]);
    setOverallAcademicStatus('Menghitung...');
  }, [form]);

  const resetAllLocalStates = useCallback(() => {
    setAllStudents([]); 
    setAvailableClasses([]); 
    setStudentMap(new Map());
    setWeights(null); 
    setSelectableYears([]); 
    setAssignedMapelList([]);
    form.reset({
        selectedClass: "all", selectedStudentId: "", selectedAcademicYear: "",
        selectedSemester: SEMESTERS[0]?.value || 1, selectedMapel: "", kkmValue: 70,
        tugas: [0], tes: 0, pts: 0, pas: 0, jumlahHariHadir: 0, eskul: 0, osis: 0,
    });
    resetGradeFieldsToZero();
  }, [form, resetGradeFieldsToZero]);

  const setDefaultsBasedOnDataAndParams = useCallback(
    (
      studentList: Siswa[],
      activeYearsData: string[],
      guruMapel: string[],
      uniqueStudentClasses: string[]
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
      if (guruMapel && Array.isArray(guruMapel) && guruMapel.length > 0) {
        if (mapelParam && guruMapel.includes(mapelParam)) defaultMapelVal = mapelParam;
        else defaultMapelVal = guruMapel[0];
      }
      form.setValue('selectedMapel', defaultMapelVal);
      
      if (!defaultStudentIdVal || !defaultYearVal || !defaultSemesterVal || !defaultMapelVal) {
          resetGradeFieldsToZero();
      }
    },
    [searchParams, form, resetGradeFieldsToZero] 
  );

  useEffect(() => {
    const initPage = async () => {
      // console.log("InputGrades: initPage triggered. authIsLoading:", authIsLoading, "userProfile?.uid:", userProfile?.uid);
      if (authIsLoading) {
        // console.log("InputGrades: Auth is still loading, initPage will wait.");
        // No need to set pageIsLoading here, rely on the initial state or the LoadingSkeletonComponent condition
        return; 
      }

      // Primary check for valid session and profile UID
      if (!userProfile || typeof userProfile.uid !== 'string' || userProfile.uid.trim() === '') {
        console.error("InputGrades: Invalid userProfile or userProfile.uid after auth. Profile:", userProfile);
        setFetchError("Sesi guru tidak ditemukan atau profil tidak valid. Silakan login ulang.");
        resetAllLocalStates(); 
        setPageIsLoading(false); // Explicitly set loading to false as we've hit a terminal error for this load attempt
        return; 
      }
      
      // If reached here, userProfile and userProfile.uid are valid.
      setPageIsLoading(true); // Start loading page-specific data
      setFetchError(null);    // Clear any previous fetch errors

      const validAssignedMapel = userProfile.assignedMapel && Array.isArray(userProfile.assignedMapel)
        ? userProfile.assignedMapel.filter(mapel => typeof mapel === 'string' && mapel.trim() !== '')
        : [];

      if (validAssignedMapel.length === 0) {
        // console.log("InputGrades: No valid mapel assigned to user:", userProfile.uid);
        setFetchError("Anda belum memiliki mata pelajaran yang ditugaskan atau mapel tidak valid. Silakan hubungi Admin.");
        // Attempt to load non-mapel specific data like academic years for UI consistency
        try {
          const activeYearsData = await getActiveAcademicYears();
          setSelectableYears(activeYearsData);
           if (activeYearsData.length > 0 && !form.getValues('selectedAcademicYear')) {
             form.setValue('selectedAcademicYear', activeYearsData.includes(CURRENT_ACADEMIC_YEAR) ? CURRENT_ACADEMIC_YEAR : activeYearsData[0]);
           } else if (activeYearsData.length === 0 && !form.getValues('selectedAcademicYear')) {
            form.setValue('selectedAcademicYear', "");
           }
           if (!form.getValues('selectedSemester')) {
            form.setValue('selectedSemester', SEMESTERS[0]?.value || 1);
           }
        } catch (e) {
          console.warn("InputGrades: Failed to load academic years while handling no_mapel_error:", e);
        }
        setAssignedMapelList([]);
        setAllStudents([]);
        setAvailableClasses([]);
        setStudentMap(new Map());
        setWeights(null);
        setPageIsLoading(false);
        return;
      }
      
      setAssignedMapelList(validAssignedMapel);

      try {
        // console.log("InputGrades: Profile and mapel are valid, fetching page data for mapel:", validAssignedMapel);
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
        
        setDefaultsBasedOnDataAndParams(studentList || [], activeYearsData, validAssignedMapel, uniqueStudentClasses);

      } catch (error: any) {
        console.error("InputGrades: Error loading page data (students/weights/years):", error);
        setFetchError("Gagal memuat data pendukung (siswa/bobot/tahun ajaran). Error: " + error.message);
        resetAllLocalStates();
      } finally {
        setPageIsLoading(false);
      }
    };

    initPage();
  // IMPORTANT: Ensure `resetAllLocalStates` and `setDefaultsBasedOnDataAndParams` are memoized with `useCallback`
  // to prevent infinite loops. `userProfile?.uid` ensures effect runs if uid changes.
  }, [authIsLoading, userProfile?.uid, retryCounter, resetAllLocalStates, setDefaultsBasedOnDataAndParams, toast]);


  useEffect(() => {
    async function fetchKkmData() {
      if (pageIsLoading || authIsLoading || !userProfile?.uid || !selectedMapel || !selectedAcademicYear || fetchError) {
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
  }, [selectedMapel, selectedAcademicYear, pageIsLoading, authIsLoading, userProfile?.uid, fetchError, form, toast]);

  useEffect(() => {
    async function fetchAndSetGrade() {
      if (pageIsLoading || authIsLoading || !userProfile?.uid || !selectedStudentId || !selectedAcademicYear || !selectedSemester || !selectedMapel || !weights || fetchError ) {
        if (!pageIsLoading && !authIsLoading && !fetchError && selectedStudentId && selectedMapel) { 
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
      const newUntuntasComponentsList: {name: string; value: number}[] = [];
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

  const handleSaveKkm = async () => {
    if (!selectedMapel || !selectedAcademicYear || typeof form.getValues("kkmValue") !== 'number' || !userProfile) {
      toast({ variant: "destructive", title: "Error KKM", description: "Mapel, tahun ajaran, dan nilai KKM harus valid." });
      return;
    }
    setIsSavingKkm(true);
    try {
      const newKkm = form.getValues("kkmValue");
      await setKkmSetting({ mapel: selectedMapel, tahun_ajaran: selectedAcademicYear, kkmValue: newKkm });
      await addActivityLog(
        "KKM Diperbarui Guru",
        `Mapel: ${selectedMapel}, TA: ${selectedAcademicYear}, KKM Baru: ${newKkm} oleh Guru: ${userProfile.displayName || userProfile.email}`,
        userProfile.uid, userProfile.displayName || userProfile.email || "Guru"
      );
      setCurrentKkm(newKkm);
      toast({ title: "Sukses", description: `KKM untuk ${selectedMapel} (${selectedAcademicYear}) berhasil disimpan: ${newKkm}.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Simpan KKM", description: error.message || "Gagal menyimpan KKM." });
    } finally {
      setIsSavingKkm(false);
    }
  };

  const onSubmit = async (data: GradeFormData) => {
    if (!weights || !userProfile?.uid || !selectedMapel || !selectedStudentId || !selectedAcademicYear || !selectedSemester) {
      toast({ variant: "destructive", title: "Data Tidak Lengkap", description: "Pastikan semua filter (siswa, mapel, periode) sudah dipilih dan bobot nilai telah dimuat." });
      return;
    }
    setIsSubmitting(true);
    const totalDaysForSemesterVal = selectedSemester === 1 ? weights.totalHariEfektifGanjil : weights.totalHariEfektifGenap;
    let currentAttendancePercentage = 0;
    if (typeof totalDaysForSemesterVal === 'number' && totalDaysForSemesterVal > 0 && typeof data.jumlahHariHadir === 'number') {
      currentAttendancePercentage = (data.jumlahHariHadir / totalDaysForSemesterVal) * 100;
      currentAttendancePercentage = Math.min(Math.max(currentAttendancePercentage, 0), 100);
    }

    const nilaiToSave: Omit<Nilai, 'id' | 'createdAt' | 'updatedAt' | 'nilai_akhir'> & { teacherUid: string } = {
      id_siswa: data.selectedStudentId,
      mapel: data.selectedMapel,
      semester: data.selectedSemester,
      tahun_ajaran: data.selectedAcademicYear,
      tugas: data.tugas && data.tugas.length > 0 ? data.tugas.map(t => t || 0) : [0],
      tes: data.tes || 0,
      pts: data.pts || 0,
      pas: data.pas || 0,
      kehadiran: currentAttendancePercentage,
      eskul: data.eskul || 0,
      osis: data.osis || 0,
      teacherUid: userProfile.uid,
    };

    const finalCalculatedGrade = calculateFinalGrade(nilaiToSave as Nilai, weights);
    const nilaiWithFinal: Omit<Nilai, 'id' | 'createdAt' | 'updatedAt'> & { teacherUid: string } = {
      ...nilaiToSave,
      nilai_akhir: finalCalculatedGrade,
    };

    try {
      await addOrUpdateGrade(nilaiWithFinal, userProfile.uid);
      setCalculatedFinalGrade(finalCalculatedGrade);
      toast({ title: "Sukses", description: `Nilai untuk ${studentMap.get(data.selectedStudentId)?.nama || 'siswa'} (${data.selectedMapel}) berhasil disimpan.` });
      
      await addActivityLog(
          "Nilai Diinput/Diperbarui Guru",
          `Siswa: ${studentMap.get(data.selectedStudentId)?.nama || data.selectedStudentId}, Mapel: ${data.selectedMapel}, TA: ${data.selectedAcademicYear}, Smt: ${data.selectedSemester}. Nilai Akhir: ${finalCalculatedGrade.toFixed(2)} oleh Guru: ${userProfile.displayName || userProfile.email}`,
          userProfile.uid, userProfile.displayName || userProfile.email || "Guru"
      );

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Simpan Nilai", description: error.message || "Gagal menyimpan nilai." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const otherGradeInputFields: { name: keyof Omit<GradeFormData, 'tugas' | 'selectedClass' | 'selectedStudentId' | 'selectedAcademicYear' | 'selectedSemester' | 'selectedMapel' | 'kkmValue'>; label: string; desc?: string; bonusKey?: keyof Pick<Bobot, 'eskul' | 'osis'> }[] = [
    { name: "tes", label: "Nilai Tes / Ulangan" }, { name: "pts", label: "Nilai PTS" }, { name: "pas", label: "Nilai PAS" },
    { name: "jumlahHariHadir", label: "Jumlah Hari Hadir Siswa" },
    { name: "eskul", label: "Nilai Ekstrakurikuler (0-100)", bonusKey: 'eskul' },
    { name: "osis", label: "Nilai OSIS/Kegiatan (0-100)", bonusKey: 'osis' },
  ];

  const handleDownloadGradeTemplate = async () => { /* ... implementasi ... */ };
  const handleExportCurrentGrade = () => { /* ... implementasi ... */ };
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => { /* ... implementasi ... */ };
  const handleImportGradesFromFile = async () => { /* ... implementasi ... */ };
  
  const retryInitialDataLoad = () => setRetryCounter(prev => prev + 1);
  const isFormEffectivelyDisabled = pageIsLoading || authIsLoading || fetchError !== null;

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
                    {/* Filter Kelas */}
                    <FormField control={form.control} name="selectedClass" render={({ field }) => (<FormItem><FormLabel>Filter Kelas</FormLabel><Select onValueChange={(value) => { field.onChange(value); form.setValue('selectedStudentId', '', { shouldDirty: true }); }} value={field.value || "all"} disabled={pageIsLoading || availableClasses.length === 0}><FormControl><SelectTrigger><SelectValue placeholder={pageIsLoading ? "Memuat kelas..." : (availableClasses.length === 0 ? "Belum ada data kelas" : "Pilih kelas...")} /></SelectTrigger></FormControl><SelectContent>{pageIsLoading ? (<SelectItem value="loading_classes_placeholder" disabled>Memuat kelas...</SelectItem>) : availableClasses.length === 0 ? (<SelectItem value="no_class_data_placeholder" disabled>Belum ada data kelas</SelectItem>) : (<><SelectItem value="all">Semua Kelas</SelectItem>{availableClasses.map(kls => (<SelectItem key={kls} value={kls}>{kls}</SelectItem>))}</>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    {/* Pilih Siswa */}
                    <FormField control={form.control} name="selectedStudentId" render={({ field }) => (<FormItem><FormLabel>Pilih Siswa</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={pageIsLoading || filteredStudentsForDropdown.length === 0}><FormControl><SelectTrigger><SelectValue placeholder={pageIsLoading ? "Memuat siswa..." : (filteredStudentsForDropdown.length === 0 ? (selectedClass && selectedClass !== "all" ? "Tidak ada siswa di kelas ini" : "Pilih siswa...") : "Pilih siswa...")} /></SelectTrigger></FormControl><SelectContent>{pageIsLoading ? (<SelectItem value="loading_students_placeholder" disabled>Memuat siswa...</SelectItem>) : filteredStudentsForDropdown.length === 0 ? (<SelectItem value="no_students_placeholder" disabled>{selectedClass && selectedClass !== "all" ? "Tidak ada siswa di kelas ini" : "Pilih kelas dahulu atau tidak ada siswa"}</SelectItem>) : (filteredStudentsForDropdown.map(student => (<SelectItem key={student.id_siswa} value={student.id_siswa}>{student.nama} ({student.nis})</SelectItem>)))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    {/* Tahun Ajaran */}
                    <FormField control={form.control} name="selectedAcademicYear" render={({ field }) => (<FormItem><FormLabel>Tahun Ajaran</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={pageIsLoading || selectableYears.length === 0}><FormControl><SelectTrigger><SelectValue placeholder={pageIsLoading ? "Memuat tahun..." : (selectableYears.length === 0 ? "Tidak ada tahun aktif" : "Pilih tahun ajaran...")} /></SelectTrigger></FormControl><SelectContent>{pageIsLoading ? (<SelectItem value="loading_years_placeholder" disabled>Memuat tahun...</SelectItem>) : selectableYears.length === 0 ? (<SelectItem value="no_active_years_placeholder" disabled>Tidak ada tahun aktif</SelectItem>) : (selectableYears.map(year => (<SelectItem key={year} value={year}>{year}</SelectItem>)))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    {/* Semester */}
                    <FormField control={form.control} name="selectedSemester" render={({ field }) => (<FormItem><FormLabel>Semester</FormLabel><Select onValueChange={(value) => field.onChange(parseInt(value))} value={String(field.value || SEMESTERS[0]?.value)} disabled={pageIsLoading} ><FormControl><SelectTrigger><SelectValue placeholder={pageIsLoading ? "Memuat..." : "Pilih semester..."} /></SelectTrigger></FormControl><SelectContent>{SEMESTERS.map(semester => (<SelectItem key={semester.value} value={String(semester.value)}>{semester.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    {/* Mata Pelajaran */}
                    <FormField control={form.control} name="selectedMapel" render={({ field }) => (<FormItem><FormLabel>Mata Pelajaran</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={pageIsLoading || assignedMapelList.length === 0}><FormControl><SelectTrigger><SelectValue placeholder={pageIsLoading ? "Memuat mapel..." : (assignedMapelList.length === 0 ? "Belum ada mapel ditugaskan" : "Pilih mapel yang diampu...")} /></SelectTrigger></FormControl><SelectContent>{pageIsLoading ? (<SelectItem value="loading_mapel_placeholder" disabled>Memuat mapel...</SelectItem>) : assignedMapelList.length === 0 ? (<SelectItem value="no_mapel_assigned_placeholder" disabled>Belum ada mapel ditugaskan</SelectItem>) : (assignedMapelList.map(mapel => (<SelectItem key={mapel} value={mapel}>{mapel}</SelectItem>)))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    {/* KKM */}
                    <FormField control={form.control} name="kkmValue" render={({ field }) => (<FormItem><FormLabel>KKM</FormLabel><div className="flex items-center gap-2"><FormControl><Input type="number" placeholder="cth: 75" {...field} value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} disabled={isFormEffectivelyDisabled || !selectedMapel || !selectedAcademicYear}/></FormControl><Button type="button" onClick={handleSaveKkm} variant="outline" size="icon" title="Simpan KKM" disabled={isFormEffectivelyDisabled || isSavingKkm || !selectedMapel || !selectedAcademicYear || form.getValues('kkmValue') === currentKkm }><Target className="h-4 w-4" /></Button></div><FormDescription>KKM saat ini untuk mapel & TA ini: <span className="font-bold">{currentKkm}</span></FormDescription><FormMessage /></FormItem>)} />
                  </div>
                </CardContent>
              </Card>

              {(isLoadingGradeData && selectedMapel && selectedStudentId && !isFormEffectivelyDisabled) ? (<Card className="mt-6"><CardHeader><CardTitle>Memuat Data Nilai...</CardTitle></CardHeader><CardContent className="flex items-center justify-center min-h-[200px]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></CardContent></Card>) : 
              isFormEffectivelyDisabled ? null : (
                <Card className="mt-6">
                  <CardHeader><CardTitle>Form Input Nilai</CardTitle><CardDescription>Masukkan nilai (0-100) atau jumlah hari hadir. Nilai akhir akan dihitung otomatis.</CardDescription></CardHeader>
                  <CardContent className="space-y-6">
                    <div><FormLabel className="text-base font-medium">Nilai Tugas</FormLabel><div className="space-y-3 mt-2">{tugasFields.map((item, index) => (<FormField key={item.id} control={form.control} name={`tugas.${index}`} render={({ field: tugasField }) => (<FormItem className="flex items-center gap-2"><FormLabel className="w-28 shrink-0">Tugas Ke-{index + 1}</FormLabel><FormControl><Input type="number" placeholder="0-100" {...tugasField} value={tugasField.value ?? ""} onChange={e => tugasField.onChange(parseFloat(e.target.value) || 0)} disabled={isFormEffectivelyDisabled || !selectedStudentId || !selectedMapel}/></FormControl>{tugasFields.length > 1 && (<Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => removeTugas(index)} title={`Hapus Tugas Ke-${index+1}`} disabled={isFormEffectivelyDisabled}><Trash2 className="h-4 w-4" /></Button>)}<FormMessage /></FormItem>)} />))}</div><Button type="button" variant="outline" size="sm" onClick={() => appendTugas(0)} className="mt-3" disabled={isFormEffectivelyDisabled || !selectedStudentId || !selectedMapel}><PlusCircle className="mr-2 h-4 w-4" /> Tambah Input Tugas</Button></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{otherGradeInputFields.map(fieldInfo => (<FormField key={fieldInfo.name} control={form.control} name={fieldInfo.name as keyof GradeFormData} render={({ field }) => (<FormItem><FormLabel>{fieldInfo.label}</FormLabel><FormControl><Input type="number" placeholder={fieldInfo.name === "jumlahHariHadir" ? "0 - " + (totalDaysForCurrentSemester || 'N/A') : "0-100"} {...field} value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} disabled={isFormEffectivelyDisabled || !selectedStudentId || !selectedMapel || (fieldInfo.name === "jumlahHariHadir" && (typeof totalDaysForCurrentSemester !== 'number' || totalDaysForCurrentSemester <=0))}/></FormControl>{fieldInfo.name === "jumlahHariHadir" && (<FormDescription className="text-xs">{typeof totalDaysForCurrentSemester === 'number' && totalDaysForCurrentSemester > 0 ? "Total hari efektif: " + totalDaysForCurrentSemester + " hari. Persentase: " : "Total hari efektif belum diatur Admin. "}{attendancePercentage !== null && typeof totalDaysForCurrentSemester === 'number' && totalDaysForCurrentSemester > 0 && (<span className="font-semibold text-primary">{attendancePercentage.toFixed(1)}%</span>)}</FormDescription>)}{fieldInfo.bonusKey && weights && (<FormDescription className="text-xs">Maks. bonus: +{weights[fieldInfo.bonusKey] ?? 0} poin. Input nilai 0-100.</FormDescription>)}{fieldInfo.desc && !fieldInfo.bonusKey && (<FormDescription className="text-xs">{fieldInfo.desc}</FormDescription>)}<FormMessage /></FormItem>)} />))}</div>
                    {calculatedFinalGrade !== null && selectedStudentId && selectedMapel && (<div className={"mt-6 p-4 border-2 border-dashed rounded-lg bg-muted/50 text-center " + (overallAcademicStatus === 'Tuntas' ? 'border-green-600/50' : overallAcademicStatus === 'Belum Tuntas' ? 'border-destructive' : 'border-border')}><BarChartHorizontalBig className="mx-auto h-10 w-10 text-primary mb-2" /><p className="text-sm font-medium text-muted-foreground">Nilai Akhir ({selectedMapel})</p><p className={"text-4xl font-bold " + (overallAcademicStatus === 'Tuntas' ? 'text-green-600' : overallAcademicStatus === 'Belum Tuntas' ? 'text-destructive' : 'text-foreground')}>{calculatedFinalGrade.toFixed(2)}</p><p className="text-base text-muted-foreground mt-1">KKM: {kkmValue} - Status: {overallAcademicStatus === 'Menghitung...' ? (<span className="italic">Menghitung...</span>) : overallAcademicStatus === 'Tuntas' ? (<span className="font-semibold text-green-600 inline-flex items-center"><CheckCircle2 className="mr-1 h-4 w-4"/>Tuntas</span>) : (<span className="font-semibold text-destructive inline-flex items-center"><XCircle className="mr-1 h-4 w-4"/>Belum Tuntas</span>)}</p>{untuntasComponents.length > 0 && overallAcademicStatus === 'Belum Tuntas' && (<div className="mt-2 text-sm text-destructive"><p className="font-medium">Komponen akademik inti yang belum tuntas (di bawah KKM {kkmValue}):</p><ul className="list-disc list-inside text-left max-w-md mx-auto">{untuntasComponents.map(comp => (<li key={comp.name}>{comp.name}: {comp.value}</li>))}</ul></div>)}{!weights && <p className="text-xs text-destructive mt-1">Bobot/Hari Efektif belum dimuat, nilai akhir mungkin tidak akurat.</p>}</div>)}
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2"><Button type="submit" disabled={isSubmitting || !selectedStudentId || !weights || !selectedAcademicYear || !selectedMapel || fetchError !== null || isFormEffectivelyDisabled}>{isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</>) : (<><Save className="mr-2 h-4 w-4" />Simpan Nilai</>)}</Button><Button type="button" variant="outline" onClick={handleExportCurrentGrade} disabled={isFormEffectivelyDisabled || !selectedStudentId || !selectedAcademicYear || !selectedSemester || !selectedMapel || fetchError !== null}><FileDown className="mr-2 h-4 w-4" /> Ekspor Nilai Ini</Button></CardFooter>
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

    
