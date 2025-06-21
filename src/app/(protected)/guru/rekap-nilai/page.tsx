"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, AlertCircle, Info, ArrowUpDown, ArrowDown, ArrowUp, Filter as FilterIcon, ChevronLeft, ChevronRight, Download, BarChartHorizontalBig, Edit, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { getStudents, getActiveAcademicYears, getKkmSetting, deleteGradeById, getGradesForTeacherDisplay } from '@/lib/firestoreService';
import { calculateAverage, SEMESTERS, getCurrentAcademicYear } from '@/lib/utils';
import type { Nilai, Siswa } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GuruGradeSummaryView extends Nilai {
  namaSiswa?: string;
  nisSiswa?: string;
  kelasSiswa?: string;
  rataRataTugas?: number;
  kkmValue?: number;
  isTuntas?: boolean;
}

type SortableKeys = keyof Pick<GuruGradeSummaryView, 'namaSiswa' | 'nisSiswa' | 'kelasSiswa' | 'nilai_akhir' | 'mapel'>;

interface SortConfig {
  key: SortableKeys | 'rataRataTugas' | 'tes' | 'pts' | 'pas' | 'kehadiran' | 'eskul' | 'osis' | null;
  direction: 'ascending' | 'descending';
}

const CURRENT_ACADEMIC_YEAR = getCurrentAcademicYear();
const ITEMS_PER_PAGE = 15;

const PageLoadingSkeleton = () => (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="w-full">
                <Skeleton className="h-8 w-64 mb-2 rounded-md" />
                <Skeleton className="h-5 w-80 rounded-md" />
            </div>
        </div>
        <Card>
            <CardHeader>
                <Skeleton className="h-7 w-48 mb-2 rounded-md" />
                <Skeleton className="h-4 w-72 rounded-md" />
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-md bg-muted/30">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="flex items-center justify-center min-h-[200px]">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            </CardContent>
        </Card>
    </div>
);

