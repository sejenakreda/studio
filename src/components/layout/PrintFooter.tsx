"use client";

import React from 'react';
import { PrintSettings } from '@/types';
import { format } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

interface PrintFooterProps {
  settings: PrintSettings | null;
  waliKelasName?: string | null; // Optional prop for specific wali kelas name
}

export const PrintFooter: React.FC<PrintFooterProps> = ({ settings, waliKelasName }) => {
  const { userProfile } = useAuth(); // Get current user profile
  if (!settings) return null;

  // Determine the name for the second signer.
  // 1. Prioritize explicit waliKelasName prop if provided (used for Ka.TU reports).
  // 2. Fallback to settings for the second signer.
  const signerTwoNameToDisplay = waliKelasName ?? settings.signerTwoName;

  // Determine the position for the second signer.
  // If waliKelasName is specifically 'userProfile.displayName', assume it's Ka.TU
  // Otherwise, use "Wali Kelas" or the default from settings.
  let signerTwoPositionToDisplay = 'Wali Kelas';
  if (waliKelasName && userProfile?.tugasTambahan?.includes('kepala_tata_usaha')) {
      signerTwoPositionToDisplay = 'Kepala Tata Usaha';
  } else if (!waliKelasName) {
      signerTwoPositionToDisplay = settings.signerTwoPosition || 'Pejabat 2';
  }


  const today = new Date();
  const formattedDate = format(today, "dd MMMM yyyy", { locale: indonesiaLocale });
  const placeAndDateText = `${settings.place || 'Cianjur'}, ${formattedDate}`;

  return (
    <div className="print-footer hidden print:block mt-12 text-xs">
      <div className="grid grid-cols-2 gap-8" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="text-center">
          <p className="mb-16">Mengetahui,</p>
          <p className="font-semibold underline">{settings.signerOneName || '(....................................)'}</p>
          <p>{settings.signerOnePosition || 'Kepala Sekolah'}</p>
        </div>
        <div className="text-center">
          <p className="mb-16">{placeAndDateText}</p>
          <p className="font-semibold underline">{signerTwoNameToDisplay || '(....................................)'}</p>
          <p>{signerTwoPositionToDisplay}</p>
        </div>
      </div>
    </div>
  );
};
