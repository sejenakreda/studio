
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

  // Signer 2 (right) logic - uses Ka.TU name if provided, otherwise falls back to settings.
  const signerTwoName = waliKelasName || settings.signerTwoName || '(....................................)';
  // If a specific waliKelasName is passed, we assume the position is 'Kepala Tata Usaha'.
  // Otherwise, use the position from settings.
  const signerTwoPosition = waliKelasName ? 'Kepala Tata Usaha' : (settings.signerTwoPosition || 'Wali Kelas');
  const signerTwoNpa = settings.signerTwoNpa ? `NPA. ${settings.signerTwoNpa}` : '';
  
  const today = new Date();
  const formattedDate = format(today, "dd MMMM yyyy", { locale: indonesiaLocale });
  const placeAndDateText = `${settings.place || 'Cianjur'}, ${formattedDate}`;

  return (
    <div style={{ marginTop: '2rem', fontSize: '11pt', width: '100%', color: '#000' }}>
      <div style={{ display: 'table', width: '100%', tableLayout: 'fixed' }}>
        <div style={{ display: 'table-row' }}>
          
          {/* Kolom Kiri - Kepala Sekolah */}
          <div style={{ display: 'table-cell', width: '50%', textAlign: 'center', verticalAlign: 'top', padding: '0 1rem' }}>
            <p style={{ margin: 0 }}>Mengetahui,</p>
            <p style={{ margin: 0 }}>{signerOnePosition}</p>
            <div style={{ height: '4rem' }}></div>
            <p style={{ fontWeight: 'bold', textDecoration: 'underline', margin: 0 }}>{signerOneName}</p>
            {signerOneNpa && <p style={{ margin: 0 }}>{signerOneNpa}</p>}
          </div>

          {/* Kolom Kanan - Kepala TU / Signer 2 */}
          <div style={{ display: 'table-cell', width: '50%', textAlign: 'center', verticalAlign: 'top', padding: '0 1rem' }}>
            <p style={{ margin: 0 }}>{placeAndDateText}</p>
            <p style={{ margin: 0 }}>{signerTwoPosition}</p>
            <div style={{ height: '4rem' }}></div>
            <p style={{ fontWeight: 'bold', textDecoration: 'underline', margin: 0 }}>{signerTwoName}</p>
            {signerTwoNpa && <p style={{ margin: 0 }}>{signerTwoNpa}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
