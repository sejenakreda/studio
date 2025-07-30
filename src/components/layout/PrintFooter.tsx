
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

  // Signer 1 (left) is always from settings (Kepala Sekolah)
  const signerOneName = settings.signerOneName || '(....................................)';
  const signerOnePosition = settings.signerOnePosition || 'Kepala Sekolah';
  const signerOneNpa = settings.signerOneNpa || '';

  // Signer 2 (right) logic
  const signerTwoNameToDisplay = waliKelasName || settings.signerTwoName || '(....................................)';
  const signerTwoPositionToDisplay = waliKelasName ? 'Kepala Tata Usaha' : (settings.signerTwoPosition || 'Wali Kelas');
  const signerTwoNpa = settings.signerTwoNpa || '';

  const today = new Date();
  const formattedDate = format(today, "dd MMMM yyyy", { locale: indonesiaLocale });
  const placeAndDateText = `${settings.place || 'Cianjur'}, ${formattedDate}`;

  return (
    <div style={{ breakInside: 'avoid-page', marginTop: '3rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', fontSize: '10pt', color: '#000' }}>
        <div style={{ textAlign: 'center' }}>
          <p>Mengetahui,</p>
          <p>{signerOnePosition}</p>
          <div style={{ marginBottom: '4rem' }}></div>
          <p style={{ fontWeight: '600', textDecoration: 'underline' }}>{signerOneName}</p>
          {signerOneNpa && <p>NPA. {signerOneNpa}</p>}
        </div>
        <div style={{ textAlign: 'center' }}>
          <p>{placeAndDateText}</p>
          <p>{signerTwoPositionToDisplay}</p>
          <div style={{ marginBottom: '4rem' }}></div>
          <p style={{ fontWeight: '600', textDecoration: 'underline' }}>{signerTwoNameToDisplay}</p>
          {signerTwoNpa && <p>NPA. {signerTwoNpa}</p>}
        </div>
      </div>
    </div>
  );
};
