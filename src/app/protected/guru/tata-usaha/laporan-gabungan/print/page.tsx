
"use client";

import React, { useEffect, useState, useMemo } from 'react';
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

    const kepalaTU = useMemo(() => allStaf.find(s => s.tugasTambahan?.includes('kepala_tata_usaha')) || null, [allStaf]);
    
    useEffect(() => {
        if (!isLoading && !error) {
            setTimeout(() => window.print(), 1000);
        }
    }, [isLoading, error]);
    
    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /> <p className="ml-4">Mempersiapkan dokumen...</p></div>;
    }
    
    if (error) {
        return <div className="p-8"><Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert></div>;
    }

    return (
        <>
            <style jsx global>{`
                @media print {
                    html, body {
                        width: 210mm;
                        height: auto;
                        font-size: 10pt;
                        background: #fff !important;
                        color: #000 !important;
                        margin: 0;
                        padding: 0;
                        overflow: visible !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    @page {
                        size: A4 portrait;
                        margin: 2cm 1.5cm;
                    }
                    body > * {
                        display: none;
                    }
                    #print-container, #print-container * {
                        display: block;
                    }
                    .print-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 9pt;
                    }
                    .print-table tr, .print-table td, .print-table th {
                        page-break-inside: avoid !important;
                    }
                    .print-table th, .print-table td {
                        border: 1px solid #000;
                        padding: 4px 6px;
                        text-align: left;
                        vertical-align: top;
                        word-wrap: break-word;
                    }
                    .report-group-title > td {
                        font-weight: bold;
                        background-color: #E2E8F0 !important;
                        padding: 5px 6px !important;
                        font-size: 11pt !important;
                        border: 1px solid #000;
                    }
                    .report-header-row > th {
                        font-weight: bold;
                        text-align: center !important;
                        background-color: #F8FAFC !important;
                    }
                }
            `}</style>
            <div id="print-container">
                <PrintHeader imageUrl={printSettings?.headerImageUrl} />
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <h2 style={{ fontSize: '14pt', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>{printMainTitle}</h2>
                    <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>{printSubTitle}</h3>
                </div>

                <table className="print-table">
                    <thead>
                        <tr className="report-header-row">
                            <th style={{width: '5%'}}>No.</th>
                            <th style={{width: '15%'}}>Tanggal</th>
                            <th style={{width: '20%'}}>Nama Staf</th>
                            <th style={{width: '20%'}}>Judul Laporan</th>
                            <th style={{width: '40%'}}>Uraian Kegiatan</th>
                        </tr>
                    </thead>
                    {orderedGroupKeys.length === 0 ? (
                        <tbody>
                            <tr><td colSpan={5} style={{textAlign: 'center', padding: '1rem'}}>Tidak ada data laporan untuk periode ini.</td></tr>
                        </tbody>
                    ) : (
                        orderedGroupKeys.map((groupKey, groupIndex) => (
                            <tbody key={groupKey}>
                                <tr className="report-group-title">
                                    <td colSpan={5}>{getActivityName(groupKey)}</td>
                                </tr>
                                {filteredAndGroupedReports[groupKey].map((r, index) => (
                                    <tr key={r.id}>
                                        <td style={{textAlign: 'center'}}>{index + 1}</td>
                                        <td>{format(r.date.toDate(), "dd-MM-yyyy")}</td>
                                        <td>{r.createdByDisplayName}</td>
                                        <td>{r.title}</td>
                                        <td>{r.content || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        ))
                    )}
                </table>
                <PrintFooter settings={printSettings} waliKelasName={kepalaTU?.displayName} />
            </div>
        </>
    );
}

