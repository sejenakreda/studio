"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { getBeritaAcaraById, getPrintSettings } from '@/lib/firestoreService';
import { BeritaAcaraUjian, PrintSettings } from '@/types';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { PrintHeader } from '@/components/layout/PrintHeader';
import Image from 'next/image';

export default function PrintBeritaAcaraPage() {
    const params = useParams();
    const beritaAcaraId = params.beritaAcaraId as string;
    const [data, setData] = useState<BeritaAcaraUjian | null>(null);
    const [printSettings, setPrintSettings] = useState<PrintSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        if (!beritaAcaraId) {
            setError("ID Berita Acara tidak ditemukan.");
            setIsLoading(false);
            return;
        }

        async function fetchData() {
            try {
                const [fetchedData, fetchedPrintSettings] = await Promise.all([
                    getBeritaAcaraById(beritaAcaraId),
                    getPrintSettings()
                ]);

                if (!fetchedData) {
                    throw new Error("Data Berita Acara tidak ditemukan.");
                }
                setData(fetchedData);
                setPrintSettings(fetchedPrintSettings);
            } catch (err: any) {
                setError(err.message || "Gagal memuat data untuk dicetak.");
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, [beritaAcaraId]);

    useEffect(() => {
        if (!isLoading && !error && data) {
            setTimeout(() => {
                window.print();
            }, 500); // Delay to allow images to load
        }
    }, [isLoading, error, data]);

    const { totalPeserta, jumlahHadir, jumlahTidakHadir } = useMemo(() => {
      if (!data) return { totalPeserta: 0, jumlahHadir: 0, jumlahTidakHadir: 0 };
      const total = (data.jumlahPesertaX || 0) + (data.jumlahPesertaXI || 0) + (data.jumlahPesertaXII || 0);
      const tidakHadirCount = data.pesertaTidakHadirNomor ? data.pesertaTidakHadirNomor.split(',').filter(p => p.trim() !== "").length : 0;
      const hadirCount = total - tidakHadirCount;
      return { totalPeserta: total, jumlahHadir: hadirCount, jumlahTidakHadir: tidakHadirCount };
    }, [data]);
    

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
            <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button onClick={() => window.history.back()} className="mt-4">Kembali</Button>
            </div>
        );
    }

    if (!data) {
        return <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Data tidak ditemukan.</div>;
    }
    
    const formattedDate = `${data.hari}, ${data.tanggal} ${data.bulan} ${data.tahun}`;

    return (
        <>
            <style jsx global>{`
                body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; background-color: #fff; }
                .print-container { width: 210mm; min-height: 297mm; padding: 20mm; margin: 0 auto; box-sizing: border-box; }
                .print-header { text-align: center; }
                .print-title { font-weight: bold; text-align: center; text-transform: uppercase; text-decoration: underline; margin-top: 1rem; margin-bottom: 0.5rem; font-size: 14pt; }
                .print-subtitle { font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 1.5rem; font-size: 14pt; }
                .opening-paragraph { text-align: justify; line-height: 1.5; margin-bottom: 1rem; }
                .details-table { margin-left: 2rem; line-height: 1.6; width: 100%; border-collapse: collapse; }
                .details-table td:first-child { width: 35%; vertical-align: top; }
                .details-table td:nth-child(2) { width: 5%; vertical-align: top; }
                .details-table td:last-child { width: 60%; vertical-align: top; }
                .details-table .sub-table td:first-child { width: 40%; }
                .details-table .sub-table td:nth-child(2) { width: 5%; }
                .details-table .sub-table td:last-child { width: 55%; }
                .signature-section { margin-top: 3rem; width: 100%; }
                .signature-box { width: 45%; text-align: center; }
                .signature-box.right { float: right; }
                .signature-name { font-weight: bold; text-decoration: underline; margin-top: 5rem; }
                .print-button-container { text-align: center; margin-top: 2rem; }
                @media print {
                    body { margin: 0; }
                    .print-container { padding: 15mm 20mm; box-shadow: none; border: none; }
                    .no-print { display: none; }
                }
            `}</style>

            <div className="print-container">
                <PrintHeader imageUrl={printSettings?.headerImageUrl} />
                <h2 className="print-title">BERITA ACARA PELAKSANAAN</h2>
                <h3 className="print-subtitle">{data.jenisUjian} TAHUN PELAJARAN {data.tahunPelajaran}</h3>

                <p className="opening-paragraph">
                    Pada hari ini {data.hari} tanggal {data.tanggal} bulan {data.bulan} tahun {data.tahun}, telah diselenggarakan {data.jenisUjian} tahun pelajaran {data.tahunPelajaran} untuk mata ujian {data.mataUjian} dari pukul {data.waktuMulai} sampai dengan pukul {data.waktuSelesai}.
                </p>

                <ol>
                    <li>
                        Tempat penyelenggaraan: SMA PGRI NARINGGUL
                        <table className="details-table">
                            <tbody>
                                <tr><td>a. Ruang ujian</td><td>:</td><td>{data.ruangUjian} {data.kelasDigabung && `(Gabungan: ${data.kelasDigabung})`}</td></tr>
                                <tr><td>b. Jumlah peserta seharusnya</td><td>:</td>
                                    <td>
                                        <table className="sub-table"><tbody>
                                            <tr><td>Kelas X</td><td>:</td><td>{data.jumlahPesertaX} orang</td></tr>
                                            <tr><td>Kelas XI</td><td>:</td><td>{data.jumlahPesertaXI} orang</td></tr>
                                            <tr><td>Kelas XII</td><td>:</td><td>{data.jumlahPesertaXII} orang</td></tr>
                                            <tr><td style={{fontWeight: 'bold'}}>Jumlah seluruhnya</td><td style={{fontWeight: 'bold'}}>:</td><td style={{fontWeight: 'bold'}}>{totalPeserta} orang</td></tr>
                                        </tbody></table>
                                    </td>
                                </tr>
                                <tr><td>c. Jumlah seluruh peserta hadir</td><td>:</td><td>{jumlahHadir} orang</td></tr>
                                <tr><td>Yakni nomor</td><td>:</td><td>{data.pesertaHadirNomor || '...................................................'}</td></tr>
                                <tr><td>d. Jumlah peserta tidak hadir</td><td>:</td><td>{jumlahTidakHadir} orang</td></tr>
                                <tr><td>Yakni nomor</td><td>:</td><td>{data.pesertaTidakHadirNomor || '...................................................'}</td></tr>
                            </tbody>
                        </table>
                    </li>
                    <li style={{marginTop: '1rem'}}>
                        Dengan disaksikan para peserta {data.jenisUjian}, telah dibuka amplop naskah ujian dan berisi:
                        <table className="details-table">
                            <tbody>
                                <tr><td>a. Daftar hadir peserta</td><td>:</td><td>{data.jumlahDaftarHadir} eksemplar</td></tr>
                                <tr><td>b. Berita acara</td><td>:</td><td>{data.jumlahBeritaAcara} eksemplar</td></tr>
                            </tbody>
                        </table>
                    </li>
                    <li style={{marginTop: '1rem'}}>
                        Catatan selama pelaksanaan {data.jenisUjian}:
                        <p style={{ minHeight: '50px', borderBottom: '1px dotted #000' }}>{data.catatanUjian || ''}</p>
                    </li>
                </ol>

                <p style={{ marginTop: '2rem' }}>
                    Berita acara ini dibuat dengan sesungguhnya untuk dapat dipergunakan sebagaimana mestinya.
                </p>
                
                <div className="signature-section">
                    <div className="signature-box right">
                        <p style={{margin: 0}}>{printSettings?.place || 'Naringgul'}, {formattedDate}</p>
                        <p style={{margin: 0}}>Yang membuat berita acara</p>
                        <p style={{margin: 0}}>Pengawas</p>
                        <div style={{height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            {data.pengawasTandaTanganUrl && <Image src={data.pengawasTandaTanganUrl} alt="Tanda Tangan Pengawas" width={120} height={60} style={{objectFit: 'contain'}} />}
                        </div>
                        <p className="signature-name" style={{margin: 0, marginTop: '0', fontWeight: 'bold', textDecoration: 'underline'}}>
                            ( {data.pengawasNama} )
                        </p>
                    </div>
                </div>
            </div>
            <div className="no-print print-button-container">
                <Button onClick={() => window.print()}>Cetak Ulang</Button>
            </div>
        </>
    );
}
