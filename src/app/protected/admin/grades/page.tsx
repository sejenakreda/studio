"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, AlertCircle, Info, ArrowUpDown, ArrowDown, ArrowUp, Filter as FilterIcon, ChevronLeft, ChevronRight, Download, Trash2 } from "lucide-react";
import { getAllGrades, getStudents, getActiveAcademicYears, getUniqueMapelNamesFromGrades, deleteGradeById, addActivityLog } from '@/lib/firestoreService';
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

interface AdminGradeView extends Nilai {
  namaSiswa?: string;
  nisSiswa?: string;
  kelasSiswa?: string;
  rataRataTugas?: number;
}

type SortableKeys = keyof Pick<AdminGradeView, 'namaSiswa' | 'nisSiswa' | 'kelasSiswa' | 'tahun_ajaran' | 'semester' | 'nilai_akhir' | 'mapel'>;

interface SortConfig {
  key: SortableKeys | 'rataRataTugas' | 'tes' | 'pts' | 'pas' | 'kehadiran' | 'eskul' | 'osis' | null;
  direction: 'ascending' | 'descending';
}

const CURRENT_ACADEMIC_YEAR = getCurrentAcademicYear();
const ITEMS_PER_PAGE = 15;

export default function ManageAllGradesPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [allGradesData, setAllGradesData] = useState<AdminGradeView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'namaSiswa', direction: 'ascending' });
  const [gradeToDelete, setGradeToDelete] = useState<AdminGradeView | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [uniqueClasses, setUniqueClasses] = useState<string[]>([]);
  const [selectableYears, setSelectableYears] = useState<string[]>([]);
  const [availableMapelFilters, setAvailableMapelFilters] = useState<string[]>([]);
  const [classFilter, setClassFilter] = useState<string>("all");
  const [academicYearFilter, setAcademicYearFilter] = useState<string>("all");
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [mapelFilter, setMapelFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [grades, students, activeYears, uniqueMapelList] = await Promise.all([
        getAllGrades(),
        getStudents(),
        getActiveAcademicYears(),
        getUniqueMapelNamesFromGrades() // Admin gets all unique mapel names
      ]);

      setSelectableYears(activeYears);
      setAvailableMapelFilters(uniqueMapelList);

      if (activeYears.includes(CURRENT_ACADEMIC_YEAR)) {
        setAcademicYearFilter(CURRENT_ACADEMIC_YEAR);
      } else if (activeYears.length > 0) {
        setAcademicYearFilter(activeYears[0]); 
      } else {
        setAcademicYearFilter("all"); 
      }

      if (!Array.isArray(grades)) {
        throw new Error("Gagal memuat data nilai. Data yang diterima bukan array.");
      }
      if (!Array.isArray(students)) {
        throw new Error("Gagal memuat data siswa. Data yang diterima bukan array.");
      }

      const studentMap = new Map(students.map(s => [s.id_siswa, s]));

      const enrichedGrades = grades.map(grade => {
        const student = studentMap.get(grade.id_siswa);
        return {
          ...grade,
          namaSiswa: student?.nama || 'N/A',
          nisSiswa: student?.nis || 'N/A',
          kelasSiswa: student?.kelas || 'N/A',
          rataRataTugas: calculateAverage(grade.tugas || []),
        };
      });

      setAllGradesData(enrichedGrades);

      if (enrichedGrades.length > 0) {
        const klasses = [...new Set(enrichedGrades.map(g => g.kelasSiswa).filter(Boolean) as string[])].sort();
        setUniqueClasses(klasses);
      } else {
        setUniqueClasses([]);
      }

    } catch (err: any) {
      console.error("Error fetching all grades data:", err);
      setError("Gagal memuat data nilai. Silakan coba lagi nanti.");
      toast({
        variant: "destructive",
        title: "Error Memuat Data",
        description: err.message || "Terjadi kesalahan saat mengambil data nilai.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  useEffect(() => {
    setCurrentPage(1); 
  }, [classFilter, academicYearFilter, semesterFilter, mapelFilter, sortConfig]);


  const requestSort = (key: SortConfig['key']) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedGrades = useMemo(() => {
    let items = [...allGradesData];

    if (classFilter !== "all") {
      items = items.filter(grade => grade.kelasSiswa === classFilter);
    }
    if (academicYearFilter !== "all") {
      items = items.filter(grade => grade.tahun_ajaran === academicYearFilter);
    }
    if (semesterFilter !== "all") {
      items = items.filter(grade => String(grade.semester) === semesterFilter);
    }
    if (mapelFilter !== "all") {
      items = items.filter(grade => grade.mapel === mapelFilter);
    }
    
    if (sortConfig.key !== null) {
      items.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof AdminGradeView];
        const bValue = b[sortConfig.key as keyof AdminGradeView];

        const aIsNull = aValue === undefined || aValue === null;
        const bIsNull = bValue === undefined || bValue === null;

        if (aIsNull && bIsNull) return 0;
        if (aIsNull) return 1; 
        if (bIsNull) return -1; 
        
        let comparison = 0;
        if (sortConfig.key === 'nilai_akhir' || sortConfig.key === 'rataRataTugas' || 
            sortConfig.key === 'tes' || sortConfig.key === 'pts' || sortConfig.key === 'pas' ||
            sortConfig.key === 'kehadiran' || sortConfig.key === 'eskul' || sortConfig.key === 'osis') {
            const numA = Number(aValue);
            const numB = Number(bValue);
            if (!isNaN(numA) && !isNaN(numB)) {
                comparison = numA - numB;
            } else if (!isNaN(numA)) {
                comparison = -1; 
            } else if (!isNaN(numB)) {
                comparison = 1; 
            } else {
                 comparison = String(aValue).localeCompare(String(bValue));
            }
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else {
           comparison = String(aValue).localeCompare(String(bValue));
        }
        return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
      });
    }
    return items;
  }, [allGradesData, sortConfig, classFilter, academicYearFilter, semesterFilter, mapelFilter]);
  
  const totalPages = Math.ceil(filteredAndSortedGrades.length / ITEMS_PER_PAGE);

  const paginatedGrades = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredAndSortedGrades.slice(startIndex, endIndex);
  }, [filteredAndSortedGrades, currentPage]);


  const getSortIcon = (key: SortConfig['key']) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-3 w-3 text-primary" /> : <ArrowDown className="ml-2 h-3 w-3 text-primary" />;
  };

  const tableHeaders: { key: SortConfig['key'], label: string, className?: string }[] = [
    { key: 'namaSiswa', label: 'Nama Siswa' },
    { key: 'nisSiswa', label: 'NIS' },
    { key: 'kelasSiswa', label: 'Kelas' },
    { key: 'tahun_ajaran', label: 'Tahun Ajaran' },
    { key: 'semester', label: 'Semester' },
    { key: 'mapel', label: 'Mapel'},
    { key: 'rataRataTugas', label: 'Avg. Tugas' },
    { key: 'tes', label: 'Tes' },
    { key: 'pts', label: 'PTS' },
    { key: 'pas', label: 'PAS' },
    { key: 'kehadiran', label: 'Kehadiran (%)' },
    { key: 'eskul', label: 'Eskul' },
    { key: 'osis', label: 'OSIS' },
    { key: 'nilai_akhir', label: 'Nilai Akhir', className: 'text-primary' },
  ];

  const handleDeleteConfirmation = (grade: AdminGradeView) => {
    setGradeToDelete(grade);
  };

  const handleActualDelete = async () => {
    if (!gradeToDelete || !gradeToDelete.id || !userProfile) {
      toast({ variant: "destructive", title: "Error", description: "Data tidak lengkap untuk penghapusan." });
      setGradeToDelete(null);
      return;
    }
    setIsDeleting(true);
    try {
      await deleteGradeById(gradeToDelete.id);
      await addActivityLog(
        "Nilai Dihapus (Admin)",
        `Nilai mapel ${gradeToDelete.mapel} untuk siswa ${gradeToDelete.namaSiswa} (NIS: ${gradeToDelete.nisSiswa}) dihapus oleh Admin: ${userProfile.displayName || userProfile.email}`,
        userProfile.uid,
        userProfile.displayName || userProfile.email || "Admin"
      );
      toast({ title: "Sukses", description: `Nilai untuk ${gradeToDelete.namaSiswa} berhasil dihapus.` });
      setGradeToDelete(null);
      fetchData(); // Refetch data
    } catch (error: any) {
      console.error("Error deleting grade:", error);
      toast({ variant: "destructive", title: "Error Hapus", description: "Gagal menghapus nilai." });
    } finally {
      setIsDeleting(false);
    }
  };


  const memoizedTableRows = useMemo(() => {
    return paginatedGrades.map((grade) => (
      <TableRow key={grade.id || `${grade.id_siswa}-${grade.tahun_ajaran}-${grade.semester}-${grade.mapel}`}>
        <TableCell className="font-medium">{grade.namaSiswa}</TableCell>
        <TableCell>{grade.nisSiswa}</TableCell>
        <TableCell>{grade.kelasSiswa}</TableCell>
        <TableCell>{grade.tahun_ajaran}</TableCell>
        <TableCell>{grade.semester === 1 ? 'Ganjil' : 'Genap'}</TableCell>
        <TableCell>{grade.mapel}</TableCell>
        <TableCell>{Number(grade.rataRataTugas || 0).toFixed(2)}</TableCell>
        <TableCell>{Number(grade.tes || 0).toFixed(2)}</TableCell>
        <TableCell>{Number(grade.pts || 0).toFixed(2)}</TableCell>
        <TableCell>{Number(grade.pas || 0).toFixed(2)}</TableCell>
        <TableCell>{Number(grade.kehadiran || 0).toFixed(2)}%</TableCell>
        <TableCell>{Number(grade.eskul || 0).toFixed(2)}</TableCell>
        <TableCell>{Number(grade.osis || 0).toFixed(2)}</TableCell>
        <TableCell className="font-semibold text-primary">{Number(grade.nilai_akhir || 0).toFixed(2)}</TableCell>
        <TableCell className="text-right">
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => handleDeleteConfirmation(grade)}
            disabled={isDeleting && gradeToDelete?.id === grade.id}
            title={"Hapus Nilai"}
          >
            {isDeleting && gradeToDelete?.id === grade.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            <span className="sr-only">Hapus Nilai</span>
          </Button>
        </TableCell>
      </TableRow>
    ));
  }, [paginatedGrades, isDeleting, gradeToDelete]);

  const handleDownloadExcel = () => {
    if (filteredAndSortedGrades.length === 0) {
      toast({
        variant: "default",
        title: "Tidak Ada Data",
        description: "Tidak ada data nilai yang sesuai dengan filter untuk diunduh.",
      });
      return;
    }

    const dataForExcel = filteredAndSortedGrades.map(grade => ({
      'Nama Siswa': grade.namaSiswa,
      'NIS': grade.nisSiswa,
      'Kelas': grade.kelasSiswa,
      'Tahun Ajaran': grade.tahun_ajaran,
      'Semester': grade.semester === 1 ? 'Ganjil' : 'Genap',
      'Mata Pelajaran': grade.mapel,
      'Avg. Tugas': parseFloat(Number(grade.rataRataTugas || 0).toFixed(2)),
      'Tes': parseFloat(Number(grade.tes || 0).toFixed(2)),
      'PTS': parseFloat(Number(grade.pts || 0).toFixed(2)),
      'PAS': parseFloat(Number(grade.pas || 0).toFixed(2)),
      'Kehadiran (%)': parseFloat(Number(grade.kehadiran || 0).toFixed(2)),
      'Eskul': parseFloat(Number(grade.eskul || 0).toFixed(2)),
      'OSIS': parseFloat(Number(grade.osis || 0).toFixed(2)),
      'Nilai Akhir': parseFloat(Number(grade.nilai_akhir || 0).toFixed(2)),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Semua Nilai Siswa");

    const wscols = [
      { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, 
      { wch: 10 }, { wch: 8 },  { wch: 8 },  { wch: 8 }, { wch: 15 }, 
      { wch: 8 },  { wch: 8 },  { wch: 12 }, 
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, "semua_nilai_siswa.xlsx");
    toast({
      title: "Unduhan Dimulai",
      description: "File Excel semua nilai siswa sedang disiapkan.",
    });
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Manajemen Nilai Global</h1>
          <p className="text-muted-foreground">
            Lihat, filter, dan kelola semua data nilai siswa. Urutkan berdasarkan kolom.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle>Daftar Semua Nilai Siswa</CardTitle>
              <CardDescription>
                Menampilkan semua catatan nilai. Gunakan filter atau klik header kolom untuk mengurutkan.
              </CardDescription>
            </div>
            {filteredAndSortedGrades.length > 0 && !isLoading && (
              <Button onClick={handleDownloadExcel} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Unduh Excel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {allGradesData.length > 0 && !isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 border rounded-md bg-muted/30">
              <div>
                <Label htmlFor="classFilter" className="text-sm font-medium">Filter Kelas</Label>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger id="classFilter" className="w-full mt-1">
                    <SelectValue placeholder="Pilih kelas..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {uniqueClasses.map(kelas => (
                      <SelectItem key={kelas} value={kelas}>{kelas}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="academicYearFilter" className="text-sm font-medium">Filter Tahun Ajaran</Label>
                <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
                  <SelectTrigger id="academicYearFilter" className="w-full mt-1">
                    <SelectValue placeholder="Pilih tahun ajaran..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tahun</SelectItem>
                    {selectableYears.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                    {selectableYears.length === 0 && <SelectItem value="all" disabled>Tidak ada tahun aktif</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="semesterFilter" className="text-sm font-medium">Filter Semester</Label>
                <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                  <SelectTrigger id="semesterFilter" className="w-full mt-1">
                    <SelectValue placeholder="Pilih semester..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Semester</SelectItem>
                    {SEMESTERS.map(semester => (
                      <SelectItem key={semester.value} value={String(semester.value)}>{semester.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="mapelFilter" className="text-sm font-medium">Filter Mata Pelajaran</Label>
                <Select value={mapelFilter} onValueChange={setMapelFilter} disabled={availableMapelFilters.length === 0 && !isLoading}>
                  <SelectTrigger id="mapelFilter" className="w-full mt-1">
                    <SelectValue placeholder="Pilih mapel..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Mapel</SelectItem>
                    {availableMapelFilters.map(mapel => (
                      <SelectItem key={mapel} value={mapel}>{mapel}</SelectItem>
                    ))}
                     {availableMapelFilters.length === 0 && <SelectItem value="no_mapel_data_placeholder" disabled>Belum ada data mapel</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center min-h-[200px]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Gagal Memuat Data</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              <Button onClick={fetchData} variant="outline" className="mt-4">
                Coba Lagi
              </Button>
            </Alert>
          ) : allGradesData.length === 0 ? (
             <div className="flex flex-col items-center justify-center min-h-[200px] text-center p-6 border-2 border-dashed rounded-lg">
              <Info className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">
                Belum Ada Data Nilai
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Sistem belum memiliki data nilai siswa. Guru dapat mulai menginput nilai melalui dasbor mereka.
              </p>
            </div>
          ) : filteredAndSortedGrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] text-center p-6 border-2 border-dashed rounded-lg">
              <FilterIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">
                Tidak Ada Data Sesuai Filter
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Tidak ada data nilai yang cocok dengan kriteria filter yang Anda pilih. Coba ubah pilihan filter Anda.
              </p>
               <Button onClick={() => { setClassFilter("all"); setAcademicYearFilter(CURRENT_ACADEMIC_YEAR); setSemesterFilter("all"); setMapelFilter("all"); }} variant="outline" className="mt-4">
                Reset Filter
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {tableHeaders.map(header => (
                        <TableHead 
                          key={header.key as string} 
                          onClick={() => header.key && requestSort(header.key)}
                          className={`cursor-pointer hover:bg-muted/50 transition-colors ${header.className || ''}`}
                          title={`Urutkan berdasarkan ${header.label}`}
                        >
                          <div className="flex items-center">
                            {header.label}
                            {header.key ? getSortIcon(header.key) : null}
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memoizedTableRows}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <CardFooter className="flex items-center justify-between border-t pt-4 mt-4">
                  <div className="text-sm text-muted-foreground">
                    Halaman {currentPage} dari {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Berikutnya
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardFooter>
              )}
            </>
          )}
        </CardContent>
      </Card>
      {gradeToDelete && (
        <AlertDialog open={!!gradeToDelete} onOpenChange={(isOpen) => !isOpen && setGradeToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Anda Yakin Ingin Menghapus Data Nilai Ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini akan menghapus data nilai <span className="font-semibold">{gradeToDelete.mapel}</span> untuk siswa <span className="font-semibold">{gradeToDelete.namaSiswa}</span> (TA {gradeToDelete.tahun_ajaran}, Semester {gradeToDelete.semester}).
                Tindakan ini tidak dapat diurungkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setGradeToDelete(null)} disabled={isDeleting}>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleActualDelete}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Ya, Hapus Nilai
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
