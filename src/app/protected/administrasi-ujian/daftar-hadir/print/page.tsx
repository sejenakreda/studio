"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from "date-fns";
import { id as indonesiaLocale } from 'date-fns/locale';
import { Loader2, AlertCircle } from "lucide-react";
import { getDaftarHadirPengawas, getPrintSettings, getAllUsersByRole } from '@/lib/firestoreService';
import type { DaftarHadirPengawas, PrintSettings, TugasTambahan, UserProfile } from '@/types';
import { PrintHeader } from '@/components/layout/PrintHeader';
import { PrintFooter } from '@/components/layout/PrintFooter';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

const MONTHS = Array.from({ length: 12 }, (_, i) => format(new Date(0, i), "MMMM", { locale: indonesiaLocale }));

export default function PrintDaftarHadirPage() {
    const { userProfile, isKurikulum } = useAuth();
    const searchParams = useSearchParams();
    const [records, setRecords] = useState<DaftarHadirPengawas[]>([]);
    const [printSettings, setPrintSettings] = useState<PrintSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const year = Number(searchParams.get('year'));
    const month = Number(searchParams.get('month'));

    useEffect(() => {
        if (!userProfile) {
            setError("Sesi pengguna tidak ditemukan.");
            setIsLoading(false);
            return;
        }
        if (!year || !month) {
            setError("Parameter tahun atau bulan tidak valid.");
            setIsLoading(false);
            return;
        }

        async function fetchDataForPrint() {
            try {
                const [fetchedRecords, fetchedPrintSettings] = await Promise.all([
                    getDaftarHadirPengawas(userProfile),
                    getPrintSettings()
                ]);

                const filtered = fetchedRecords.filter(rec => {
                    const recDate = rec.tanggalUjian.toDate();
                    return recDate.getFullYear() === year && recDate.getMonth() === month - 1;
                });

                setRecords(filtered.sort((a,b) => a.tanggalUjian.toMillis() - b.tanggalUjian.toMillis()));
                setPrintSettings(fetchedPrintSettings);
            } catch (err: any) {
                setError("Gagal memuat data untuk dicetak: " + err.message);
            } finally {
                setIsLoading(false);
            }
        }
        fetchDataForPrint();
    }, [year, month, userProfile, isKurikulum]);

    useEffect(() => {
        if (!isLoading && !error && records.length > 0) {
             setTimeout(() => { window.print(); }, 800);
        }
    }, [isLoading, error, records]);

    const printMainTitle = `DAFTAR HADIR PENGAWAS RUANG`;
    const printSubTitle = `TAHUN PELAJARAN ${month >= 7 ? `${year}/${year + 1}`: `${year - 1}/${year}`}`;
    const printPeriod = `BULAN: ${MONTHS[month - 1]?.toUpperCase()} ${year}`;

    const waliKelasNameForPrint = isKurikulum ? (userProfile?.displayName || null) : null;

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

    if (records.length === 0) {
        return (
             <div style={{ padding: '2rem' }}>
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Tidak Ada Data</AlertTitle>
                    <AlertDescription>Tidak ada data kehadiran pengawas untuk periode yang dipilih.</AlertDescription>
                </Alert>
                 <Button onClick={() => window.close()} className="mt-4 no-print">Tutup</Button>
            </div>
        )
    }

    return (
        <>
            <style jsx global>{`
                @page { size: A4 landscape; margin: 15mm; }
                body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000; background-color: #fff; }
                .print-container { width: 100%; }
                table { border-collapse: collapse; width: 100%; font-size: 10pt; }
                th, td { border: 1px solid #000; padding: 5px; text-align: center; vertical-align: middle; }
                .text-left { text-align: left; }
                .ttd-cell { height: 60px; }
                @media print { .no-print { display: none; } }
            `}</style>

            <div className="print-container">
                <PrintHeader imageUrl={printSettings?.headerImageUrl} />
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <h2 style={{ fontSize: '14pt', fontWeight: 'bold', textTransform: 'uppercase', textDecoration: 'underline', margin: 0 }}>{printMainTitle}</h2>
                    <p style={{ fontSize: '12pt', fontWeight: 'bold', margin: 0 }}>{printSubTitle}</p>
                    <p style={{ fontSize: '12pt', fontWeight: 'bold', margin: 0 }}>{printPeriod}</p>
                </div>
                
                <table style={{ marginTop: '1.5rem' }}>
                    <thead>
                        <tr>
                            <th rowSpan={2}>No.</th>
                            <th rowSpan={2}>Hari/Tanggal</th>
                            <th rowSpan={2}>Mata Pelajaran</th>
                            <th rowSpan={2}>Ruang</th>
                            <th colSpan={2}>Waktu</th>
                            <th rowSpan={2}>Nama Pengawas</th>
                            <th colSpan={2}>Tanda Tangan</th>
                        </tr>
                        <tr>
                            <th>Mulai</th>
                            <th>Selesai</th>
                            <th>Pagi</th>
                            <th>Siang</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map((rec, index) => {
                            const isPagi = parseInt(rec.waktuMulai.split(':')[0]) < 12;
                            return (
                                <tr key={rec.id}>
                                    <td>{index + 1}</td>
                                    <td className="text-left">{format(rec.tanggalUjian.toDate(), "EEEE, dd-MM-yyyy", { locale: indonesiaLocale })}</td>
                                    <td className="text-left">{rec.mataUjian}</td>
                                    <td>{rec.ruangUjian}</td>
                                    <td>{rec.waktuMulai}</td>
                                    <td>{rec.waktuSelesai}</td>
                                    <td className="text-left">{rec.namaPengawas}</td>
                                    <td className="ttd-cell">
                                        {isPagi && rec.tandaTanganUrl && <Image src={rec.tandaTanganUrl} alt="TTD" width={100} height={50} style={{ objectFit: 'contain', margin: 'auto' }} />}
                                    </td>
                                    <td className="ttd-cell">
                                        {!isPagi && rec.tandaTanganUrl && <Image src={rec.tandaTanganUrl} alt="TTD" width={100} height={50} style={{ objectFit: 'contain', margin: 'auto' }} />}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                
                <PrintFooter settings={printSettings} waliKelasName={waliKelasNameForPrint} />

                <div className="no-print" style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <Button onClick={() => window.print()}>Cetak Ulang</Button>
                </div>
            </div>
        </>
    );
}
