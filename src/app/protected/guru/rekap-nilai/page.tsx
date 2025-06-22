
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from "next/link";
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, AlertCircle, BarChartHorizontalBig, Filter, Download, Info } from "lucide-react";
import { useAuth } from '@/context/AuthContext';
import { getStudents, getGradesForTeacherDisplay, getActiveAcademicYears, getMataPelajaranMaster } from '@/lib/firestoreService';
import type { Siswa, Nilai } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { calculateAverage, SEMESTERS, getCurrentAcademicYear } from '@/lib/utils';


interface RekapRow extends Siswa {
  nilai?: Nilai;
}

export default function RekapNilaiPage() {
    const { toast } = useToast();
    const { userProfile } = useAuth();

    const [students, setStudents] = useState<Siswa[]>([]);
    const [grades, setGrades] = useState<Nilai[]>([]);
    const [activeYears, setActiveYears] = useState<string[]>([]);
    const [masterMapel, setMasterMapel] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Filter states
    const [selectedYear, setSelectedYear] = useState(getCurrentAcademicYear());
    const [selectedSemester, setSelectedSemester] = useState<number>(1);
    const [selectedMapel, setSelectedMapel] = useState<string>("");
    const [selectedClass, setSelectedClass] = useState<string>("all");

    const fetchPrerequisites = useCallback(async () => {
      if (!userProfile) return;
      setIsLoading(true);
      try {
        const [fetchedStudents, fetchedYears, fetchedMasterMapelList] = await Promise.all([
          getStudents(),
          getActiveAcademicYears(),
          getMataPelajaranMaster(),
        ]);
        setStudents(fetchedStudents);
        setActiveYears(fetchedYears);
        setMasterMapel(fetchedMasterMapelList.map(m => m.namaMapel));
      } catch (err) {
        toast({ variant: "destructive", title: "Gagal memuat data awal." });
      } finally {
        setIsLoading(false);
      }
    }, [userProfile, toast]);

    useEffect(() => {
        fetchPrerequisites();
    }, [fetchPrerequisites]);
    
    const validAssignedMapel = useMemo(() => {
        if (!userProfile?.assignedMapel || masterMapel.length === 0) return [];
        return userProfile.assignedMapel.filter(mapel => masterMapel.includes(mapel));
    }, [userProfile?.assignedMapel, masterMapel]);

    useEffect(() => {
        if (validAssignedMapel.length > 0 && !selectedMapel) {
            setSelectedMapel(validAssignedMapel[0]);
        }
    }, [validAssignedMapel, selectedMapel]);


    const fetchDataForTable = useCallback(async () => {
        if (!userProfile || !selectedMapel || !selectedYear || !selectedSemester) {
          setGrades([]); // Clear grades if filters are incomplete
          return;
        }
        setIsLoading(true);
        try {
            const fetchedGrades = await getGradesForTeacherDisplay(userProfile.uid, [selectedMapel], selectedYear, selectedSemester);
            setGrades(fetchedGrades);
        } catch (err) {
            toast({ variant: "destructive", title: "Gagal Memuat Nilai" });
        } finally {
            setIsLoading(false);
        }
    }, [userProfile, selectedMapel, selectedYear, selectedSemester, toast]);
    
    useEffect(() => {
        fetchDataForTable();
    }, [fetchDataForTable]);
    
    const uniqueClasses = useMemo(() => [...new Set(students.map(s => s.kelas).filter(Boolean))].sort(), [students]);

    const rekapData = useMemo<RekapRow[]>(() => {
        const studentsInClass = selectedClass === "all" ? students : students.filter(s => s.kelas === selectedClass);
        
        // Sort students alphabetically by name
        const sortedStudents = [...studentsInClass].sort((a, b) => a.nama.localeCompare(b.nama));
        
        return sortedStudents.map(student => ({
            ...student,
            nilai: grades.find(g => g.id_siswa === student.id_siswa),
        }));
    }, [students, grades, selectedClass]);
    
    const handleDownloadExcel = () => {
      if (rekapData.length === 0) {
        toast({ variant: "default", title: "Tidak ada data untuk diunduh." });
        return;
      }
      const dataForExcel = rekapData.map(row => ({
          'Nama Siswa': row.nama,
          'NIS': row.nis,
          'Kelas': row.kelas,
          'Avg. Tugas': row.nilai ? calculateAverage(row.nilai.tugas).toFixed(2) : 'N/A',
          'Tes': row.nilai?.tes?.toFixed(2) || 'N/A',
          'PTS': row.nilai?.pts?.toFixed(2) || 'N/A',
          'PAS': row.nilai?.pas?.toFixed(2) || 'N/A',
          'Kehadiran (%)': row.nilai?.kehadiran?.toFixed(2) || 'N/A',
          'Eskul': row.nilai?.eskul?.toFixed(2) || 'N/A',
          'OSIS': row.nilai?.osis?.toFixed(2) || 'N/A',
          'Nilai Akhir': row.nilai?.nilai_akhir?.toFixed(2) || 'N/A',
      }));
      const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap ${selectedMapel}`);
      XLSX.writeFile(workbook, `rekap_nilai_${selectedMapel}_${selectedClass}_${selectedYear}_${selectedSemester}.xlsx`);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Link href="/protected/guru"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
              <div><h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Rekapitulasi Nilai</h1><p className="text-muted-foreground">Lihat dan unduh rekap nilai untuk mata pelajaran yang Anda ampu.</p></div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5 text-primary"/> Filter Rekap Nilai</CardTitle>
                            <CardDescription>Pilih filter untuk melihat rekapitulasi nilai dan unduh data.</CardDescription>
                        </div>
                        <Button onClick={handleDownloadExcel} disabled={isLoading || rekapData.length === 0}>
                            <Download className="mr-2 h-4 w-4" /> Unduh Excel
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                        <Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{activeYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select>
                        <Select value={String(selectedSemester)} onValueChange={v => setSelectedSemester(Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SEMESTERS.map(s => <SelectItem key={s.value} value={String(s.value)}>{s.label}</SelectItem>)}</SelectContent></Select>
                        <Select value={selectedMapel} onValueChange={setSelectedMapel} disabled={validAssignedMapel.length === 0}><SelectTrigger><SelectValue placeholder="Pilih mapel..."/></SelectTrigger><SelectContent>{validAssignedMapel.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
                        <Select value={selectedClass} onValueChange={setSelectedClass} disabled={uniqueClasses.length === 0}><SelectTrigger><SelectValue placeholder="Pilih kelas..." /></SelectTrigger><SelectContent><SelectItem value="all">Semua Kelas</SelectItem>{uniqueClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                    </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? <Skeleton className="h-64 w-full" />
                  : !selectedMapel ? <Alert><Info className="h-4 w-4" /><AlertTitle>Pilih Filter</AlertTitle><AlertDescription>Silakan pilih mata pelajaran untuk melihat rekapitulasi nilai.</AlertDescription></Alert>
                  : rekapData.length === 0 ? <Alert><Info className="h-4 w-4" /><AlertTitle>Data Kosong</AlertTitle><AlertDescription>Tidak ada data siswa atau nilai yang cocok dengan filter yang Anda pilih.</AlertDescription></Alert>
                  : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nama Siswa</TableHead>
                            <TableHead>Avg. Tugas</TableHead>
                            <TableHead>Tes</TableHead>
                            <TableHead>PTS</TableHead>
                            <TableHead>PAS</TableHead>
                            <TableHead>Kehadiran</TableHead>
                            <TableHead>Eskul</TableHead>
                            <TableHead>OSIS</TableHead>
                            <TableHead className="font-bold text-primary">Nilai Akhir</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rekapData.map(row => (
                            <TableRow key={row.id_siswa}>
                              <TableCell className="font-medium">{row.nama}</TableCell>
                              <TableCell>{row.nilai ? calculateAverage(row.nilai.tugas).toFixed(1) : '-'}</TableCell>
                              <TableCell>{row.nilai?.tes?.toFixed(1) || '-'}</TableCell>
                              <TableCell>{row.nilai?.pts?.toFixed(1) || '-'}</TableCell>
                              <TableCell>{row.nilai?.pas?.toFixed(1) || '-'}</TableCell>
                              <TableCell>{row.nilai?.kehadiran?.toFixed(1) || '-'}%</TableCell>
                              <TableCell>{row.nilai?.eskul?.toFixed(1) || '-'}</TableCell>
                              <TableCell>{row.nilai?.osis?.toFixed(1) || '-'}</TableCell>
                              <TableCell className="font-semibold text-primary">{row.nilai?.nilai_akhir?.toFixed(1) || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
            </Card>
        </div>
    );
}
