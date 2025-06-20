
"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription as FormDesc } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, UserPlus, Loader2, AlertCircle, Users, Edit, Trash2, Filter, ChevronLeft, ChevronRight, Download, FileUp } from "lucide-react";
import { addStudent, getStudents, deleteStudent, addActivityLog } from '@/lib/firestoreService';
import type { Siswa } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { useAuth } from '@/context/AuthContext';

const studentSchema = z.object({
  nama: z.string().min(3, "Nama minimal 3 karakter"),
  nis: z.string().min(5, "NIS minimal 5 karakter").regex(/^[0-9]+$/, "NIS hanya boleh berisi angka"),
  kelas: z.string().min(1, "Kelas tidak boleh kosong"),
  id_siswa: z.string().min(3, "ID Siswa minimal 3 karakter").regex(/^[a-zA-Z0-9_.-]+$/, "ID Siswa hanya boleh berisi huruf, angka, _, ., -"),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface StudentImportData {
  nama: string;
  nis: string;
  kelas: string;
  id_siswa: string;
}

const ITEMS_PER_PAGE = 15;

export default function AdminManageStudentsPage() {
  const { toast } = useToast();
  const { userProfile: currentAdminProfile } = useAuth();
  const [allStudents, setAllStudents] = useState<Siswa[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Siswa | null>(null);
  const [uniqueClasses, setUniqueClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      nama: "",
      nis: "",
      kelas: "",
      id_siswa: "",
    },
  });

  const fetchStudents = useCallback(async () => {
    setIsLoadingData(true);
    setFetchError(null);
    try {
      const studentList = await getStudents();
      setAllStudents(studentList || []);
      if (studentList && studentList.length > 0) {
        const klasses = [...new Set(studentList.map(s => s.kelas).filter(Boolean))].sort();
        setUniqueClasses(klasses);
      } else {
        setUniqueClasses([]);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      setFetchError("Gagal memuat daftar siswa. Silakan coba lagi.");
      toast({ variant: "destructive", title: "Error", description: "Gagal memuat daftar siswa." });
      setAllStudents([]);
      setUniqueClasses([]);
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    setCurrentPage(1); 
  }, [selectedClass]);

  const filteredStudents = useMemo(() => {
    if (selectedClass === "all") {
      return allStudents;
    }
    return allStudents.filter(student => student.kelas === selectedClass);
  }, [allStudents, selectedClass]);

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, currentPage]);

  const onSubmit = async (data: StudentFormData) => {
    setIsSubmitting(true);
    if (!currentAdminProfile) {
      toast({ variant: "destructive", title: "Error", description: "Sesi admin tidak ditemukan." });
      setIsSubmitting(false);
      return;
    }
    try {
      // Fetch current students list again to ensure no race conditions if allStudents state is stale
      const currentStudentList = await getStudents();
      const existingStudentById = currentStudentList.find(s => s.id_siswa === data.id_siswa); 
      if (existingStudentById) {
        form.setError("id_siswa", { type: "manual", message: "ID Siswa ini sudah digunakan." });
        toast({ variant: "destructive", title: "Error Validasi", description: "ID Siswa ini sudah digunakan." });
        setIsSubmitting(false);
        return;
      }
      const existingStudentByNis = currentStudentList.find(s => s.nis === data.nis); 
      if (existingStudentByNis) {
        form.setError("nis", { type: "manual", message: "NIS ini sudah digunakan." });
        toast({ variant: "destructive", title: "Error Validasi", description: "NIS ini sudah digunakan." });
        setIsSubmitting(false);
        return;
      }

      await addStudent(data);
      await addActivityLog(
        "Siswa Baru Ditambahkan (Admin)",
        `Siswa: ${data.nama} (NIS: ${data.nis}, Kelas: ${data.kelas}, ID: ${data.id_siswa}) oleh Admin: ${currentAdminProfile.displayName || currentAdminProfile.email}`,
        currentAdminProfile.uid,
        currentAdminProfile.displayName || currentAdminProfile.email || "Admin"
      );
      toast({ title: "Sukses", description: `Siswa ${data.nama} berhasil ditambahkan.` });
      form.reset();
      fetchStudents(); 
    } catch (error: any) {
      console.error("Error adding student:", error);
      toast({ variant: "destructive", title: "Error", description: "Gagal menambahkan siswa. Silakan coba lagi." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirmation = (student: Siswa) => {
    setStudentToDelete(student);
  };

  const handleActualDelete = async () => {
    if (!studentToDelete || !studentToDelete.id || !currentAdminProfile) {
      toast({ variant: "destructive", title: "Error", description: "Data tidak lengkap untuk penghapusan." });
      setStudentToDelete(null);
      return;
    }
    setIsDeleting(true);
    try {
      await deleteStudent(studentToDelete.id);
      await addActivityLog(
        "Siswa Dihapus (Admin)",
        `Siswa: ${studentToDelete.nama} (NIS: ${studentToDelete.nis}) dihapus oleh Admin: ${currentAdminProfile.displayName || currentAdminProfile.email}`,
        currentAdminProfile.uid,
        currentAdminProfile.displayName || currentAdminProfile.email || "Admin"
      );
      toast({ title: "Sukses", description: `Siswa ${studentToDelete.nama} dan semua nilainya berhasil dihapus.` });
      setStudentToDelete(null);
      fetchStudents();
    } catch (error) {
      console.error("Error deleting student:", error);
      toast({ variant: "destructive", title: "Error Hapus", description: "Gagal menghapus siswa." });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadStudentTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["nama", "nis", "kelas", "id_siswa"],
      ["Contoh Nama Siswa", "1234567890", "X IPA 1", "contoh_id_siswa_01"],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Siswa");
    const wscols = [ { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 } ];
    worksheet['!cols'] = wscols;
    XLSX.writeFile(workbook, "template_import_siswa.xlsx");
    toast({ title: "Template Diunduh", description: "Template Excel untuk impor siswa telah diunduh." });
  };

  const handleExportStudentsData = () => {
    if (allStudents.length === 0) {
      toast({ variant: "default", title: "Tidak Ada Data", description: "Belum ada data siswa untuk diekspor." });
      return;
    }
    const dataToExport = allStudents.map(student => ({
      Nama: student.nama,
      NIS: student.nis,
      Kelas: student.kelas,
      ID_Siswa: student.id_siswa,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Siswa");
    const wscols = [ { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 } ];
    worksheet['!cols'] = wscols;
    XLSX.writeFile(workbook, "data_siswa_siap_smapna.xlsx");
    toast({ title: "Data Diekspor", description: "Data siswa telah diekspor ke Excel." });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleImportStudents = async () => {
    if (!selectedFile) {
      toast({ variant: "destructive", title: "Tidak Ada File", description: "Silakan pilih file Excel terlebih dahulu." });
      return;
    }
     if (!currentAdminProfile) {
      toast({ variant: "destructive", title: "Error", description: "Sesi admin tidak ditemukan untuk impor." });
      return;
    }
    setIsImporting(true);
    const reader = new FileReader();
    const currentStudentList = await getStudents(); // Fetch fresh list before loop

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<StudentImportData>(worksheet);

        if (json.length === 0) {
          toast({ variant: "destructive", title: "File Kosong", description: "File Excel tidak mengandung data siswa." });
          setIsImporting(false);
          return;
        }

        const firstRow = json[0];
        if (!firstRow || !('nama' in firstRow) || !('nis' in firstRow) || !('kelas' in firstRow) || !('id_siswa' in firstRow)) {
          toast({ variant: "destructive", title: "Format File Salah", description: "Header kolom di file Excel tidak sesuai. Harap gunakan template (nama, nis, kelas, id_siswa)." });
          setIsImporting(false);
          return;
        }

        let successCount = 0;
        let failCount = 0;
        const errorMessages: string[] = [];
        
        for (const student of json) {
          if (!student.nama || !student.nis || !student.kelas || !student.id_siswa) {
            failCount++;
            errorMessages.push(`Baris tidak lengkap untuk NIS: ${student.nis || 'NIS tidak ada'}. Dilewati.`);
            continue;
          }

          const nisRegex = /^[0-9]+$/;
          if (student.nis.length < 5 || !nisRegex.test(student.nis)) {
            failCount++;
            errorMessages.push(`Format NIS salah atau kurang dari 5 karakter untuk: ${student.nis}. Dilewati.`);
            continue;
          }

          const idSiswaRegex = /^[a-zA-Z0-9_.-]+$/;
          if (student.id_siswa.length < 3 || !idSiswaRegex.test(student.id_siswa)) {
            failCount++;
            errorMessages.push(`Format ID Siswa salah atau kurang dari 3 karakter untuk: ${student.id_siswa}. Dilewati.`);
            continue;
          }

          const existingStudentById = currentStudentList.find(s => s.id_siswa === student.id_siswa);
          if (existingStudentById) {
            failCount++;
            errorMessages.push(`ID Siswa ${student.id_siswa} sudah digunakan. Dilewati.`);
            continue;
          }
          const existingStudentByNis = currentStudentList.find(s => s.nis === student.nis);
          if (existingStudentByNis) {
            failCount++;
            errorMessages.push(`NIS ${student.nis} sudah digunakan. Dilewati.`);
            continue;
          }

          try {
            const newStudent = {
              nama: student.nama,
              nis: student.nis,
              kelas: student.kelas,
              id_siswa: student.id_siswa,
            };
            await addStudent(newStudent);
             await addActivityLog(
              "Siswa Baru Diimpor (Admin)",
              `Siswa: ${newStudent.nama} (NIS: ${newStudent.nis}) oleh Admin: ${currentAdminProfile.displayName || currentAdminProfile.email}`,
              currentAdminProfile.uid,
              currentAdminProfile.displayName || currentAdminProfile.email || "Admin"
            );
            successCount++;
            currentStudentList.push({ ...newStudent, id: 'temp-id-' + successCount }); // Add to local list to prevent re-adding if file has duplicates
          } catch (error: any) {
            failCount++;
            errorMessages.push(`Gagal impor ${student.nama} (NIS: ${student.nis}): ${error.message}. Dilewati.`);
          }
        }

        toast({
          title: "Proses Impor Siswa Selesai",
          description: `${successCount} siswa berhasil diimpor. ${failCount} siswa gagal diimpor. ${failCount > 0 ? 'Lihat konsol untuk detail error.' : ''}`,
          duration: failCount > 0 ? 10000 : 5000,
        });

        if (errorMessages.length > 0) {
          console.warn("Detail error impor siswa:", errorMessages.join("\n"));
        }
        
        fetchStudents(); 
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

      } catch (error) {
        console.error("Error processing Excel file for students:", error);
        toast({ variant: "destructive", title: "Error Baca File", description: "Gagal memproses file Excel siswa." });
      } finally {
        setIsImporting(false);
      }
    };
    reader.onerror = () => {
      toast({ variant: "destructive", title: "Error Baca File", description: "Tidak dapat membaca file yang dipilih." });
      setIsImporting(false);
    };
    reader.readAsBinaryString(selectedFile);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Admin">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Kelola Data Siswa (Admin)</h1>
          <p className="text-muted-foreground">
            Tambah, impor, lihat, edit atau hapus data siswa yang terdaftar.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Siswa Baru (Manual)</CardTitle>
          <CardDescription>Masukkan detail siswa untuk mendaftarkannya satu per satu.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="nama"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Lengkap Siswa</FormLabel>
                    <FormControl>
                      <Input placeholder="cth: Ayu Lestari" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIS (Nomor Induk Siswa)</FormLabel>
                    <FormControl>
                      <Input placeholder="cth: 2024001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kelas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kelas</FormLabel>
                    <FormControl>
                      <Input placeholder="cth: X IPA 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="id_siswa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Siswa</FormLabel>
                    <FormControl>
                      <Input placeholder="cth: ayu_lestari_01" {...field} />
                    </FormControl>
                    <FormDesc>ID unik untuk siswa, bisa berupa kombinasi nama dan angka.</FormDesc>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menambahkan...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Tambah Siswa
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Impor Siswa dari Excel</CardTitle>
          <CardDescription>Impor banyak data siswa sekaligus menggunakan file Excel. Gunakan template yang disediakan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <Input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="flex-grow text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            <Button onClick={handleImportStudents} disabled={isImporting || !selectedFile} className="w-full sm:w-auto">
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              {isImporting ? 'Mengimpor...' : 'Impor Siswa'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Pastikan file Excel Anda memiliki kolom: <code className="bg-muted px-1 py-0.5 rounded text-xs">nama</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">nis</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">kelas</code>, dan <code className="bg-muted px-1 py-0.5 rounded text-xs">id_siswa</code>.
            Data yang sudah ada (berdasarkan NIS atau ID Siswa) akan dilewati.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Daftar Siswa Terdaftar</CardTitle>
              <CardDescription>Berikut adalah daftar semua siswa.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                 {uniqueClasses.length > 0 && (
                    <div className="w-full sm:w-auto min-w-[200px]">
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="w-full" aria-label="Filter berdasarkan kelas">
                            <Filter className="h-4 w-4 mr-2 opacity-70" />
                            <SelectValue placeholder="Filter Kelas..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Kelas</SelectItem>
                            {uniqueClasses.map(kelas => (
                            <SelectItem key={kelas} value={kelas}>{kelas}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                )}
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button onClick={handleDownloadStudentTemplate} variant="outline" className="flex-1 sm:flex-initial">
                        <Download className="mr-2 h-4 w-4" /> Unduh Template
                    </Button>
                    <Button onClick={handleExportStudentsData} variant="outline" className="flex-1 sm:flex-initial">
                        <Download className="mr-2 h-4 w-4" /> Ekspor Siswa
                    </Button>
                </div>
            </div>

          </div>
        </CardHeader>
        <CardContent>
          {fetchError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Memuat Data</AlertTitle>
              <AlertDescription>{fetchError}</AlertDescription>
            </Alert>
          )}
          {isLoadingData ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-2 border rounded-md">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-60" />
                  </div>
                </div>
              ))}
            </div>
          ) : allStudents.length === 0 && !fetchError ? (
             <div className="flex flex-col items-center justify-center min-h-[150px] text-center p-6 border-2 border-dashed rounded-lg">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">
                Belum Ada Siswa
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Belum ada siswa yang terdaftar. Silakan tambahkan siswa baru menggunakan formulir di atas.
              </p>
            </div>
          ) : filteredStudents.length === 0 && selectedClass !== "all" ? (
            <div className="flex flex-col items-center justify-center min-h-[150px] text-center p-6 border-2 border-dashed rounded-lg">
              <Filter className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">
                Tidak Ada Siswa di Kelas {selectedClass}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Tidak ada siswa yang cocok dengan filter kelas yang dipilih. Coba pilih kelas lain atau "Semua Kelas".
              </p>
              <Button variant="outline" className="mt-4" onClick={() => setSelectedClass("all")}>
                Tampilkan Semua Kelas
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Siswa</TableHead>
                      <TableHead>NIS</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>ID Siswa</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStudents.map((student) => (
                      <TableRow key={student.id_siswa}>
                        <TableCell className="font-medium">{student.nama}</TableCell>
                        <TableCell>{student.nis}</TableCell>
                        <TableCell>{student.kelas}</TableCell>
                        <TableCell>{student.id_siswa}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Link href={`/admin/students/edit/${student.id}`} passHref>
                            <Button variant="ghost" size="icon" className="hover:bg-accent hover:text-accent-foreground" title="Edit Siswa">
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteConfirmation(student)}
                            disabled={isDeleting && studentToDelete?.id === student.id}
                            title="Hapus Siswa"
                          >
                            {isDeleting && studentToDelete?.id === student.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            <span className="sr-only">Hapus</span>
                          </Button>
                        </TableCell> 
                      </TableRow>
                    ))}
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

      {studentToDelete && (
        <AlertDialog open={!!studentToDelete} onOpenChange={(isOpen) => !isOpen && setStudentToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Anda Yakin Ingin Menghapus Siswa Ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini akan menghapus data siswa <span className="font-semibold">{studentToDelete.nama}</span> ({studentToDelete.nis}) beserta semua data nilai yang terkait. 
                Tindakan ini tidak dapat diurungkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setStudentToDelete(null)} disabled={isDeleting}>Batal</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleActualDelete} 
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Ya, Hapus Siswa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
    
