"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from "next/link";
import * as XLSX from 'xlsx';
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
import { ArrowLeft, Save, Loader2, Info, Filter, Trash2, Download, FileUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { getStudents, getGradesForTeacherDisplay, getActiveAcademicYears, getWeights, addOrUpdateGrade, addActivityLog, deleteGradeById, getKkmSetting, getMataPelajaranMaster } from '@/lib/firestoreService';
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

const gradeInputSchema = z.object({
  tugas: z.string().optional(),
  tes: z.coerce.number().min(0).max(100).optional(),
  pts: z.coerce.number().min(0).max(100).optional(),
  pas: z.coerce.number().min(0).max(100).optional(),
  kehadiran: z.coerce.number().min(0).max(100).optional(),
  eskul: z.coerce.number().min(0).max(100).optional(),
  osis: z.coerce.number().min(0).max(100).optional(),
});

const studentGradeSchema = z.object({
  id_siswa: z.string(),
  gradeId: z.string().optional(),
  namaSiswa: z.string(),
  grades: gradeInputSchema,
});

const formSchema = z.object({
  students: z.array(studentGradeSchema),
});

type StudentGradeFormData = z.infer<typeof studentGradeSchema>;
type FullFormData = z.infer<typeof formSchema>;

interface StudentImportData {
  "NIS": string;
  "Tugas"?: string;
  "Tes"?: number;
  "PTS"?: number;
  "PAS"?: number;
  "Kehadiran"?: number;
  "Eskul"?: number;
  "OSIS"?: number;
}

export default function InputNilaiPage() {
    const { toast } = useToast();
    const { userProfile } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [allStudents, setAllStudents] = useState<Siswa[]>([]);
    const [activeYears, setActiveYears] = useState<string[]>([]);
    const [weights, setWeights] = useState<Bobot | null>(null);
    const [existingGrades, setExistingGrades] = useState<Nilai[]>([]);
    const [kkm, setKkm] = useState<number | null>(null);
    const [masterMapel, setMasterMapel] = useState<string[]>([]);
    
    const [isLoadingPrerequisites, setIsLoadingPrerequisites] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    
    const [gradeToDelete, setGradeToDelete] = useState<StudentGradeFormData | null>(null);

    const [selectedYear, setSelectedYear] = useState(getCurrentAcademicYear());
    const [selectedSemester, setSelectedSemester] = useState<number>(1);
    const [selectedMapel, setSelectedMapel] = useState<string>("");
    const [selectedClass, setSelectedClass] = useState<string>("");

    const form = useForm<FullFormData>({
        resolver: zodResolver(formSchema),
        defaultValues: { students: [] },
    });
    
    const { fields, replace, setValue } = useFieldArray({ control: form.control, name: "students" });

    const fetchPrerequisites = useCallback(async () => {
      if (!userProfile) return;
      setIsLoadingPrerequisites(true);
      try {
        const [fetchedStudents, fetchedYears, fetchedWeights, fetchedMasterMapelList] = await Promise.all([ 
            getStudents(), 
            getActiveAcademicYears(), 
            getWeights(),
            getMataPelajaranMaster()
        ]);
        setAllStudents(fetchedStudents || []);
        setActiveYears(fetchedYears.length > 0 ? fetchedYears : [getCurrentAcademicYear()]);
        setWeights(fetchedWeights);
        setMasterMapel(fetchedMasterMapelList.map(m => m.namaMapel));
        
        const uniqueClasses = [...new Set((fetchedStudents || []).map(s => s.kelas).filter(Boolean))].sort();
        if (uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0]);

      } catch (err) {
        toast({ variant: "destructive", title: "Gagal memuat data awal", description: "Tidak bisa memuat daftar siswa atau pengaturan." });
      } finally {
        setIsLoadingPrerequisites(false);
      }
    }, [userProfile, toast, selectedClass]);

    useEffect(() => { fetchPrerequisites(); }, [fetchPrerequisites]);
    
    const validAssignedMapel = useMemo(() => {
        if (!userProfile?.assignedMapel || masterMapel.length === 0) {
            return [];
        }
        // Filter the teacher's assigned subjects against the master list
        return userProfile.assignedMapel.filter(mapel => masterMapel.includes(mapel));
    }, [userProfile?.assignedMapel, masterMapel]);

    useEffect(() => {
        // Effect to automatically select the first valid mapel
        if (validAssignedMapel.length > 0) {
            // If no mapel is selected yet, or the current one is no longer valid, select the first valid one.
            if (!selectedMapel || !validAssignedMapel.includes(selectedMapel)) {
                setSelectedMapel(validAssignedMapel[0]);
            }
        } else {
            // If the teacher has no valid assigned mapel, clear the selection
            setSelectedMapel("");
        }
    }, [validAssignedMapel, selectedMapel]);


    const fetchDataForTable = useCallback(async () => {
        if (!userProfile || !selectedMapel || !selectedClass || !selectedYear || !selectedSemester) return;
        setIsLoadingData(true);
        setKkm(null);
        try {
            const [fetchedGrades, kkmSetting] = await Promise.all([
                getGradesForTeacherDisplay(userProfile.uid, [selectedMapel], selectedYear, selectedSemester),
                getKkmSetting(selectedMapel, selectedYear)
            ]);
            setExistingGrades(fetchedGrades.filter(g => allStudents.find(s => s.id_siswa === g.id_siswa)?.kelas === selectedClass));
            setKkm(kkmSetting?.kkmValue ?? null);
        } catch (err) {
            toast({ variant: "destructive", title: "Gagal Memuat Nilai", description: "Tidak bisa memuat nilai yang sudah ada atau KKM." });
            setExistingGrades([]);
        } finally {
            setIsLoadingData(false);
        }
    }, [userProfile, selectedMapel, selectedClass, selectedYear, selectedSemester, toast, allStudents]);
    
    useEffect(() => { if (selectedClass && selectedMapel) fetchDataForTable(); }, [fetchDataForTable]);
    
    const studentsInClass = useMemo(() => {
        return allStudents
            .filter(s => s.kelas === selectedClass)
            .sort((a, b) => a.nama.localeCompare(b.nama));
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
                tes: grade?.tes ?? undefined,
                pts: grade?.pts ?? undefined,
                pas: grade?.pas ?? undefined,
                kehadiran: grade?.kehadiran ?? undefined,
                eskul: grade?.eskul ?? undefined,
                osis: grade?.osis ?? undefined,
            }
        };
      });
      replace(studentData);
    }, [studentsInClass, existingGrades, replace]);
    
    const onSubmit = async (data: FullFormData) => {
        if (!userProfile || !weights) { toast({ variant: "destructive", title: "Data tidak lengkap untuk menyimpan." }); return; }
        setIsSaving(true);
        const savePromises = data.students.map(studentData => {
            const tugasAsNumbers = String(studentData.grades.tugas || '').split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
            const nilaiPartial: Omit<Nilai, 'id' | 'createdAt' | 'updatedAt' | 'nilai_akhir' | 'teacherUid'> = { id_siswa: studentData.id_siswa, mapel: selectedMapel, semester: selectedSemester, tahun_ajaran: selectedYear, tugas: tugasAsNumbers, tes: studentData.grades.tes, pts: studentData.grades.pts, pas: studentData.grades.pas, kehadiran: studentData.grades.kehadiran, eskul: studentData.grades.eskul, osis: studentData.grades.osis };
            const finalGrade = calculateFinalGrade(nilaiPartial as Nilai, weights);
            const payload: Omit<Nilai, 'id'> = { ...nilaiPartial, nilai_akhir: finalGrade, teacherUid: userProfile.uid };
            return addOrUpdateGrade(payload, userProfile.uid, studentData.gradeId);
        });
        try {
            await Promise.all(savePromises);
            await addActivityLog(`Nilai Massal Disimpan`, `Nilai ${selectedMapel} untuk kelas ${selectedClass} disimpan oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName!);
            toast({ title: "Sukses", description: `Semua nilai untuk kelas ${selectedClass} berhasil disimpan.` });
            fetchDataForTable();
        } catch (err: any) { toast({ variant: "destructive", title: "Gagal menyimpan beberapa nilai", description: err.message }); } finally { setIsSaving(false); }
    };
    
    const handleDeleteClick = (student: StudentGradeFormData) => {
        if (!student.gradeId) { toast({ variant: "default", title: "Tidak ada data", description: "Tidak ada data nilai yang tersimpan untuk siswa ini." }); return; }
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
        } catch (err: any) { toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message }); } finally { setIsDeleting(null); setGradeToDelete(null); }
    };

    const uniqueClasses = useMemo(() => [...new Set(allStudents.map(s => s.kelas).filter(Boolean))].sort(), [allStudents]);
    
    const handleDownloadTemplate = () => {
        const dataForSheet = studentsInClass.map(s => ({ "Nama Siswa": s.nama, "NIS": s.nis, "Tugas": "", "Tes": "", "PTS": "", "PAS": "", "Kehadiran": "", "Eskul": "", "OSIS": "" }));
        const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Template ${selectedClass}`);
        XLSX.writeFile(workbook, `template_nilai_${selectedClass}_${selectedMapel}.xlsx`);
    };

    const handleExportData = () => {
        const dataForSheet = form.getValues().students.map(student => {
            const savedGrade = existingGrades.find(g => g.id_siswa === student.id_siswa);
            return {
                "Nama Siswa": student.namaSiswa,
                "NIS": allStudents.find(s => s.id_siswa === student.id_siswa)?.nis || "N/A",
                "Tugas": student.grades.tugas || '',
                "Tes": student.grades.tes ?? '',
                "PTS": student.grades.pts ?? '',
                "PAS": student.grades.pas ?? '',
                "Kehadiran": student.grades.kehadiran ?? '',
                "Eskul": student.grades.eskul ?? '',
                "OSIS": student.grades.osis ?? '',
                "Nilai Akhir": savedGrade?.nilai_akhir?.toFixed(1) || ''
            };
        });
        const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Data ${selectedClass}`);
        XLSX.writeFile(workbook, `data_nilai_${selectedClass}_${selectedMapel}.xlsx`);
    };

    const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const importedData = XLSX.utils.sheet_to_json<StudentImportData>(worksheet);

                let updatedCount = 0;
                
                // Create a map for quick lookup: NIS -> student index in form
                const nisToFormIndexMap = new Map<string, number>();
                form.getValues().students.forEach((student, index) => {
                    const studentData = allStudents.find(s => s.id_siswa === student.id_siswa);
                    if (studentData) {
                        nisToFormIndexMap.set(studentData.nis, index);
                    }
                });

                importedData.forEach(row => {
                    const studentNis = String(row["NIS"] || "").trim();
                    if (nisToFormIndexMap.has(studentNis)) {
                        const studentIndex = nisToFormIndexMap.get(studentNis)!;
                        setValue(`students.${studentIndex}.grades.tugas`, String(row.Tugas ?? ''));
                        setValue(`students.${studentIndex}.grades.tes`, row.Tes ?? undefined);
                        setValue(`students.${studentIndex}.grades.pts`, row.PTS ?? undefined);
                        setValue(`students.${studentIndex}.grades.pas`, row.PAS ?? undefined);
                        setValue(`students.${studentIndex}.grades.kehadiran`, row.Kehadiran ?? undefined);
                        setValue(`students.${studentIndex}.grades.eskul`, row.Eskul ?? undefined);
                        setValue(`students.${studentIndex}.grades.osis`, row.OSIS ?? undefined);
                        updatedCount++;
                    }
                });
                toast({ title: "Impor Selesai", description: `${updatedCount} data siswa berhasil diperbarui di formulir.` });
            } catch (error: any) {
                console.error("Import error:", error);
                toast({ variant: "destructive", title: "Gagal Impor", description: `Terjadi kesalahan saat memproses file: ${error.message}` });
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4"><Link href="/protected/guru"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link><div><h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Input &amp; Edit Nilai</h1><p className="text-muted-foreground">Pilih filter untuk menampilkan siswa dan mulai input nilai.</p></div></div>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5 text-primary"/> Filter Data Siswa</CardTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                        <div><Label htmlFor="year-select">Tahun Ajaran</Label><Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger id="year-select"><SelectValue /></SelectTrigger><SelectContent>{activeYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label htmlFor="semester-select">Semester</Label><Select value={String(selectedSemester)} onValueChange={v => setSelectedSemester(Number(v))}><SelectTrigger id="semester-select"><SelectValue /></SelectTrigger><SelectContent>{SEMESTERS.map(s => <SelectItem key={s.value} value={String(s.value)}>{s.label}</SelectItem>)}</SelectContent></Select></div>
                        <div>
                            <Label htmlFor="mapel-select">Mata Pelajaran</Label>
                            <Select value={selectedMapel} onValueChange={setSelectedMapel} disabled={validAssignedMapel.length === 0}>
                                <SelectTrigger id="mapel-select">
                                    <SelectValue placeholder="Pilih mapel..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {validAssignedMapel.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div><Label htmlFor="class-select">Kelas</Label><Select value={selectedClass} onValueChange={setSelectedClass} disabled={uniqueClasses.length === 0}><SelectTrigger id="class-select"><SelectValue placeholder="Pilih kelas..." /></SelectTrigger><SelectContent>{uniqueClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoadingPrerequisites ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
                    : !selectedMapel || !selectedClass ? <Alert variant="default"><Info className="h-4 w-4" /><AlertTitle>Informasi</AlertTitle><AlertDescription>Silakan pilih semua filter di atas untuk menampilkan tabel input nilai.</AlertDescription></Alert>
                    : studentsInClass.length === 0 ? <Alert variant="default"><Info className="h-4 w-4" /><AlertTitle>Tidak Ada Siswa</AlertTitle><AlertDescription>Tidak ada siswa yang terdaftar di kelas yang Anda pilih.</AlertDescription></Alert>
                    : (
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmit)}>
                            {isLoadingData ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div> : (
                            <>
                            <div className="flex flex-wrap gap-2 mb-4">
                                <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate}><Download className="mr-2 h-4 w-4"/>Unduh Template</Button>
                                <Button type="button" variant="outline" size="sm" onClick={handleExportData}><Download className="mr-2 h-4 w-4"/>Ekspor Nilai</Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isImporting}><FileUp className="mr-2 h-4 w-4"/>Impor Nilai {isImporting && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}</Button>
                                <Input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleImportData} />
                            </div>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="min-w-[200px]">Nama Siswa</TableHead>
                                    <TableHead>Tugas (koma)</TableHead><TableHead>Tes</TableHead><TableHead>PTS</TableHead><TableHead>PAS</TableHead><TableHead>Kehadiran (%)</TableHead><TableHead>Eskul</TableHead><TableHead>OSIS</TableHead>
                                    <TableHead className="text-center font-semibold">Nilai Akhir</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                {fields.map((studentField, index) => {
                                  const savedGrade = existingGrades.find(g => g.id_siswa === studentField.id_siswa);
                                  const avgTugas = savedGrade ? calculateAverage(savedGrade.tugas || []).toFixed(1) : '0.0';
                                  const nilaiAkhir = savedGrade?.nilai_akhir;
                                  const isTuntas = kkm !== null && nilaiAkhir !== undefined && nilaiAkhir >= kkm;
                                  return (
                                    <TableRow key={studentField.id} className="hover:bg-muted/30">
                                      <TableCell className="font-medium"><p>{studentField.namaSiswa}</p><p className="text-xs text-muted-foreground">Tugas Avg: <span className="font-semibold">{avgTugas}</span></p></TableCell>
                                      <TableCell><Input {...form.register(`students.${index}.grades.tugas`)} placeholder="80,90,75" className="w-28 text-sm"/></TableCell>
                                      <TableCell><Input type="number" {...form.register(`students.${index}.grades.tes`)} className="w-20 text-sm"/></TableCell>
                                      <TableCell><Input type="number" {...form.register(`students.${index}.grades.pts`)} className="w-20 text-sm"/></TableCell>
                                      <TableCell><Input type="number" {...form.register(`students.${index}.grades.pas`)} className="w-20 text-sm"/></TableCell>
                                      <TableCell><Input type="number" {...form.register(`students.${index}.grades.kehadiran`)} className="w-20 text-sm"/></TableCell>
                                      <TableCell><Input type="number" {...form.register(`students.${index}.grades.eskul`)} className="w-20 text-sm"/></TableCell>
                                      <TableCell><Input type="number" {...form.register(`students.${index}.grades.osis`)} className="w-20 text-sm"/></TableCell>
                                      <TableCell className="text-center font-bold text-primary">{nilaiAkhir?.toFixed(1) || '-'}</TableCell>
                                      <TableCell className="text-center">{nilaiAkhir !== undefined ? (<Badge variant={isTuntas ? "default" : "destructive"} className={isTuntas ? "bg-green-600 hover:bg-green-700" : ""}>{isTuntas ? "Tuntas" : "Tidak Tuntas"}</Badge>) : (<Badge variant="secondary">N/A</Badge>)}</TableCell>
                                      <TableCell className="text-right"><Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteClick(form.getValues().students[index])} disabled={!studentField.gradeId || !!isDeleting}>{isDeleting === studentField.gradeId ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}</Button></TableCell>
                                    </TableRow>
                                  );
                                })}
                                </TableBody>
                              </Table>
                            </div>
                            </>
                            )}
                            <CardFooter className="mt-6 px-0 justify-end">
                                <Button type="submit" disabled={isSaving || isLoadingData}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Simpan Semua Perubahan</Button>
                            </CardFooter>
                          </form>
                        </Form>
                    )}
                </CardContent>
            </Card>

            {gradeToDelete && (<AlertDialog open={!!gradeToDelete} onOpenChange={() => setGradeToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Konfirmasi Hapus Nilai</AlertDialogTitle><AlertDialogDescription>Anda yakin ingin menghapus semua data nilai untuk siswa <span className="font-semibold">{gradeToDelete.namaSiswa}</span> pada mata pelajaran ini? Tindakan ini tidak dapat diurungkan.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setGradeToDelete(null)} disabled={!!isDeleting}>Batal</AlertDialogCancel><AlertDialogAction onClick={handleActualDelete} className="bg-destructive hover:bg-destructive/90" disabled={!!isDeleting}>{isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Ya, Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
        </div>
    );
}
