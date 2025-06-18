
"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as XLSX from 'xlsx';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, AlertCircle, BookOpenCheck, BarChartHorizontalBig, Download, FileUp, FileDown, Target, Info } from "lucide-react";
import { getStudents, getWeights, getGrade, addOrUpdateGrade, getActiveAcademicYears, getKkmSetting, setKkmSetting, addActivityLog } from '@/lib/firestoreService';
import { calculateFinalGrade, SEMESTERS, getCurrentAcademicYear, calculateAverage } from '@/lib/utils';
import type { Siswa, Bobot, Nilai, KkmSetting } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';

const gradeSchema = z.object({
  selectedStudentId: z.string().min(1, "Siswa harus dipilih"),
  selectedAcademicYear: z.string().min(1, "Tahun ajaran harus dipilih"),
  selectedSemester: z.coerce.number().min(1, "Semester harus dipilih").max(2),
  selectedMapel: z.string().min(1, "Mata pelajaran harus dipilih"),
  kkmValue: z.coerce.number().min(0, "KKM minimal 0").max(100, "KKM maksimal 100").optional().default(70),
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
  [key: string]: any;
}

const CURRENT_ACADEMIC_YEAR = getCurrentAcademicYear();

export default function InputGradesPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [students, setStudents] = useState<Siswa[]>([]);
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


  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [isImportingFile, setIsImportingFile] = useState(false);
  const fileImportInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<GradeFormData>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
        kkmValue: 70,
        selectedMapel: "",
    }
  });

  const watchedFormValues = form.watch();
  const { selectedStudentId, selectedAcademicYear, selectedSemester, selectedMapel, kkmValue } = watchedFormValues;

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
        
        let defaultStudentId = studentList && studentList.length > 0 ? studentList[0].id_siswa : "";
        let defaultYear = "";
        if (activeYears.includes(CURRENT_ACADEMIC_YEAR)) {
          defaultYear = CURRENT_ACADEMIC_YEAR;
        } else if (activeYears.length > 0) {
          defaultYear = activeYears[0];
        }
        let defaultSemester = SEMESTERS[0]?.value || 1;
        let defaultMapel = "";

        if (mapelParam && guruAssignedMapel.includes(mapelParam)) {
          defaultMapel = mapelParam;
        } else if (guruAssignedMapel.length > 0) {
          defaultMapel = guruAssignedMapel[0];
        }
        
        if (studentIdParam && academicYearParam && semesterParam) {
            defaultStudentId = studentIdParam;
            defaultYear = academicYearParam;
            defaultSemester = parseInt(semesterParam, 10);
        }
        
        form.reset({
          selectedStudentId: defaultStudentId,
          selectedAcademicYear: defaultYear,
          selectedSemester: defaultSemester,
          selectedMapel: defaultMapel,
          kkmValue: 70,
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
    if (userProfile) { // Ensure userProfile is loaded before fetching
        fetchInitialData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, searchParams, userProfile]); // Removed form and router as they are stable

  // Fetch KKM when mapel or academic year changes
  useEffect(() => {
    async function fetchKkm() {
      if (selectedMapel && selectedAcademicYear) {
        setIsLoadingGradeData(true);
        try {
          const kkmData = await getKkmSetting(selectedMapel, selectedAcademicYear);
          if (kkmData) {
            form.setValue("kkmValue", kkmData.kkmValue);
            setCurrentKkm(kkmData.kkmValue);
          } else {
            form.setValue("kkmValue", 70); // Default if not set
            setCurrentKkm(70);
          }
        } catch (error) {
          console.error("Error fetching KKM:", error);
          toast({ variant: "destructive", title: "Error KKM", description: "Gagal memuat KKM." });
        } finally {
          setIsLoadingGradeData(false);
        }
      } else {
        form.setValue("kkmValue", 70); // Reset KKM if mapel or TA not selected
        setCurrentKkm(70);
      }
    }
    fetchKkm();
  }, [selectedMapel, selectedAcademicYear, form, toast]);


  useEffect(() => {
    async function fetchGrade() {
      if (!selectedStudentId || !selectedAcademicYear || !selectedSemester || !selectedMapel || !weights || isLoadingInitialData) {
        if (!isLoadingInitialData) {
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
        const gradeData = await getGrade(selectedStudentId, selectedSemester, selectedAcademicYear, selectedMapel);
        const totalDaysForSemester = selectedSemester === 1 ? weights.totalHariEfektifGanjil : weights.totalHariEfektifGenap;
        let calculatedJumlahHariHadir = 0;

        if (gradeData) {
          if (typeof gradeData.kehadiran === 'number' && typeof totalDaysForSemester === 'number' && totalDaysForSemester > 0) {
            calculatedJumlahHariHadir = Math.round((gradeData.kehadiran / 100) * totalDaysForSemester);
          }
          form.reset({
            ...form.getValues(),
            selectedMapel: gradeData.mapel,
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
    
    if (selectedStudentId && selectedAcademicYear && selectedSemester && selectedMapel && weights && !isLoadingInitialData) {
       fetchGrade();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, selectedAcademicYear, selectedSemester, selectedMapel, weights, toast, isLoadingInitialData]);


  useEffect(() => {
    if (weights && !isLoadingInitialData && selectedMapel) {
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
        mapel: watchedFormValues.selectedMapel,
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
  }, [watchedFormValues, weights, isLoadingInitialData, selectedMapel]);

  const handleSaveKkm = async () => {
    if (!selectedMapel || !selectedAcademicYear) {
      toast({ variant: "destructive", title: "Error", description: "Mata pelajaran dan tahun ajaran harus dipilih untuk menyimpan KKM." });
      return;
    }
    if (kkmValue === null || kkmValue === undefined || kkmValue < 0 || kkmValue > 100) {
      toast({ variant: "destructive", title: "Error KKM", description: "Nilai KKM harus antara 0 dan 100." });
      return;
    }

    setIsSavingKkm(true);
    try {
      await setKkmSetting({ mapel: selectedMapel, tahun_ajaran: selectedAcademicYear, kkmValue: kkmValue });
      setCurrentKkm(kkmValue);
      toast({ title: "Sukses", description: "KKM untuk " + selectedMapel + " TA " + selectedAcademicYear + " berhasil disimpan: " + kkmValue + "." });
      if (userProfile) {
        addActivityLog(
            "KKM Diperbarui Guru",
            "Mapel: " + selectedMapel + ", TA: " + selectedAcademicYear + ", KKM: " + kkmValue + " oleh " + (userProfile.displayName || userProfile.email),
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
      mapel: data.selectedMapel,
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
      toast({ title: "Sukses", description: "Data nilai siswa untuk mapel " + data.selectedMapel + " berhasil disimpan." });
    } catch (error) {
      console.error("Error saving grade data:", error);
      setFetchError("Gagal menyimpan data nilai. Silakan coba lagi.");
      toast({ variant: "destructive", title: "Error", description: "Gagal menyimpan data nilai." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const gradeInputFields: { name: keyof Omit<GradeFormData, 'selectedStudentId' | 'selectedAcademicYear' | 'selectedSemester' | 'selectedMapel' | 'kkmValue' | 'kehadiran'>; label: string, type?: string, desc?: string }[] = [
    { name: "tugas1", label: "Nilai Tugas 1" }, { name: "tugas2", label: "Nilai Tugas 2" },
    { name: "tugas3", label: "Nilai Tugas 3" }, { name: "tugas4", label: "Nilai Tugas 4" },
    { name: "tugas5", label: "Nilai Tugas 5" }, { name: "tes", label: "Nilai Tes / Ulangan" },
    { name: "pts", label: "Nilai PTS" }, { name: "pas", label: "Nilai PAS" },
    { name: "jumlahHariHadir", label: "Jumlah Hari Hadir", desc: "Akan dikonversi ke persentase otomatis."},
    { name: "eskul", label: "Nilai Ekstrakurikuler" }, { name: "osis", label: "Nilai OSIS/Kegiatan" },
  ];

  const handleDownloadGradeTemplate = async () => {
    const { selectedAcademicYear: currentYear, selectedSemester: currentSemester, selectedMapel: currentMapel } = form.getValues();

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
        const allStudentsList = await getStudents();
        if (!allStudentsList || allStudentsList.length === 0) {
            toast({ title: "Tidak Ada Siswa", description: "Tidak ada data siswa untuk membuat template.", variant: "default" });
            return;
        }

        const dataForExcel = allStudentsList.map(student => ({
            id_siswa: student.id_siswa,
            nama_siswa: student.nama,
            nis: student.nis,
            kelas: student.kelas,
            tahun_ajaran: currentYear,
            semester: currentSemester,
            mapel: currentMapel, // Mapel diisi otomatis
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
        const filename = "template_nilai_" + safeMapel + "_" + safeYear + "_smt" + currentSemester + ".xlsx";
        XLSX.writeFile(workbook, filename);
        toast({ title: "Template Diunduh", description: "Template untuk mapel " + currentMapel + ", TA " + currentYear + " Semester " + currentSemester + " telah diunduh." });

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
    const dataForExcel = [{
      'ID Siswa': selectedStudentId,
      'Nama Siswa': currentStudent.nama,
      'NIS': currentStudent.nis,
      'Kelas': currentStudent.kelas,
      'Tahun Ajaran': selectedAcademicYear,
      'Semester': selectedSemester === 1 ? 'Ganjil' : 'Genap',
      'Mata Pelajaran': selectedMapel,
      'KKM': values.kkmValue,
      'Tugas 1': values.tugas1 || 0,
      'Tugas 2': values.tugas2 || 0,
      'Tugas 3': values.tugas3 || 0,
      'Tugas 4': values.tugas4 || 0,
      'Tugas 5': values.tugas5 || 0,
      'Tes': values.tes || 0,
      'PTS': values.pts || 0,
      'PAS': values.pas || 0,
      'Jumlah Hari Hadir': values.jumlahHariHadir || 0,
      'Kehadiran (%)': attendancePercentage?.toFixed(2) || '0.00',
      'Eskul': values.eskul || 0,
      'OSIS': values.osis || 0,
      'Nilai Akhir': calculatedFinalGrade?.toFixed(2) || '0.00',
    }];

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Nilai Siswa");
    const wscols = [
      { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 8 }, // mapel, kkm
      { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
      { wch: 18 }, { wch: 15 }, { wch: 8 }, { wch: 8 }, { wch: 12 }
    ];
    worksheet['!cols'] = wscols;
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
            ? (SEMESTERS.find(s => s.label.toLowerCase() === row.semester.toLowerCase())?.value || parseInt(String(row.semester)))
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


          const totalDaysForSemester = semesterNum === 1 ? weights.totalHariEfektifGanjil : weights.totalHariEfektifGenap;
          let calculatedKehadiranPercentage = 0;
          const jumlahHadir = typeof row.jumlah_hari_hadir === 'number' ? row.jumlah_hari_hadir : 0;

          if (typeof totalDaysForSemester === 'number' && totalDaysForSemester > 0) {
            calculatedKehadiranPercentage = (jumlahHadir / totalDaysForSemester) * 100;
            calculatedKehadiranPercentage = Math.min(Math.max(calculatedKehadiranPercentage, 0), 100);
          }

          const tugasScores: number[] = [];
          for (let i = 1; i <= 20; i++) {
            const tugasValue = row["tugas" + i];
            if (tugasValue !== undefined && tugasValue !== null && String(tugasValue).trim() !== '') {
                 const numValue = Number(tugasValue);
                 if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                    tugasScores.push(numValue);
                } else {
                    tugasScores.push(0);
                    errorDetails.push("Nilai tugas" + i + " (" + tugasValue + ") tidak valid untuk " + row.id_siswa + " mapel " + row.mapel + ". Dianggap 0.");
                }
            }
          }

          const nilaiToSave: Omit<Nilai, 'id' | 'nilai_akhir'> = {
            id_siswa: row.id_siswa,
            mapel: row.mapel.trim(),
            semester: semesterNum,
            tahun_ajaran: row.tahun_ajaran,
            tugas: tugasScores,
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
        
        if (watchedFormValues.selectedStudentId && watchedFormValues.selectedAcademicYear && watchedFormValues.selectedSemester && watchedFormValues.selectedMapel) {
           const currentFormValues = form.getValues();
           const reselectStudentId = currentFormValues.selectedStudentId;
           const reselectAcademicYear = currentFormValues.selectedAcademicYear;
           const reselectSemester = currentFormValues.selectedSemester;
           const reselectMapel = currentFormValues.selectedMapel;

            form.reset({
                ...currentFormValues,
                selectedStudentId: '',
            });
            setTimeout(() => {
                form.reset({
                    ...currentFormValues,
                    selectedStudentId: reselectStudentId,
                    selectedAcademicYear: reselectAcademicYear,
                    selectedSemester: reselectSemester,
                    selectedMapel: reselectMapel,
                });
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
        <div><h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Input &amp; Lihat Nilai Siswa</h1><p className="text-muted-foreground">Pilih siswa, periode, mapel yang diampu &amp; KKM, lalu input atau perbarui nilai.</p></div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader><CardTitle>Filter Data &amp; Pengaturan Mapel</CardTitle><CardDescription>Pilih siswa, periode, mata pelajaran yang Anda ampu, dan atur KKM.</CardDescription></CardHeader>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField control={form.control} name="selectedStudentId" render={({ field }) => (<FormItem><FormLabel>Pilih Siswa</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={students.length === 0 || noMapelAssigned}><FormControl><SelectTrigger><SelectValue placeholder="Pilih siswa..." /></SelectTrigger></FormControl><SelectContent>{students.length === 0 ? (<SelectItem value="-" disabled>Belum ada siswa</SelectItem>) : (students.map(student => (<SelectItem key={student.id_siswa} value={student.id_siswa}>{student.nama} ({student.nis})</SelectItem>)))}</SelectContent></Select><FormMessage /></FormItem>)} />
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
              </div>
              <FormField
                control={form.control}
                name="kkmValue"
                render={({ field }) => (
                  <FormItem className="md:col-span-2 lg:col-span-1 mt-4">
                    <FormLabel>KKM (Kriteria Ketuntasan Minimal)</FormLabel>
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
                        disabled={isSavingKkm || noMapelAssigned || !selectedMapel || !selectedAcademicYear || kkmValue === currentKkm}
                        >
                        {isSavingKkm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Target className="mr-2 h-4 w-4" />}
                        Simpan KKM
                        </Button>
                    </div>
                    <FormDescription>KKM saat ini untuk {selectedMapel || "mapel ini"} TA {selectedAcademicYear || ""} adalah: <span className="font-bold">{currentKkm}</span></FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {isLoadingGradeData && selectedMapel && !noMapelAssigned ? (
             <Card className="mt-6"><CardHeader><CardTitle>Memuat Data Nilai &amp; KKM...</CardTitle></CardHeader><CardContent className="flex items-center justify-center min-h-[200px]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></CardContent></Card>
          ) : noMapelAssigned ? (
            <Card className="mt-6"><CardHeader><CardTitle>Input Nilai Dinonaktifkan</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-center py-8">Silakan hubungi Admin untuk penugasan mata pelajaran.</p></CardContent></Card>
          ) : !selectedMapel && !noMapelAssigned ? (
             <Card className="mt-6"><CardHeader><CardTitle>Pilih Mata Pelajaran</CardTitle></CardHeader><CardContent className="flex items-center justify-center min-h-[100px]"><p className="text-muted-foreground">Silakan pilih mata pelajaran yang Anda ampu untuk melanjutkan.</p></CardContent></Card>
          ) : (
            <Card className="mt-6">
              <CardHeader><CardTitle>Form Input Nilai</CardTitle><CardDescription>Masukkan nilai (0-100) atau jumlah hari hadir. Nilai akhir akan dihitung otomatis.</CardDescription></CardHeader>
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                {calculatedFinalGrade !== null && selectedStudentId && selectedMapel && (
                  <div className={"mt-6 p-4 border-2 border-dashed rounded-lg bg-muted/50 text-center " + (calculatedFinalGrade < currentKkm ? 'border-destructive' : 'border-primary/50')}>
                    <BarChartHorizontalBig className="mx-auto h-10 w-10 text-primary mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">Nilai Akhir (Rapor) untuk {selectedMapel}</p>
                    <p className={"text-4xl font-bold " + (calculatedFinalGrade < currentKkm ? 'text-destructive' : 'text-primary')}>{calculatedFinalGrade.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      KKM: {currentKkm} -
                      Status: <span className={"font-semibold " + (calculatedFinalGrade < currentKkm ? 'text-destructive' : 'text-green-600')}>
                        {calculatedFinalGrade < currentKkm ? 'Belum Tuntas' : 'Tuntas'}
                      </span>
                    </p>
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
            Unduh template di bawah ini. Template akan berisi `id_siswa`, `nama_siswa`, `nis`, `kelas`, `tahun_ajaran`, `semester`, dan `mapel` yang sudah terisi sesuai filter.
            Guru tinggal mengisi komponen nilai. Sistem akan membaca kolom `tugas1`, `tugas2`, ..., `tugasN` secara dinamis. File impor harus berisi mapel yang telah ditugaskan kepada Anda dan cocok dengan filter mapel yang aktif.
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


    