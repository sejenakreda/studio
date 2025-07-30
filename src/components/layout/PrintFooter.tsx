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
    // For now, we assume this context means the position is "Kepala Tata Usaha"
    // The NPA would need to be part of the name or a new field in the future
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
    // The `break-inside: avoid` class is crucial to prevent this block from splitting across pages.
    <div className="print-footer hidden print:block mt-12 text-xs" style={{ breakInside: 'avoid' }}>
      <div className="grid grid-cols-2 gap-8" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="text-center">
          <p>Mengetahui,</p>
          <p className="mb-16">Kepala Sekolah</p> 
          <p className="font-semibold underline">{signerOneName}</p>
          {/* We use position here for NPA as a workaround. Admin should input "Jabatan\nNPA: XXX" in settings. */}
          <p dangerouslySetInnerHTML={{ __html: signerOnePosition.replace(/\n/g, '<br />') }}></p>
        </div>
        <div className="text-center">
          <p>{placeAndDateText}</p>
          {/* The position is now hardcoded for this specific report context */}
          <p className="mb-16">Kepala Tata Usaha</p>
          <p className="font-semibold underline">{signerTwoNameToDisplay}</p>
           {/* Fallback to generic setting if Ka.TU has no specific NPA in settings */}
          <p dangerouslySetInnerHTML={{ __html: (settings.signerTwoPosition || 'N/A').replace(/\n/g, '<br />') }}></p>
        </div>
      </div>
    </div>
  );
};
