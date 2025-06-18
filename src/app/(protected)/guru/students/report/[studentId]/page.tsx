
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, AlertCircle, User, BookOpen, CalendarDays, Info, Printer } from "lucide-react";
import { getStudentById, getGradesByStudent } from '@/lib/firestoreService';
import type { Siswa, Nilai } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { calculateAverage } from '@/lib/utils';

interface GroupedGrades {
  [tahunAjaran: string]: {
    [semester: string]: Nilai;
  };
}

export default function StudentReportPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const studentDocumentId = params.studentId as string;

  const [student, setStudent] = useState<Siswa | null>(null);
  const [grades, setGrades] = useState<Nilai[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudentDataAndGrades = useCallback(async (docId: string) => {
    if (!docId) {
      setError("ID Siswa tidak valid.");
      setIsLoading(false);
      toast({ variant: "destructive", title: "Error", description: "ID Siswa tidak ditemukan." });
      router.push('/guru/students');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const fetchedStudent = await getStudentById(docId);
      if (!fetchedStudent) {
        throw new Error("Data siswa tidak ditemukan.");
      }
      setStudent(fetchedStudent);

      const fetchedGrades = await getGradesByStudent(fetchedStudent.id_siswa);
      setGrades(fetchedGrades.sort((a, b) => {
        // Sort by tahun_ajaran descending, then semester ascending
        if (a.tahun_ajaran > b.tahun_ajaran) return -1;
        if (a.tahun_ajaran < b.tahun_ajaran) return 1;
        return a.semester - b.semester;
      }));

    } catch (err: any) {
      console.error("Error fetching student report data:", err);
      setError(err.message || "Gagal memuat data rapor siswa.");
      toast({ variant: "destructive", title: "Error Memuat Data", description: err.message || "Terjadi kesalahan." });
    } finally {
      setIsLoading(false);
    }
  }, [toast, router]);

  useEffect(() => {
    if (studentDocumentId) {
      fetchStudentDataAndGrades(studentDocumentId);
    }
  }, [studentDocumentId, fetchStudentDataAndGrades]);

  const groupedGrades = React.useMemo(() => {
    return grades.reduce<GroupedGrades>((acc, grade) => {
      const { tahun_ajaran, semester } = grade;
      if (!acc[tahun_ajaran]) {
        acc[tahun_ajaran] = {};
      }
      acc[tahun_ajaran][semester === 1 ? 'Ganjil' : 'Genap'] = grade;
      return acc;
    }, {});
  }, [grades]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div><Skeleton className="h-8 w-64 mb-2 rounded-md" /><Skeleton className="h-5 w-80 rounded-md" /></div>
        </div>
        <Card><CardHeader><Skeleton className="h-7 w-48 mb-2 rounded-md" /><Skeleton className="h-4 w-72 rounded-md" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-40 w-full rounded-md" />
            <Skeleton className="h-40 w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/guru/students"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div><h1 className="text-3xl font-bold">Error Memuat Rapor</h1></div>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" /><AlertTitle>Gagal Memuat</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => fetchStudentDataAndGrades(studentDocumentId)} variant="outline">Coba Lagi</Button>
      </div>
    );
  }

  if (!student) {
    return (
       <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/guru/students"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div><h1 className="text-3xl font-bold">Data Siswa Tidak Ditemukan</h1></div>
        </div>
         <Alert variant="default">
            <Info className="h-4 w-4" /><AlertTitle>Informasi</AlertTitle>
            <AlertDescription>Tidak ada data siswa yang dapat ditampilkan. Mungkin siswa telah dihapus.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/guru/students">
            <Button variant="outline" size="icon" aria-label="Kembali ke Daftar Siswa">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Rapor Siswa</h1>
            <p className="text-muted-foreground">Detail riwayat nilai akademik siswa.</p>
          </div>
        </div>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="mr-2 h-4 w-4" />
          Cetak Rapor
        </Button>
      </div>

      <Card className="print:shadow-none print:border-none">
        <CardHeader className="border-b print:border-b-2 print:border-black">
          <CardTitle className="text-2xl text-center sm:text-left font-headline print:text-xl">Profil Siswa</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 print:grid-cols-2 print:gap-x-4 print:pt-4">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">Nama Lengkap</p>
              <p className="font-semibold text-foreground">{student.nama}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">NIS (Nomor Induk Siswa)</p>
              <p className="font-semibold text-foreground">{student.nis}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">Kelas Saat Ini</p>
              <p className="font-semibold text-foreground">{student.kelas}</p>
            </div>
          </div>
           <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">ID Siswa (Sistem)</p>
              <p className="font-semibold text-foreground">{student.id_siswa}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.keys(groupedGrades).length === 0 && !isLoading && (
        <Card>
          <CardHeader><CardTitle>Belum Ada Data Nilai</CardTitle></CardHeader>
          <CardContent>
            <Alert variant="default">
                <Info className="h-4 w-4" />
                <AlertTitle>Informasi</AlertTitle>
                <AlertDescription>Siswa ini belum memiliki data nilai yang tercatat dalam sistem.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {Object.entries(groupedGrades).map(([tahunAjaran, semesterData]) => (
        <Card key={tahunAjaran} className="print:shadow-none print:border print:border-gray-300 print:mt-4">
          <CardHeader className="bg-muted/30 print:bg-gray-100">
            <CardTitle className="text-xl font-headline print:text-lg">Tahun Ajaran: {tahunAjaran}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {Object.entries(semesterData).map(([semesterLabel, nilai]) => {
              const rataRataTugas = calculateAverage(nilai.tugas || []);
              return (
                <div key={semesterLabel} className="mt-6 print:mt-3">
                  <h3 className="text-lg font-semibold text-primary border-b pb-1 mb-3 print:text-base">
                    Semester: {semesterLabel}
                  </h3>
                  <div className="overflow-x-auto">
                    <Table className="print:text-xs">
                      <TableHeader className="print:hidden">
                        <TableRow>
                          <TableHead className="w-[60%]">Komponen Penilaian</TableHead>
                          <TableHead className="text-right w-[40%]">Nilai</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Rata-Rata Tugas/Harian</TableCell>
                          <TableCell className="text-right">{rataRataTugas.toFixed(2)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Tes / Ulangan</TableCell>
                          <TableCell className="text-right">{nilai.tes?.toFixed(2) || '0.00'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">PTS (Penilaian Tengah Semester)</TableCell>
                          <TableCell className="text-right">{nilai.pts?.toFixed(2) || '0.00'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">PAS (Penilaian Akhir Semester)</TableCell>
                          <TableCell className="text-right">{nilai.pas?.toFixed(2) || '0.00'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Kehadiran</TableCell>
                          <TableCell className="text-right">{nilai.kehadiran?.toFixed(2) || '0.00'}%</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Ekstrakurikuler</TableCell>
                          <TableCell className="text-right">{nilai.eskul?.toFixed(2) || '0.00'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">OSIS / Kegiatan Sekolah</TableCell>
                          <TableCell className="text-right">{nilai.osis?.toFixed(2) || '0.00'}</TableCell>
                        </TableRow>
                        <TableRow className="bg-primary/10 print:bg-gray-200">
                          <TableCell className="font-bold text-primary print:text-black">Nilai Akhir (Rapor)</TableCell>
                          <TableCell className="text-right font-bold text-primary print:text-black">
                            {(nilai.nilai_akhir || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
       <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          .print\\:border { border-width: 1px !important; }
          .print\\:border-gray-300 { border-color: #D1D5DB !important; }
          .print\\:mt-4 { margin-top: 1rem !important; }
          .print\\:mt-3 { margin-top: 0.75rem !important; }
          .print\\:bg-gray-100 { background-color: #F3F4F6 !important; }
          .print\\:text-lg { font-size: 1.125rem !important; line-height: 1.75rem !important; }
          .print\\:text-base { font-size: 1rem !important; line-height: 1.5rem !important; }
          .print\\:text-xs { font-size: 0.75rem !important; line-height: 1rem !important; }
          .print\\:text-xl { font-size: 1.25rem !important; line-height: 1.75rem !important; }
          .print\\:border-b-2 { border-bottom-width: 2px !important; }
          .print\\:border-black { border-color: #000000 !important; }
          .print\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .print\\:gap-x-4 { column-gap: 1rem !important; }
          .print\\:pt-4 { padding-top: 1rem !important; }
          .print\\:space-y-4 > :not([hidden]) ~ :not([hidden]) {
            --tw-space-y-reverse: 0;
            margin-top: calc(1rem * calc(1 - var(--tw-space-y-reverse))) !important;
            margin-bottom: calc(1rem * var(--tw-space-y-reverse)) !important;
          }
        }
      `}</style>
    </div>
  );
}


    