export default function RekapNilaiPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { userProfile, loading: authIsLoading } = useAuth();

  const [allGradesData, setAllGradesData] = useState<GuruGradeSummaryView[]>([]);
  const [studentsMap, setStudentsMap] = useState<Map<string, Siswa>>(new Map());
  const [kkmSettingsMap, setKkmSettingsMap] = useState<Map<string, number>>(new Map());
  
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [gradesAreLoading, setGradesAreLoading] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);
  const [gradeToDelete, setGradeToDelete] = useState<GuruGradeSummaryView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'namaSiswa', direction: 'ascending' });

  const [selectableYears, setSelectableYears] = useState<string[]>([]);
  const [academicYearFilter, setAcademicYearFilter] = useState<string>("");
  const [semesterFilter, setSemesterFilter] = useState<string>(String(SEMESTERS[0]?.value || "1"));
  const [mapelFilter, setMapelFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [retryCounter, setRetryCounter] = useState(0);

  useEffect(() => {
    const fetchInitialPageData = async () => {
      setPageIsLoading(true);
      setError(null);
      setAllGradesData([]);

      if (authIsLoading) return;

      if (!userProfile || !userProfile.uid) {
        setError("Sesi guru tidak ditemukan atau tidak valid.");
        setPageIsLoading(false);
        return;
      }

      if (!userProfile.assignedMapel || userProfile.assignedMapel.length === 0) {
        setError("Anda tidak memiliki mata pelajaran yang ditugaskan. Silakan hubungi Admin.");
        try {
            const activeYears = await getActiveAcademicYears();
            setSelectableYears(activeYears);
            if (activeYears.length > 0 && !academicYearFilter) {
                setAcademicYearFilter(activeYears.includes(CURRENT_ACADEMIC_YEAR) ? CURRENT_ACADEMIC_YEAR : activeYears[0]);
            } else if (activeYears.length === 0 && !academicYearFilter) {
                setAcademicYearFilter("");
            }
        } catch (e) { console.error("Failed to load academic years even without mapel:", e); }
        setPageIsLoading(false);
        return;
      }

      try {
        const [studentList, activeYears] = await Promise.all([ getStudents(), getActiveAcademicYears() ]);
        setSelectableYears(activeYears);
        
        if (!academicYearFilter && activeYears.length > 0) {
             setAcademicYearFilter(activeYears.includes(CURRENT_ACADEMIC_YEAR) ? CURRENT_ACADEMIC_YEAR : activeYears[0]);
        } else if (!academicYearFilter && activeYears.length === 0) {
             setAcademicYearFilter("");
        }
        
        if (!mapelFilter && userProfile.assignedMapel.length > 0) {
           setMapelFilter(userProfile.assignedMapel[0]);
        }

        if (!Array.isArray(studentList)) throw new Error("Gagal memuat data siswa. Format tidak sesuai.");
        setStudentsMap(new Map(studentList.map(s => [s.id_siswa, s])));
      } catch (err: any) {
        console.error("Error fetching initial data for grade summary:", err);
        setError("Gagal memuat data awal. Silakan coba lagi nanti.");
      } finally {
        setPageIsLoading(false);
      }
    };
    fetchInitialPageData();
  }, [authIsLoading, userProfile, retryCounter]);

  useEffect(() => {
    const fetchGradesAndKkm = async () => {
      if (pageIsLoading || authIsLoading) return;
      if (!userProfile?.uid || !userProfile.assignedMapel?.length || !academicYearFilter || !semesterFilter || !mapelFilter) {
        setAllGradesData([]);
        setGradesAreLoading(false);
        return;
      }

      setGradesAreLoading(true);
      setError(null);
      try {
        const mapelListToQuery = mapelFilter === "all" ? userProfile.assignedMapel : [mapelFilter];
        if (mapelListToQuery.length === 0) {
            setAllGradesData([]);
            return;
        }

        const grades = await getGradesForTeacherDisplay(userProfile.uid, mapelListToQuery, academicYearFilter, parseInt(semesterFilter, 10));
        if (!Array.isArray(grades)) throw new Error("Gagal memuat data nilai. Format tidak sesuai.");

        const uniqueMapelTaPairsForKkm = [...new Set(grades.map(g => `${g.mapel}__${g.tahun_ajaran}`))];
        const kkmPromises = uniqueMapelTaPairsForKkm.map(async pair => {
          const [mapel, ta] = pair.split('__');
          const kkmSetting = await getKkmSetting(mapel, ta);
          return { key: pair, value: kkmSetting?.kkmValue || 70 };
        });
        const kkmResults = await Promise.all(kkmPromises);
        const newKkmSettingsMap = new Map<string, number>();
        kkmResults.forEach(res => newKkmSettingsMap.set(res.key, res.value));
        setKkmSettingsMap(newKkmSettingsMap);

        const enrichedGrades = grades.map(grade => {
          const student = studentsMap.get(grade.id_siswa);
          const kkmKey = `${grade.mapel}__${grade.tahun_ajaran}`;
          const kkm = newKkmSettingsMap.get(kkmKey) || 70;
          const allTasksTuntas = (grade.tugas || []).every(score => (score || 0) >= kkm);
          const allCoreComponentsTuntas = allTasksTuntas && (grade.tes || 0) >= kkm && (grade.pts || 0) >= kkm && (grade.pas || 0) >= kkm;
          const finalGradeTuntas = (grade.nilai_akhir || 0) >= kkm;
          return {
            ...grade,
            namaSiswa: student?.nama || 'N/A', nisSiswa: student?.nis || 'N/A', kelasSiswa: student?.kelas || 'N/A',
            rataRataTugas: calculateAverage(grade.tugas || []),
            kkmValue: kkm, isTuntas: finalGradeTuntas && allCoreComponentsTuntas,
          };
        });
        setAllGradesData(enrichedGrades);
      } catch (err: any) {
        console.error("Error fetching grades data:", err);
        setError("Gagal memuat data rekap nilai. Silakan coba lagi nanti.");
        setAllGradesData([]);
      } finally {
        setGradesAreLoading(false);
      }
    };

    if (!pageIsLoading && !authIsLoading) {
      fetchGradesAndKkm();
    }
  }, [pageIsLoading, authIsLoading, academicYearFilter, semesterFilter, mapelFilter, userProfile, studentsMap]);

  useEffect(() => { setCurrentPage(1); }, [academicYearFilter, semesterFilter, mapelFilter, sortConfig]);

  const requestSort = (key: SortConfig['key']) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };

  const filteredAndSortedGrades = useMemo(() => {
    let items = [...allGradesData];
    if (sortConfig.key !== null) {
      items.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof GuruGradeSummaryView];
        const bValue = b[sortConfig.key as keyof GuruGradeSummaryView];
        if (aValue == null) return 1; if (bValue == null) return -1;
        let comparison = 0;
        if (typeof aValue === 'number' && typeof bValue === 'number') comparison = aValue - bValue;
        else comparison = String(aValue).localeCompare(String(bValue));
        return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
      });
    }
    return items;
  }, [allGradesData, sortConfig]);

  const totalPages = Math.ceil(filteredAndSortedGrades.length / ITEMS_PER_PAGE);
  const paginatedGrades = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedGrades.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedGrades, currentPage]);

  const getSortIcon = (key: SortConfig['key']) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />;
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-3 w-3 text-primary" /> : <ArrowDown className="ml-2 h-3 w-3 text-primary" />;
  };

  const tableHeaders = [
    { key: 'namaSiswa', label: 'Nama Siswa' }, { key: 'nisSiswa', label: 'NIS' }, { key: 'kelasSiswa', label: 'Kelas' },
    { key: 'mapel', label: 'Mapel' }, { key: 'rataRataTugas', label: 'Avg. Tugas' }, { key: 'tes', label: 'Tes' },
    { key: 'pts', label: 'PTS' }, { key: 'pas', label: 'PAS' }, { key: 'kehadiran', label: 'Kehadiran (%)' },
    { key: 'eskul', label: 'Eskul' }, { key: 'osis', label: 'OSIS' }, { key: 'nilai_akhir', label: 'Nilai Akhir', className: 'text-primary' },
    { label: 'Status', className: 'text-center' }, { label: 'Aksi', className: 'text-right' },
  ] as const;

  const handleDownloadExcel = () => {
    if (filteredAndSortedGrades.length === 0) {
      toast({ variant: "default", title: "Tidak Ada Data", description: "Tidak ada data rekap nilai yang sesuai untuk diunduh." });
      return;
    }

    const maxTugasCount = filteredAndSortedGrades.reduce((max, grade) => Math.max(max, grade.tugas?.length || 0), 0);
    const dataForExcel = filteredAndSortedGrades.map(grade => {
      let keterangan = grade.isTuntas ? "Semua komponen nilai tuntas." : "";
      if (!grade.isTuntas) {
        const kkm = grade.kkmValue || 70; const messages: string[] = [];
        (grade.tugas || []).forEach((t, i) => { if ((t || 0) < kkm) messages.push(`Tgs Ke-${i + 1}: ${t || 0}`); });
        if ((grade.tes || 0) < kkm) messages.push(`Tes: ${grade.tes || 0}`);
        if ((grade.pts || 0) < kkm) messages.push(`PTS: ${grade.pts || 0}`);
        if ((grade.pas || 0) < kkm) messages.push(`PAS: ${grade.pas || 0}`);
        if (messages.length > 0) keterangan = `Blm Tuntas (KKM ${kkm}) - ${messages.join(', ')}.`;
        else if ((grade.nilai_akhir || 0) < kkm) keterangan = `Nilai Akhir (${(grade.nilai_akhir || 0).toFixed(2)}) di bawah KKM (${kkm}).`;
        else keterangan = "Belum tuntas (periksa detail nilai).";
      }

      const excelRow: any = {
        'Nama Siswa': grade.namaSiswa, 'NIS': grade.nisSiswa, 'Kelas': grade.kelasSiswa,
        'Tahun Ajaran': grade.tahun_ajaran, 'Semester': grade.semester === 1 ? 'Ganjil' : 'Genap', 'Mata Pelajaran': grade.mapel,
        'KKM': grade.kkmValue, 'Avg. Tugas': parseFloat((grade.rataRataTugas || 0).toFixed(2)),
      };
      for (let i = 0; i < maxTugasCount; i++) {
        excelRow[`Tugas ${i + 1}`] = grade.tugas?.[i] != null ? parseFloat(grade.tugas[i].toFixed(2)) : '';
      }
      excelRow['Tes'] = parseFloat(grade.tes?.toFixed(2) || '0.00'); excelRow['PTS'] = parseFloat(grade.pts?.toFixed(2) || '0.00');
      excelRow['PAS'] = parseFloat(grade.pas?.toFixed(2) || '0.00'); excelRow['Kehadiran (%)'] = parseFloat(grade.kehadiran?.toFixed(2) || '0.00');
      excelRow['Eskul'] = parseFloat(grade.eskul?.toFixed(2) || '0.00'); excelRow['OSIS'] = parseFloat(grade.osis?.toFixed(2) || '0.00');
      excelRow['Nilai Akhir'] = parseFloat((grade.nilai_akhir || 0).toFixed(2));
      excelRow['Status Tuntas'] = grade.isTuntas ? 'Tuntas' : 'Belum Tuntas'; excelRow['Keterangan'] = keterangan;
      return excelRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    const safeTa = academicYearFilter.replace('/', '-'); const safeSmt = semesterFilter;
    const safeMapel = (mapelFilter === "all" ? "SemuaMapelYgDiampu" : mapelFilter.replace(/[^a-z0-9]/gi, '_'));
    const sheetName = `Rekap ${safeTa} S${safeSmt} ${safeMapel}`.substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.trim().length < 1 ? "RekapNilai" : sheetName);
    const baseCols = [{wch:25},{wch:15},{wch:10},{wch:15},{wch:10},{wch:20},{wch:8},{wch:10}];
    const tugasCols = Array(maxTugasCount).fill({wch:8});
    const remainingCols = [{wch:8},{wch:8},{wch:8},{wch:15},{wch:8},{wch:8},{wch:12},{wch:15},{wch:40}];
    worksheet['!cols'] = [...baseCols, ...tugasCols, ...remainingCols];
    XLSX.writeFile(workbook, `rekap_nilai_${safeTa}_smt${safeSmt}_${safeMapel}.xlsx`);
    toast({ title: "Unduhan Dimulai", description: "File Excel rekap nilai sedang disiapkan." });
  };

  const handleEditGrade = (grade: GuruGradeSummaryView) => {
    const student = studentsMap.get(grade.id_siswa);
    const queryParams = new URLSearchParams({
      studentId: grade.id_siswa, academicYear: grade.tahun_ajaran,
      semester: String(grade.semester), mapel: grade.mapel, class: student?.kelas || '',
    });
    router.push(`/guru/grades?${queryParams.toString()}`);
  };

  const handleDeleteConfirmation = (grade: GuruGradeSummaryView) => { setGradeToDelete(grade); };
  const handleActualDelete = async () => {
    if (!gradeToDelete?.id) return;
    setIsDeleting(true);
    try {
      await deleteGradeById(gradeToDelete.id);
      toast({ title: "Sukses", description: `Nilai untuk ${gradeToDelete.namaSiswa} (${gradeToDelete.mapel}) berhasil dihapus.` });
      setAllGradesData(prev => prev.filter(g => g.id !== gradeToDelete.id));
      setGradeToDelete(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Hapus Nilai", description: "Gagal menghapus data nilai." });
    } finally {
      setIsDeleting(false);
    }
  };

  const retryDataLoad = () => setRetryCounter(prev => prev + 1);

  if (authIsLoading || (pageIsLoading && !error)) return <PageLoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/guru"><Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Guru"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Rekap Nilai Semester</h1>
          <p className="text-muted-foreground">Lihat, edit, atau hapus rekapitulasi nilai siswa per tahun ajaran, semester, dan mata pelajaran yang Anda ampu.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div><CardTitle>Filter dan Tampilan Rekap Nilai</CardTitle><CardDescription>Pilih filter untuk melihat rekap nilai. Klik header kolom untuk mengurutkan.</CardDescription></div>
            {filteredAndSortedGrades.length > 0 && !gradesAreLoading && (<Button onClick={handleDownloadExcel} variant="outline"><Download className="mr-2 h-4 w-4" />Unduh Excel</Button>)}
          </div>
        </CardHeader>
        <CardContent>
          {error && (<Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4" /><AlertTitle>Gagal Memuat Data</AlertTitle><AlertDescription>{error}</AlertDescription><Button onClick={retryDataLoad} variant="outline" className="mt-4">Coba Lagi</Button></Alert>)}
          {!error && (!userProfile?.assignedMapel || userProfile.assignedMapel.length === 0) && (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Tidak Ada Mapel Ditugaskan</AlertTitle><AlertDescription>Anda tidak memiliki mata pelajaran yang ditugaskan. Silakan hubungi Admin. Rekap nilai tidak dapat ditampilkan.</AlertDescription></Alert>)}
          {!error && userProfile?.assignedMapel && userProfile.assignedMapel.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-md bg-muted/30">
              <div><Label htmlFor="academicYearFilter">Filter Tahun Ajaran</Label><Select value={academicYearFilter || ""} onValueChange={setAcademicYearFilter} disabled={selectableYears.length === 0}><SelectTrigger id="academicYearFilter"><SelectValue placeholder={selectableYears.length === 0 ? "Tidak ada tahun aktif" : "Pilih..."} /></SelectTrigger><SelectContent>{selectableYears.length > 0 ? selectableYears.map(y => (<SelectItem key={y} value={y}>{y}</SelectItem>)) : (<SelectItem value="-" disabled>Tidak ada tahun aktif</SelectItem>)}</SelectContent></Select></div>
              <div><Label htmlFor="semesterFilter">Filter Semester</Label><Select value={semesterFilter} onValueChange={setSemesterFilter}><SelectTrigger id="semesterFilter"><SelectValue placeholder="Pilih..." /></SelectTrigger><SelectContent>{SEMESTERS.map(s => (<SelectItem key={s.value} value={String(s.value)}>{s.label}</SelectItem>))}</SelectContent></Select></div>
              <div><Label htmlFor="mapelFilter">Filter Mata Pelajaran</Label><Select value={mapelFilter || ""} onValueChange={setMapelFilter} disabled={!userProfile.assignedMapel?.length}><SelectTrigger id="mapelFilter"><SelectValue placeholder="Pilih..." /></SelectTrigger><SelectContent>{userProfile.assignedMapel.length > 0 ? (<><SelectItem value="all">Semua Mapel Saya</SelectItem>{userProfile.assignedMapel.map(m => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</>) : (<SelectItem value="-" disabled>Tidak ada mapel</SelectItem>)}</SelectContent></Select></div>
            </div>
          )}
          {gradesAreLoading ? (<div className="flex items-center justify-center min-h-[200px]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>)
          : !error && (!academicYearFilter || !mapelFilter) && userProfile?.assignedMapel?.length > 0 ? (<Alert variant="default"><Info className="h-4 w-4" /><AlertTitle>Pilih Filter</AlertTitle><AlertDescription>Silakan pilih Tahun Ajaran dan Mata Pelajaran untuk menampilkan rekap nilai.</AlertDescription></Alert>)
          : !error && filteredAndSortedGrades.length === 0 && userProfile?.assignedMapel?.length > 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] text-center p-6 border-2 border-dashed rounded-lg">
              <BarChartHorizontalBig className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-2 text-sm font-medium text-foreground">Tidak Ada Data Sesuai Filter</h3><p className="mt-1 text-sm text-muted-foreground">Tidak ada data rekap nilai yang cocok dengan filter yang Anda pilih, atau belum ada nilai yang diinput untuk kriteria ini.</p>
            </div>
          ) : !error && filteredAndSortedGrades.length > 0 && (
            <>
              <div className="overflow-x-auto"><Table><TableHeader><TableRow>{tableHeaders.map(h => (<TableHead key={h.label} onClick={() => h.key && requestSort(h.key)} className={`cursor-pointer hover:bg-muted/50 ${h.className||''}`}><div className="flex items-center">{h.label}{h.key ? getSortIcon(h.key) : null}</div></TableHead>))}</TableRow></TableHeader>
                <TableBody>{paginatedGrades.map((g) => (<TableRow key={g.id || `${g.id_siswa}-${g.mapel}`}><TableCell className="font-medium">{g.namaSiswa}</TableCell><TableCell>{g.nisSiswa}</TableCell><TableCell>{g.kelasSiswa}</TableCell><TableCell>{g.mapel}</TableCell><TableCell>{(g.rataRataTugas || 0).toFixed(2)}</TableCell><TableCell>{g.tes?.toFixed(2) || '0.00'}</TableCell><TableCell>{g.pts?.toFixed(2) || '0.00'}</TableCell><TableCell>{g.pas?.toFixed(2) || '0.00'}</TableCell><TableCell>{g.kehadiran?.toFixed(2) || '0.00'}%</TableCell><TableCell>{g.eskul?.toFixed(2) || '0.00'}</TableCell><TableCell>{g.osis?.toFixed(2) || '0.00'}</TableCell><TableCell className={`font-semibold ${g.isTuntas ? 'text-green-600' : 'text-destructive'}`}>{(g.nilai_akhir || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-center">{g.isTuntas ? (<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle2 className="mr-1 h-3 w-3"/>Tuntas</span>) : (<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive"><XCircle className="mr-1 h-3 w-3"/>Belum Tuntas</span>)}<div className="text-xs text-muted-foreground">(KKM: {g.kkmValue || 70})</div></TableCell>
                  <TableCell className="text-right space-x-1"><Button variant="ghost" size="icon" onClick={() => handleEditGrade(g)} title="Edit Nilai"><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDeleteConfirmation(g)} className="text-destructive hover:text-destructive" title="Hapus Nilai" disabled={isDeleting && gradeToDelete?.id === g.id}>{isDeleting && gradeToDelete?.id === g.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button></TableCell></TableRow>))}</TableBody>
              </Table></div>
              {totalPages > 1 && (<CardFooter className="flex items-center justify-between border-t pt-4 mt-4"><div className="text-sm text-muted-foreground">Halaman {currentPage} dari {totalPages}</div><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="mr-1 h-4 w-4"/>Sebelumnya</Button><Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Berikutnya<ChevronRight className="ml-1 h-4 w-4"/></Button></div></CardFooter>)}
            </>
          )}
        </CardContent>
      </Card>
      {gradeToDelete && (<AlertDialog open={!!gradeToDelete} onOpenChange={(isOpen) => !isOpen && setGradeToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Yakin Hapus Data Nilai Ini?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus data nilai mata pelajaran <span className="font-semibold">{gradeToDelete.mapel}</span> untuk siswa <span className="font-semibold">{gradeToDelete.namaSiswa}</span> pada tahun ajaran {gradeToDelete.tahun_ajaran} semester {gradeToDelete.semester === 1 ? "Ganjil" : "Genap"}. Tindakan ini tidak dapat diurungkan.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setGradeToDelete(null)} disabled={isDeleting}>Batal</AlertDialogCancel><AlertDialogAction onClick={handleActualDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">{isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Ya, Hapus Nilai</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
    </div>
  );
}
