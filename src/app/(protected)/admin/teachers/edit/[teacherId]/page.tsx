
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { useRouter, useParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription as FormDesc } from "@/components/ui/form";
import { ArrowLeft, Save, Loader2, AlertCircle, UserCog } from "lucide-react";
import { getUserProfile, updateUserProfile, addActivityLog } from '@/lib/firestoreService';
import type { UserProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';

const editTeacherSchema = z.object({
  displayName: z.string().min(3, "Nama tampilan minimal 3 karakter"),
});

type EditTeacherFormData = z.infer<typeof editTeacherSchema>;

export default function EditTeacherPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const teacherId = params.teacherId as string; // Firestore document ID (user UID)
  const { userProfile: currentAdminProfile } = useAuth();

  const [teacherData, setTeacherData] = useState<UserProfile | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const form = useForm<EditTeacherFormData>({
    resolver: zodResolver(editTeacherSchema),
    defaultValues: {
      displayName: "",
    },
  });

  const fetchTeacherData = useCallback(async (id: string) => {
    if (!id) {
      setIsLoadingData(false);
      setFetchError("ID Guru tidak valid.");
      toast({ variant: "destructive", title: "Error", description: "ID Guru tidak ditemukan." });
      router.push('/admin/teachers'); 
      return;
    }
    setIsLoadingData(true);
    setFetchError(null);
    try {
      const fetchedTeacher = await getUserProfile(id);
      if (fetchedTeacher && fetchedTeacher.role === 'guru') {
        setTeacherData(fetchedTeacher);
        form.reset({
          displayName: fetchedTeacher.displayName || "",
        });
      } else {
        setFetchError("Data guru tidak ditemukan atau peran tidak sesuai.");
        toast({ variant: "destructive", title: "Error", description: "Data guru tidak ditemukan." });
        router.push('/admin/teachers');
      }
    } catch (error) {
      console.error("Error fetching teacher data:", error);
      setFetchError("Gagal memuat data guru. Silakan coba lagi.");
      toast({ variant: "destructive", title: "Error", description: "Gagal memuat data guru." });
    } finally {
      setIsLoadingData(false);
    }
  }, [toast, form, router]);

  useEffect(() => {
    if (teacherId) {
      fetchTeacherData(teacherId);
    }
  }, [teacherId, fetchTeacherData]);

  const onSubmit = async (data: EditTeacherFormData) => {
    if (!teacherId || !teacherData || !currentAdminProfile?.uid || !currentAdminProfile?.displayName) {
      toast({ variant: "destructive", title: "Error", description: "Data guru atau admin tidak lengkap untuk pembaruan." });
      return;
    }
    setIsSubmitting(true);
    try {
      await updateUserProfile(teacherId, {
        displayName: data.displayName,
      });

      await addActivityLog(
        "Profil Guru Diperbarui",
        `Nama tampilan guru ${teacherData.email} (sebelumnya: ${teacherData.displayName}) diubah menjadi ${data.displayName} oleh Admin: ${currentAdminProfile.displayName}`,
        currentAdminProfile.uid,
        currentAdminProfile.displayName
      );

      toast({ title: "Sukses", description: `Nama tampilan guru ${data.displayName} berhasil diperbarui.` });
      router.push('/admin/teachers');
    } catch (error: any) {
      console.error("Error updating teacher:", error);
      toast({ variant: "destructive", title: "Error", description: "Gagal memperbarui data guru. Silakan coba lagi." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div><Skeleton className="h-8 w-64 mb-2 rounded-md" /><Skeleton className="h-5 w-80 rounded-md" /></div>
        </div>
        <Card><CardHeader><Skeleton className="h-7 w-48 mb-2 rounded-md" /><Skeleton className="h-4 w-72 rounded-md" /></CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-5 w-32 rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ))}
          </CardContent>
          <CardFooter><Skeleton className="h-10 w-28 rounded-md" /></CardFooter>
        </Card>
      </div>
    );
  }

  if (fetchError || !teacherData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/teachers">
            <Button variant="outline" size="icon" aria-label="Kembali ke Daftar Guru">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div><h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Error Memuat Data</h1></div>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat</AlertTitle>
          <AlertDescription>{fetchError || "Data guru tidak ditemukan. Silakan kembali dan coba lagi."}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/admin/teachers')}>Kembali ke Daftar Guru</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/teachers">
          <Button variant="outline" size="icon" aria-label="Kembali ke Daftar Guru">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Edit Data Guru</h1>
          <p className="text-muted-foreground">
            Perbarui nama tampilan guru <span className="font-semibold">{teacherData.displayName}</span>.
          </p>
        </div>
      </div>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-6 w-6 text-primary" /> Form Edit Profil Guru
              </CardTitle>
              <CardDescription>Ubah nama tampilan guru. Email dan peran tidak dapat diubah melalui form ini.</CardDescription>
            </CardHeader>
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
              <FormItem>
                <FormLabel>Email Guru</FormLabel>
                <FormControl>
                  <Input value={teacherData.email || ""} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
                </FormControl>
                <FormDesc>Email tidak dapat diubah.</FormDesc>
              </FormItem>
              <FormItem>
                <FormLabel>Peran</FormLabel>
                <FormControl>
                  <Input value={teacherData.role} readOnly disabled className="bg-muted/50 cursor-not-allowed capitalize" />
                </FormControl>
                <FormDesc>Peran tidak dapat diubah.</FormDesc>
              </FormItem>
               <FormItem>
                <FormLabel>UID Guru</FormLabel>
                <FormControl>
                  <Input value={teacherData.uid} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
                </FormControl>
                <FormDesc>UID unik pengguna.</FormDesc>
              </FormItem>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Simpan Perubahan
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
