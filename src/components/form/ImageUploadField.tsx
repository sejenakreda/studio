"use client";

import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Loader2, Trash2, Upload } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadFieldProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  folderPath: string; // This prop is no longer used but kept for compatibility
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({ value, onChange }) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast({
            variant: 'destructive',
            title: 'File Tidak Valid',
            description: 'Silakan pilih file gambar (PNG, JPG, dll).',
        });
        return;
    }
    
    // Check file size (e.g., limit to 200KB for Base64)
    if (file.size > 200 * 1024) {
        toast({
            variant: 'destructive',
            title: 'Ukuran File Terlalu Besar',
            description: 'Ukuran gambar tanda tangan tidak boleh lebih dari 200 KB.',
        });
        return;
    }

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
        const base64String = e.target?.result as string;
        onChange(base64String);
        setIsProcessing(false);
        toast({
            title: 'Sukses',
            description: 'Gambar berhasil dimuat.',
        });
    };
    reader.onerror = () => {
        setIsProcessing(false);
        toast({
            variant: 'destructive',
            title: 'Gagal Membaca File',
            description: 'Terjadi kesalahan saat memproses gambar.',
        });
    };
    reader.readAsDataURL(file);
  };
  
  const handleRemoveImage = async () => {
    onChange(null);
    toast({
        title: 'Gambar Dihapus',
        description: 'Gambar telah dihapus dari formulir.',
    });
  };

  return (
    <div className="space-y-3">
        {!value && !isProcessing && (
             <div className="flex items-center gap-2">
                <Input
                    id="image-upload"
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleFileChange}
                    disabled={isProcessing}
                    className="flex-grow text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
             </div>
        )}
      
        {isProcessing && (
            <div className="flex items-center justify-center p-4 border-2 border-dashed rounded-md">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2">Memproses gambar...</p>
            </div>
        )}

        {value && !isProcessing && (
            <div className="relative group w-full p-2 border rounded-md min-h-[100px] flex justify-center items-center bg-gray-50">
                 <Image src={value} alt="Pratinjau Tanda Tangan" width={200} height={100} style={{ objectFit: 'contain' }} />
                <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleRemoveImage}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        )}
    </div>
  );
};
