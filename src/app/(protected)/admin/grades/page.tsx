
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, AlertCircle, Users, ClipboardList, Info, ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";
import { getAllGrades, getStudents } from '@/lib/firestoreService';
import { calculateAverage } from '@/lib/utils';
import type { Nilai, Siswa } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AdminGradeView extends Nilai {
  namaSiswa?: string;
  nisSiswa?: string;
  kelasSiswa?: string;
  rataRataTugas?: number;
}

type SortableKeys = keyof Pick<AdminGradeView, 'namaSiswa' | 'nisSiswa' | 'kelasSiswa' | 'tahun_ajaran' | 'semester' | 'nilai_akhir'>;

interface SortConfig {
  key: SortableKeys | 'rataRataTugas' | 'tes' | 'pts' | 'pas' | 'kehadiran' | 'eskul' | 'osis' | null;
  direction: 'ascending' | 'descending';
}

export default function ManageAllGradesPage() {
  const { toast } = useToast();
  const [allGradesData, setAllGradesData] = useState<AdminGradeView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'namaSiswa', direction: 'ascending' });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [grades, students] = await Promise.all([
        getAllGrades(),
        getStudents()
      ]);

      if (!grades || !students) {
        throw new Error("Gagal memuat data nilai atau siswa.");
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

  const requestSort = (key: SortConfig['key']) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedGradesData = useMemo(() => {
    let sortableItems = [...allGradesData];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof AdminGradeView];
        const bValue = b[sortConfig.key as keyof AdminGradeView];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        
        let comparison = 0;
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else {
           // Fallback for mixed types or other types
           comparison = String(aValue).localeCompare(String(bValue));
        }
        return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
      });
    }
    return sortableItems;
  }, [allGradesData, sortConfig]);

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
    { key: 'rataRataTugas', label: 'Avg. Tugas' },
    { key: 'tes', label: 'Tes' },
    { key: 'pts', label: 'PTS' },
    { key: 'pas', label: 'PAS' },
    { key: 'kehadiran', label: 'Kehadiran' },
    { key: 'eskul', label: 'Eskul' },
    { key: 'osis', label: 'OSIS' },
    { key: 'nilai_akhir', label: 'Nilai Akhir', className: 'text-primary' },
  ];


  const memoizedTableRows = useMemo(() => {
    return sortedGradesData.map((grade) => (
      <TableRow key={grade.id || `${grade.id_siswa}-${grade.tahun_ajaran}-${grade.semester}`}>
        <TableCell className="font-medium">{grade.namaSiswa}</TableCell>
        <TableCell>{grade.nisSiswa}</TableCell>
        <TableCell>{grade.kelasSiswa}</TableCell>
        <TableCell>{grade.tahun_ajaran}</TableCell>
        <TableCell>{grade.semester === 1 ? 'Ganjil' : 'Genap'}</TableCell>
        <TableCell>{(grade.rataRataTugas || 0).toFixed(2)}</TableCell>
        <TableCell>{grade.tes?.toFixed(2) || '0.00'}</TableCell>
        <TableCell>{grade.pts?.toFixed(2) || '0.00'}</TableCell>
        <TableCell>{grade.pas?.toFixed(2) || '0.00'}</TableCell>
        <TableCell>{grade.kehadiran?.toFixed(2) || '0.00'}%</TableCell>
        <TableCell>{grade.eskul?.toFixed(2) || '0.00'}</TableCell>
        <TableCell>{grade.osis?.toFixed(2) || '0.00'}</TableCell>
        <TableCell className="font-semibold text-primary">{(grade.nilai_akhir || 0).toFixed(2)}</TableCell>
      </TableRow>
    ));
  }, [sortedGradesData]);


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Admin">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Manajemen Nilai Global</h1>
          <p className="text-muted-foreground">
            Lihat dan kelola semua data nilai siswa secara keseluruhan. Urutkan berdasarkan kolom.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Semua Nilai Siswa</CardTitle>
          <CardDescription>
            Menampilkan semua catatan nilai yang tersimpan dalam sistem. Klik header kolom untuk mengurutkan.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {tableHeaders.map(header => (
                      <TableHead 
                        key={header.key} 
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memoizedTableRows}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

