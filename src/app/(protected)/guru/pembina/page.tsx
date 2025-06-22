
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { id as indonesiaLocale } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Award, Loader2, AlertCircle, Users, UserPlus, Trash2, Search, BookOpen, PlusCircle, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getStudents, updateStudentActivity, addActivityLog, getLaporanKegiatanByActivity, addLaporanKegiatan, deleteLaporanKegiatan } from '@/lib/firestoreService';
import type { Siswa, TugasTambahan, LaporanKegiatan } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Timestamp } from 'firebase/firestore';


const getActivityName = (activityId: TugasTambahan): string => {
    if (activityId === 'pembina_osis') return 'OSIS';
    if (activityId === 'kesiswaan') return 'Kesiswaan';
    return activityId
        .replace('pembina_eskul_', '')
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const laporanSchema = z.object({
    title: z.string().min(5, "Judul minimal 5 karakter").max(100, "Judul maksimal 100 karakter"),
    date: z.date({ required_error: "Tanggal kegiatan harus dipilih" }),
    content: z.string().min(10, "Isi laporan minimal 10 karakter").max(5000, "Isi laporan maksimal 5000 karakter"),
});

type LaporanFormData = z.infer<typeof laporanSchema>;

interface MemberManagementProps {
    activityId: TugasTambahan;
    allStudents: Siswa[];
    onDataChange: () => void;
}

function MemberManagement({ activityId, allStudents, onDataChange }: MemberManagementProps) {
    const { userProfile } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [studentToRemove, setStudentToRemove] = useState<Siswa | null>(null);
    const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);

    const members = useMemo(() => allStudents.filter(s => s.kegiatan?.includes(activityId)), [allStudents, activityId]);
    const nonMembers = useMemo(() => {
        const memberIds = new Set(members.map(m => m.id));
        return allStudents.filter(s => !memberIds.has(s.id!));
    }, [allStudents, members]);

    const handleAddMember = async (student: Siswa) => {
        if (!userProfile) return;
        setIsSubmitting(true);
        try {
            await updateStudentActivity(student.id!, activityId, 'add');
            await addActivityLog(`Keanggotaan Diperbarui`, `${student.nama} ditambahkan ke ${getActivityName(activityId)} oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName || 'Pembina');
            toast({ title: "Sukses", description: `${student.nama} berhasil ditambahkan.` });
            onDataChange();
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
            await addActivityLog(`Keanggotaan Diperbarui`, `${studentToRemove.nama} dikeluarkan dari ${getActivityName(activityId)} oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName || 'Pembina');
            toast({ title: "Sukses", description: `${studentToRemove.nama} berhasil dikeluarkan.` });
            onDataChange();
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
                    <DialogTrigger asChild><Button><UserPlus className="mr-2 h-4 w-4" /> Tambah Anggota</Button></DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>Tambah Anggota ke {getActivityName(activityId)}</DialogTitle><DialogDescription>Pilih siswa untuk ditambahkan.</DialogDescription></DialogHeader>
                        <Command><CommandInput placeholder="Cari nama siswa..." /><CommandList><CommandEmpty>Tidak ada siswa ditemukan.</CommandEmpty>
                            <CommandGroup>{nonMembers.map((student) => (<CommandItem key={student.id} value={student.nama} onSelect={() => handleAddMember(student)} disabled={isSubmitting}>{student.nama} ({student.kelas})</CommandItem>))}</CommandGroup>
                        </CommandList></Command>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="border rounded-md"><Table><TableHeader><TableRow><TableHead>Nama Siswa</TableHead><TableHead>Kelas</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                <TableBody>{members.length === 0 ? (<TableRow><TableCell colSpan={3} className="text-center h-24">Belum ada anggota.</TableCell></TableRow>) : (members.map((member) => (<TableRow key={member.id}><TableCell className="font-medium">{member.nama}</TableCell><TableCell>{member.kelas}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setStudentToRemove(member)} disabled={isSubmitting}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)))}</TableBody>
            </Table></div>
            {studentToRemove && (<AlertDialog open={!!studentToRemove} onOpenChange={() => setStudentToRemove(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Anda Yakin?</AlertDialogTitle><AlertDialogDescription>Ini akan mengeluarkan <span className="font-semibold">{studentToRemove.nama}</span> dari keanggotaan {getActivityName(activityId)}.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel><AlertDialogAction onClick={handleRemoveMember} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/80">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Ya, Keluarkan</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
        </div>
    );
}

interface ReportManagementProps {
    activityId: TugasTambahan;
    onDataChange: () => void;
}

function ReportManagement({ activityId, onDataChange }: ReportManagementProps) {
    const { userProfile } = useAuth();
    const { toast } = useToast();
    const [laporanList, setLaporanList] = useState<LaporanKegiatan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [reportToDelete, setReportToDelete] = useState<LaporanKegiatan | null>(null);
    const form = useForm<LaporanFormData>({ resolver: zodResolver(laporanSchema), defaultValues: { title: "", date: new Date(), content: "" } });

    useEffect(() => {
        const fetchReports = async () => {
            setIsLoading(true);
            try {
                const reports = await getLaporanKegiatanByActivity(activityId);
                setLaporanList(reports);
            } catch (error) {
                toast({ variant: "destructive", title: "Error", description: "Gagal memuat laporan kegiatan." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchReports();
    }, [activityId, toast, onDataChange]);

    const onSubmit = async (data: LaporanFormData) => {
        if (!userProfile) return;
        setIsSubmitting(true);
        try {
            await addLaporanKegiatan({
                activityId, activityName: getActivityName(activityId), ...data,
                date: Timestamp.fromDate(data.date),
                createdByUid: userProfile.uid, createdByDisplayName: userProfile.displayName || 'Pembina',
            });
            await addActivityLog("Laporan Kegiatan Dibuat", `Laporan "${data.title}" untuk ${getActivityName(activityId)} dibuat oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName || 'Pembina');
            toast({ title: "Sukses", description: "Laporan kegiatan berhasil disimpan." });
            form.reset(); setIsFormOpen(false); onDataChange();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Gagal Menyimpan", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteReport = async () => {
        if (!reportToDelete?.id) return;
        setIsSubmitting(true);
        try {
            await deleteLaporanKegiatan(reportToDelete.id);
            toast({ title: "Sukses", description: "Laporan kegiatan berhasil dihapus." });
            setReportToDelete(null);
            onDataChange();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Gagal Hapus", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <div className="flex justify-end mb-4">
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" /> Buat Laporan Baru</Button></DialogTrigger>
                    <DialogContent className="sm:max-w-[525px]">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)}>
                                <DialogHeader>
                                    <DialogTitle>Form Laporan Kegiatan</DialogTitle>
                                    <DialogDescription>Isi detail agenda atau laporan kegiatan yang telah dilaksanakan.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Judul Laporan/Agenda</FormLabel><FormControl><Input placeholder="cth: Rapat Persiapan Lomba 17an" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Tanggal Kegiatan</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={`w-full justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: indonesiaLocale }) : (<span>Pilih tanggal</span>)}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="content" render={({ field }) => (<FormItem><FormLabel>Isi Laporan/Rincian Agenda</FormLabel><FormControl><Textarea placeholder="Tuliskan detail laporan di sini..." {...field} rows={6} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmitting}>Batal</Button></DialogClose>
                                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Menyimpan...</> : "Simpan Laporan"}</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Judul</TableHead>
                            <TableHead>Tanggal</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (<TableRow><TableCell colSpan={3} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : laporanList.length === 0 ? (<TableRow><TableCell colSpan={3} className="text-center h-24">Belum ada laporan.</TableCell></TableRow>) : (laporanList.map((laporan) => (<TableRow key={laporan.id}><TableCell className="font-medium max-w-sm truncate" title={laporan.title}>{laporan.title}</TableCell><TableCell>{format(laporan.date.toDate(), "dd MMM yyyy", { locale: indonesiaLocale })}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setReportToDelete(laporan)} disabled={isSubmitting}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)))}
                    </TableBody>
                </Table>
            </div>
            {reportToDelete && (
                <AlertDialog open={!!reportToDelete} onOpenChange={() => setReportToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
                            <AlertDialogDescription>Ini akan menghapus laporan <span className="font-semibold">{reportToDelete.title}</span>. Tindakan ini tidak dapat diurungkan.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteReport} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/80">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Ya, Hapus</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}

export default function PembinaDashboardPage() {
    const { userProfile, isPembinaEskul, isPembinaOsis, isKesiswaan } = useAuth();
    const [allStudents, setAllStudents] = useState<Siswa[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [forceRerender, setForceRerender] = useState(0);

    const pembinaRoles = useMemo(() => {
        const roles = userProfile?.tugasTambahan?.filter(t => t.startsWith('pembina_') || t === 'kesiswaan') || [];
        return roles;
    }, [userProfile]);

    const fetchData = useCallback(async () => {
        setIsLoading(true); setError(null);
        try {
            const studentList = await getStudents();
            setAllStudents(studentList);
            setForceRerender(prev => prev + 1);
        } catch (err: any) {
            setError("Gagal memuat data siswa.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isPembinaOsis || isPembinaEskul || isKesiswaan) {
            fetchData();
        } else { setIsLoading(false); }
    }, [isPembinaOsis, isPembinaEskul, isKesiswaan, fetchData]);


    if (isLoading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    if (!isPembinaOsis && !isPembinaEskul && !isKesiswaan) return (<Card><CardHeader><CardTitle>Akses Terbatas</CardTitle></CardHeader><CardContent><Alert variant="default"><Award className="h-4 w-4" /><AlertTitle>Tidak Ada Tugas Pembina/Kesiswaan</AlertTitle><AlertDescription>Halaman ini hanya untuk guru dengan tugas tambahan sebagai Pembina OSIS, Ekstrakurikuler atau Kesiswaan.</AlertDescription></Alert></CardContent></Card>);
    if (error) return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4"><Link href="/guru"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
                <div><h1 className="text-3xl font-bold tracking-tight text-foreground font-headline flex items-center gap-2"><Award className="h-8 w-8 text-primary" />Dasbor Pembina & Kesiswaan</h1><p className="text-muted-foreground">Kelola keanggotaan dan laporan untuk kegiatan yang Anda ampu.</p></div>
            </div>
            <Card>
                <CardHeader><CardTitle>Manajemen Kegiatan</CardTitle><CardDescription>Pilih tab untuk melihat dan mengelola setiap kegiatan.</CardDescription></CardHeader>
                <CardContent>
                    <Tabs defaultValue={pembinaRoles[0]} className="w-full">
                        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 h-auto">
                            {pembinaRoles.map(role => (<TabsTrigger key={role} value={role}>{getActivityName(role)}</TabsTrigger>))}
                        </TabsList>
                        {pembinaRoles.map(role => (<TabsContent key={role} value={role} className="mt-4">
                            <Tabs defaultValue="laporan" className="w-full">
                                <TabsList><TabsTrigger value="laporan">Laporan Kegiatan</TabsTrigger><TabsTrigger value="anggota">Anggota</TabsTrigger></TabsList>
                                <TabsContent value="laporan" className="mt-4"><ReportManagement key={`report-${role}-${forceRerender}`} activityId={role} onDataChange={fetchData} /></TabsContent>
                                <TabsContent value="anggota" className="mt-4"><MemberManagement key={`member-${role}-${forceRerender}`} activityId={role} allStudents={allStudents} onDataChange={fetchData} /></TabsContent>
                            </Tabs>
                        </TabsContent>))}
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
