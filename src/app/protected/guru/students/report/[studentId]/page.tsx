
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
    [semester: string]: Nilai[]; // Changed to Nilai[] to group by mapel within a semester
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
      router.push('/protected/guru/students');
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
      // Sort by tahun_ajaran desc, semester asc, then mapel asc for consistent display
      setGrades(fetchedGrades.sort((a, b) => {
        if (a.tahun_ajaran > b.tahun_ajaran) return -1;
        if (a.tahun_ajaran < b.tahun_ajaran) return 1;
        if (a.semester < b.semester) return -1;
        if (a.semester > b.semester) return 1;
        return a.mapel.localeCompare(b.mapel);
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

  const groupedGradesByTAAndSemester = React.useMemo(() => {
    return grades.reduce<GroupedGrades>((acc, grade) => {
      const { tahun_ajaran, semester, mapel } = grade;
      const semesterLabel = semester === 1 ? 'Ganjil' : 'Genap';
      if (!acc[tahun_ajaran]) {
        acc[tahun_ajaran] = {};
      }
      if (!acc[tahun_ajaran][semesterLabel]) {
        acc[tahun_ajaran][semesterLabel] = [];
      }
      acc[tahun_ajaran][semesterLabel].push(grade);
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
          <Link href="/protected/guru/students"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
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
          <Link href="/protected/guru/students"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
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
    <div className="space-y-6 print:space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/protected/guru/students">
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
      
      <div className="print:block hidden text-center mb-4">
        <h2 className="text-xl font-bold">LAPORAN HASIL BELAJAR SISWA</h2>
        <h3 className="text-lg font-semibold">SMA PGRI NARINGGUL</h3>
      </div>


      <Card className="print:shadow-none print:border-none">
        <CardHeader className="border-b print:border-b-2 print:border-black print:py-2">
          <CardTitle className="text-2xl text-center sm:text-left font-headline print:text-lg print:text-left">Profil Siswa</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 print:grid-cols-2 print:gap-x-4 print:pt-2 print:text-xs">
          <div className="flex items-start gap-3 print:items-center">
            <User className="h-5 w-5 text-primary flex-shrink-0 print:hidden" />
            <div className="print:flex print:gap-2">
              <p className="text-sm text-muted-foreground print:w-28 print:font-medium">Nama Lengkap</p>
              <p className="font-semibold text-foreground print:font-normal print:before:content-[':'] print:before:mr-1">{student.nama}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 print:items-center">
            <BookOpen className="h-5 w-5 text-primary flex-shrink-0 print:hidden" />
             <div className="print:flex print:gap-2">
              <p className="text-sm text-muted-foreground print:w-28 print:font-medium">NIS</p>
              <p className="font-semibold text-foreground print:font-normal print:before:content-[':'] print:before:mr-1">{student.nis}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 print:items-center">
            <CalendarDays className="h-5 w-5 text-primary flex-shrink-0 print:hidden" />
             <div className="print:flex print:gap-2">
              <p className="text-sm text-muted-foreground print:w-28 print:font-medium">Kelas</p>
              <p className="font-semibold text-foreground print:font-normal print:before:content-[':'] print:before:mr-1">{student.kelas}</p>
            </div>
          </div>
           <div className="flex items-start gap-3 print:items-center">
            <Info className="h-5 w-5 text-primary flex-shrink-0 print:hidden" />
            <div className="print:flex print:gap-2">
              <p className="text-sm text-muted-foreground print:w-28 print:font-medium">ID Siswa</p>
              <p className="font-semibold text-foreground print:font-normal print:before:content-[':'] print:before:mr-1">{student.id_siswa}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.keys(groupedGradesByTAAndSemester).length === 0 && !isLoading && (
        <Card className="print:hidden">
          <CardHeader><CardTitle>Belum Ada Data Nilai</CardTitle></CardHeader>
          <CardContent>
            <Alert variant="default">
                <Info className="h-4 w-4" /><AlertTitle>Informasi</AlertTitle>
                <AlertDescription>Siswa ini belum memiliki data nilai yang tercatat dalam sistem.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {Object.entries(groupedGradesByTAAndSemester).map(([tahunAjaran, semesterMap]) => (
        <div key={tahunAjaran} className="print:break-after-page">
          {Object.entries(semesterMap).map(([semesterLabel, nilaiPerMapelArray]) => (
            <Card key={`${tahunAjaran}-${semesterLabel}`} className="print:shadow-none print:border-none print:mt-2 mb-6 print:mb-3">
              <CardHeader className="bg-muted/30 print:bg-gray-100 print:py-1 px-4 print:px-2">
                <CardTitle className="text-xl font-headline print:text-base">
                  Tahun Ajaran: {tahunAjaran} - Semester: {semesterLabel}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 print:pt-2 px-4 print:px-0">
                <div className="overflow-x-auto">
                  <Table className="print:text-[10px]">
                    <TableHeader>
                      <TableRow className="print:bg-gray-200">
                        <TableHead className="w-[40px] print:w-[20px] print:px-1 print:py-0.5 text-center">No.</TableHead>
                        <TableHead className="w-[200px] print:w-[150px] print:px-1 print:py-0.5">Mata Pelajaran</TableHead>
                        <TableHead className="text-center print:px-1 print:py-0.5">Avg. Tugas</TableHead>
                        <TableHead className="text-center print:px-1 print:py-0.5">Tes</TableHead>
                        <TableHead className="text-center print:px-1 print:py-0.5">PTS</TableHead>
                        <TableHead className="text-center print:px-1 print:py-0.5">PAS</TableHead>
                        <TableHead className="text-center print:px-1 print:py-0.5">Kehadiran</TableHead>
                        <TableHead className="text-center print:px-1 print:py-0.5">Eskul</TableHead>
                        <TableHead className="text-center print:px-1 print:py-0.5">OSIS</TableHead>
                        <TableHead className="text-center font-bold print:px-1 print:py-0.5">Nilai Akhir</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nilaiPerMapelArray.map((nilai, index) => {
                        const rataRataTugas = calculateAverage(nilai.tugas || []);
                        return (
                          <TableRow key={nilai.id || `${nilai.mapel}-${index}`}>
                            <TableCell className="text-center print:px-1 print:py-0.5">{index + 1}</TableCell>
                            <TableCell className="font-medium print:px-1 print:py-0.5">{nilai.mapel}</TableCell>
                            <TableCell className="text-center print:px-1 print:py-0.5">{rataRataTugas.toFixed(1)}</TableCell>
                            <TableCell className="text-center print:px-1 print:py-0.5">{nilai.tes?.toFixed(1) || '0'}</TableCell>
                            <TableCell className="text-center print:px-1 print:py-0.5">{nilai.pts?.toFixed(1) || '0'}</TableCell>
                            <TableCell className="text-center print:px-1 print:py-0.5">{nilai.pas?.toFixed(1) || '0'}</TableCell>
                            <TableCell className="text-center print:px-1 print:py-0.5">{nilai.kehadiran?.toFixed(1) || '0'}%</TableCell>
                            <TableCell className="text-center print:px-1 print:py-0.5">{nilai.eskul?.toFixed(1) || '0'}</TableCell>
                            <TableCell className="text-center print:px-1 print:py-0.5">{nilai.osis?.toFixed(1) || '0'}</TableCell>
                            <TableCell className="text-center font-bold print:font-semibold print:px-1 print:py-0.5">{(nilai.nilai_akhir || 0).toFixed(1)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
      
      <div className="print:block hidden mt-8 text-xs">
        <div className="grid grid-cols-2 gap-8">
            <div>
                <p className="mb-16">Mengetahui,</p>
                <p>Orang Tua/Wali Siswa</p>
                <br/><br/><br/>
                <p className="border-b border-black w-48"></p>
            </div>
            <div className="text-right">
                <p className="mb-16">Naringgul, ........................... {new Date().getFullYear()}</p>
                <p>Wali Kelas</p>
                <br/><br/><br/>
                <p className="border-b border-black w-48 ml-auto"></p>
                {/* <p>NIP. ....................................</p> */}
            </div>
        </div>
         <div className="mt-12 text-center">
            <p>Kepala Sekolah SMA PGRI Naringgul</p>
            <br/><br/><br/><br/>
            <p className="font-bold border-b border-black w-60 mx-auto">ASEP RISMAN KOMARA, S.Pd.</p>
            <p>NUPTK. 1234567890123456</p>
         </div>
      </div>


       <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-size: 10pt !important;
          }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:text-center { text-align: center !important; }
          .print\\:text-left { text-align: left !important; }
          .print\\:text-right { text-align: right !important; }
          .print\\:mb-4 { margin-bottom: 1rem !important; }
          .print\\:mb-3 { margin-bottom: 0.75rem !important; }
          .print\\:mt-2 { margin-top: 0.5rem !important; }
          .print\\:mt-8 { margin-top: 2rem !important; }
          .print\\:mt-12 { margin-top: 3rem !important; }
          .print\\:space-y-3 > :not([hidden]) ~ :not([hidden]) {
            --tw-space-y-reverse: 0;
            margin-top: calc(0.75rem * calc(1 - var(--tw-space-y-reverse))) !important;
            margin-bottom: calc(0.75rem * var(--tw-space-y-reverse)) !important;
          }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          .print\\:border { border-width: 1px !important; }
          .print\\:border-gray-300 { border-color: #D1D5DB !important; }
          .print\\:border-black { border-color: #000000 !important; }
          .print\\:border-b { border-bottom-width: 1px !important; }
          .print\\:border-b-2 { border-bottom-width: 2px !important; }
          .print\\:bg-gray-100 { background-color: #F3F4F6 !important; }
          .print\\:bg-gray-200 { background-color: #E5E7EB !important; }
          .print\\:text-xl { font-size: 1.25rem !important; line-height: 1.75rem !important; }
          .print\\:text-lg { font-size: 1.125rem !important; line-height: 1.75rem !important; }
          .print\\:text-base { font-size: 1rem !important; line-height: 1.5rem !important; }
          .print\\:text-xs { font-size: 0.75rem !important; line-height: 1rem !important; }
          .print\\:text-\\[10px\\] table, .print\\:text-\\[10px\\] th, .print\\:text-\\[10px\\] td { font-size: 10px !important; line-height: 1.2 !important; }
          .print\\:py-1 { padding-top: 0.25rem !important; padding-bottom: 0.25rem !important; }
          .print\\:py-2 { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }
          .print\\:px-0 { padding-left: 0 !important; padding-right: 0 !important; }
          .print\\:px-1 { padding-left: 0.25rem !important; padding-right: 0.25rem !important; }
          .print\\:px-2 { padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
          .print\\:py-0\\.5 { padding-top: 0.125rem !important; padding-bottom: 0.125rem !important; }
          .print\\:pt-2 { padding-top: 0.5rem !important; }
          .print\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .print\\:gap-x-4 { column-gap: 1rem !important; }
          .print\\:gap-2 > :not([hidden]) ~ :not([hidden]) { margin-left: 0.5rem !important; }
          .print\\:items-center { align-items: center !important; }
          .print\\:font-medium { font-weight: 500 !important; }
          .print\\:font-semibold { font-weight: 600 !important; }
          .print\\:font-bold { font-weight: 700 !important; }
          .print\\:font-normal { font-weight: 400 !important; }
          .print\\:w-28 { width: 7rem !important; }
          .print\\:w-48 { width: 12rem !important; }
          .print\\:w-60 { width: 15rem !important; }
          .print\\:w-\\[20px\\] { width: 20px !important; }
          .print\\:w-\\[150px\\] { width: 150px !important; }
          .print\\:mx-auto { margin-left: auto !important; margin-right: auto !important; }
          .print\\:ml-auto { margin-left: auto !important; }
          .print\\:before\\:content-\\[\\'\\:\\'\\]::before { content: ':' !important; }
          .print\\:before\\:mr-1::before { margin-right: 0.25rem !important; }
          .print\\:break-after-page { break-after: page !important; }
          
          /* Ensure table borders are visible for print */
          .print\\:text-\\[10px\\] table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          .print\\:text-\\[10px\\] thead > tr > th {
            background-color: #E5E7EB !important;
          }
          .print\\:text-\\[10px\\] th, .print\\:text-\\[10px\\] td {
            border: 1px solid #ccc !important; /* Light gray border */
            padding: 2px 4px !important;
          }
        }
      `}</style>
    </div>
  );
}
