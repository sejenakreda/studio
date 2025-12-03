
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from "next/link";
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, AlertCircle, FileWarning, Filter, Download, Info, Check, ListFilter } from "lucide-react";
import { useAuth } from '@/context/AuthContext';
import { getStudents, getAllGrades, getActiveAcademicYears, getMataPelajaranMaster } from '@/lib/firestoreService';
import type { Siswa, Nilai } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SEMESTERS, getCurrentAcademicYear } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

type GradeType = 'tugas' | 'tes' | 'pts' | 'pas';

const GRADE_TYPES: { value: GradeType, label: string }[] = [
    { value: 'tugas', label: 'Tugas' },
    { value: 'tes', label: 'Tes' },
    { value: 'pts', label: 'PTS' },
    { value: 'pas', label: 'PAS' },
];

interface MissingGradeInfo {
    studentName: string;
    studentNis: string;
    studentClass: string;
    studentId: string;
    missingMapel: string;
    recordedValue: string; // To show '0' or 'N/A'
}

export default function RekapNilaiKosongPage() {
    const { toast } = useToast();
    const [allStudents, setAllStudents] = useState<Siswa[]>([]);
    const [allGrades, setAllGrades] = useState<Nilai[]>([]);
    const [activeYears, setActiveYears] = useState<string[]>([]);
    const [availableMapel, setAvailableMapel] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedYear, setSelectedYear] = useState(getCurrentAcademicYear());
    const [selectedSemester, setSelectedSemester] = useState<number>(1);
    const [selectedMapel, setSelectedMapel] = useState<string[]>([]);
    const [selectedGradeType, setSelectedGradeType] = useState<GradeType>('pas');
    const [selectedClass, setSelectedClass] = useState<string>("all");
    const [uniqueClasses, setUniqueClasses] = useState<string[]>([]);


    const fetchPrerequisites = useCallback(async () => {
        setIsLoading(true);
        try {
            const [students, grades, years, mapelList] = await Promise.all([
                getStudents(),
                getAllGrades(),
                getActiveAcademicYears(),
                getMataPelajaranMaster()
            ]);
            setAllStudents(students);
            setAllGrades(grades);
            setActiveYears(years);
            const sortedMapel = mapelList.map(m => m.namaMapel).sort();
            setAvailableMapel(sortedMapel);
            
            const klasses = [...new Set(students.map(s => s.kelas).filter(Boolean))].sort();
            setUniqueClasses(klasses);
            
        } catch (err) {
            toast({ variant: "destructive", title: "Gagal memuat data awal." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchPrerequisites();
    }, [fetchPrerequisites]);

    const studentsWithMissingGrades = useMemo<MissingGradeInfo[]>(() => {
        if (isLoading || selectedMapel.length === 0) return [];

        const gradesMap = new Map<string, Nilai>();
        allGrades
            .filter(g => g.tahun_ajaran === selectedYear && g.semester === selectedSemester)
            .forEach(g => {
                const key = `${g.id_siswa}-${g.mapel}`;
                gradesMap.set(key, g);
            });
            
        const missingGradesList: MissingGradeInfo[] = [];

        const studentsToCheck = selectedClass === "all"
            ? allStudents
            : allStudents.filter(s => s.kelas === selectedClass);
        
        const mapelToCheck = selectedMapel;

        studentsToCheck.forEach(student => {
            mapelToCheck.forEach(mapel => {
                const gradeKey = `${student.id_siswa}-${mapel}`;
                const gradeRecord = gradesMap.get(gradeKey);

                let isMissing = false;
                let recordedValueStr = "N/A";

                if (!gradeRecord) {
                    isMissing = true;
                } else {
                    const gradeValue = gradeRecord[selectedGradeType];
                    if (selectedGradeType === 'tugas') {
                        isMissing = !gradeValue || (Array.isArray(gradeValue) && gradeValue.length === 0);
                        if(isMissing) recordedValueStr = "Kosong";
                    } else {
                        isMissing = gradeValue === null || gradeValue === undefined || gradeValue === 0;
                        if(isMissing && gradeValue === 0) recordedValueStr = "0";
                    }
                }

                if (isMissing) {
                    missingGradesList.push({
                        studentName: student.nama,
                        studentNis: student.nis,
                        studentClass: student.kelas,
                        studentId: student.id_siswa,
                        missingMapel: mapel,
                        recordedValue: recordedValueStr,
                    });
                }
            });
        });
        
        return missingGradesList.sort((a, b) => {
            if (a.studentClass < b.studentClass) return -1;
            if (a.studentClass > b.studentClass) return 1;
            if (a.studentName < b.studentName) return -1;
            if (a.studentName > b.studentName) return 1;
            return a.missingMapel.localeCompare(b.missingMapel);
        });

    }, [allStudents, allGrades, selectedYear, selectedSemester, selectedMapel, selectedGradeType, selectedClass, isLoading]);

    const handleDownloadExcel = () => {
        if (studentsWithMissingGrades.length === 0) {
            toast({ variant: "default", title: "Tidak ada data untuk diunduh." });
            return;
        }
        const dataForExcel = studentsWithMissingGrades.map(item => ({
            'Nama Siswa': item.studentName,
            'NIS': item.studentNis,
            'Kelas': item.studentClass,
            'Mata Pelajaran': item.missingMapel,
            'Nilai Tercatat': item.recordedValue,
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4">
                        <Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{activeYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select>
                        <Select value={String(selectedSemester)} onValueChange={v => setSelectedSemester(Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SEMESTERS.map(s => <SelectItem key={s.value} value={String(s.value)}>{s.label}</SelectItem>)}</SelectContent></Select>
                        
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Kelas</SelectItem>
                                {uniqueClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between font-normal"
                                >
                                {selectedMapel.length > 0
                                    ? `${selectedMapel.length} mapel dipilih`
                                    : "Pilih mapel..."}
                                <ListFilter className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                <CommandInput placeholder="Cari mapel..." />
                                <CommandList>
                                    <CommandEmpty>Mapel tidak ditemukan.</CommandEmpty>
                                    <CommandGroup>
                                    <ScrollArea className="h-48">
                                        <CommandItem
                                            onSelect={() => {
                                                if (selectedMapel.length === availableMapel.length) {
                                                    setSelectedMapel([]);
                                                } else {
                                                    setSelectedMapel(availableMapel);
                                                }
                                            }}
                                            className="cursor-pointer"
                                            >
                                            <Checkbox
                                                className="mr-2"
                                                checked={selectedMapel.length > 0 && selectedMapel.length === availableMapel.length}
                                                indeterminate={selectedMapel.length > 0 && selectedMapel.length < availableMapel.length ? "true" : undefined}
                                            />
                                            (Pilih Semua)
                                        </CommandItem>
                                        {availableMapel.map((mapel) => (
                                        <CommandItem
                                            key={mapel}
                                            onSelect={() => {
                                                const isSelected = selectedMapel.includes(mapel);
                                                if (isSelected) {
                                                    setSelectedMapel(selectedMapel.filter(m => m !== mapel));
                                                } else {
                                                    setSelectedMapel([...selectedMapel, mapel]);
                                                }
                                            }}
                                            className="cursor-pointer"
                                        >
                                            <Checkbox
                                                className="mr-2"
                                                checked={selectedMapel.includes(mapel)}
                                            />
                                            {mapel}
                                        </CommandItem>
                                        ))}
                                    </ScrollArea>
                                    </CommandGroup>
                                </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

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
                    : selectedMapel.length === 0 ? <Alert><Info className="h-4 w-4" /><AlertTitle>Pilih Filter</AlertTitle><AlertDescription>Silakan pilih satu atau beberapa mata pelajaran untuk memulai pencarian.</AlertDescription></Alert>
                    : studentsWithMissingGrades.length === 0 ? <Alert><Info className="h-4 w-4" /><AlertTitle>Data Lengkap</AlertTitle><AlertDescription>Tidak ditemukan siswa dengan nilai kosong untuk kriteria yang Anda pilih.</AlertDescription></Alert>
                    : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nama Siswa</TableHead>
                                        <TableHead>NIS</TableHead>
                                        <TableHead>Kelas</TableHead>
                                        <TableHead>Mapel Kosong</TableHead>
                                        <TableHead>Nilai Tercatat</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {studentsWithMissingGrades.map(item => (
                                        <TableRow key={`${item.studentId}-${item.missingMapel}`}>
                                            <TableCell className="font-medium">{item.studentName}</TableCell>
                                            <TableCell>{item.studentNis}</TableCell>
                                            <TableCell>{item.studentClass}</TableCell>
                                            <TableCell className="text-destructive font-semibold">{item.missingMapel}</TableCell>
                                            <TableCell className="font-mono text-center">{item.recordedValue}</TableCell>
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
