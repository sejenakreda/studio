"use client";

import React from 'react';
import { PrintSettings } from '@/types';
import { format } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';

interface PrintFooterProps {
  settings: PrintSettings | null;
  waliKelasName?: string | null; // Optional prop for specific name on the right side
}

export const PrintFooter: React.FC<PrintFooterProps> = ({ settings, waliKelasName }) => {
  if (!settings) return null;

  // Signer 1 (left) is always from settings (Kepala Sekolah)
  const signerOneName = settings.signerOneName || '(....................................)';
  const signerOnePosition = settings.signerOnePosition || 'Kepala Sekolah';

  // Signer 2 (right) logic
  let signerTwoNameToDisplay: string;
  let signerTwoPositionToDisplay: string;

  if (waliKelasName) {
    // If a specific name is provided (like Ka. TU), use it.
    signerTwoNameToDisplay = waliKelasName;
    // Assume the position for this specific context is "Kepala Tata Usaha"
    signerTwoPositionToDisplay = 'Kepala Tata Usaha';
  } else {
    // Otherwise, fall back to the general print settings for the second signer.
    signerTwoNameToDisplay = settings.signerTwoName || '(....................................)';
    signerTwoPositionToDisplay = settings.signerTwoPosition || 'Wali Kelas';
  }

  const today = new Date();
  const formattedDate = format(today, "dd MMMM yyyy", { locale: indonesiaLocale });
  const placeAndDateText = `${settings.place || 'Cianjur'}, ${formattedDate}`;

  return (
    <div className="print-footer hidden print:block mt-12 text-xs">
      <div className="grid grid-cols-2 gap-8" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="text-center">
          <p className="mb-16">Mengetahui,</p>
          <p className="font-semibold underline">{signerOneName}</p>
          <p>{signerOnePosition}</p>
        </div>
        <div className="text-center">
          <p className="mb-16">{placeAndDateText}</p>
          <p className="font-semibold underline">{signerTwoNameToDisplay}</p>
          <p>{signerTwoPositionToDisplay}</p>
        </div>
      </div>
    </div>
  );
};
