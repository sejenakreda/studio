"use client";

import React from 'react';
import { PrintSettings } from '@/types';
import { format } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';

interface PrintFooterProps {
  settings: PrintSettings | null;
  waliKelasName?: string | null; // Optional prop for specific wali kelas name
}

export const PrintFooter: React.FC<PrintFooterProps> = ({ settings, waliKelasName }) => {
  if (!settings) return null;

  // Determine the name for the second signer. Prioritize waliKelasName if provided.
  const signerTwoNameToDisplay = waliKelasName || settings.signerTwoName;
  const signerTwoPositionToDisplay = waliKelasName ? 'Wali Kelas' : settings.signerTwoPosition;

  const today = new Date();
  const formattedDate = format(today, "dd MMMM yyyy", { locale: indonesiaLocale });
  const placeAndDateText = `${settings.place || 'Cianjur'}, ${formattedDate}`;

  return (
    <div className="print-footer hidden print:block mt-12 text-xs">
      <div className="grid grid-cols-2 gap-8" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="text-center">
          <p className="mb-16">Mengetahui,</p>
          <p className="font-semibold underline">{settings.signerOneName || '(....................................)'}</p>
          <p>{settings.signerOnePosition || 'Pejabat 1'}</p>
        </div>
        <div className="text-center">
          <p className="mb-16">{placeAndDateText}</p>
          <p className="font-semibold underline">{signerTwoNameToDisplay || '(....................................)'}</p>
          <p>{signerTwoPositionToDisplay || 'Pejabat 2'}</p>
        </div>
      </div>
    </div>
  );
};
