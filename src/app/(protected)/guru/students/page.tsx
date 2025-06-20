
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, AlertCircle, Users, BookUser, Filter, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { getStudents } from '@/lib/firestoreService';
import type { Siswa } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ITEMS_PER_PAGE = 15;

export default function ViewStudentsPage() {
  const { toast } = useToast();
  const [allStudents, setAllStudents] = useState<Siswa[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [uniqueClasses, setUniqueClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/guru">
          <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Guru">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Daftar Siswa</h1>
          <p className="text-muted-foreground">
            Lihat data siswa yang terdaftar dan akses rapor individual mereka.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Daftar Siswa Terdaftar</CardTitle>
              <CardDescription>Berikut adalah daftar semua siswa. Gunakan filter kelas untuk mempermudah pencarian.</CardDescription>
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
              {[...Array(5)].map((_, i) => (
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
                Data siswa dikelola oleh Admin. Saat ini belum ada siswa yang terdaftar.
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
    </div>
  );
}

    