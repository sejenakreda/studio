
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, AlertCircle, Info, Filter, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { getStudents, getGradesForTeacherDisplay, getActiveAcademicYears, getWeights, addOrUpdateGrade, addActivityLog, deleteGradeById } from '@/lib/firestoreService';
import type { Siswa, Nilai, Bobot } from '@/types';
import { calculateFinalGrade, calculateAverage, SEMESTERS, getCurrentAcademicYear } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
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

// Schema untuk satu baris input nilai siswa
const gradeInputSchema = z.object({
  tugas: z.string().optional(), // Akan di-parse sebagai array number nanti
  tes: z.coerce.number().min(0).max(100).optional(),
  pts: z.coerce.number().min(0).max(100).optional(),
  pas: z.coerce.number().min(0).max(100).optional(),
  kehadiran: z.coerce.number().min(0).max(100).optional(),
  eskul: z.coerce.number().min(0).max(100).optional(),
  osis: z.coerce.number().min(0).max(100).optional(),
});

// Schema untuk data siswa tunggal di dalam form array
const studentGradeSchema = z.object({
  id_siswa: z.string(),
  gradeId: z.string().optional(), // ID dokumen nilai yang sudah ada
  namaSiswa: z.string(),
  grades: gradeInputSchema,
});

// Schema untuk seluruh form yang berisi array siswa
const formSchema = z.object({
  students: z.array(studentGradeSchema),
});

type StudentGradeFormData = z.infer<typeof studentGradeSchema>;
type FullFormData = z.infer<typeof formSchema>;

