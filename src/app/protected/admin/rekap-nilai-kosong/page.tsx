"use client";

import React, { useState, useEffect } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject as deleteFile, FirebaseStorage } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/lib/firebase'; // Import the initialized storage service directly

interface ImageUploadFieldProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  folderPath: string; // e.g., "signatures/user_uid"
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({ value, onChange, folderPath }) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  
  const storageInstance = storage; // Use the globally initialized storage

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!storageInstance) {
      toast({
        variant: 'destructive',
        title: 'Layanan Penyimpanan Belum Siap',
        description: 'Konfigurasi Firebase Storage tidak ditemukan atau gagal dimuat.',
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
        toast({
            variant: 'destructive',
            title: 'File Tidak Valid',
            description: 'Silakan pilih file gambar (PNG, JPG, dll).',
        });
        return;
    }

    if (file.size > 1 * 1024 * 1024) { // 1MB limit
        toast({
            variant: 'destructive',
            title: 'Ukuran File Terlalu Besar',
            description: 'Ukuran gambar tidak boleh lebih dari 1 MB.',
        });
        return;
    }

    setIsUploading(true);

    const fileName = `${uuidv4()}-${file.name}`;
    const storageRef = ref(storageInstance, `${folderPath}/${fileName}`);

    try {
      // If there's an old image, delete it first.
      if (value) {
        try {
          const oldImageRef = ref(storageInstance, value);
          await deleteFile(oldImageRef);
        } catch (deleteError: any) {
          if (deleteError.code !== 'storage/object-not-found') {
            console.warn("Could not delete old image, proceeding with upload anyway:", deleteError);
          }
        }
      }
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      onChange(downloadURL); // Update the form state with the new URL
      toast({
        title: 'Sukses',
        description: 'Gambar berhasil diunggah.',
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        variant: 'destructive',
        title: 'Gagal Unggah',
        description: 'Terjadi kesalahan saat mengunggah gambar. Coba lagi nanti.',
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleRemoveImage = async () => {
    if (!storageInstance) {
        toast({ variant: 'destructive', title: 'Error', description: 'Layanan penyimpanan belum siap.' });
        return;
    }
    if (value) {
      try {
        const imageRef = ref(storageInstance, value);
        await deleteFile(imageRef);
      } catch (error: any) {
        if (error.code !== 'storage/object-not-found') {
          console.error("Delete error:", error);
          toast({
            variant: 'destructive',
            title: 'Gagal Menghapus Gambar dari Cloud',
            description: 'Silakan coba lagi.',
          });
          return; 
        }
      }
    }
    onChange(null); // Clear the URL from the form state
    toast({
        title: 'Gambar Dihapus',
        description: 'Gambar telah dihapus dari formulir.',
    });
  };

  return (
    <div className="space-y-3">
        {!value && !isUploading && (
             <div className="flex items-center gap-2">
                <Input
                    id="image-upload"
                    type="file"
                    accept="image/png, image/jpeg, image/gif"
                    onChange={handleFileChange}
                    disabled={isUploading || !storageInstance}
                    className="flex-grow text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
             </div>
        )}
      
        {isUploading && (
            <div className="flex items-center justify-center p-4 border-2 border-dashed rounded-md">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2">Mengunggah...</p>
            </div>
        )}

        {value && !isUploading && (
            <div className="relative group w-full p-2 border rounded-md min-h-[100px] flex justify-center items-center bg-gray-50">
                 <Image src={value} alt="Pratinjau Tanda Tangan" width={200} height={100} style={{ objectFit: 'contain' }} unoptimized />
                <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleRemoveImage}
                    disabled={!storageInstance}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        )}
    </div>
  );
};