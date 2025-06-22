
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle, Users2, Download, Filter } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getStudents } from '@/lib/firestoreService';
import type { Siswa, TugasTambahan } from '@/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge';


const ALL_PEMBINA_ROLES: TugasTambahan[] = [
    'pembina_osis', 
    'pembina_eskul_pmr', 
    'pembina_eskul_paskibra', 
    'pembina_eskul_pramuka', 
    'pembina_eskul_karawitan', 
    'pembina_eskul_pencak_silat', 
    'pembina_eskul_volly_ball'
];

const getActivityName = (activityId: TugasTambahan): string => {
    if (activityId === 'pembina_osis') return 'OSIS';
    return activityId
        .replace('pembina_eskul_', '')
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export default function ActivityReportsPage() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Siswa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedStudents = await getStudents();
      setStudents(fetchedStudents);
    } catch (err: any) {
      setError("Gagal memuat data siswa.");
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activityGroups = useMemo(() => {
    const groups = new Map<TugasTambahan, Siswa[]>();
    ALL_PEMBINA_ROLES.forEach(role => groups.set(role, []));

    students.forEach(student => {
      student.kegiatan?.forEach(activity => {
        if (groups.has(activity)) {
          groups.get(activity)!.push(student);
        }
      });
    });
    
    // Sort students within each group by name
    groups.forEach(studentList => {
        studentList.sort((a, b) => a.nama.localeCompare(b.nama));
    });

    return groups;
  }, [students]);

  const handleDownloadExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    activityGroups.forEach((members, activityId) => {
      if (members.length > 0) {
        const sheetName = getActivityName(activityId).substring(0, 31);
        const dataForExcel = members.map(member => ({
          'Nama Siswa': member.nama,
          'NIS': member.nis,
          'Kelas': member.kelas,
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
        const wscols = [ {wch:30}, {wch:15}, {wch:10} ];
        worksheet['!cols'] = wscols;
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }
    });

    if (workbook.SheetNames.length === 0) {
        toast({ variant: "default", title: "Tidak ada data untuk diunduh." });
        return;
    }

    XLSX.writeFile(workbook, "laporan_keanggotaan_kegiatan.xlsx");
    toast({ title: "Unduhan Dimulai", description: "File Excel sedang disiapkan." });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin"><Button variant="outline" size="icon" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline flex items-center gap-2">
              <Users2 className="h-8 w-8 text-primary" /> Laporan Keanggotaan
            </h1>
            <p className="text-muted-foreground">Daftar anggota untuk setiap kegiatan OSIS dan Ekstrakurikuler.</p>
          </div>
        </div>
        <Button onClick={handleDownloadExcel} variant="outline" disabled={isLoading}><Download className="mr-2 h-4 w-4" />Unduh Semua</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Kegiatan</CardTitle>
          <CardDescription>Klik pada setiap kegiatan untuk melihat daftar anggotanya.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (<div className="space-y-2"><Skeleton className="h-12 w-full"/><Skeleton className="h-12 w-full"/><Skeleton className="h-12 w-full"/></div>)
          : error ? (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>)
          : (
            <Accordion type="multiple" className="w-full">
              {Array.from(activityGroups.entries()).map(([activityId, members]) => (
                <AccordionItem key={activityId} value={activityId}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4">
                        <span className="font-semibold text-base">{getActivityName(activityId)}</span>
                        <Badge variant="secondary">{members.length} Anggota</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {members.length === 0 ? (
                        <p className="text-sm text-muted-foreground px-4 py-6 text-center">Belum ada anggota yang terdaftar untuk kegiatan ini.</p>
                    ) : (
                        <div className="overflow-x-auto border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nama Siswa</TableHead>
                                        <TableHead>NIS</TableHead>
                                        <TableHead>Kelas</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {members.map(member => (
                                        <TableRow key={member.id}>
                                            <TableCell className="font-medium">{member.nama}</TableCell>
                                            <TableCell>{member.nis}</TableCell>
                                            <TableCell>{member.kelas}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
