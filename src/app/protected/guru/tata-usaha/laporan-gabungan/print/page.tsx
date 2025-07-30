"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from "date-fns";
import { id as indonesiaLocale } from 'date-fns/locale';
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
    const [kepalaTU, setKepalaTU] = useState<UserProfile | null>(null);
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
                
                setKepalaTU(allUsers.find(u => u.tugasTambahan?.includes('kepala_tata_usaha')) || null);
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

    const printMainTitle = `LAPORAN KEGIATAN KEPALA DAN STAF TATA USAHA`;
    const printSubTitle = `TAHUN PELAJARAN ${academicYear}`;
    const printPeriod = `BULAN: ${month === 'all' ? 'SATU TAHUN' : MONTHS.find(m => m.value === month)?.label.toUpperCase()} ${year}`;

    useEffect(() => {
        if (!isLoading && !error) {
            document.title = printMainTitle;
            setTimeout(() => window.print(), 800);
        }
    }, [isLoading, error, printMainTitle]);
    
    if (isLoading) {
        return (
            <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
                <Loader2 className="h-10 w-10 animate-spin" />
                <p style={{ marginLeft: '1rem' }}>Mempersiapkan dokumen...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div style={{ padding: '2rem' }}>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <>
            <style jsx global>{`
                @page {
                    size: A4;
                    margin: 10mm;
                }
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    background: #fff !important;
                }
                h1, h2, h3 {
                    margin: 0;
                    padding: 0;
                }
                .cover {
                    text-align: center;
                    padding: 10px 0;
                    margin-bottom: 10px;
                }
                .table-container {
                    width: 100%;
                    margin-top: 10px;
                }
                table {
                    border-collapse: collapse;
                    width: 100%;
                    font-size: 11pt;
                }
                th, td {
                    border: 1px solid #000;
                    padding: 5px;
                    text-align: left;
                    word-wrap: break-word;
                }
                .group-title {
                    font-size: 12pt;
                    font-weight: bold;
                    margin-top: 1.5rem;
                    margin-bottom: 0.5rem;
                }
                @media print {
                    ::-webkit-scrollbar { display: none !important; }
                    html, body, .table-container, #__next, main {
                        overflow: visible !important;
                        height: auto !important;
                        max-height: none !important;
                    }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                    table { page-break-inside: auto; }
                    tr, td, th { page-break-inside: avoid; }
                    * { page-break-before: auto !important; }
                    body { margin-top: 0 !important; }
                    .print-footer {
                        page-break-before: always !important;
                        page-break-inside: avoid !important;
                        display: block !important;
                    }
                }
            `}</style>
            
            <div className="print-area">
                <div className="cover">
                    <PrintHeader imageUrl={printSettings?.headerImageUrl} />
                    <h2 style={{ fontSize: '14pt', fontWeight: 'bold', margin: '0', textTransform: 'uppercase', marginTop: '1rem' }}>{printMainTitle}</h2>
                    <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>{printSubTitle}</h3>
                    <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>{printPeriod}</h3>
                </div>

                <div className="table-container">
                    {orderedGroupKeys.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada data laporan untuk periode ini.</p>
                    ) : (
                        orderedGroupKeys.map((groupKey) => (
                            <div key={groupKey}>
                                <h4 className="group-title">
                                    Laporan: {getActivityName(groupKey)}
                                </h4>
                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{width: '5%'}}>No.</th>
                                            <th style={{width: '15%'}}>Tanggal</th>
                                            <th style={{width: '20%'}}>Nama Staf</th>
                                            <th style={{width: '25%'}}>Judul Laporan</th>
                                            <th style={{width: '35%'}}>Uraian Kegiatan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
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
                                </table>
                            </div>
                        ))
                    )}
                </div>
                
                <PrintFooter settings={printSettings} waliKelasName={kepalaTU?.displayName} />
            </div>
        </>
    );
}