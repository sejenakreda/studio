
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

    const printMainTitle = `LAPORAN KEGIATAN KEPALA DAN STAF TATA USAHA TAHUN PELAJARAN ${academicYear}`;
    const printSubTitle = `BULAN: ${month === 'all' ? 'SATU TAHUN' : MONTHS.find(m => m.value === month)?.label.toUpperCase()} ${year}`;

    useEffect(() => {
        if (!isLoading && !error) {
            document.title = printMainTitle;
            setTimeout(() => window.print(), 500);
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
                
                @media print {
                    html, body {
                        width: 210mm;
                        height: auto !important;
                        background: #fff !important;
                        color: #000 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    
                    ::-webkit-scrollbar { display: none !important; }

                    .cover-page, .report-group, .signature-block {
                        page-break-inside: avoid;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        page-break-inside: auto;
                    }

                    thead {
                        display: table-header-group;
                    }
                    
                    tr, td, th {
                        page-break-inside: avoid;
                    }

                    .no-print {
                        display: none !important;
                    }
                }

                body {
                    font-family: 'Times New Roman', Times, serif;
                    margin: 0;
                    background: #eee;
                }
                
                .print-container {
                    width: 210mm;
                    min-height: 297mm;
                    margin: 20px auto;
                    padding: 10mm;
                    background-color: white;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    color: black;
                }

                .cover-page {
                    text-align: center;
                    margin-bottom: 20px;
                }

                .table-container {
                    overflow-x: auto;
                    margin-bottom: 1.5rem;
                }

                .report-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 10pt;
                    table-layout: fixed;
                }
                
                .report-table th,
                .report-table td {
                    border: 1px solid black;
                    padding: 4px 6px;
                    text-align: left;
                    word-wrap: break-word;
                }

                .report-table th {
                    font-weight: bold;
                    text-align: center;
                    background-color: #f2f2f2;
                }

                .signature-block {
                    margin-top: 40px;
                    width: 100%;
                }
            `}</style>
            
            <div className="print-container">
                <div className="cover-page">
                    <PrintHeader imageUrl={printSettings?.headerImageUrl} />
                    <h2 style={{ fontSize: '14pt', fontWeight: 'bold', margin: '0', textTransform: 'uppercase', marginTop: '1rem' }}>{printMainTitle}</h2>
                    <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>{printSubTitle}</h3>
                </div>

                {orderedGroupKeys.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada data laporan untuk periode ini.</p>
                ) : (
                    orderedGroupKeys.map((groupKey) => (
                        <div key={groupKey} className="report-group">
                            <h4 style={{ fontSize: '11pt', fontWeight: 'bold' }}>
                                Laporan: {getActivityName(groupKey)}
                            </h4>
                            <div className="table-container">
                                <table className="report-table">
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
                        </div>
                    ))
                )}
                
                <div className="signature-block">
                    <PrintFooter settings={printSettings} waliKelasName={kepalaTU?.displayName} />
                </div>
            </div>
        </>
    );
}
