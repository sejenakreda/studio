
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription as FormDesc } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Loader2, AlertCircle, UserCog, BookOpen } from "lucide-react";
import { getUserProfile, updateUserProfile, addActivityLog } from '@/lib/firestoreService';
import type { UserProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';
import { AVAILABLE_MAPEL_FOR_ASSIGNMENT } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const editTeacherSchema = z.object({
  displayName: z.string().min(3, "Nama tampilan minimal 3 karakter"),
  assignedMapel: z.array(z.string()).optional().default([]),
});

type EditTeacherFormData = z.infer<typeof editTeacherSchema>;

export default function EditTeacherPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const teacherId = params.teacherId as string; 
  const { userProfile: currentAdminProfile } = useAuth();

  const [teacherData, setTeacherData] = useState<UserProfile | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const form = useForm<EditTeacherFormData>({
    resolver: zodResolver(editTeacherSchema),
    defaultValues: {
      displayName: "",
      assignedMapel: [],
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
          assignedMapel: fetchedTeacher.assignedMapel || [],
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
        assignedMapel: data.assignedMapel || [],
      });

      const oldMapel = teacherData.assignedMapel?.join(', ') || 'Belum ada';
      const newMapel = data.assignedMapel?.join(', ') || 'Tidak ada';
      await addActivityLog(
        "Profil & Mapel Guru Diperbarui",
        `Profil Guru ${teacherData.email}: Nama -> ${data.displayName}. Mapel: ${oldMapel} -> ${newMapel}. Oleh Admin: ${currentAdminProfile.displayName}`,
        currentAdminProfile.uid,
        currentAdminProfile.displayName
      );

      toast({ title: "Sukses", description: `Data guru ${data.displayName} berhasil diperbarui.` });
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
            <Skeleton className="h-20 w-full rounded-md mt-4" /> 
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Edit Data Guru & Mapel</h1>
          <p className="text-muted-foreground">
            Perbarui nama tampilan dan mata pelajaran yang diampu oleh guru <span className="font-semibold">{teacherData.displayName}</span>.
          </p>
        </div>
      </div>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-6 w-6 text-primary" /> Form Edit Profil & Mapel Guru
              </CardTitle>
              <CardDescription>Ubah nama tampilan dan pilih mapel yang diajarkan. Email dan peran tidak dapat diubah.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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

              <FormField
                control={form.control}
                name="assignedMapel"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary"/>
                        Tugaskan Mata Pelajaran
                      </FormLabel>
                      <FormDesc>Pilih mata pelajaran yang akan diajarkan oleh guru ini.</FormDesc>
                    </div>
                    <ScrollArea className="h-72 w-full rounded-md border p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {AVAILABLE_MAPEL_FOR_ASSIGNMENT.map((mapel) => (
                          <FormField
                            key={mapel}
                            control={form.control}
                            name="assignedMapel"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={mapel}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(mapel)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), mapel])
                                          : field.onChange(
                                              (field.value || []).filter(
                                                (value) => value !== mapel
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">
                                    {mapel}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                    </ScrollArea>
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
