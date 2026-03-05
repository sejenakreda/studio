
"use client";

import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Trash2, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/lib/firebase';

interface ImageUploadFieldProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  folderPath: string;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({ value, onChange, folderPath }) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!storage) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Layanan Firebase Storage tidak tersedia. Periksa konfigurasi.',
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'File tidak valid', description: 'Gunakan format gambar (PNG/JPG).' });
      return;
    }

    setIsUploading(true);
    const fileName = `${uuidv4()}-${file.name}`;
    const storageRef = ref(storage, `${folderPath}/${fileName}`);

    try {
      // Direct upload without deleting old file to prevent CORS/Ref errors
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      onChange(downloadURL);
      toast({ title: 'Sukses', description: 'Gambar berhasil diunggah.' });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        variant: 'destructive',
        title: 'Gagal Mengunggah',
        description: error.message?.includes('CORS') 
          ? 'Masalah izin akses (CORS). Jalankan firebase deploy --only storage di terminal.'
          : 'Terjadi kesalahan saat mengunggah. Pastikan Storage sudah diaktifkan di Console.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange(null);
    toast({ title: 'Dihapus', description: 'Gambar dilepas dari formulir.' });
  };

  return (
    <div className="space-y-3">
      {!value && !isUploading && (
        <Input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="cursor-pointer file:bg-primary/10 file:text-primary file:border-0 file:rounded-full file:px-4"
        />
      )}

      {isUploading && (
        <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg animate-pulse bg-muted/20">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <span className="text-sm font-medium">Sedang mengunggah...</span>
        </div>
      )}

      {value && !isUploading && (
        <div className="relative group w-fit">
          <div className="p-2 border rounded-lg bg-card overflow-hidden">
            <Image src={value} alt="Preview" width={150} height={150} className="rounded object-contain" unoptimized />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemove}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};
