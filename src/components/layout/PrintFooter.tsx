
"use client";

import React from 'react';
import { PrintSettings } from '@/types';
import { format } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';

interface PrintFooterProps {
  settings: PrintSettings | null;
  waliKelasName?: string | null;
}

export const PrintFooter: React.FC<PrintFooterProps> = ({ settings, waliKelasName }) => {
  if (!settings) return null;

  // Signer 1 (left) is always Kepala Sekolah from settings
  const signerOneName = settings.signerOneName || '(....................................)';
  const signerOnePosition = settings.signerOnePosition || 'Kepala Sekolah';
  const signerOneNpa = settings.signerOneNpa ? `NPA. ${settings.signerOneNpa}` : '';

  // Signer 2 (right) logic
  const signerTwoName = waliKelasName || settings.signerTwoName || '(....................................)';
  const signerTwoPosition = 'Kepala Tata Usaha'; // As requested
  const signerTwoNpa = settings.signerTwoNpa ? `NPA. ${settings.signerTwoNpa}` : '';
  
  const today = new Date();
  const formattedDate = format(today, "dd MMMM yyyy", { locale: indonesiaLocale });
  const placeAndDateText = `${settings.place || 'Cianjur'}, ${formattedDate}`;

  return (
    <div style={{ breakInside: 'avoid !important', pageBreakInside: 'avoid !important', marginTop: '3rem', fontSize: '11pt', width: '100%', color: '#000' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', width: '100%' }}>
        
        {/* Kolom Kiri - Kepala Sekolah */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0 }}>Mengetahui,</p>
          <p style={{ margin: '0 0 4rem 0' }}>{signerOnePosition}</p>
          <p style={{ fontWeight: 'bold', textDecoration: 'underline', margin: 0 }}>{signerOneName}</p>
          <p style={{ margin: 0 }}>{signerOneNpa}</p>
        </div>

        {/* Kolom Kanan - Kepala TU */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0 }}>{placeAndDateText}</p>
          <p style={{ margin: '0 0 4rem 0' }}>{signerTwoPosition}</p>
          <p style={{ fontWeight: 'bold', textDecoration: 'underline', margin: 0 }}>{signerTwoName}</p>
          <p style={{ margin: 0 }}>{signerTwoNpa}</p>
        </div>

      </div>
    </div>
  );
};
