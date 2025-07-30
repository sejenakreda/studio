"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from "date-fns";
import { id as indonesiaLocale } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle } from "lucide-react";
import { getAllLaporanKegiatan, getPrintSettings, getAllUsersByRole } from '@/lib/firestoreService';
import type { LaporanKegiatan, PrintSettings, TugasTambahan, UserProfile } from '@/types';
import { PrintHeader } from '@/components/layout/PrintHeader';
import { PrintFooter } from '@/components/layout/PrintFooter';
import { getActivityName } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const TU_STAFF_ROLES: TugasTambahan[] = ['kepala_tata_usaha', 'operator', 'staf_tu', 'satpam', 'penjaga_sekolah'];
const TU_ROLE_ORDER: TugasTambahan[] = [
    'kepala_tata_usaha',
    'operator',
    'staf_tu',
    'satpam',
    'penjaga_sekolah'
];
const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: format(new Date(0, i), "MMMM", { locale: indonesiaLocale }) }));


export default function PrintLaporanGabunganPage() {
    const searchParams = useSearchParams();
    const [reports, setReports] = useState<LaporanKegiatan[]>([]);
    const [printSettings, setPrintSettings] = useState<PrintSettings | null>(null);
    const [allStaf, setAllStaf] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const year = Number(searchParams.get('year'));
    const month = searchParams.get('month') === 'all' ? 'all' : Number(searchParams.get('month'));
    
    useEffect(() => {
        async function fetchDataForPrint() {
            if (!year || !month) {
                setError("Parameter tahun atau bulan tidak valid.");
                setIsLoading(false);
                return;
            }
            try {
                const [allReports, settings, allUsers] = await Promise.all([
                    getAllLaporanKegiatan(),
                    getPrintSettings(),
                    getAllUsersByRole('guru')
                ]);
                
                const staffUsers = allUsers.filter(u => u.tugasTambahan?.some(t => TU_STAFF_ROLES.includes(t)) || u.tugasTambahan?.includes('kepala_sekolah'));
                setAllStaf(staffUsers);
                setPrintSettings(settings);

                const filteredReports = allReports.filter(report => {
                    const reportDate = report.date.toDate();
                    return (
                        TU_STAFF_ROLES.includes(report.activityId) &&
                        reportDate.getFullYear() === year &&
                        (month === 'all' || reportDate.getMonth() === month - 1)
                    );
                });
                setReports(filteredReports);
            } catch (err: any) {
                setError("Gagal memuat data untuk dicetak: " + err.message);
            } finally {
                setIsLoading(false);
            }
        }
        fetchDataForPrint();
    }, [year, month]);

    const filteredAndGroupedReports = useMemo(() => {
        const grouped = reports.reduce((acc, report) => {
            const groupKey = report.activityId;
            if (!acc[groupKey]) acc[groupKey] = [];
            acc[groupKey].push(report);
            return acc;
        }, {} as Record<TugasTambahan, LaporanKegiatan[]>);

        for (const key in grouped) {
            grouped[key as TugasTambahan].sort((a, b) => a.date.toMillis() - b.date.toMillis());
        }
        return grouped;
    }, [reports]);

    const orderedGroupKeys = useMemo(() => {
        return TU_ROLE_ORDER.filter(role => filteredAndGroupedReports[role] && filteredAndGroupedReports[role].length > 0);
    }, [filteredAndGroupedReports]);

    const academicYear = useMemo(() => {
        const currentMonth = month === 'all' ? new Date().getMonth() : month - 1;
        return currentMonth >= 6 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
    }, [year, month]);

    const printMainTitle = `LAPORAN KEGIATAN KEPALA DAN STAF TATA USAHA TAHUN PELAJARAN ${academicYear}`;
    const printSubTitle = `BULAN: ${month === 'all' ? 'SATU TAHUN' : MONTHS.find(m => m.value === month)?.label.toUpperCase()} ${year}`;

    const kepalaTUName = useMemo(() => allStaf.find(s => s.tugasTambahan?.includes('kepala_tata_usaha'))?.displayName || null, [allStaf]);
    
    useEffect(() => {
        if (!isLoading && !error) {
            setTimeout(() => window.print(), 500); // Delay to allow images and layout to render
        }
    }, [isLoading, error]);
    
    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /> <p className="ml-4">Mempersiapkan dokumen...</p></div>;
    }
    
    if (error) {
        return <div className="p-8"><Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert></div>;
    }

    return (
        <div id="print-area">
             <style jsx global>{`
                @media print {
                    html, body {
                        background-color: #fff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        margin: 0;
                        padding: 0;
                        overflow: hidden !important; /* Hide scrollbars on main elements */
                    }
                    body > * {
                        display: none; /* Hide everything in the body by default */
                    }
                    #print-area {
                        display: block !important; /* Only show the print area */
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        overflow: visible !important;
                    }
                    @page {
                        size: A4 portrait;
                        margin: 1.5cm;
                    }
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        font-size: 9pt !important;
                    }
                    tr {
                        page-break-inside: avoid !important;
                    }
                    th, td {
                        border: 1px solid #000 !important;
                        padding: 4px 6px !important;
                        text-align: left !important;
                        vertical-align: top !important;
                        background-color: transparent !important;
                        word-wrap: break-word !important;
                    }
                    .report-group-title > td {
                        font-weight: bold;
                        background-color: #E2E8F0 !important;
                        padding: 5px 6px !important;
                        font-size: 11pt !important;
                    }
                    .report-header-row > th {
                        font-weight: bold;
                        text-align: center !important;
                        background-color: #F1F5F9 !important;
                    }
                    .text-center { text-align: center !important; }
                    .whitespace-pre-wrap { white-space: pre-wrap !important; }
                }
            `}</style>
            
            <PrintHeader imageUrl={printSettings?.headerImageUrl} />
            <div className="text-center my-4">
              <h2 className="text-lg font-bold uppercase">{printMainTitle}</h2>
              <h3 className="text-base font-bold uppercase">{printSubTitle}</h3>
            </div>
            
            {orderedGroupKeys.length > 0 ? (
                <Table>
                    <tbody>
                    {orderedGroupKeys.flatMap((groupKey) => {
                        const groupName = getActivityName(groupKey);
                        const groupReports = filteredAndGroupedReports[groupKey];
                        
                        const rows = [];
                        rows.push(
                            <tr key={`title-${groupKey}`} className="report-group-title">
                                <td colSpan={5}>{groupName}</td>
                            </tr>
                        );
                        rows.push(
                            <tr key={`header-${groupKey}`} className="report-header-row">
                                <th className="w-[4%]">No.</th>
                                <th className="w-[15%]">Tanggal</th>
                                <th className="w-[21%]">Nama Staf</th>
                                <th className="w-[20%]">Judul Laporan</th>
                                <th className="w-[40%]">Uraian Kegiatan</th>
                            </tr>
                        );

                        groupReports.forEach((r, index) => {
                            rows.push(
                                <tr key={`data-${r.id}`}>
                                    <td className="text-center">{index + 1}</td>
                                    <td>{format(r.date.toDate(), "dd-MM-yyyy")}</td>
                                    <td>{r.createdByDisplayName}</td>
                                    <td>{r.title}</td>
                                    <td className="whitespace-pre-wrap">{r.content || '-'}</td>
                                </tr>
                            );
                        });
                        return rows;
                    })}
                    </tbody>
                </Table>
            ) : <p className="text-center">Tidak ada data untuk periode ini.</p>}
            
            <PrintFooter settings={printSettings} waliKelasName={kepalaTUName} />
        </div>
    );
}
