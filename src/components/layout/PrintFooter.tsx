
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
  const signerOneNpa = settings.signerOneNpa || '-';

  // Signer 2 (right) logic - for this report, it's always Ka. TU
  const signerTwoNameToDisplay = waliKelasName || settings.signerTwoName || '(....................................)';
  const signerTwoPositionToDisplay = 'Kepala Tata Usaha'; // Hardcoded for this specific report
  const signerTwoNpa = settings.signerTwoNpa || '-';


  const today = new Date();
  const formattedDate = format(today, "dd MMMM yyyy", { locale: indonesiaLocale });
  const placeAndDateText = `${settings.place || 'Cianjur'}, ${formattedDate}`;

  return (
    <div style={{ breakInside: 'avoid !important', pageBreakInside: 'avoid !important', marginTop: '3rem', fontSize: '10pt' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0 }}>Mengetahui,</p>
          <p style={{ margin: 0 }}>{signerOnePosition}</p>
          <div style={{ height: '4rem' }}></div> {/* Space for signature */}
          <p style={{ fontWeight: 'bold', textDecoration: 'underline', margin: 0 }}>{signerOneName}</p>
          <p style={{ margin: 0 }}>NPA. {signerOneNpa}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0 }}>{placeAndDateText}</p>
          <p style={{ margin: 0 }}>{signerTwoPositionToDisplay}</p>
          <div style={{ height: '4rem' }}></div> {/* Space for signature */}
          <p style={{ fontWeight: 'bold', textDecoration: 'underline', margin: 0 }}>{signerTwoNameToDisplay}</p>
          <p style={{ margin: 0 }}>NPA. {signerTwoNpa}</p>
        </div>
      </div>
    </div>
  );
};
