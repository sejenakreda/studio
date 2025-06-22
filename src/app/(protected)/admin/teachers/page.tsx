"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription as FormDesc } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, UserPlus, Loader2, AlertCircle, Users, Edit, Trash2, Download, FileUp } from "lucide-react";
import { 
  getAllUsersByRole, 
  createUserProfile as createUserProfileFirestore, 
  addActivityLog,
  deleteUserRecord, 
} from '@/lib/firestoreService';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { UserProfile, TugasTambahan } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';
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
import { getActivityName } from '@/lib/utils';

const addTeacherSchema = z.object({
  displayName: z.string().min(3, "Nama tampilan minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

type AddTeacherFormData = z.infer<typeof addTeacherSchema>;

interface TeacherImportData {
  "Nama Tampilan": string;
  "Email": string;
  "Password": string;
  "Mapel Ditugaskan"?: string;
  "Tugas Tambahan"?: string; 
}

const availableTugasTambahan: TugasTambahan[] = [
    'kesiswaan', 'kurikulum', 'pembina_osis', 'kepala_sekolah', 'operator', 'bendahara', 'bk', 'kepala_tata_usaha', 'staf_tu', 'satpam', 'penjaga_sekolah',
    'pembina_eskul_pmr', 'pembina_eskul_paskibra', 'pembina_eskul_pramuka',
    'pembina_eskul_karawitan', 'pembina_eskul_pencak_silat', 'pembina_eskul_volly_ball'
];

export default function ManageTeachersPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { userProfile: currentAdminProfile } = useAuth(); 
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<UserProfile | null>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const form = useForm<AddTeacherFormData>({
    resolver: zodResolver(addTeacherSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
    },
  });

  const fetchTeachers = useCallback(async () => {
    setIsLoadingData(true);
    setFetchError(null);
    try {
      const guruUsers = await getAllUsersByRole('guru');
      setTeachers(guruUsers || []); 
    } catch (error: any) {
      console.error("Error fetching teachers:", error);
      setFetchError("Gagal memuat daftar guru. Silakan coba lagi.");
      toast({ variant: "destructive", title: "Error", description: "Gagal memuat daftar guru." });
      setTeachers([]); 
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]); 

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const onSubmit = async (data: AddTeacherFormData) => {
    setIsSubmitting(true);

    if (!currentAdminProfile?.uid || !currentAdminProfile?.displayName) {
        toast({ variant: "destructive", title: "Error Sesi Admin", description: "Sesi admin tidak valid untuk mencatat log. Silakan refresh." });
        setIsSubmitting(false);
        return;
    }
    const adminUIDToLog = currentAdminProfile.uid;
    const adminDisplayNameToLog = currentAdminProfile.displayName;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      
      // Creating profile with default empty arrays for mapel and tugasTambahan
      await createUserProfileFirestore(userCredential.user, 'guru', data.displayName, [], []); 
      
      await addActivityLog(
          "Guru Baru Ditambahkan (Manual)", 
          "Guru: " + data.displayName + " (" + data.email + ") oleh Admin: " + adminDisplayNameToLog,
          adminUIDToLog,
          adminDisplayNameToLog
        );

      if (auth.currentUser && auth.currentUser.uid === userCredential.user.uid) {
          await signOut(auth); 
      }
      
      toast({ title: "Sukses", description: "Guru " + data.displayName + " berhasil ditambahkan." });
      form.reset();
      fetchTeachers(); 

    } catch (error: any) {
      console.error("Error adding teacher:", error);
      let errorMessage = "Gagal menambahkan guru. Silakan coba lagi.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Email ini sudah terdaftar. Gunakan email lain.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password terlalu lemah. Gunakan password yang lebih kuat.";
      }
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
        setIsSubmitting(false); 
    }
  };

  const handleDeleteConfirmation = (teacher: UserProfile) => {
    setTeacherToDelete(teacher);
  };

  const handleActualDelete = async () => {
    if (!teacherToDelete || !teacherToDelete.uid || !currentAdminProfile?.uid || !currentAdminProfile?.displayName) {
        toast({ variant: "destructive", title: "Error", description: "Data guru atau admin tidak lengkap untuk penghapusan." });
        setTeacherToDelete(null);
        return;
    }
    setIsDeleting(true);
    try {
      await deleteUserRecord(teacherToDelete.uid); 
      
      await addActivityLog(
        "Profil Guru Dihapus dari Sistem",
        "Profil Guru: " + teacherToDelete.displayName + " (" + teacherToDelete.email + ") dihapus oleh Admin: " + currentAdminProfile.displayName,
        currentAdminProfile.uid,
        currentAdminProfile.displayName
      );

      toast({ 
        title: "Sukses", 
        description: "Profil guru " + teacherToDelete.displayName + " berhasil dihapus dari sistem." 
      });
      setTeacherToDelete(null);
      fetchTeachers(); 
    } catch (error: any) {
      console.error("Error deleting teacher profile:", error);
      toast({ variant: "destructive", title: "Error Hapus Profil", description: "Gagal menghapus profil guru." });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadTeacherTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Nama Tampilan", "Email", "Password", "Mapel Ditugaskan", "Tugas Tambahan"],
      ["Contoh Nama Guru", "contoh@email.com", "password123", "Matematika,Bahasa Indonesia", "kurikulum,pembina_osis"], 
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Guru");
    const wscols = [ { wch: 25 }, { wch: 30 }, { wch: 20 }, {wch: 40}, {wch: 40} ];
    worksheet['!cols'] = wscols;
    XLSX.writeFile(workbook, "template_import_guru.xlsx");
    toast({ 
        title: "Template Diunduh", 
        description: "Template Excel untuk impor guru telah diunduh. Isi kolom dengan data yang sesuai, pisahkan dengan koma.",
        duration: 7000
    });
  };

  const handleExportTeachersData = () => {
    if (teachers.length === 0) {
      toast({ variant: "default", title: "Tidak Ada Data", description: "Belum ada data guru untuk diekspor." });
      return;
    }
    const dataToExport = teachers.map(teacher => ({
      "Nama Tampilan": teacher.displayName,
      "Email": teacher.email,
      "Mapel Ditugaskan": teacher.assignedMapel?.join(', ') || '',
      "Tugas Tambahan": teacher.tugasTambahan?.map(t => getActivityName(t)).join(', ') || '',
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Guru");
    const wscols = [ { wch: 25 }, { wch: 30 }, { wch: 40 }, { wch: 40 } ];
    worksheet['!cols'] = wscols;
    XLSX.writeFile(workbook, "data_guru_siap_smapna.xlsx");
    toast({ title: "Data Diekspor", description: "Data guru telah diekspor ke Excel." });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleImportTeachers = async () => {
    if (!selectedFile) {
      toast({ variant: "destructive", title: "Tidak Ada File", description: "Silakan pilih file Excel terlebih dahulu." });
      return;
    }
    if (!currentAdminProfile?.uid || !currentAdminProfile?.displayName) {
      toast({ variant: "destructive", title: "Error Sesi Admin", description: "Sesi admin tidak valid. Silakan refresh." });
      return;
    }

    setIsImporting(true);
    const currentTeacherList = await getAllUsersByRole('guru'); // Fetch fresh list

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<TeacherImportData>(worksheet);

        if (json.length === 0) {
          toast({ variant: "destructive", title: "File Kosong", description: "File Excel tidak mengandung data guru." });
          setIsImporting(false);
          return;
        }

        const headers = Object.keys(json[0] || {});
        const expectedHeaders = ["Nama Tampilan", "Email", "Password"];
        if (!expectedHeaders.every(h => headers.includes(h))) {
          toast({ variant: "destructive", title: "Format File Salah", description: `Header kolom di file Excel tidak sesuai (min: ${expectedHeaders.join(', ')}).` });
          setIsImporting(false);
          return;
        }

        let successCount = 0;
        let failCount = 0;
        const errorMessages: string[] = [];
        let anyInvalidTugasDetected = false;

        for (const [index, teacher] of json.entries()) {
          const teacherEmail = String(teacher["Email"] || "").trim();
          const teacherPassword = String(teacher["Password"] || "");
          const teacherDisplayName = String(teacher["Nama Tampilan"] || "").trim();
          
          if (!teacherDisplayName || !teacherEmail || !teacherPassword) {
            failCount++;
            errorMessages.push(`Baris ${index + 2}: Data tidak lengkap. Dilewati.`);
            continue;
          }
          if (teacherPassword.length < 6) {
            failCount++;
            errorMessages.push(`Baris ${index + 2}: Password untuk ${teacherEmail} terlalu pendek. Dilewati.`);
            continue;
          }

          const existingTeacherByEmail = currentTeacherList.find(t => t.email === teacherEmail);
          if (existingTeacherByEmail) {
            failCount++;
            errorMessages.push(`Baris ${index + 2}: Email ${teacherEmail} sudah terdaftar. Dilewati.`);
            continue;
          }

          let finalAssignedMapel: string[] = [];
          if (teacher["Mapel Ditugaskan"] && typeof teacher["Mapel Ditugaskan"] === 'string') {
            finalAssignedMapel = teacher["Mapel Ditugaskan"].split(',').map(m => m.trim()).filter(Boolean);
          }

          let finalTugasTambahan: TugasTambahan[] = [];
          if (teacher["Tugas Tambahan"] && typeof teacher["Tugas Tambahan"] === 'string') {
            const importedTugasArray = teacher["Tugas Tambahan"].split(',').map(t => t.trim().toLowerCase().replace(/ /g, '_')).filter(Boolean);
            const validTugas: TugasTambahan[] = [];
            const invalidTugas: string[] = [];

            for (const impTugas of importedTugasArray) {
              if (availableTugasTambahan.includes(impTugas as TugasTambahan)) {
                validTugas.push(impTugas as TugasTambahan);
              } else {
                invalidTugas.push(impTugas);
                anyInvalidTugasDetected = true;
              }
            }
            finalTugasTambahan = validTugas;
            if (invalidTugas.length > 0) {
              errorMessages.push(`Baris ${index + 2} (Guru ${teacherEmail}): Tugas tambahan tidak valid: ${invalidTugas.join(', ')}. Dilewati.`);
            }
          }

          try {
            const userCredential = await createUserWithEmailAndPassword(auth, teacherEmail, teacherPassword);
            await createUserProfileFirestore(userCredential.user, 'guru', teacherDisplayName, finalAssignedMapel, finalTugasTambahan);
            
            await addActivityLog(
              "Guru Baru Diimpor (Excel)",
              `Guru: ${teacherDisplayName} (${teacherEmail}) Mapel: ${finalAssignedMapel.join(', ') || 'N/A'}. Tugas: ${finalTugasTambahan.join(', ') || 'N/A'} oleh Admin: ${currentAdminProfile.displayName || currentAdminProfile.email}`,
              currentAdminProfile.uid,
              currentAdminProfile.displayName || currentAdminProfile.email || "Admin"
            );
            
            if (auth.currentUser && auth.currentUser.uid === userCredential.user.uid) {
              await signOut(auth);
            }
            successCount++;
            currentTeacherList.push({ 
                uid: userCredential.user.uid, 
                email: teacherEmail, 
                displayName: teacherDisplayName, 
                role: 'guru', 
                assignedMapel: finalAssignedMapel,
                tugasTambahan: finalTugasTambahan,
            });
          } catch (error: any) {
            failCount++;
            if (error.code === 'auth/email-already-in-use') {
              errorMessages.push(`Baris ${index + 2}: Email ${teacherEmail} sudah terdaftar (gagal saat pembuatan). Dilewati.`);
            } else {
              errorMessages.push(`Baris ${index + 2}: Gagal impor ${teacherEmail}: ${error.message}. Dilewati.`);
            }
          }
        }
        
        let summaryMessage = `${successCount} guru berhasil diimpor. ${failCount} guru gagal diimpor.`;
        if (anyInvalidTugasDetected) {
            summaryMessage += " Beberapa tugas tambahan tidak valid dan tidak ditugaskan.";
        }
        if (failCount > 0 || anyInvalidTugasDetected) {
            summaryMessage += " Lihat konsol untuk detail error/peringatan.";
        }

        toast({
          title: "Proses Impor Selesai",
          description: summaryMessage,
          duration: (failCount > 0 || anyInvalidTugasDetected) ? 10000 : 5000,
        });

        if (errorMessages.length > 0) {
          console.warn("Detail error/peringatan impor guru:", errorMessages.join("\n"));
        }
        
        fetchTeachers();
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

      } catch (error) {
        console.error("Error processing Excel file:", error);
        toast({ variant: "destructive", title: "Error Baca File", description: "Gagal memproses file Excel." });
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Kelola Data Guru</h1>
          <p className="text-muted-foreground">
            Tambah, lihat, edit, hapus, atau impor data profil guru.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Guru Baru (Manual)</CardTitle>
          <CardDescription>Masukkan detail guru untuk mendaftarkannya satu per satu.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Tampilan Guru</FormLabel>
                    <FormControl>
                      <Input placeholder="cth: Budi Sudarsono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Guru</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="cth: guru@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password Awal</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Minimal 6 karakter" {...field} />
                    </FormControl>
                    <FormDesc>Guru dapat mengubah password ini nanti.</FormDesc> 
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
                    Tambah Guru
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Impor Guru dari Excel</CardTitle>
          <CardDescription>Impor banyak data guru sekaligus menggunakan file Excel. Gunakan template yang disediakan. Mapel dan tugas harus sudah ada di sistem.</CardDescription>
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
            <Button onClick={handleImportTeachers} disabled={isImporting || !selectedFile} className="w-full sm:w-auto">
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              {isImporting ? 'Mengimpor...' : 'Impor Guru'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Pastikan file Excel memiliki kolom: <code className="bg-muted px-1 py-0.5 rounded text-xs">Nama Tampilan</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">Email</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">Password</code>, dan opsional <code className="bg-muted px-1 py-0.5 rounded text-xs">Mapel Ditugaskan</code> serta <code className="bg-muted px-1 py-0.5 rounded text-xs">Tugas Tambahan</code> (pisahkan dengan koma).
            Data yang sudah ada (berdasarkan email) akan dilewati.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-wrap">
            <div>
              <CardTitle>Daftar Guru Terdaftar</CardTitle>
              <CardDescription>Berikut adalah daftar semua profil guru dalam sistem.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto justify-end flex-wrap">
              <Button onClick={handleDownloadTeacherTemplate} variant="outline" className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Unduh Template
              </Button>
              <Button onClick={handleExportTeachersData} variant="outline" className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Ekspor Data Guru
              </Button>
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
          ) : teachers.length === 0 && !fetchError ? (
            <div className="flex flex-col items-center justify-center min-h-[150px] text-center p-6 border-2 border-dashed rounded-lg">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">
                Belum Ada Guru
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Belum ada guru yang terdaftar. Silakan tambahkan guru baru menggunakan formulir di atas atau impor dari Excel.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Tampilan</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Mapel Ditugaskan</TableHead>
                    <TableHead>Tugas Tambahan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher) => {
                    const cleanedTugas = teacher.tugasTambahan?.map(t => getActivityName(t));
                    return (
                      <TableRow key={teacher.uid}>
                        <TableCell className="font-medium">{teacher.displayName || 'N/A'}</TableCell>
                        <TableCell>{teacher.email || 'N/A'}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={teacher.assignedMapel?.join(', ') || 'Belum ada'}>
                          {teacher.assignedMapel && teacher.assignedMapel.length > 0 
                            ? teacher.assignedMapel.join(', ') 
                            : <span className="italic text-muted-foreground">Belum ada</span>
                          }
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={cleanedTugas?.join(', ') || 'Tidak ada'}>
                          {cleanedTugas && cleanedTugas.length > 0
                            ? cleanedTugas.join(', ')
                            : <span className="italic text-muted-foreground">Tidak ada</span>
                          }
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Link href={`/admin/teachers/edit/${teacher.uid}`} passHref>
                            <Button variant="ghost" size="icon" className="hover:bg-accent hover:text-accent-foreground" title="Edit Guru & Mapel">
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteConfirmation(teacher)}
                            disabled={isDeleting || teacherToDelete?.uid === teacher.uid}
                            title="Hapus Guru"
                          >
                            {isDeleting && teacherToDelete?.uid === teacher.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            <span className="sr-only">Hapus</span>
                          </Button>
                        </TableCell> 
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {teacherToDelete && (
        <AlertDialog open={!!teacherToDelete} onOpenChange={(isOpen) => !isOpen && setTeacherToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Anda Yakin Ingin Menghapus Profil Guru Ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini akan menghapus profil guru <span className="font-semibold">{teacherToDelete.displayName}</span> ({teacherToDelete.email}) dari sistem SiAP Smapna. 
                Akun login Firebase pengguna ini tidak akan dihapus.
                Tindakan ini tidak dapat diurungkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setTeacherToDelete(null)} disabled={isDeleting}>Batal</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleActualDelete} 
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Ya, Hapus Profil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
