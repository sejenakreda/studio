"use client";

import React from 'react';
import { PrintSettings } from '@/types';

interface PrintFooterProps {
  settings: PrintSettings | null;
  waliKelasName?: string | null; // Optional prop for specific wali kelas name
}

export const PrintFooter: React.FC<PrintFooterProps> = ({ settings, waliKelasName }) => {
  if (!settings) return null;

  // Determine the name for the second signer. Prioritize waliKelasName if provided.
  const signerTwoNameToDisplay = waliKelasName || settings.signerTwoName;
  const signerTwoPositionToDisplay = waliKelasName ? 'Wali Kelas' : settings.signerTwoPosition;

  return (
    <div className="print-footer hidden print:block mt-8 text-xs">
      <div className="grid grid-cols-2 gap-8" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="text-center">
          <p className="mb-16">Mengetahui,</p>
          <p className="font-semibold">{settings.signerOneName || '(....................................)'}</p>
          <p className="border-t border-black w-48 mx-auto mt-1 pt-1">{settings.signerOnePosition || 'Pejabat 1'}</p>
        </div>
        <div className="text-center">
          <p className="mb-16">{settings.placeAndDate || 'Tempat, Tanggal'}</p>
          <p className="font-semibold">{signerTwoNameToDisplay || '(....................................)'}</p>
          <p className="border-t border-black w-48 mx-auto mt-1 pt-1">{signerTwoPositionToDisplay || 'Pejabat 2'}</p>
        </div>
      </div>
    </div>
  );
};
