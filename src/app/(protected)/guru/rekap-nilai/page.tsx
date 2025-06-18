
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, AlertCircle, Info, ArrowUpDown, ArrowDown, ArrowUp, Filter as FilterIcon, ChevronLeft, ChevronRight, Download, BarChartHorizontalBig } from "lucide-react";
import { getAllGrades, getStudents, getActiveAcademicYears } from '@/lib/firestoreService';
import { calculateAverage, SEMESTERS, getCurrentAcademicYear } from '@/lib/utils';
import type { Nilai, Siswa } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface GuruGradeSummaryView extends Nilai {
  namaSiswa?: string;
  nisSiswa?: string;
  kelasSiswa?: string;
  rataRataTugas?: number;
}

type SortableKeys = keyof Pick<GuruGradeSummaryView, 'namaSiswa' | 'nisSiswa' | 'kelasSiswa' | 'nilai_akhir'>;

interface SortConfig {
  key: SortableKeys | 'rataRataTugas' | 'tes' | 'pts' | 'pas' | 'kehadiran' | 'eskul' | 'osis' | null;
  direction: 'ascending' | 'descending';
}

const CURRENT_ACADEMIC_YEAR = getCurrentAcademicYear();
const ITEMS_PER_PAGE = 15;

export default function RekapNilaiPage() {
  const { toast } = useToast();
  const [allGradesData, setAllGradesData] = useState<GuruGradeSummaryView[]>([]);
  const [studentsMap, setStudentsMap] = useState<Map<string, Siswa>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'namaSiswa', direction: 'ascending' });

  const [selectableYears, setSelectableYears] = useState<string[]>([]);
  const [academicYearFilter, setAcademicYearFilter] = useState<string>("");
  const [semesterFilter, setSemesterFilter] = useState<string>(String(SEMESTERS[0]?.value || "1"));
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [grades, students, activeYears] = await Promise.all([
        getAllGrades(),
        getStudents(),
        getActiveAcademicYears()
      ]);

      setSelectableYears(activeYears);
      if (activeYears.includes(CURRENT_ACADEMIC_YEAR)) {
        setAcademicYearFilter(CURRENT_ACADEMIC_YEAR);
      } else if (activeYears.length > 0) {
        setAcademicYearFilter(activeYears[0]);
      } else {
        // If no active years, this case should ideally not happen if there's a fallback in getActiveAcademicYears
        // but as a safeguard, we can set it to empty and let the UI show a message
        setAcademicYearFilter(""); 
        toast({ variant: "default", title: "Informasi", description: "Tidak ada tahun ajaran aktif. Silakan hubungi Admin."});
      }
      
      if (!Array.isArray(grades)) throw new Error("Gagal memuat data nilai. Format tidak sesuai.");
      if (!Array.isArray(students)) throw new Error("Gagal memuat data siswa. Format tidak sesuai.");

      const studentMap = new Map(students.map(s => [s.id_siswa, s]));
      setStudentsMap(studentMap);

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

    } catch (err: any) {
      console.error("Error fetching data for grade summary:", err);
      setError("Gagal memuat data rekap nilai. Silakan coba lagi nanti.");
      toast({
        variant: "destructive",
        title: "Error Memuat Data",
        description: err.message || "Terjadi kesalahan saat mengambil data.",
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
  }, [academicYearFilter, semesterFilter, sortConfig]);

  const requestSort = (key: SortConfig['key']) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedGrades = useMemo(() => {
    let items = [...allGradesData];

    if (academicYearFilter) {
      items = items.filter(grade => grade.tahun_ajaran === academicYearFilter);
    } else {
       return []; // If no academic year is selected (e.g. no active years), show no data
    }
    if (semesterFilter) {
      items = items.filter(grade => String(grade.semester) === semesterFilter);
    }
    
    if (sortConfig.key !== null) {
      items.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof GuruGradeSummaryView];
        const bValue = b[sortConfig.key as keyof GuruGradeSummaryView];
        const aIsNull = aValue === undefined || aValue === null;
        const bIsNull = bValue === undefined || bValue === null;

        if (aIsNull && bIsNull) return 0;
        if (aIsNull) return 1; 
        if (bIsNull) return -1; 
        
        let comparison = 0;
        if (['nilai_akhir', 'rataRataTugas', 'tes', 'pts', 'pas', 'kehadiran', 'eskul', 'osis'].includes(sortConfig.key as string)) {
            const numA = Number(aValue);
            const numB = Number(bValue);
            comparison = numA - numB;
        } else {
           comparison = String(aValue).localeCompare(String(bValue));
        }
        return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
      });
    }
    return items;
  }, [allGradesData, sortConfig, academicYearFilter, semesterFilter]);
  
  const totalPages = Math.ceil(filteredAndSortedGrades.length / ITEMS_PER_PAGE);

  const paginatedGrades = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredAndSortedGrades.slice(startIndex, endIndex);
  }, [filteredAndSortedGrades, currentPage]);

  const getSortIcon = (key: SortConfig['key']) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />;
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-3 w-3 text-primary" /> : <ArrowDown className="ml-2 h-3 w-3 text-primary" />;
  };

  const tableHeaders: { key: SortConfig['key'], label: string, className?: string }[] = [
    { key: 'namaSiswa', label: 'Nama Siswa' }, { key: 'nisSiswa', label: 'NIS' },
    { key: 'kelasSiswa', label: 'Kelas' }, { key: 'rataRataTugas', label: 'Avg. Tugas' },
    { key: 'tes', label: 'Tes' }, { key: 'pts', label: 'PTS' }, { key: 'pas', label: 'PAS' },
    { key: 'kehadiran', label: 'Kehadiran (%)' }, { key: 'eskul', label: 'Eskul' },
    { key: 'osis', label: 'OSIS' }, { key: 'nilai_akhir', label: 'Nilai Akhir', className: 'text-primary' },
  ];

  const handleDownloadExcel = () => {
    if (filteredAndSortedGrades.length === 0) {
      toast({ variant: "default", title: "Tidak Ada Data", description: "Tidak ada data rekap nilai yang sesuai untuk diunduh." });
      return;
    }
    const dataForExcel = filteredAndSortedGrades.map(grade => ({
      'Nama Siswa': grade.namaSiswa, 'NIS': grade.nisSiswa, 'Kelas': grade.kelasSiswa,
      'Tahun Ajaran': grade.tahun_ajaran, 'Semester': grade.semester === 1 ? 'Ganjil' : 'Genap',
      'Avg. Tugas': parseFloat((grade.rataRataTugas || 0).toFixed(2)),
      'Tes': parseFloat(grade.tes?.toFixed(2) || '0.00'),
      'PTS': parseFloat(grade.pts?.toFixed(2) || '0.00'),
      'PAS': parseFloat(grade.pas?.toFixed(2) || '0.00'),
      'Kehadiran (%)': parseFloat(grade.kehadiran?.toFixed(2) || '0.00'),
      'Eskul': parseFloat(grade.eskul?.toFixed(2) || '0.00'),
      'OSIS': parseFloat(grade.osis?.toFixed(2) || '0.00'),
      'Nilai Akhir': parseFloat((grade.nilai_akhir || 0).toFixed(2)),
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap Nilai ${academicYearFilter.replace('/', '-')} Smt ${semesterFilter}`);
    const wscols = [
      { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, 
      { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 15 }, 
      { wch: 8 }, { wch: 8 }, { wch: 12 }, 
    ];
    worksheet['!cols'] = wscols;
    XLSX.writeFile(workbook, `rekap_nilai_${academicYearFilter.replace('/', '-')}_smt${semesterFilter}.xlsx`);
    toast({ title: "Unduhan Dimulai", description: "File Excel rekap nilai sedang disiapkan." });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/guru">
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Guru">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Rekap Nilai Semester</h1>
          <p className="text-muted-foreground">
            Lihat rekapitulasi nilai siswa per tahun ajaran dan semester.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle>Filter dan Tampilan Rekap Nilai</CardTitle>
              <CardDescription>
                Pilih tahun ajaran dan semester untuk melihat rekap nilai. Klik header kolom untuk mengurutkan.
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 border rounded-md bg-muted/30">
            <div>
              <Label htmlFor="academicYearFilter" className="text-sm font-medium">Filter Tahun Ajaran</Label>
              <Select value={academicYearFilter} onValueChange={setAcademicYearFilter} disabled={selectableYears.length === 0}>
                <SelectTrigger id="academicYearFilter" className="w-full mt-1">
                  <SelectValue placeholder="Pilih tahun ajaran..." />
                </SelectTrigger>
                <SelectContent>
                  {selectableYears.length > 0 ? (
                    selectableYears.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>Tidak ada tahun aktif</SelectItem>
                  )}
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
                  {SEMESTERS.map(semester => (
                    <SelectItem key={semester.value} value={String(semester.value)}>{semester.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4"><div className="flex items-center justify-center min-h-[200px]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>{[...Array(5)].map((_, i) => (<Skeleton key={i} className="h-10 w-full rounded-md" />))}</div>
          ) : error ? (
            <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Gagal Memuat Data</AlertTitle><AlertDescription>{error}</AlertDescription><Button onClick={fetchData} variant="outline" className="mt-4">Coba Lagi</Button></Alert>
          ) : !academicYearFilter ? (
             <Alert variant="default"><Info className="h-4 w-4" /><AlertTitle>Pilih Tahun Ajaran</AlertTitle><AlertDescription>Silakan pilih tahun ajaran untuk menampilkan rekap nilai. Jika daftar kosong, hubungi Admin.</AlertDescription></Alert>
          ) : filteredAndSortedGrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] text-center p-6 border-2 border-dashed rounded-lg">
              <BarChartHorizontalBig className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">Tidak Ada Data Sesuai Filter</h3>
              <p className="mt-1 text-sm text-muted-foreground">Tidak ada data rekap nilai yang cocok dengan tahun ajaran dan semester yang Anda pilih.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>{tableHeaders.map(header => (<TableHead key={header.key as string} onClick={() => header.key && requestSort(header.key)} className={`cursor-pointer hover:bg-muted/50 transition-colors ${header.className || ''}`} title={`Urutkan berdasarkan ${header.label}`}><div className="flex items-center">{header.label}{header.key ? getSortIcon(header.key) : null}</div></TableHead>))}</TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedGrades.map((grade) => (
                      <TableRow key={grade.id || `${grade.id_siswa}-${grade.tahun_ajaran}-${grade.semester}`}>
                        <TableCell className="font-medium">{grade.namaSiswa}</TableCell><TableCell>{grade.nisSiswa}</TableCell>
                        <TableCell>{grade.kelasSiswa}</TableCell><TableCell>{(grade.rataRataTugas || 0).toFixed(2)}</TableCell>
                        <TableCell>{grade.tes?.toFixed(2) || '0.00'}</TableCell><TableCell>{grade.pts?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell>{grade.pas?.toFixed(2) || '0.00'}</TableCell><TableCell>{grade.kehadiran?.toFixed(2) || '0.00'}%</TableCell>
                        <TableCell>{grade.eskul?.toFixed(2) || '0.00'}</TableCell><TableCell>{grade.osis?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell className="font-semibold text-primary">{(grade.nilai_akhir || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <CardFooter className="flex items-center justify-between border-t pt-4 mt-4">
                  <div className="text-sm text-muted-foreground">Halaman {currentPage} dari {totalPages}</div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4 mr-1" />Sebelumnya</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Berikutnya<ChevronRight className="h-4 w-4 ml-1" /></Button>
                  </div>
                </CardFooter>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    