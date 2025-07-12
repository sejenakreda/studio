"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, PlusCircle, Loader2, AlertCircle, BookOpen, Trash2, Edit, CalendarDays, Award, Briefcase, HeartHandshake, CircleDollarSign, Library, Users2, DatabaseZap, ShieldAlert, ShieldQuestion, Users } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';
import { addLaporanKegiatan, getLaporanKegiatanByActivity, deleteLaporanKegiatan, updateLaporanKegiatan, addActivityLog } from '@/lib/firestoreService';
import type { LaporanKegiatan, TugasTambahan } from '@/types';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, getActivityName } from "@/lib/utils";
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
import { Timestamp } from 'firebase/firestore';

const laporanSchema = z.object({
  title: z.string().min(5, "Judul minimal 5 karakter").max(150, "Maksimal 150 karakter"),
  content: z.string().min(10, "Isi laporan minimal 10 karakter").max(2000, "Maksimal 2000 karakter"),
  date: z.date({ required_error: "Tanggal kegiatan harus diisi" }),
});

type LaporanFormData = z.infer<typeof laporanSchema>;

interface SubMenuCategory {
  title: string;
  href: string;
  icon: React.ElementType;
  color: string;
  activityId: TugasTambahan;
}

const allSubMenuCategories: SubMenuCategory[] = [
    { title: "Kesiswaan", href: "/protected/guru/kesiswaan", icon: Users2, color: "text-blue-500", activityId: "kesiswaan" },
    { title: "Kurikulum", href: "/protected/guru/kurikulum", icon: Library, color: "text-green-500", activityId: "kurikulum" },
    { title: "Bendahara", href: "/protected/guru/bendahara", icon: CircleDollarSign, color: "text-amber-500", activityId: "bendahara" },
    { title: "Pembina", href: "/protected/guru/pembina", icon: Award, color: "text-purple-500", activityId: "pembina_osis" },
    { title: "BK", href: "/protected/guru/bk", icon: HeartHandshake, color: "text-rose-500", activityId: "bk" },
    { title: "Operator", href: "/protected/guru/operator", icon: DatabaseZap, color: "text-sky-500", activityId: "operator" },
    { title: "Kepala TU", href: "/protected/guru/tata-usaha", icon: Briefcase, color: "text-slate-500", activityId: "kepala_tata_usaha" },
    { title: "Staf TU", href: "/protected/guru/laporan-kegiatan?context=staf_tu", icon: Users, color: "text-gray-500", activityId: "staf_tu" },
    { title: "Satpam", href: "/protected/guru/laporan-kegiatan?context=satpam", icon: ShieldQuestion, color: "text-indigo-500", activityId: "satpam" },
    { title: "Penjaga Sekolah", href: "/protected/guru/laporan-kegiatan?context=penjaga_sekolah", icon: ShieldAlert, color: "text-red-500", activityId: "penjaga_sekolah" },
];


function SubDashboardMenu() {
    const authContext = useAuth();
    
    const visibleMenuItems = useMemo(() => {
        if (!authContext?.userProfile?.tugasTambahan) return [];

        const reportableTugas = authContext.userProfile.tugasTambahan.filter(tugas => 
            allSubMenuCategories.some(cat => cat.activityId === tugas)
        );

        return allSubMenuCategories.filter(cat => reportableTugas.includes(cat.activityId));
    }, [authContext]);

    if (visibleMenuItems.length <= 1 && !authContext.isStafTu && !authContext.isSatpam && !authContext.isPenjagaSekolah) {
      // If only one major role, don't show a sub-dashboard, let the main component handle it.
      return null;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/protected/guru">
                    <Button variant="outline" size="icon" aria-label="Kembali ke Dasbor Guru">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Pilih Jenis Laporan</h1>
                    <p className="text-muted-foreground">Pilih tugas tambahan yang ingin Anda laporkan.</p>
                </div>
            </div>
             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-x-4 gap-y-8 pt-4">
                {visibleMenuItems.map((item) => (
                    <Link
                        href={item.href}
                        key={item.title}
                        className="flex flex-col items-center justify-center text-center gap-2 group"
                    >
                        <div className="p-4 rounded-full bg-muted/60 group-hover:bg-primary/10 transition-colors duration-200">
                            <item.icon className={`h-8 w-8 transition-colors duration-200 ${item.color || 'text-muted-foreground'} group-hover:text-primary`} />
                        </div>
                        <p className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors duration-200">
                            {item.title}
                        </p>
                    </Link>
                ))}
            </div>
        </div>
    );
}

