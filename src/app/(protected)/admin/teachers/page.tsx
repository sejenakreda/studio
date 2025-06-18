
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription as FormDesc } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, UserPlus, Loader2, AlertCircle, Users, Edit, Trash2 } from "lucide-react";
import { getAllUsersByRole, createUserProfile as createUserProfileFirestore, addActivityLog } from '@/lib/firestoreService';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'; // Import signOut
import { auth } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';


const addTeacherSchema = z.object({
  displayName: z.string().min(3, "Nama tampilan minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

type AddTeacherFormData = z.infer<typeof addTeacherSchema>;

export default function ManageTeachersPage() {
  const { toast } = useToast();
  const { userProfile: currentAdminProfileFromAuth } = useAuth(); // Get admin profile from context
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

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
    } catch (error) {
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
    // Capture admin's details BEFORE creating the new user, as auth state will change
    const adminUIDToLog = currentAdminProfileFromAuth?.uid;
    const adminDisplayNameToLog = currentAdminProfileFromAuth?.displayName || currentAdminProfileFromAuth?.email || "Admin";

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      // NEW USER (TEACHER) IS NOW SIGNED IN
      
      await createUserProfileFirestore(userCredential.user, 'guru', data.displayName);
      
      // Sign out the newly created teacher user.
      // This allows onAuthStateChanged to restore the admin's session.
      if (auth.currentUser && auth.currentUser.uid === userCredential.user.uid) {
          await signOut(auth);
      }

      toast({ title: "Sukses", description: `Guru ${data.displayName} berhasil ditambahkan.` });
      
      // Log the activity as the original admin
      if (adminUIDToLog) {
        await addActivityLog(
            "Guru Baru Ditambahkan", 
            `Guru: ${data.displayName} (${data.email})`,
            adminUIDToLog,
            adminDisplayNameToLog
          );
      }

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
            Tambah atau lihat data guru yang terdaftar dalam sistem.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Guru Baru</CardTitle>
          <CardDescription>Masukkan detail guru untuk mendaftarkannya.</CardDescription>
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
          <CardTitle>Daftar Guru Terdaftar</CardTitle>
          <CardDescription>Berikut adalah daftar semua guru dalam sistem.</CardDescription>
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
                Belum ada guru yang terdaftar. Silakan tambahkan guru baru menggunakan formulir di atas.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Tampilan</TableHead>
                  <TableHead>Email</TableHead>
                  {/* <TableHead className="text-right">Aksi</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.uid}>
                    <TableCell className="font-medium">{teacher.displayName || 'N/A'}</TableCell>
                    <TableCell>{teacher.email || 'N/A'}</TableCell>
                    {/* 
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="mr-2" disabled>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" disabled className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Hapus</span>
                      </Button>
                    </TableCell> 
                    */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