export default function InputNilaiPage() {
    const { toast } = useToast();
    const { userProfile } = useAuth();

    const [allStudents, setAllStudents] = useState<Siswa[]>([]);
    const [activeYears, setActiveYears] = useState<string[]>([]);
    const [weights, setWeights] = useState<Bobot | null>(null);
    const [existingGrades, setExistingGrades] = useState<Nilai[]>([]);
    
    const [isLoadingPrerequisites, setIsLoadingPrerequisites] = useState(true);
    const [isLoadingGrades, setIsLoadingGrades] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null); // Store gradeId being deleted

    const [gradeToDelete, setGradeToDelete] = useState<StudentGradeFormData | null>(null);

    // Filter states
    const [selectedYear, setSelectedYear] = useState(getCurrentAcademicYear());
    const [selectedSemester, setSelectedSemester] = useState<number>(1);
    const [selectedMapel, setSelectedMapel] = useState<string>("");
    const [selectedClass, setSelectedClass] = useState<string>("");

    const form = useForm<FullFormData>({
        resolver: zodResolver(formSchema),
        defaultValues: { students: [] },
    });
    
    const { fields, replace } = useFieldArray({ control: form.control, name: "students" });

    const fetchPrerequisites = useCallback(async () => {
      if (!userProfile) return;
      setIsLoadingPrerequisites(true);
      try {
        const [fetchedStudents, fetchedYears, fetchedWeights] = await Promise.all([
          getStudents(),
          getActiveAcademicYears(),
          getWeights(),
        ]);
        setAllStudents(fetchedStudents || []);
        setActiveYears(fetchedYears.length > 0 ? fetchedYears : [getCurrentAcademicYear()]);
        setWeights(fetchedWeights);
        
        if (userProfile.assignedMapel && userProfile.assignedMapel.length > 0 && !selectedMapel) {
            setSelectedMapel(userProfile.assignedMapel[0]);
        }

        const uniqueClasses = [...new Set((fetchedStudents || []).map(s => s.kelas).filter(Boolean))].sort();
        if (uniqueClasses.length > 0 && !selectedClass) {
            setSelectedClass(uniqueClasses[0]);
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Gagal memuat data awal", description: "Tidak bisa memuat daftar siswa atau pengaturan." });
      } finally {
        setIsLoadingPrerequisites(false);
      }
    }, [userProfile, toast, selectedMapel, selectedClass]);

    useEffect(() => {
        fetchPrerequisites();
    }, [fetchPrerequisites]);

    const fetchDataForTable = useCallback(async () => {
        if (!userProfile || !selectedMapel || !selectedClass || !selectedYear || !selectedSemester) return;
        setIsLoadingGrades(true);
        try {
            const fetchedGrades = await getGradesForTeacherDisplay(userProfile.uid, [selectedMapel], selectedYear, selectedSemester);
            setExistingGrades(fetchedGrades.filter(g => allStudents.find(s => s.id_siswa === g.id_siswa)?.kelas === selectedClass));
        } catch (err) {
            toast({ variant: "destructive", title: "Gagal Memuat Nilai", description: "Tidak bisa memuat nilai yang sudah ada." });
            setExistingGrades([]);
        } finally {
            setIsLoadingGrades(false);
        }
    }, [userProfile, selectedMapel, selectedClass, selectedYear, selectedSemester, toast, allStudents]);
    
    useEffect(() => {
        if (selectedClass && selectedMapel) {
            fetchDataForTable();
        }
    }, [fetchDataForTable, selectedClass, selectedMapel, selectedYear, selectedSemester]);
    
    const studentsInClass = useMemo(() => {
        return allStudents.filter(s => s.kelas === selectedClass);
    }, [allStudents, selectedClass]);
    
    useEffect(() => {
      const studentData: StudentGradeFormData[] = studentsInClass.map(student => {
        const grade = existingGrades.find(g => g.id_siswa === student.id_siswa);
        return {
          id_siswa: student.id_siswa,
          gradeId: grade?.id,
          namaSiswa: student.nama,
          grades: {
            tugas: grade?.tugas?.join(',') || '',
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
    
    const onSubmit = async (data: FullFormData) => {
        if (!userProfile || !weights) {
            toast({ variant: "destructive", title: "Data tidak lengkap untuk menyimpan." });
            return;
        }
        setIsSaving(true);
        
        const savePromises = data.students.map(studentData => {
            const tugasAsNumbers = String(studentData.grades.tugas || '').split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
            
            const nilaiPartial: Omit<Nilai, 'id' | 'createdAt' | 'updatedAt' | 'nilai_akhir' | 'teacherUid'> = {
                id_siswa: studentData.id_siswa,
                mapel: selectedMapel,
                semester: selectedSemester,
                tahun_ajaran: selectedYear,
                tugas: tugasAsNumbers,
                tes: studentData.grades.tes, pts: studentData.grades.pts, pas: studentData.grades.pas,
                kehadiran: studentData.grades.kehadiran, eskul: studentData.grades.eskul, osis: studentData.grades.osis,
            };
            const finalGrade = calculateFinalGrade(nilaiPartial as Nilai, weights);
            
            const payload: Omit<Nilai, 'id'> = { ...nilaiPartial, nilai_akhir: finalGrade, teacherUid: userProfile.uid };
            
            // Pass the existing gradeId to avoid query if we already have it
            return addOrUpdateGrade(payload, userProfile.uid, studentData.gradeId);
        });

        try {
            await Promise.all(savePromises);
            await addActivityLog(`Nilai Massal Disimpan`, `Nilai ${selectedMapel} untuk kelas ${selectedClass} disimpan oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName!);
            toast({ title: "Sukses", description: `Semua nilai untuk kelas ${selectedClass} berhasil disimpan.` });
            fetchDataForTable(); // Refresh data
        } catch (err: any) {
            toast({ variant: "destructive", title: "Gagal menyimpan beberapa nilai", description: err.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteClick = (student: StudentGradeFormData) => {
        if (!student.gradeId) {
            toast({ variant: "default", title: "Tidak ada data", description: "Tidak ada data nilai yang tersimpan untuk siswa ini." });
            return;
        }
        setGradeToDelete(student);
    };

    const handleActualDelete = async () => {
        if (!gradeToDelete || !gradeToDelete.gradeId || !userProfile) return;
        setIsDeleting(gradeToDelete.gradeId);
        try {
            await deleteGradeById(gradeToDelete.gradeId);
            await addActivityLog(`Nilai Dihapus`, `Nilai ${selectedMapel} untuk siswa ${gradeToDelete.namaSiswa} dihapus oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName!);
            toast({ title: "Sukses", description: `Nilai untuk ${gradeToDelete.namaSiswa} berhasil dihapus.` });
            fetchDataForTable();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message });
        } finally {
            setIsDeleting(null);
            setGradeToDelete(null);
        }
    };

    const uniqueClasses = useMemo(() => [...new Set(allStudents.map(s => s.kelas).filter(Boolean))].sort(), [allStudents]);

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
                        <div>
                            <Label htmlFor="year-select">Tahun Ajaran</Label>
                            <Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger id="year-select"><SelectValue /></SelectTrigger><SelectContent>{activeYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <Label htmlFor="semester-select">Semester</Label>
                            <Select value={String(selectedSemester)} onValueChange={v => setSelectedSemester(Number(v))}><SelectTrigger id="semester-select"><SelectValue /></SelectTrigger><SelectContent>{SEMESTERS.map(s => <SelectItem key={s.value} value={String(s.value)}>{s.label}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <Label htmlFor="mapel-select">Mata Pelajaran</Label>
                            <Select value={selectedMapel} onValueChange={setSelectedMapel} disabled={!userProfile?.assignedMapel?.length}><SelectTrigger id="mapel-select"><SelectValue placeholder="Pilih mapel..."/></SelectTrigger><SelectContent>{userProfile?.assignedMapel?.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <Label htmlFor="class-select">Kelas</Label>
                            <Select value={selectedClass} onValueChange={setSelectedClass} disabled={uniqueClasses.length === 0}><SelectTrigger id="class-select"><SelectValue placeholder="Pilih kelas..." /></SelectTrigger><SelectContent>{uniqueClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoadingPrerequisites || isLoadingGrades ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
                    : !selectedMapel || !selectedClass ? (
                         <Alert variant="default"><Info className="h-4 w-4" /><AlertTitle>Informasi</AlertTitle><AlertDescription>Silakan pilih semua filter di atas untuk menampilkan tabel input nilai.</AlertDescription></Alert>
                    ) : studentsInClass.length === 0 ? (
                        <Alert variant="default"><Info className="h-4 w-4" /><AlertTitle>Tidak Ada Siswa</AlertTitle><AlertDescription>Tidak ada siswa yang terdaftar di kelas yang Anda pilih.</AlertDescription></Alert>
                    ) : (
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmit)}>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="min-w-[200px]">Nama Siswa</TableHead>
                                    <TableHead>Tugas (koma)</TableHead>
                                    <TableHead>Tes</TableHead>
                                    <TableHead>PTS</TableHead>
                                    <TableHead>PAS</TableHead>
                                    <TableHead>Kehadiran (%)</TableHead>
                                    <TableHead>Eskul</TableHead>
                                    <TableHead>OSIS</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                {fields.map((studentField, index) => {
                                  const savedGrade = existingGrades.find(g => g.id_siswa === studentField.id_siswa);
                                  const avgTugas = savedGrade ? calculateAverage(savedGrade.tugas || []).toFixed(1) : '0.0';
                                  const nilaiAkhir = savedGrade ? savedGrade.nilai_akhir?.toFixed(1) : '-';

                                  return (
                                    <TableRow key={studentField.id} className="hover:bg-muted/30">
                                      <TableCell className="font-medium">
                                        <p>{studentField.namaSiswa}</p>
                                        <p className="text-xs text-muted-foreground">Nilai Akhir: <span className="font-semibold text-primary">{nilaiAkhir}</span> | Tugas Avg: <span className="font-semibold">{avgTugas}</span></p>
                                      </TableCell>
                                      <TableCell><Input {...form.register(`students.${index}.grades.tugas`)} placeholder="80,90,75" className="w-28 text-sm"/></TableCell>
                                      <TableCell><Input type="number" {...form.register(`students.${index}.grades.tes`)} className="w-20 text-sm"/></TableCell>
                                      <TableCell><Input type="number" {...form.register(`students.${index}.grades.pts`)} className="w-20 text-sm"/></TableCell>
                                      <TableCell><Input type="number" {...form.register(`students.${index}.grades.pas`)} className="w-20 text-sm"/></TableCell>
                                      <TableCell><Input type="number" {...form.register(`students.${index}.grades.kehadiran`)} className="w-20 text-sm"/></TableCell>
                                      <TableCell><Input type="number" {...form.register(`students.${index}.grades.eskul`)} className="w-20 text-sm"/></TableCell>
                                      <TableCell><Input type="number" {...form.register(`students.${index}.grades.osis`)} className="w-20 text-sm"/></TableCell>
                                      <TableCell className="text-right">
                                          <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteClick(form.getValues().students[index])} disabled={!studentField.gradeId || !!isDeleting}>
                                            {isDeleting === studentField.gradeId ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
                                          </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                                </TableBody>
                              </Table>
                            </div>
                             <CardFooter className="mt-6 px-0 justify-end">
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Simpan Semua Perubahan
                                </Button>
                            </CardFooter>
                          </form>
                        </Form>
                    )}
                </CardContent>
            </Card>

            {gradeToDelete && (
              <AlertDialog open={!!gradeToDelete} onOpenChange={() => setGradeToDelete(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Konfirmasi Hapus Nilai</AlertDialogTitle>
                    <AlertDialogDescription>
                      Anda yakin ingin menghapus semua data nilai untuk siswa <span className="font-semibold">{gradeToDelete.namaSiswa}</span> pada mata pelajaran ini? Tindakan ini tidak dapat diurungkan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setGradeToDelete(null)} disabled={!!isDeleting}>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleActualDelete} className="bg-destructive hover:bg-destructive/90" disabled={!!isDeleting}>
                      {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Ya, Hapus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
        </div>
    );
}


    