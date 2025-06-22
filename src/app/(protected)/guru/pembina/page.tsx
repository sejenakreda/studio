
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Award, Loader2, AlertCircle, Users, UserPlus, Trash2, Search } from "lucide-react";
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getStudents, updateStudentActivity, addActivityLog } from '@/lib/firestoreService';
import type { Siswa, TugasTambahan } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";


// Helper function to get a display-friendly name from a TugasTambahan ID
const getActivityName = (activityId: TugasTambahan): string => {
    if (activityId === 'pembina_osis') return 'OSIS';
    return activityId
        .replace('pembina_eskul_', '')
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

interface MemberManagementProps {
    activityId: TugasTambahan;
    allStudents: Siswa[];
    onMemberChange: () => void;
}

function MemberManagement({ activityId, allStudents, onMemberChange }: MemberManagementProps) {
    const { userProfile } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [studentToRemove, setStudentToRemove] = useState<Siswa | null>(null);
    const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);

    const members = useMemo(() => {
        return allStudents.filter(s => s.kegiatan?.includes(activityId));
    }, [allStudents, activityId]);

    const nonMembers = useMemo(() => {
        const memberIds = new Set(members.map(m => m.id));
        return allStudents.filter(s => !memberIds.has(s.id));
    }, [allStudents, members]);

    const handleAddMember = async (student: Siswa) => {
        if (!userProfile) return;
        setIsSubmitting(true);
        try {
            await updateStudentActivity(student.id!, activityId, 'add');
            await addActivityLog(
                `Keanggotaan Diperbarui`,
                `${student.nama} ditambahkan ke ${getActivityName(activityId)} oleh ${userProfile.displayName}`,
                userProfile.uid,
                userProfile.displayName || 'Pembina'
            );
            toast({ title: "Sukses", description: `${student.nama} berhasil ditambahkan.` });
            onMemberChange();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Gagal Menambahkan", description: error.message });
        } finally {
            setIsSubmitting(false);
            setIsAddMemberDialogOpen(false);
        }
    };

    const handleRemoveMember = async () => {
        if (!studentToRemove || !userProfile) return;
        setIsSubmitting(true);
        try {
            await updateStudentActivity(studentToRemove.id!, activityId, 'remove');
            await addActivityLog(
                `Keanggotaan Diperbarui`,
                `${studentToRemove.nama} dikeluarkan dari ${getActivityName(activityId)} oleh ${userProfile.displayName}`,
                userProfile.uid,
                userProfile.displayName || 'Pembina'
            );
            toast({ title: "Sukses", description: `${studentToRemove.nama} berhasil dikeluarkan.` });
            onMemberChange();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Gagal Mengeluarkan", description: error.message });
        } finally {
            setIsSubmitting(false);
            setStudentToRemove(null);
        }
    };

    return (
        <div>
            <div className="flex justify-end mb-4">
                <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><UserPlus className="mr-2 h-4 w-4" /> Tambah Anggota</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Tambah Anggota ke {getActivityName(activityId)}</DialogTitle>
                            <DialogDescription>Pilih siswa dari daftar untuk ditambahkan. Siswa yang sudah menjadi anggota tidak akan muncul.</DialogDescription>
                        </DialogHeader>
                        <Command>
                            <CommandInput placeholder="Cari nama siswa..." />
                            <CommandList>
                                <CommandEmpty>Tidak ada siswa ditemukan.</CommandEmpty>
                                <CommandGroup>
                                    {nonMembers.map((student) => (
                                        <CommandItem
                                            key={student.id}
                                            value={student.nama}
                                            onSelect={() => handleAddMember(student)}
                                            disabled={isSubmitting}
                                        >
                                            {student.nama} ({student.kelas})
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama Siswa</TableHead>
                            <TableHead>Kelas</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {members.length === 0 ? (
                            <TableRow><TableCell colSpan={3} className="text-center h-24">Belum ada anggota.</TableCell></TableRow>
                        ) : (
                            members.map((member) => (
                                <TableRow key={member.id}>
                                    <TableCell className="font-medium">{member.nama}</TableCell>
                                    <TableCell>{member.kelas}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setStudentToRemove(member)} disabled={isSubmitting}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {studentToRemove && (
                 <AlertDialog open={!!studentToRemove} onOpenChange={() => setStudentToRemove(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Ini akan mengeluarkan <span className="font-semibold">{studentToRemove.nama}</span> dari keanggotaan {getActivityName(activityId)}.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={handleRemoveMember} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/80">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Ya, Keluarkan
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}

export default function PembinaDashboardPage() {
    const { userProfile, isPembinaEskul, isPembinaOsis } = useAuth();
    const [allStudents, setAllStudents] = useState<Siswa[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const pembinaRoles = useMemo(() => {
        return userProfile?.tugasTambahan?.filter(t => t.startsWith('pembina_')) || [];
    }, [userProfile]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const studentList = await getStudents();
            setAllStudents(studentList);
        } catch (err: any) {
            setError("Gagal memuat data siswa.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isPembinaOsis || isPembinaEskul) {
            fetchData();
        } else {
            setIsLoading(false);
        }
    }, [isPembinaOsis, isPembinaEskul, fetchData]);


    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    if (!isPembinaOsis && !isPembinaEskul) {
        return (
             <Card>
                <CardHeader>
                  <CardTitle>Akses Terbatas</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="default">
                        <Award className="h-4 w-4" />
                        <AlertTitle>Tidak Ada Tugas Pembina</AlertTitle>
                        <AlertDescription>
                          Halaman ini hanya untuk guru dengan tugas tambahan sebagai Pembina OSIS atau Ekstrakurikuler.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }
    
    if (error) {
        return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/guru">
                    <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Guru">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline flex items-center gap-2">
                        <Award className="h-8 w-8 text-primary" />
                        Dasbor Pembina
                    </h1>
                    <p className="text-muted-foreground">
                        Kelola keanggotaan untuk OSIS dan Ekstrakurikuler yang Anda ampu.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Manajemen Keanggotaan</CardTitle>
                    <CardDescription>Pilih tab untuk melihat dan mengelola anggota dari setiap kegiatan.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue={pembinaRoles[0]} className="w-full">
                        <TabsList>
                            {pembinaRoles.map(role => (
                                <TabsTrigger key={role} value={role}>{getActivityName(role)}</TabsTrigger>
                            ))}
                        </TabsList>
                        {pembinaRoles.map(role => (
                             <TabsContent key={role} value={role}>
                                <MemberManagement 
                                    activityId={role} 
                                    allStudents={allStudents}
                                    onMemberChange={fetchData}
                                />
                             </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