function ReportFormAndList({ activityId }: { activityId: TugasTambahan }) {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  
  const [reports, setReports] = useState<LaporanKegiatan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [editingReport, setEditingReport] = useState<LaporanKegiatan | null>(null);
  const [reportToDelete, setReportToDelete] = useState<LaporanKegiatan | null>(null);

  const form = useForm<LaporanFormData>({
    resolver: zodResolver(laporanSchema),
    defaultValues: {
      title: "",
      content: "",
      date: new Date(),
    }
  });

  const fetchReports = useCallback(async () => {
    if (!activityId || !userProfile?.uid) {
        setReports([]);
        return;
    };
    setIsLoading(true);
    setError(null);
    try {
      const fetchedReports = await getLaporanKegiatanByActivity(activityId, userProfile.uid);
      const sortedReports = fetchedReports.sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      setReports(sortedReports);
    } catch (err: any) {
      setError(`Gagal memuat laporan untuk ${getActivityName(activityId)}.`);
      toast({ variant: "destructive", title: "Error Memuat Data", description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [activityId, toast, userProfile?.uid]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const onSubmit = async (data: LaporanFormData) => {
    if (!userProfile || !activityId) return toast({ variant: "destructive", title: "Error", description: "Sesi atau aktivitas tidak valid." });
    setIsSubmitting(true);
    
    try {
        if (editingReport) {
            await updateLaporanKegiatan(editingReport.id!, { title: data.title, content: data.content, date: Timestamp.fromDate(data.date) });
            await addActivityLog(`Laporan Kegiatan Diperbarui`, `Judul: "${data.title}" oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName || "Guru");
            toast({ title: "Sukses", description: "Laporan kegiatan berhasil diperbarui." });
        } else {
            const payload: Omit<LaporanKegiatan, 'id' | 'createdAt' | 'updatedAt'> = {
                activityId: activityId,
                activityName: getActivityName(activityId),
                title: data.title,
                content: data.content,
                date: Timestamp.fromDate(data.date),
                createdByUid: userProfile.uid,
                createdByDisplayName: userProfile.displayName || "Guru",
            };
            await addLaporanKegiatan(payload);
            await addActivityLog(`Laporan Kegiatan Ditambahkan`, `Judul: "${data.title}" oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName || "Guru");
            toast({ title: "Sukses", description: "Laporan kegiatan berhasil disimpan." });
        }
        form.reset({ title: "", content: "", date: new Date() });
        setEditingReport(null);
        fetchReports();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: err.message });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleEdit = (report: LaporanKegiatan) => {
    setEditingReport(report);
    form.reset({
      title: report.title,
      content: report.content,
      date: report.date.toDate(),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async () => {
    if (!reportToDelete || !userProfile) return;
    try {
      await deleteLaporanKegiatan(reportToDelete.id!);
      await addActivityLog("Laporan Kegiatan Dihapus", `Laporan "${reportToDelete.title}" dihapus oleh ${userProfile.displayName}`, userProfile.uid, userProfile.displayName || "Guru");
      toast({ title: "Sukses", description: "Laporan berhasil dihapus." });
      setReportToDelete(null);
      fetchReports();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message });
    }
  };

  return (
      <div className="space-y-6">
          <div className="flex items-center gap-4">
              <Link href="/protected/guru">
                  <Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button>
              </Link>
              <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Laporan: {getActivityName(activityId)}</h1>
                  <p className="text-muted-foreground">Buat dan kelola laporan untuk tugas tambahan Anda.</p>
              </div>
          </div>
          <Card>
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                      <CardHeader>
                          <CardTitle>{editingReport ? 'Edit Laporan' : 'Buat Laporan Baru'}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                          <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Judul Laporan</FormLabel><FormControl><Input placeholder="cth: Laporan Kegiatan Class Meeting" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Tanggal Kegiatan</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: indonesiaLocale }) : <span>Pilih tanggal</span>}<CalendarDays className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="content" render={({ field }) => (<FormItem><FormLabel>Isi Laporan</FormLabel><FormControl><Textarea placeholder="Jelaskan detail kegiatan, hasil, dan evaluasi..." {...field} rows={5} /></FormControl><FormMessage /></FormItem>)} />
                      </CardContent>
                      <CardFooter className="gap-2">
                          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}{editingReport ? 'Simpan Perubahan' : 'Tambah Laporan'}</Button>
                          {editingReport && (<Button variant="outline" onClick={() => { setEditingReport(null); form.reset({ title: "", content: "", date: new Date() }); }}>Batal Edit</Button>)}
                      </CardFooter>
                  </form>
              </Form>
          </Card>
          <Card>
              <CardHeader>
                  <CardTitle>Riwayat Laporan: {getActivityName(activityId)}</CardTitle>
              </CardHeader>
              <CardContent>
                  {isLoading ? (<Skeleton className="h-40 w-full" />)
                  : error ? (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>)
                  : reports.length === 0 ? (
                      <div className="text-center py-10"><BookOpen className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-2 text-sm font-semibold">Belum Ada Laporan</h3><p className="mt-1 text-sm text-muted-foreground">Anda belum membuat laporan untuk kegiatan ini.</p></div>
                  ) : (
                      <div className="overflow-x-auto">
                          <Table><TableHeader><TableRow><TableHead>Judul</TableHead><TableHead>Tgl. Kegiatan</TableHead><TableHead>Isi Laporan</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                              <TableBody>
                                  {reports.map(r => (
                                      <TableRow key={r.id}>
                                          <TableCell className="font-medium max-w-xs truncate">{r.title}</TableCell>
                                          <TableCell>{format(r.date.toDate(), "dd MMM yyyy")}</TableCell>
                                          <TableCell className="max-w-xs truncate">{r.content}</TableCell>
                                          <TableCell className="text-right space-x-1">
                                              <Button variant="outline" size="icon" onClick={() => handleEdit(r)}><Edit className="h-4 w-4" /></Button>
                                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setReportToDelete(r)}><Trash2 className="h-4 w-4" /></Button>
                                          </TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                      </div>
                  )}
              </CardContent>
          </Card>
          {reportToDelete && (
              <AlertDialog open={!!reportToDelete} onOpenChange={() => setReportToDelete(null)}>
                  <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle><AlertDialogDescription>Yakin ingin menghapus laporan "{reportToDelete.title}"? Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
          )}
      </div>
  );
}

export default function LaporanKegiatanSwitcher() {
  const { userProfile } = useAuth();
  const searchParams = useSearchParams();
  const context = searchParams.get('context') as TugasTambahan | null;
  const routerActivity = searchParams.get('activityId') as TugasTambahan | null;

  const reportableActivities = useMemo(() => {
    if (!userProfile?.tugasTambahan) return [];
    return userProfile.tugasTambahan.filter(tugas => 
      ['kesiswaan', 'kurikulum', 'bendahara', 'bk', 'operator', 'staf_tu', 'satpam', 'penjaga_sekolah', 'kepala_tata_usaha', 'kepala_sekolah'].includes(tugas) || tugas.startsWith('pembina_')
    );
  }, [userProfile]);

  const activityToShow = context || routerActivity;

  if (activityToShow) {
    return <ReportFormAndList activityId={activityToShow} />;
  }

  if (reportableActivities.length > 1) {
    return <SubDashboardMenu />;
  }

  if (reportableActivities.length === 1) {
    return <ReportFormAndList activityId={reportableActivities[0]} />;
  }
  
  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Link href="/protected/guru"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Laporan Kegiatan</h1>
                <p className="text-muted-foreground">Anda tidak memiliki tugas tambahan yang memerlukan pelaporan.</p>
            </div>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Tidak Ada Akses</AlertTitle>
          <AlertDescription>
            Menu ini hanya untuk guru dengan tugas tambahan tertentu. Jika ini adalah kesalahan, hubungi Admin.
          </AlertDescription>
        </Alert>
    </div>
  );
}