
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from "next/link";
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, AlertCircle, FileWarning, Filter, Download, Info } from "lucide-react";
import { useAuth } from '@/context/AuthContext';
import { getStudents, getAllGrades, getActiveAcademicYears, getUniqueMapelNamesFromGrades } from '@/lib/firestoreService';
import type { Siswa, Nilai } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SEMESTERS, getCurrentAcademicYear } from '@/lib/utils';

type GradeType = 'tugas' | 'tes' | 'pts' | 'pas';

const GRADE_TYPES: { value: GradeType, label: string }[] = [
    { value: 'tugas', label: 'Tugas' },
    { value: 'tes', label: 'Tes' },
    { value: 'pts', label: 'PTS' },
    { value: 'pas', label: 'PAS' },
];

export default function RekapNilaiKosongPage() {
    const { toast } = useToast();
    const [allStudents, setAllStudents] = useState<Siswa[]>([]);
    const [allGrades, setAllGrades] = useState<Nilai[]>([]);
    const [activeYears, setActiveYears] = useState<string[]>([]);
    const [availableMapel, setAvailableMapel] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedYear, setSelectedYear] = useState(getCurrentAcademicYear());
    const [selectedSemester, setSelectedSemester] = useState<number>(1);
    const [selectedMapel, setSelectedMapel] = useState<string>("");
    const [selectedGradeType, setSelectedGradeType] = useState<GradeType>('tugas');

    const fetchPrerequisites = useCallback(async () => {
        setIsLoading(true);
        try {
            const [students, grades, years, mapelList] = await Promise.all([
                getStudents(),
                getAllGrades(),
                getActiveAcademicYears(),
                getUniqueMapelNamesFromGrades()
            ]);
            setAllStudents(students);
            setAllGrades(grades);
            setActiveYears(years);
            setAvailableMapel(mapelList);
            if (mapelList.length > 0) {
                setSelectedMapel(mapelList[0]);
            }
        } catch (err) {
            toast({ variant: "destructive", title: "Gagal memuat data awal." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchPrerequisites();
    }, [fetchPrerequisites]);

    const studentsWithMissingGrades = useMemo(() => {
        if (!selectedMapel || isLoading) return [];

        const relevantGrades = allGrades.filter(g =>
            g.tahun_ajaran === selectedYear &&
            g.semester === selectedSemester &&
            g.mapel === selectedMapel
        );

        const gradesMap = new Map(relevantGrades.map(g => [g.id_siswa, g]));

        return allStudents.filter(student => {
            const gradeRecord = gradesMap.get(student.id_siswa);

            if (!gradeRecord) {
                return true; // No grade record at all for this student, mapel, semester, year.
            }
            
            const gradeValue = gradeRecord[selectedGradeType];

            if (selectedGradeType === 'tugas') {
                return !gradeValue || (Array.isArray(gradeValue) && gradeValue.length === 0);
            } else {
                // For tes, pts, pas, check if it's null, undefined, or 0.
                // We check for falsy values, but specifically allow 0 if it's not the desired check.
                // A value of 0 might be a real grade, so we look for null/undefined.
                return gradeValue === null || gradeValue === undefined;
            }
        });
    }, [allStudents, allGrades, selectedYear, selectedSemester, selectedMapel, selectedGradeType, isLoading]);

    const handleDownloadExcel = () => {
        if (studentsWithMissingGrades.length === 0) {
            toast({ variant: "default", title: "Tidak ada data untuk diunduh." });
            return;
        }
        const dataForExcel = studentsWithMissingGrades.map(student => ({
            'Nama Siswa': student.nama,
            'NIS': student.nis,
            'Kelas': student.kelas,
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Nilai Kosong");
        const gradeTypeLabel = GRADE_TYPES.find(gt => gt.value === selectedGradeType)?.label || "Nilai";
        XLSX.writeFile(workbook, `rekap_nilai_${gradeTypeLabel}_kosong.xlsx`);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/protected/admin"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Rekap Nilai Kosong</h1>
                    <p className="text-muted-foreground">Temukan siswa yang belum memiliki nilai untuk kategori tertentu.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5 text-primary"/> Filter Data</CardTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                        <Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{activeYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select>
                        <Select value={String(selectedSemester)} onValueChange={v => setSelectedSemester(Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SEMESTERS.map(s => <SelectItem key={s.value} value={String(s.value)}>{s.label}</SelectItem>)}</SelectContent></Select>
                        <Select value={selectedMapel} onValueChange={setSelectedMapel} disabled={availableMapel.length === 0}><SelectTrigger><SelectValue placeholder="Pilih mapel..."/></SelectTrigger><SelectContent>{availableMapel.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
                        <Select value={selectedGradeType} onValueChange={(v: GradeType) => setSelectedGradeType(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GRADE_TYPES.map(gt => <SelectItem key={gt.value} value={gt.value}>{gt.label}</SelectItem>)}</SelectContent></Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-end mb-4">
                        <Button onClick={handleDownloadExcel} disabled={isLoading || studentsWithMissingGrades.length === 0}>
                            <Download className="mr-2 h-4 w-4" /> Unduh Hasil Excel
                        </Button>
                    </div>
                    {isLoading ? <Skeleton className="h-64 w-full" />
                    : !selectedMapel ? <Alert><Info className="h-4 w-4" /><AlertTitle>Pilih Filter</AlertTitle><AlertDescription>Silakan pilih mata pelajaran untuk memulai pencarian.</AlertDescription></Alert>
                    : studentsWithMissingGrades.length === 0 ? <Alert><Info className="h-4 w-4" /><AlertTitle>Data Lengkap</AlertTitle><AlertDescription>Tidak ditemukan siswa dengan nilai kosong untuk kriteria yang Anda pilih.</AlertDescription></Alert>
                    : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nama Siswa</TableHead>
                                        <TableHead>NIS</TableHead>
                                        <TableHead>Kelas</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {studentsWithMissingGrades.map(student => (
                                        <TableRow key={student.id_siswa}>
                                            <TableCell className="font-medium">{student.nama}</TableCell>
                                            <TableCell>{student.nis}</TableCell>
                                            <TableCell>{student.kelas}</TableCell>
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
