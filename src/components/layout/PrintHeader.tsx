"use client";

import React from 'react';
import Image from 'next/image';

interface PrintHeaderProps {
  imageUrl?: string | null;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ imageUrl }) => {
  if (!imageUrl) return null;

  return (
    <div className="print-header hidden print:block">
      <Image
        src={imageUrl}
        alt="Kop Surat"
        width={2100} // Corresponds to A4 width at high DPI
        height={400} // Adjust based on your header image aspect ratio
        style={{ width: '100%', height: 'auto' }}
        priority
      />
    </div>
  );
};
