
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, AlertCircle, Edit3, Filter, Info } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { getStudents, getGradesForTeacherDisplay, getActiveAcademicYears, getWeights, addOrUpdateGrade } from '@/lib/firestoreService';
import type { Siswa, Nilai, Bobot } from '@/types';
import { calculateFinalGrade, SEMESTERS, getCurrentAcademicYear } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';


const gradeInputSchema = z.object({
  tugas: z.array(z.coerce.number().min(0).max(100)).optional(),
  tes: z.coerce.number().min(0).max(100).optional(),
  pts: z.coerce.number().min(0).max(100).optional(),
  pas: z.coerce.number().min(0).max(100).optional(),
  kehadiran: z.coerce.number().min(0).max(100).optional(),
  eskul: z.coerce.number().min(0).max(100).optional(),
  osis: z.coerce.number().min(0).max(100).optional(),
});

const studentGradesSchema = z.object({
  id_siswa: z.string(),
  grades: gradeInputSchema,
});

const formSchema = z.object({
  students: z.array(studentGradesSchema),
});

type StudentGradeData = z.infer<typeof studentGradesSchema>;

export default function InputNilaiPage() {
    const { toast } = useToast();
    const { userProfile } = useAuth();

    const [students, setStudents] = useState<Siswa[]>([]);
    const [activeYears, setActiveYears] = useState<string[]>([]);
    const [weights, setWeights] = useState<Bobot | null>(null);
    const [existingGrades, setExistingGrades] = useState<Nilai[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});

    // Filter states
    const [selectedYear, setSelectedYear] = useState(getCurrentAcademicYear());
    const [selectedSemester, setSelectedSemester] = useState<number>(1);
    const [selectedMapel, setSelectedMapel] = useState<string>("");
    const [selectedClass, setSelectedClass] = useState<string>("");

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { students: [] },
    });
    
    const { fields, replace } = useFieldArray({ control: form.control, name: "students" });

    const fetchPrerequisites = useCallback(async () => {
      if (!userProfile) return;
      setIsLoading(true);
      try {
        const [fetchedStudents, fetchedYears, fetchedWeights] = await Promise.all([
          getStudents(),
          getActiveAcademicYears(),
          getWeights(),
        ]);
        setStudents(fetchedStudents);
        setActiveYears(fetchedYears);
        setWeights(fetchedWeights);
        
        if (userProfile.assignedMapel && userProfile.assignedMapel.length > 0) {
            setSelectedMapel(userProfile.assignedMapel[0]);
        }
        if (fetchedStudents.length > 0) {
            const uniqueClasses = [...new Set(fetchedStudents.map(s => s.kelas))].sort();
            if (uniqueClasses.length > 0) {
                setSelectedClass(uniqueClasses[0]);
            }
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Gagal memuat data awal", description: "Tidak bisa memuat daftar siswa atau pengaturan." });
      } finally {
        setIsLoading(false);
      }
    }, [userProfile, toast]);

    useEffect(() => {
        fetchPrerequisites();
    }, [fetchPrerequisites]);

    const fetchDataForTable = useCallback(async () => {
        if (!userProfile || !selectedMapel || !selectedClass || !selectedYear || !selectedSemester) return;
        setIsLoading(true);
        try {
            const fetchedGrades = await getGradesForTeacherDisplay(userProfile.uid, [selectedMapel], selectedYear, selectedSemester);
            setExistingGrades(fetchedGrades);
        } catch (err) {
            toast({ variant: "destructive", title: "Gagal Memuat Nilai", description: "Tidak bisa memuat nilai yang sudah ada." });
        } finally {
            setIsLoading(false);
        }
    }, [userProfile, selectedMapel, selectedClass, selectedYear, selectedSemester, toast]);
    
    useEffect(() => {
        fetchDataForTable();
    }, [fetchDataForTable]);
    
    const studentsInClass = useMemo(() => {
        return students.filter(s => s.kelas === selectedClass);
    }, [students, selectedClass]);
    
    useEffect(() => {
      const studentData = studentsInClass.map(student => {
        const grade = existingGrades.find(g => g.id_siswa === student.id_siswa);
        return {
          id_siswa: student.id_siswa,
          grades: {
            tugas: grade?.tugas || [],
            tes: grade?.tes,
            pts: grade?.pts,
            pas: grade?.pas,
            kehadiran: grade?.kehadiran,
            eskul: grade?.eskul,
            osis: grade?.osis,
          }
        };
      });
      replace(studentData);
    }, [studentsInClass, existingGrades, replace]);
    
    const handleSave = async (studentData: StudentGradeData) => {
        if (!userProfile || !weights) return toast({ variant: "destructive", title: "Data tidak lengkap" });
        setIsSaving(prev => ({ ...prev, [studentData.id_siswa]: true }));
        try {
            const nilaiPartial: Omit<Nilai, 'id' | 'createdAt' | 'updatedAt'| 'nilai_akhir' | 'teacherUid'> = {
                id_siswa: studentData.id_siswa,
                mapel: selectedMapel,
                semester: selectedSemester,
                tahun_ajaran: selectedYear,
                ...studentData.grades,
                tugas: studentData.grades.tugas || [],
            };
            const finalGrade = calculateFinalGrade(nilaiPartial as Nilai, weights);
            
            const payload: Omit<Nilai, 'id'> = {
                ...nilaiPartial,
                nilai_akhir: finalGrade,
                teacherUid: userProfile.uid,
            };

            await addOrUpdateGrade(payload, userProfile.uid);
            toast({ title: "Sukses", description: `Nilai untuk siswa berhasil disimpan.` });
            fetchDataForTable(); // Refresh data
        } catch (err: any) {
            toast({ variant: "destructive", title: "Gagal menyimpan", description: err.message });
        } finally {
            setIsSaving(prev => ({ ...prev, [studentData.id_siswa]: false }));
        }
    };
    
    const uniqueClasses = useMemo(() => [...new Set(students.map(s => s.kelas).filter(Boolean))].sort(), [students]);

    return (
        <div className="space-y-6">
             <div className="flex items-center gap-4">
                <Link href="/protected/guru"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
                <div><h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Input &amp; Edit Nilai</h1><p className="text-muted-foreground">Pilih filter untuk menampilkan siswa dan mulai input nilai.</p></div>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5 text-primary"/> Filter Data Siswa</CardTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                        <FormItem><FormLabel>Tahun Ajaran</FormLabel><Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{activeYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select></FormItem>
                        <FormItem><FormLabel>Semester</FormLabel><Select value={String(selectedSemester)} onValueChange={v => setSelectedSemester(Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SEMESTERS.map(s => <SelectItem key={s.value} value={String(s.value)}>{s.label}</SelectItem>)}</SelectContent></Select></FormItem>
                        <FormItem><FormLabel>Mata Pelajaran</FormLabel><Select value={selectedMapel} onValueChange={setSelectedMapel} disabled={!userProfile?.assignedMapel?.length}><SelectTrigger><SelectValue placeholder="Pilih mapel..."/></SelectTrigger><SelectContent>{userProfile?.assignedMapel?.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></FormItem>
                        <FormItem><FormLabel>Kelas</FormLabel><Select value={selectedClass} onValueChange={setSelectedClass} disabled={uniqueClasses.length === 0}><SelectTrigger><SelectValue placeholder="Pilih kelas..." /></SelectTrigger><SelectContent>{uniqueClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></FormItem>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-64 w-full" />
                    : !selectedMapel || !selectedClass ? (
                         <Alert variant="default"><Info className="h-4 w-4" /><AlertTitle>Informasi</AlertTitle><AlertDescription>Silakan pilih semua filter di atas untuk menampilkan tabel input nilai.</AlertDescription></Alert>
                    ) : studentsInClass.length === 0 ? (
                        <Alert variant="default"><Info className="h-4 w-4" /><AlertTitle>Tidak Ada Siswa</AlertTitle><AlertDescription>Tidak ada siswa yang terdaftar di kelas yang Anda pilih.</AlertDescription></Alert>
                    ) : (
                        <Form {...form}>
                          <form>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="min-w-[200px]">Nama Siswa</TableHead>
                                    <TableHead>Tugas (Avg)</TableHead>
                                    <TableHead>Tes</TableHead>
                                    <TableHead>PTS</TableHead>
                                    <TableHead>PAS</TableHead>
                                    <TableHead>Kehadiran</TableHead>
                                    <TableHead>Eskul</TableHead>
                                    <TableHead>OSIS</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                {fields.map((studentField, index) => {
                                  const studentInfo = studentsInClass.find(s => s.id_siswa === studentField.id_siswa);
                                  if (!studentInfo) return null;
                                  return (
                                    <TableRow key={studentField.id}>
                                      <TableCell className="font-medium">{studentInfo.nama}</TableCell>
                                      {/* Other fields will be implemented */}
                                      <TableCell><Input {...form.register(`students.${index}.grades.tugas`)} placeholder="Pisah dgn koma" className="w-28"/></TableCell>
                                      <TableCell><Input type="number" {...form.register(`students.${index}.grades.tes`)} className="w-20"/></TableCell>
                                      <TableCell><Input type="number" {...form.register(`students.${index}.grades.pts`)} className="w-20"/></TableCell>
                                      <TableCell><Input type="number" {...form.register(`students.${index}.grades.pas`)} className="w-20"/></TableCell>
                                      <TableCell><Input type="number" {...form.register(`students.${index}.grades.kehadiran`)} className="w-20"/></TableCell>
                                      <TableCell><Input type="number" {...form.register(`students.${index}.grades.eskul`)} className="w-20"/></TableCell>
                                      <TableCell><Input type="number" {...form.register(`students.${index}.grades.osis`)} className="w-20"/></TableCell>
                                      <TableCell className="text-right">
                                          <Button type="button" size="sm" onClick={() => handleSave(form.getValues().students[index])} disabled={isSaving[studentInfo.id_siswa]}>
                                              {isSaving[studentInfo.id_siswa] ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
                                          </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                                </TableBody>
                              </Table>
                            </div>
                          </form>
                        </Form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
