
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

interface UntuntasComponent {
  name: string;
  value: number;
}

const CURRENT_ACADEMIC_YEAR = getCurrentAcademicYear();

export default function InputGradesPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [allStudents, setAllStudents] = useState<Siswa[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [studentMap, setStudentMap] = useState<Map<string, Siswa>>(new Map());
  const [weights, setWeights] = useState<Bobot | null>(null);
  const [selectableYears, setSelectableYears] = useState<string[]>([]);
  const [assignedMapelList, setAssignedMapelList] = useState<string[]>([]);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [isLoadingGradeData, setIsLoadingGradeData] = useState(false);
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

  const form = useForm<GradeFormData>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
        selectedClass: "all",
        selectedStudentId: "",
        selectedAcademicYear: "",
        selectedSemester: SEMESTERS[0]?.value || 1,
        selectedMapel: "",
        kkmValue: 70,
        tugas: [0], 
        tes: 0, pts: 0, pas: 0, jumlahHariHadir: 0, eskul: 0, osis: 0,
    }
  });

  const { fields: tugasFields, append: appendTugas, remove: removeTugas } = useFieldArray({
    control: form.control,
    name: "tugas"
  });

  const watchedFormValues = form.watch();
  const { 
    selectedClass, 
    selectedStudentId, 
    selectedAcademicYear, 
    selectedSemester, 
    selectedMapel, 
    kkmValue, // This is directly from form.watch()
    tugas, 
    tes, pts, pas, jumlahHariHadir, eskul, osis
  } = watchedFormValues;


  const filteredStudentsForDropdown = useMemo(() => {
    if (!selectedClass || selectedClass === "all") {
      return allStudents;
    }
    return allStudents.filter(student => student.kelas === selectedClass);
  }, [allStudents, selectedClass]);


  const totalDaysForCurrentSemester = useMemo(() => {
    if (!weights || !selectedSemester) return undefined;
    return selectedSemester === 1 ? weights.totalHariEfektifGanjil : weights.totalHariEfektifGenap;
  }, [weights, selectedSemester]);

  const resetGradeFieldsToZero = useCallback(() => {
    form.setValue('tugas', [0]); 
    form.setValue('tes', 0);
    form.setValue('pts', 0);
    form.setValue('pas', 0);
    form.setValue('jumlahHariHadir', 0);
    form.setValue('eskul', 0);
    form.setValue('osis', 0);
    setCalculatedFinalGrade(null);
    setAttendancePercentage(null);
    setUntuntasComponents([]);
    setOverallAcademicStatus('Menghitung...');
  }, [form]);

  useEffect(() => {
    async function fetchInitialData() {
      if (!userProfile) return;
      setIsLoadingInitialData(true); 
      setFetchError(null);
      try {
        const [studentList, weightData, activeYears] = await Promise.all([
          getStudents(),
          getWeights(),
          getActiveAcademicYears()
        ]);
        
        setAllStudents(studentList || []);
        const uniqueStudentClasses = [...new Set((studentList || []).map(s => s.kelas).filter(Boolean) as string[])].sort();
        setAvailableClasses(uniqueStudentClasses);

        const newStudentMap = new Map((studentList || []).map(s => [s.id_siswa, s]));
        setStudentMap(newStudentMap);

        setWeights(weightData);
        setSelectableYears(activeYears);

        const guruAssignedMapel = userProfile?.assignedMapel || [];
        setAssignedMapelList(guruAssignedMapel);
        
        const studentIdParam = searchParams.get('studentId');
        const academicYearParam = searchParams.get('academicYear');
        const semesterParam = searchParams.get('semester');
        const mapelParam = searchParams.get('mapel');
        const classParam = searchParams.get('class');
        
        let defaultClassVal = "all";
        if (classParam && uniqueStudentClasses.includes(classParam)) {
            defaultClassVal = classParam;
        }
        form.setValue('selectedClass', defaultClassVal);

        let defaultStudentIdVal = "";
        if (studentIdParam && newStudentMap.has(studentIdParam)) {
            defaultStudentIdVal = studentIdParam;
        } else if (defaultClassVal !== "all") {
            const studentsInClass = (studentList || []).filter(s => s.kelas === defaultClassVal);
            if (studentsInClass.length > 0) defaultStudentIdVal = studentsInClass[0].id_siswa;
        } else if (studentList && studentList.length > 0) {
            defaultStudentIdVal = studentList[0].id_siswa;
        }
        form.setValue('selectedStudentId', defaultStudentIdVal);

        let defaultYearVal = "";
        if (academicYearParam && activeYears.includes(academicYearParam)) {
            defaultYearVal = academicYearParam;
        } else if (activeYears.includes(CURRENT_ACADEMIC_YEAR)) {
          defaultYearVal = CURRENT_ACADEMIC_YEAR;
        } else if (activeYears.length > 0) {
          defaultYearVal = activeYears[0];
        }
        form.setValue('selectedAcademicYear', defaultYearVal);
        
        let defaultSemesterVal = SEMESTERS[0]?.value || 1;
        if (semesterParam && SEMESTERS.some(s => String(s.value) === semesterParam)) {
            defaultSemesterVal = parseInt(semesterParam, 10);
        }
        form.setValue('selectedSemester', defaultSemesterVal);

        let defaultMapelVal = "";
        if (mapelParam && guruAssignedMapel.includes(mapelParam)) {
          defaultMapelVal = mapelParam;
        } else if (guruAssignedMapel.length > 0) {
          defaultMapelVal = guruAssignedMapel[0];
        }
        form.setValue('selectedMapel', defaultMapelVal);
        
        resetGradeFieldsToZero();

      } catch (error) {
        console.error("Error fetching initial data:", error);
        setFetchError("Gagal memuat data siswa, bobot, atau tahun ajaran. Silakan coba lagi.");
        toast({ variant: "destructive", title: "Error", description: "Gagal memuat data awal." });
      } finally {
        setIsLoadingInitialData(false);
      }
    }
    if(userProfile){
      fetchInitialData();
    }
  }, [userProfile, searchParams, toast, form, resetGradeFieldsToZero]); 

  useEffect(() => {
    async function fetchKkmData() {
      if (isLoadingInitialData || !selectedMapel || !selectedAcademicYear) {
        if (!isLoadingInitialData) {
             form.setValue("kkmValue", 70); 
             setCurrentKkm(70);
        }
        return;
      }
      setIsLoadingGradeData(true);
      try {
        const kkmData = await getKkmSetting(selectedMapel, selectedAcademicYear);
        const kkmVal = kkmData ? kkmData.kkmValue : 70;
        form.setValue("kkmValue", kkmVal);
        setCurrentKkm(kkmVal);
      } catch (error) {
        console.error("Error fetching KKM:", error);
        toast({ variant: "destructive", title: "Error KKM", description: "Gagal memuat KKM. Menggunakan default 70." });
         form.setValue("kkmValue", 70);
         setCurrentKkm(70);
      } finally {
        setIsLoadingGradeData(false);
      }
    }
    if(!isLoadingInitialData){
      fetchKkmData();
    }
  }, [selectedMapel, selectedAcademicYear, isLoadingInitialData, form, toast]);

  useEffect(() => {
    async function fetchAndSetGrade() {
      if (isLoadingInitialData || !selectedStudentId || !selectedAcademicYear || !selectedSemester || !selectedMapel || !weights) {
        if (!isLoadingInitialData) {
           resetGradeFieldsToZero();
        }
        return;
      }
      setIsLoadingGradeData(true);
      setFetchError(null);
      try {
        const gradeData = await getGrade(selectedStudentId, selectedSemester, selectedAcademicYear, selectedMapel);
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
        console.error("Error fetching grade data:", error);
        setFetchError("Gagal memuat data nilai siswa. Silakan coba lagi.");
        toast({ variant: "destructive", title: "Error", description: "Gagal memuat data nilai." });
        resetGradeFieldsToZero();
      } finally {
        setIsLoadingGradeData(false);
      }
    }
    if(!isLoadingInitialData){
      fetchAndSetGrade();
    }
  }, [selectedStudentId, selectedAcademicYear, selectedSemester, selectedMapel, weights, isLoadingInitialData, resetGradeFieldsToZero, form, toast]);

 useEffect(() => {
    if (weights && !isLoadingInitialData && selectedMapel && selectedStudentId && typeof kkmValue === 'number') {
      const totalDaysForSemesterVal = selectedSemester === 1
        ? weights.totalHariEfektifGanjil
        : weights.totalHariEfektifGenap;
      
      let currentAttendancePercentage = 0;
      if (typeof totalDaysForSemesterVal === 'number' && totalDaysForSemesterVal > 0 && typeof jumlahHariHadir === 'number') {
        currentAttendancePercentage = (jumlahHariHadir / totalDaysForSemesterVal) * 100;
        currentAttendancePercentage = Math.min(Math.max(currentAttendancePercentage, 0), 100);
      }
      setAttendancePercentage(currentAttendancePercentage);

      const allTugasScores = tugas && tugas.length > 0 ? tugas.map(t => t || 0) : [0];

      const currentNilai: Nilai = {
        id_siswa: selectedStudentId, 
        mapel: selectedMapel, 
        semester: selectedSemester, 
        tahun_ajaran: selectedAcademicYear, 
        tugas: allTugasScores,
        tes: tes ?? 0, 
        pts: pts ?? 0, 
        pas: pas ?? 0, 
        kehadiran: currentAttendancePercentage,
        eskul: eskul ?? 0, 
        osis: osis ?? 0, 
      };
      const finalGrade = calculateFinalGrade(currentNilai, weights);
      setCalculatedFinalGrade(finalGrade);

      const kkmToUse = kkmValue; 
      const newUntuntasComponentsList: UntuntasComponent[] = [];
      let allAcademicComponentsAreTuntas = true;

      allTugasScores.forEach((score, index) => {
        if (score < kkmToUse) {
          newUntuntasComponentsList.push({ name: `Tugas Ke-${index + 1}`, value: score });
          allAcademicComponentsAreTuntas = false;
        }
      });

      if ((tes ?? 0) < kkmToUse) {
        newUntuntasComponentsList.push({ name: "Tes/Ulangan", value: tes ?? 0 });
        allAcademicComponentsAreTuntas = false;
      }
      if ((pts ?? 0) < kkmToUse) {
        newUntuntasComponentsList.push({ name: "PTS", value: pts ?? 0 });
        allAcademicComponentsAreTuntas = false;
      }
      if ((pas ?? 0) < kkmToUse) {
        newUntuntasComponentsList.push({ name: "PAS", value: pas ?? 0 });
        allAcademicComponentsAreTuntas = false;
      }
      setUntuntasComponents(newUntuntasComponentsList);

      const overallTuntas = (finalGrade !== null && finalGrade >= kkmToUse) && allAcademicComponentsAreTuntas;
      setOverallAcademicStatus(selectedStudentId && selectedMapel ? (overallTuntas ? 'Tuntas' : 'Belum Tuntas') : 'Menghitung...');

    } else if (!selectedStudentId || !selectedMapel) {
        setOverallAcademicStatus('Menghitung...');
        setUntuntasComponents([]);
        setCalculatedFinalGrade(null);
    }
  }, [ // Dependencies
    selectedStudentId, selectedAcademicYear, selectedSemester, selectedMapel, kkmValue,
    tugas, tes, pts, pas, jumlahHariHadir, eskul, osis,
    weights, isLoadingInitialData 
  ]);

  const handleSaveKkm = async () => {
    const currentSelectedMapel = form.getValues('selectedMapel');
    const currentSelectedAcademicYear = form.getValues('selectedAcademicYear');
    if (!currentSelectedMapel || !currentSelectedAcademicYear) {
      toast({ variant: "destructive", title: "Error", description: "Mata pelajaran dan tahun ajaran harus dipilih untuk menyimpan KKM." });
      return;
    }
    const kkmToSave = form.getValues('kkmValue');
    if (kkmToSave === null || kkmToSave === undefined || kkmToSave < 0 || kkmToSave > 100) {
      toast({ variant: "destructive", title: "Error KKM", description: "Nilai KKM harus antara 0 dan 100." });
      return;
    }

    setIsSavingKkm(true);
    try {
      await setKkmSetting({ mapel: currentSelectedMapel, tahun_ajaran: currentSelectedAcademicYear, kkmValue: kkmToSave });
      setCurrentKkm(kkmToSave);
      toast({ title: "Sukses", description: "KKM untuk " + currentSelectedMapel + " TA " + currentSelectedAcademicYear + " berhasil disimpan: " + kkmToSave + "." });
      if (userProfile) {
        addActivityLog(
            "KKM Diperbarui Guru",
            "Mapel: " + currentSelectedMapel + ", TA: " + currentSelectedAcademicYear + ", KKM: " + kkmToSave + " oleh " + (userProfile.displayName || userProfile.email),
            userProfile.uid,
            userProfile.displayName || userProfile.email || "Guru"
        );
      }
    } catch (error) {
      console.error("Error saving KKM:", error);
      toast({ variant: "destructive", title: "Error Simpan KKM", description: "Gagal menyimpan KKM." });
    } finally {
      setIsSavingKkm(false);
    }
  };


  const onSubmit = async (data: GradeFormData) => {
    setIsSubmitting(true);
    setFetchError(null);
    if (!weights) {
      toast({ variant: "destructive", title: "Error", description: "Konfigurasi bobot & hari efektif belum dimuat." });
      setIsSubmitting(false);
      return;
    }
    if (!data.selectedMapel) {
      toast({ variant: "destructive", title: "Error", description: "Mata pelajaran harus dipilih." });
      setIsSubmitting(false);
      return;
    }
     if (!data.selectedStudentId) {
      toast({ variant: "destructive", title: "Error", description: "Siswa harus dipilih." });
      setIsSubmitting(false);
      return;
    }

    const totalDaysForSemesterVal = data.selectedSemester === 1 ? weights.totalHariEfektifGanjil : weights.totalHariEfektifGenap;
    let calculatedKehadiranPercentage = 0;

    if (typeof totalDaysForSemesterVal === 'number' && totalDaysForSemesterVal > 0 && typeof data.jumlahHariHadir === 'number') {
      calculatedKehadiranPercentage = (data.jumlahHariHadir / totalDaysForSemesterVal) * 100;
      calculatedKehadiranPercentage = Math.min(Math.max(calculatedKehadiranPercentage, 0), 100);
    } else if (typeof totalDaysForSemesterVal !== 'number' || totalDaysForSemesterVal <= 0) {
        toast({ variant: "destructive", title: "Peringatan", description: "Total hari efektif belum diatur oleh Admin untuk semester ini. Kehadiran tidak dapat dihitung." });
    }

    const tugasScoresToSave = data.tugas.map(t => t || 0);

    const nilaiToSave: Omit<Nilai, 'id' | 'nilai_akhir'> = {
      id_siswa: data.selectedStudentId,
      mapel: data.selectedMapel,
      semester: data.selectedSemester,
      tahun_ajaran: data.selectedAcademicYear,
      tugas: tugasScoresToSave,
      tes: data.tes ?? 0,
      pts: data.pts ?? 0,
      pas: data.pas ?? 0,
      kehadiran: calculatedKehadiranPercentage,
      eskul: data.eskul ?? 0,
      osis: data.osis ?? 0,
    };
    
    const finalGradeValue = calculateFinalGrade(nilaiToSave as Nilai, weights);
    const nilaiWithFinal: Omit<Nilai, 'id'> = {...nilaiToSave, nilai_akhir: finalGradeValue};

    try {
      await addOrUpdateGrade(nilaiWithFinal);
      toast({ title: "Sukses", description: "Data nilai siswa untuk mapel " + data.selectedMapel + " berhasil disimpan." });
    } catch (error) {
      console.error("Error saving grade data:", error);
      setFetchError("Gagal menyimpan data nilai. Silakan coba lagi.");
      toast({ variant: "destructive", title: "Error", description: "Gagal menyimpan data nilai." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const otherGradeInputFields: { 
    name: keyof Omit<GradeFormData, 'selectedClass' | 'selectedStudentId' | 'selectedAcademicYear' | 'selectedSemester' | 'selectedMapel' | 'kkmValue' | 'kehadiran' | 'tugas'>; 
    label: string; 
    type?: string; 
    desc?: string;
    bonusKey?: 'eskul' | 'osis';
  }[] = [
    { name: "tes", label: "Nilai Tes / Ulangan" },
    { name: "pts", label: "Nilai PTS" },
    { name: "pas", label: "Nilai PAS" },
    { name: "jumlahHariHadir", label: "Jumlah Hari Hadir", desc: "Akan dikonversi ke persentase otomatis."},
    { name: "eskul", label: "Nilai Ekstrakurikuler", bonusKey: "eskul"},
    { name: "osis", label: "Nilai OSIS/Kegiatan", bonusKey: "osis"},
  ];

  const handleDownloadGradeTemplate = async () => {
    const { selectedAcademicYear: currentYear, selectedSemester: currentSemester, selectedMapel: currentMapel, selectedClass: currentClassFilter } = form.getValues();

    if (!currentYear || !currentSemester || !currentMapel) {
        toast({
            title: "Filter Belum Dipilih",
            description: "Silakan pilih Tahun Ajaran, Semester, dan Mata Pelajaran terlebih dahulu untuk membuat template yang sesuai.",
            variant: "default"
        });
        return;
    }
    setIsImportingFile(true); 
    try {
        const studentsForTemplate = currentClassFilter === "all" || !currentClassFilter 
                                    ? allStudents 
                                    : allStudents.filter(s => s.kelas === currentClassFilter);

        if (studentsForTemplate.length === 0) {
            toast({ title: "Tidak Ada Siswa", description: "Tidak ada siswa di kelas " + (currentClassFilter === "all" ? "manapun" : currentClassFilter) + " untuk membuat template.", variant: "default" });
            setIsImportingFile(false);
            return;
        }

        const dataForExcel = studentsForTemplate.map(student => ({
            id_siswa: student.id_siswa,
            nama_siswa: student.nama,
            nis: student.nis,
            kelas: student.kelas,
            tahun_ajaran: currentYear,
            semester: currentSemester, 
            mapel: currentMapel, 
            tugas1: '', tugas2: '', tugas3: '', tugas4: '', tugas5: '', 
            tes: '', pts: '', pas: '', jumlah_hari_hadir: '', eskul: '', osis: ''
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
        const headers = [
            "id_siswa", "nama_siswa", "nis", "kelas",
            "tahun_ajaran", "semester", "mapel",
            "tugas1", "tugas2", "tugas3", "tugas4", "tugas5",
            "tes", "pts", "pas", "jumlah_hari_hadir", "eskul", "osis"
        ];
        XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" }); 

        const wscols = [
            { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, 
            { wch: 15 }, { wch: 10 }, { wch: 20}, 
            { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, 
            { wch: 8 }, { wch: 8 }, { wch: 8 }, 
            { wch: 18 }, { wch: 8 }, { wch: 8 } 
        ];
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template Nilai");
        
        const safeYear = currentYear.replace(/\//g, '-');
        const safeMapel = currentMapel.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const safeClass = (currentClassFilter === "all" || !currentClassFilter) ? "SemuaKelas" : currentClassFilter.replace(/[^a-z0-9]/gi, '_');
        const filename = "template_nilai_" + safeMapel + "_" + safeYear + "_smt" + currentSemester + "_" + safeClass + ".xlsx";
        XLSX.writeFile(workbook, filename);
        toast({ title: "Template Diunduh", description: "Template untuk mapel " + currentMapel + ", TA " + currentYear + " Semester " + (SEMESTERS.find(s=>s.value === currentSemester)?.label || currentSemester) + (currentClassFilter !== "all" && currentClassFilter ? " Kelas " + currentClassFilter : "") + " telah diunduh." });

    } catch (error) {
        console.error("Error downloading grade template:", error);
        toast({ title: "Error Unduh Template", description: "Gagal membuat template nilai.", variant: "destructive"});
    } finally {
        setIsImportingFile(false);
    }
  };

  const handleExportCurrentGrade = () => {
    if (!selectedStudentId || !selectedAcademicYear || !selectedSemester || !selectedMapel || !weights) {
      toast({ variant: "destructive", title: "Data Tidak Lengkap", description: "Pilih siswa, tahun ajaran, semester, dan mapel terlebih dahulu." });
      return;
    }
    const currentStudent = studentMap.get(selectedStudentId);
    if (!currentStudent) {
       toast({ variant: "destructive", title: "Siswa Tidak Ditemukan", description: "Data siswa terpilih tidak ditemukan." });
       return;
    }

    const values = form.getValues();
    const excelRow: any = {
      'ID Siswa': selectedStudentId,
      'Nama Siswa': currentStudent.nama,
      'NIS': currentStudent.nis,
      'Kelas': currentStudent.kelas,
      'Tahun Ajaran': selectedAcademicYear,
      'Semester': selectedSemester === 1 ? 'Ganjil' : 'Genap',
      'Mata Pelajaran': selectedMapel,
      'KKM': values.kkmValue,
    };

    (values.tugas || []).forEach((tugasNilai, index) => {
        excelRow[`Tugas ${index + 1}`] = tugasNilai ?? 0;
    });
    
    // Ensure at least 5 task columns for consistency, pad with empty if fewer.
    const maxTugasCols = Math.max(5, (values.tugas || []).length);
    for (let i = (values.tugas || []).length; i < maxTugasCols; i++) {
        if (!excelRow.hasOwnProperty(`Tugas ${i + 1}`)) { 
             excelRow[`Tugas ${i + 1}`] = '';
        }
    }

    excelRow['Tes'] = values.tes ?? 0;
    excelRow['PTS'] = values.pts ?? 0;
    excelRow['PAS'] = values.pas ?? 0;
    excelRow['Jumlah Hari Hadir'] = values.jumlahHariHadir ?? 0;
    excelRow['Kehadiran (%)'] = attendancePercentage?.toFixed(2) || '0.00';
    excelRow['Eskul'] = values.eskul ?? 0;
    excelRow['OSIS'] = values.osis ?? 0;
    excelRow['Nilai Akhir'] = calculatedFinalGrade?.toFixed(2) || '0.00';
    excelRow['Status Tuntas'] = overallAcademicStatus;
    
    const dataForExcel = [excelRow];

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Nilai Siswa");
    
    const baseWscols = [
      { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 8 }
    ];
    const tugasWscols = Array(maxTugasCols).fill({ wch: 8 });

    const remainingWscols = [
      { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 18 }, { wch: 15 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 15 } 
    ];
    worksheet['!cols'] = [...baseWscols, ...tugasWscols, ...remainingWscols];

    const safeStudentName = currentStudent.nama.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const safeYear = selectedAcademicYear.replace(/\//g, '-');
    const safeMapel = selectedMapel.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    XLSX.writeFile(workbook, "nilai_" + safeStudentName + "_" + safeMapel + "_" + safeYear + "_smt" + selectedSemester + ".xlsx");
    toast({ title: "Nilai Diekspor", description: "Nilai untuk mapel " + selectedMapel + ", siswa " + currentStudent.nama + ", semester " + selectedSemester + " TA " + selectedAcademicYear + " telah diekspor." });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedImportFile(event.target.files[0]);
    } else {
      setSelectedImportFile(null);
    }
  };

  const handleImportGradesFromFile = async () => {
    if (!selectedImportFile) {
      toast({ variant: "destructive", title: "Tidak Ada File", description: "Silakan pilih file Excel terlebih dahulu." });
      return;
    }
    if (!weights) {
      toast({ variant: "destructive", title: "Error", description: "Konfigurasi bobot belum dimuat. Impor dibatalkan." });
      return;
    }
    const currentSelectedMapel = form.getValues().selectedMapel;
    if (!currentSelectedMapel) {
        toast({ variant: "destructive", title: "Mapel Belum Dipilih", description: "Silakan pilih mata pelajaran di filter terlebih dahulu sebelum mengimpor." });
        return;
    }

    setIsImportingFile(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const fileData = e.target?.result;
        const workbook = XLSX.read(fileData, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<GradeImportDataRow>(worksheet);

        if (jsonData.length === 0) {
          toast({ variant: "destructive", title: "File Kosong", description: "File Excel tidak mengandung data nilai." });
          setIsImportingFile(false);
          return;
        }

        const firstRow = jsonData[0];
        const expectedHeadersBase = ["id_siswa", "tahun_ajaran", "semester", "mapel"];
        const actualHeaders = Object.keys(firstRow);
        if (!expectedHeadersBase.every(header => actualHeaders.includes(header))) {
          toast({ variant: "destructive", title: "Format File Salah", description: "Header kolom di file Excel tidak sesuai. Pastikan minimal ada kolom: " + expectedHeadersBase.join(', ') + "." });
          setIsImportingFile(false);
          return;
        }
        
        let successCount = 0;
        let failCount = 0;
        const errorDetails: string[] = [];

        for (const row of jsonData) {
          const studentExists = studentMap.get(row.id_siswa);
          if (!studentExists) {
            failCount++;
            errorDetails.push("ID Siswa " + row.id_siswa + " tidak ditemukan. Baris dilewati.");
            continue;
          }
          
          if (!row.mapel || typeof row.mapel !== 'string' || row.mapel.trim() === "") {
            failCount++;
            errorDetails.push("Mata pelajaran \"" + (row.mapel || '') + "\" tidak valid atau tidak ada untuk siswa " + row.id_siswa + ". Baris dilewati.");
            continue;
          }

          if (row.mapel.trim() !== currentSelectedMapel) {
            failCount++;
            errorDetails.push("Mapel di file (" + row.mapel.trim() + ") tidak cocok dengan mapel yang dipilih di filter (" + currentSelectedMapel + ") untuk siswa " + row.id_siswa + ". Baris dilewati.");
            continue;
          }
          
          if (!assignedMapelList.includes(row.mapel.trim())) {
            failCount++;
            errorDetails.push("Mata pelajaran \"" + row.mapel.trim() + "\" tidak ditugaskan kepada Anda untuk siswa " + row.id_siswa + ". Baris dilewati.");
            continue;
          }

          const semesterNum = typeof row.semester === 'string'
            ? (SEMESTERS.find(s => s.label.toLowerCase() === row.semester.toLowerCase() || String(s.value) === row.semester.trim())?.value || parseInt(String(row.semester).trim()))
            : Number(row.semester);


          if (![1, 2].includes(semesterNum)) {
            failCount++;
            errorDetails.push("Semester tidak valid (" + row.semester + ") untuk siswa " + row.id_siswa + ". Baris dilewati.");
            continue;
          }
          if (!selectableYears.includes(row.tahun_ajaran)) {
             failCount++;
             errorDetails.push("Tahun ajaran " + row.tahun_ajaran + " tidak aktif/valid untuk siswa " + row.id_siswa + ". Baris dilewati.");
             continue;
          }

          const totalDaysForSemesterVal = semesterNum === 1 ? weights.totalHariEfektifGanjil : weights.totalHariEfektifGenap;
          let calculatedKehadiranPercentage = 0;
          const jumlahHadir = typeof row.jumlah_hari_hadir === 'number' ? row.jumlah_hari_hadir : 0;

          if (typeof totalDaysForSemesterVal === 'number' && totalDaysForSemesterVal > 0) {
            calculatedKehadiranPercentage = (jumlahHadir / totalDaysForSemesterVal) * 100;
            calculatedKehadiranPercentage = Math.min(Math.max(calculatedKehadiranPercentage, 0), 100);
          }

          const importedTugasScores = [];
          // Iterate through tugas1, tugas2, ..., tugasN columns found in the Excel row
          for (const key in row) {
            if (key.startsWith("tugas") && row[key] !== undefined && String(row[key]).trim() !== '') {
                const numValue = Number(row[key]);
                if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                    importedTugasScores.push(numValue);
                } else {
                    importedTugasScores.push(0); // Default to 0 if invalid
                    errorDetails.push(`Nilai ${key} (${row[key]}) tidak valid untuk ${row.id_siswa}, mapel ${row.mapel}. Dianggap 0.`);
                }
            } else if (key.startsWith("tugas") && row.hasOwnProperty(key) && (row[key] === undefined || String(row[key]).trim() === '')) {
                importedTugasScores.push(0); // If column exists but is empty, count as 0
            }
          }
          // If no tugas columns were found at all (e.g., tugas1, tugas2...), default to a single 0
          if (importedTugasScores.length === 0) {
            importedTugasScores.push(0);
          }


          const nilaiToSave: Omit<Nilai, 'id' | 'nilai_akhir'> = {
            id_siswa: row.id_siswa,
            mapel: row.mapel.trim(),
            semester: semesterNum,
            tahun_ajaran: row.tahun_ajaran,
            tugas: importedTugasScores, 
            tes: (typeof row.tes === 'number' && row.tes >=0 && row.tes <=100) ? row.tes : 0,
            pts: (typeof row.pts === 'number' && row.pts >=0 && row.pts <=100) ? row.pts : 0,
            pas: (typeof row.pas === 'number' && row.pas >=0 && row.pas <=100) ? row.pas : 0,
            kehadiran: calculatedKehadiranPercentage,
            eskul: (typeof row.eskul === 'number' && row.eskul >=0 && row.eskul <=100) ? row.eskul : 0,
            osis: (typeof row.osis === 'number' && row.osis >=0 && row.osis <=100) ? row.osis : 0,
          };
          const finalGradeValue = calculateFinalGrade(nilaiToSave as Nilai, weights);
          const nilaiWithFinal: Omit<Nilai, 'id'> = { ...nilaiToSave, nilai_akhir: finalGradeValue };

          try {
            await addOrUpdateGrade(nilaiWithFinal);
            successCount++;
          } catch (err: any) {
            failCount++;
            errorDetails.push("Gagal simpan nilai " + row.id_siswa + " mapel " + row.mapel + " TA " + row.tahun_ajaran + " Smt " + semesterNum + ": " + err.message + ".");
          }
        }

        toast({
          title: "Impor Nilai Selesai",
          description: successCount + " data nilai berhasil diimpor. " + failCount + " data gagal. " + (failCount > 0 ? 'Lihat konsol untuk detail.' : ''),
          duration: failCount > 0 ? 10000 : 5000,
        });
        if (errorDetails.length > 0) console.warn("Detail Error Impor Nilai:", errorDetails.join("\n"));
        
        const currentFormStudentId = form.getValues('selectedStudentId');
        if (currentFormStudentId && jsonData.some(row => row.id_siswa === currentFormStudentId)) {
            const tempMapel = form.getValues('selectedMapel');
            form.setValue('selectedMapel', '', {shouldDirty: false}); 
            setTimeout(() => { 
                form.setValue('selectedMapel', tempMapel, {shouldDirty: true});
            }, 0);
        }
        
      } catch (err) {
        console.error("Error processing Excel file for grades:", err);
        toast({ variant: "destructive", title: "Error Baca File", description: "Gagal memproses file Excel nilai." });
      } finally {
        setIsImportingFile(false);
        setSelectedImportFile(null);
        if (fileImportInputRef.current) fileImportInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      toast({ variant: "destructive", title: "Error Baca File", description: "Tidak dapat membaca file yang dipilih." });
      setIsImportingFile(false);
    };
    reader.readAsBinaryString(selectedImportFile);
  };


  if (isLoadingInitialData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-md" /><div><Skeleton className="h-8 w-64 mb-2 rounded-md" /><Skeleton className="h-5 w-80 rounded-md" /></div></div>
        <Card><CardHeader><Skeleton className="h-7 w-48 mb-2 rounded-md" /><Skeleton className="h-4 w-72 rounded-md" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-10 w-full rounded-md" /><Skeleton className="h-10 w-full rounded-md" /><Skeleton className="h-10 w-full rounded-md" /><Skeleton className="h-10 w-full rounded-md" /><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}</div></CardContent></Card>
      </div>
    );
  }
  
  const noMapelAssigned = assignedMapelList.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/guru"><Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Guru"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div><h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Input &amp; Lihat Nilai Siswa</h1><p className="text-muted-foreground">Pilih filter, mapel yang diampu &amp; KKM, lalu input atau perbarui nilai.</p></div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader><CardTitle>Filter Data &amp; Pengaturan Mapel</CardTitle><CardDescription>Pilih kelas, siswa, periode, mata pelajaran, dan atur KKM.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {fetchError && (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{fetchError}</AlertDescription></Alert>)}
              {noMapelAssigned && !isLoadingInitialData && (
                <Alert variant="default">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Belum Ada Mapel Ditugaskan</AlertTitle>
                  <AlertDescription>
                    Anda belum memiliki mata pelajaran yang ditugaskan oleh Admin.
                    Silakan hubungi Admin untuk menugaskan mapel agar Anda dapat menginput nilai.
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                <FormField 
                  control={form.control} 
                  name="selectedClass" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Filter Kelas</FormLabel>
                      <Select 
                         onValueChange={(value) => {
                            field.onChange(value);
                            if (!isLoadingInitialData) { // Only reset if not during initial load
                              form.setValue('selectedStudentId', '', { shouldDirty: true }); 
                            }
                          }}
                        value={field.value || "all"} 
                        disabled={availableClasses.length === 0 || noMapelAssigned}
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder="Pilih kelas..." /></SelectTrigger></FormControl>
                        <SelectContent>{availableClasses.length === 0 ? (<SelectItem value="all" disabled>Belum ada data kelas</SelectItem>) : (<><SelectItem value="all">Semua Kelas</SelectItem>{availableClasses.map(kls => (<SelectItem key={kls} value={kls}>{kls}</SelectItem>))}</>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                <FormField control={form.control} name="selectedStudentId" render={({ field }) => (<FormItem><FormLabel>Pilih Siswa</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={filteredStudentsForDropdown.length === 0 || noMapelAssigned || !selectedClass}><FormControl><SelectTrigger><SelectValue placeholder="Pilih siswa..." /></SelectTrigger></FormControl><SelectContent>{filteredStudentsForDropdown.length === 0 ? (<SelectItem value="-" disabled>{selectedClass && selectedClass !== "all" ? "Tidak ada siswa di kelas ini" : "Pilih kelas dahulu"}</SelectItem>) : (filteredStudentsForDropdown.map(student => (<SelectItem key={student.id_siswa} value={student.id_siswa}>{student.nama} ({student.nis})</SelectItem>)))}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="selectedAcademicYear" render={({ field }) => (<FormItem><FormLabel>Tahun Ajaran</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={selectableYears.length === 0 || noMapelAssigned}><FormControl><SelectTrigger><SelectValue placeholder="Pilih tahun ajaran..." /></SelectTrigger></FormControl><SelectContent>{selectableYears.length === 0 ? (<SelectItem value="-" disabled>Tidak ada tahun aktif</SelectItem>) : (selectableYears.map(year => (<SelectItem key={year} value={year}>{year}</SelectItem>)))}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="selectedSemester" render={({ field }) => (<FormItem><FormLabel>Semester</FormLabel><Select onValueChange={(value) => field.onChange(parseInt(value))} value={String(field.value || SEMESTERS[0]?.value)} disabled={noMapelAssigned}><FormControl><SelectTrigger><SelectValue placeholder="Pilih semester..." /></SelectTrigger></FormControl><SelectContent>{SEMESTERS.map(semester => (<SelectItem key={semester.value} value={String(semester.value)}>{semester.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="selectedMapel" render={({ field }) => (<FormItem><FormLabel>Mata Pelajaran</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""} disabled={noMapelAssigned}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih mapel yang diampu..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {noMapelAssigned ? (
                        <SelectItem value="-" disabled>Tidak ada mapel ditugaskan</SelectItem>
                      ) : assignedMapelList.length === 0 ? (
                         <SelectItem value="-" disabled>Anda belum ditugaskan mapel</SelectItem>
                      ) : (
                        assignedMapelList.map(mapel => (<SelectItem key={mapel} value={mapel}>{mapel}</SelectItem>))
                      )}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>)} />
                 <FormField
                control={form.control}
                name="kkmValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KKM</FormLabel>
                    <div className="flex items-center gap-2">
                        <FormControl>
                        <Input
                            type="number"
                            placeholder="cth: 75"
                            {...field}
                            value={field.value ?? ""} 
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                            disabled={noMapelAssigned || !selectedMapel || !selectedAcademicYear}
                        />
                        </FormControl>
                        <Button
                        type="button"
                        onClick={handleSaveKkm}
                        variant="outline"
                        size="icon"
                        title="Simpan KKM"
                        disabled={isSavingKkm || noMapelAssigned || !selectedMapel || !selectedAcademicYear || form.getValues('kkmValue') === currentKkm}
                        >
                        {isSavingKkm ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                        </Button>
                    </div>
                    <FormDescription>KKM saat ini untuk mapel &amp; TA ini: <span className="font-bold">{currentKkm}</span></FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </div>
            </CardContent>
          </Card>

          {isLoadingGradeData && selectedMapel && !noMapelAssigned && selectedStudentId ? (
             <Card className="mt-6"><CardHeader><CardTitle>Memuat Data Nilai &amp; KKM...</CardTitle></CardHeader><CardContent className="flex items-center justify-center min-h-[200px]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></CardContent></Card>
          ) : noMapelAssigned ? (
            <Card className="mt-6"><CardHeader><CardTitle>Input Nilai Dinonaktifkan</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-center py-8">Silakan hubungi Admin untuk penugasan mata pelajaran.</p></CardContent></Card>
          ) : !selectedMapel && !noMapelAssigned ? (
             <Card className="mt-6"><CardHeader><CardTitle>Pilih Mata Pelajaran</CardTitle></CardHeader><CardContent className="flex items-center justify-center min-h-[100px]"><p className="text-muted-foreground">Silakan pilih mata pelajaran yang Anda ampu untuk melanjutkan.</p></CardContent></Card>
          ) : !selectedStudentId && selectedMapel && !noMapelAssigned ? (
             <Card className="mt-6"><CardHeader><CardTitle>Pilih Siswa</CardTitle></CardHeader><CardContent className="flex items-center justify-center min-h-[100px]"><p className="text-muted-foreground">Silakan pilih siswa untuk menginput atau melihat nilai.</p></CardContent></Card>
          ) : (
            <Card className="mt-6">
              <CardHeader><CardTitle>Form Input Nilai</CardTitle><CardDescription>Masukkan nilai (0-100) atau jumlah hari hadir. Nilai akhir akan dihitung otomatis.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <FormLabel className="text-base font-medium">Nilai Tugas</FormLabel>
                  <div className="space-y-3 mt-2">
                    {tugasFields.map((field, index) => (
                      <FormField
                        key={field.id}
                        control={form.control}
                        name={`tugas.${index}`}
                        render={({ field: tugasField }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormLabel className="w-28 shrink-0">Tugas Ke-{index + 1}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0-100"
                                {...tugasField}
                                value={tugasField.value ?? ""}
                                onChange={e => tugasField.onChange(parseFloat(e.target.value) || 0)}
                                disabled={!selectedStudentId || !selectedMapel}
                              />
                            </FormControl>
                            {tugasFields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => removeTugas(index)}
                                title={`Hapus Tugas Ke-${index+1}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendTugas(0)}
                    className="mt-3"
                    disabled={!selectedStudentId || !selectedMapel}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Tambah Input Tugas
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {otherGradeInputFields.map(fieldInfo => (
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
                              placeholder={fieldInfo.name === "jumlahHariHadir" ? "0 - " + (totalDaysForCurrentSemester || 'N/A') : "0-100"}
                              {...field}
                              value={field.value ?? ""} 
                              onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                              disabled={!selectedStudentId || !selectedMapel || (fieldInfo.name === "jumlahHariHadir" && (typeof totalDaysForCurrentSemester !== 'number' || totalDaysForCurrentSemester <=0))}
                            />
                          </FormControl>
                          {fieldInfo.name === "jumlahHariHadir" && (
                             <FormDescription className="text-xs">
                                {typeof totalDaysForCurrentSemester === 'number' && totalDaysForCurrentSemester > 0
                                  ? "Total hari efektif: " + totalDaysForCurrentSemester + " hari. Persentase: "
                                  : "Total hari efektif belum diatur Admin. "}
                                {attendancePercentage !== null && typeof totalDaysForCurrentSemester === 'number' && totalDaysForCurrentSemester > 0 && (
                                  <span className="font-semibold text-primary">{attendancePercentage.toFixed(1)}%</span>
                                )}
                             </FormDescription>
                          )}
                           {fieldInfo.bonusKey && weights && (
                            <FormDescription className="text-xs">
                              Maks. bonus tambahan: +{weights[fieldInfo.bonusKey] ?? 0} poin. Input nilai 0-100.
                            </FormDescription>
                          )}
                          {fieldInfo.desc && !fieldInfo.bonusKey && (
                              <FormDescription className="text-xs">{fieldInfo.desc}</FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                {calculatedFinalGrade !== null && selectedStudentId && selectedMapel && (
                  <div className={"mt-6 p-4 border-2 border-dashed rounded-lg bg-muted/50 text-center " + 
                                  (overallAcademicStatus === 'Tuntas' ? 'border-green-600/50' : overallAcademicStatus === 'Belum Tuntas' ? 'border-destructive' : 'border-border')}
                  >
                    <BarChartHorizontalBig className="mx-auto h-10 w-10 text-primary mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">Nilai Akhir (Rapor) untuk {selectedMapel}</p>
                    <p className={"text-4xl font-bold " + (overallAcademicStatus === 'Tuntas' ? 'text-green-600' : overallAcademicStatus === 'Belum Tuntas' ? 'text-destructive' : 'text-foreground')}>
                      {calculatedFinalGrade.toFixed(2)}
                    </p>
                    <p className="text-base text-muted-foreground mt-1">
                      KKM: {kkmValue} - 
                      Status: {overallAcademicStatus === 'Menghitung...' ? (
                        <span className="italic">Menghitung...</span>
                      ) : overallAcademicStatus === 'Tuntas' ? (
                        <span className="font-semibold text-green-600 inline-flex items-center"><CheckCircle2 className="mr-1 h-4 w-4"/>Tuntas</span>
                      ) : (
                        <span className="font-semibold text-destructive inline-flex items-center"><XCircle className="mr-1 h-4 w-4"/>Belum Tuntas</span>
                      )}
                    </p>
                    {untuntasComponents.length > 0 && overallAcademicStatus === 'Belum Tuntas' && (
                      <div className="mt-2 text-sm text-destructive">
                        <p className="font-medium">Komponen akademik inti yang belum tuntas (di bawah KKM {kkmValue}):</p>
                        <ul className="list-disc list-inside text-left max-w-md mx-auto">
                          {untuntasComponents.map(comp => (
                            <li key={comp.name}>{comp.name}: {comp.value}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!weights && <p className="text-xs text-destructive mt-1">Bobot/Hari Efektif belum dimuat, nilai akhir mungkin tidak akurat.</p>}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isSubmitting || noMapelAssigned || !selectedStudentId || !weights || !selectedAcademicYear || !selectedMapel}>
                  {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</>) : (<><Save className="mr-2 h-4 w-4" />Simpan Nilai</>)}
                </Button>
                 <Button type="button" variant="outline" onClick={handleExportCurrentGrade} disabled={noMapelAssigned || !selectedStudentId || !selectedAcademicYear || !selectedSemester || !selectedMapel}>
                  <FileDown className="mr-2 h-4 w-4" /> Ekspor Nilai Ini
                </Button>
              </CardFooter>
            </Card>
          )}
        </form>
      </Form>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Impor &amp; Ekspor Nilai Massal</CardTitle>
          <CardDescription>Gunakan template Excel untuk impor nilai secara massal. Template akan menyertakan daftar siswa, serta tahun ajaran, semester, dan mapel yang terpilih di filter atas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <Input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              ref={fileImportInputRef}
              disabled={noMapelAssigned || !watchedFormValues.selectedMapel}
              className="flex-grow text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            <Button onClick={handleImportGradesFromFile} disabled={isImportingFile || !selectedImportFile || noMapelAssigned || !watchedFormValues.selectedMapel} className="w-full sm:w-auto">
              {isImportingFile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              {isImportingFile ? 'Mengimpor...' : 'Impor File Nilai'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Unduh template di bawah ini. Template akan berisi ` + "`id_siswa`, `nama_siswa`, `nis`, `kelas`, `tahun_ajaran`, `semester`, dan `mapel`" + ` yang sudah terisi sesuai filter.
            Guru tinggal mengisi komponen nilai. Sistem akan membaca kolom ` + "`tugas1` hingga `tugas5`" + ` (sesuai template) dan komponen lain. File impor harus berisi mapel yang telah ditugaskan kepada Anda dan cocok dengan filter mapel yang aktif.
          </p>
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadGradeTemplate}
            disabled={isImportingFile || noMapelAssigned || !watchedFormValues.selectedAcademicYear || !watchedFormValues.selectedSemester || !watchedFormValues.selectedMapel}
          >
            <Download className="mr-2 h-4 w-4" /> Unduh Template Impor Nilai
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
    

    

    