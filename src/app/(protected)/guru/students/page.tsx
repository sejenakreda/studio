
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription as FormDesc } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, UserPlus, Loader2, AlertCircle, Users, BookUser, Edit, Trash2, Filter, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { addStudent, getStudents, deleteStudent } from '@/lib/firestoreService';
import type { Siswa } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
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

const studentSchema = z.object({
  nama: z.string().min(3, "Nama minimal 3 karakter"),
  nis: z.string().min(5, "NIS minimal 5 karakter").regex(/^[0-9]+$/, "NIS hanya boleh berisi angka"),
  kelas: z.string().min(1, "Kelas tidak boleh kosong"),
  id_siswa: z.string().min(3, "ID Siswa minimal 3 karakter").regex(/^[a-zA-Z0-9_.-]+$/, "ID Siswa hanya boleh berisi huruf, angka, _, ., -"),
});

type StudentFormData = z.infer<typeof studentSchema>;

const ITEMS_PER_PAGE = 15;

export default function ManageStudentsPage() {
  const { toast } = useToast();
  const [allStudents, setAllStudents] = useState<Siswa[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Siswa | null>(null);
  const [uniqueClasses, setUniqueClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

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
    setCurrentPage(1); // Reset to first page when filter changes
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
    try {
      const existingStudentById = allStudents.find(s => s.id_siswa === data.id_siswa && s.id !== (form.getValues() as any).editingId); 
      if (existingStudentById) {
        form.setError("id_siswa", { type: "manual", message: "ID Siswa ini sudah digunakan." });
        toast({ variant: "destructive", title: "Error", description: "ID Siswa ini sudah digunakan." });
        setIsSubmitting(false);
        return;
      }
      const existingStudentByNis = allStudents.find(s => s.nis === data.nis && s.id !== (form.getValues() as any).editingId); 
      if (existingStudentByNis) {
        form.setError("nis", { type: "manual", message: "NIS ini sudah digunakan." });
        toast({ variant: "destructive", title: "Error", description: "NIS ini sudah digunakan." });
        setIsSubmitting(false);
        return;
      }

      await addStudent(data);
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
    if (!studentToDelete || !studentToDelete.id) return;
    setIsDeleting(true);
    try {
      await deleteStudent(studentToDelete.id);
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


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/guru">
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Guru">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Kelola Data Siswa</h1>
          <p className="text-muted-foreground">
            Tambah, lihat, edit atau hapus data siswa yang terdaftar.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Siswa Baru</CardTitle>
          <CardDescription>Masukkan detail siswa untuk mendaftarkannya.</CardDescription>
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Daftar Siswa Terdaftar</CardTitle>
              <CardDescription>Berikut adalah daftar semua siswa.</CardDescription>
            </div>
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
              <BookUser className="mx-auto h-12 w-12 text-muted-foreground" />
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
                          <Link href={`/guru/students/report/${student.id}`} passHref>
                            <Button variant="ghost" size="icon" className="hover:bg-accent hover:text-accent-foreground" title="Lihat Rapor">
                              <FileText className="h-4 w-4" />
                              <span className="sr-only">Lihat Rapor</span>
                            </Button>
                          </Link>
                          <Link href={`/guru/students/edit/${student.id}`} passHref>
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
                            disabled={isDeleting}
                            title="Hapus Siswa"
                          >
                            <Trash2 className="h-4 w-4" />
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
    

    