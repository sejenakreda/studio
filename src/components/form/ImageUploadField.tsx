"use client";

import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Loader2, Trash2, Upload } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadFieldProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  folderPath: string;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({ value, onChange, folderPath }) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !storage) return;

    // Basic file type check
    if (!file.type.startsWith('image/')) {
        toast({
            variant: 'destructive',
            title: 'File Tidak Valid',
            description: 'Silakan pilih file gambar (PNG, JPG, dll).',
        });
        return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const imageRef = ref(storage, `${folderPath}/${uuidv4()}-${file.name}`);

    try {
        const uploadTask = await uploadBytes(imageRef, file);
        const url = await getDownloadURL(uploadTask.ref);
        onChange(url);
        toast({
            title: 'Sukses',
            description: 'Gambar berhasil diunggah.',
        });
    } catch (error: any) {
        console.error("Image upload error:", error);
        toast({
            variant: 'destructive',
            title: 'Gagal Unggah',
            description: 'Terjadi kesalahan saat mengunggah gambar. Silakan coba lagi.',
        });
        onChange(null);
    } finally {
        setIsUploading(false);
        setUploadProgress(0);
    }
  };
  
  const handleRemoveImage = async () => {
    if (!value || !storage) return;

    try {
        const imageRef = ref(storage, value);
        await deleteObject(imageRef);
        onChange(null);
        toast({
            title: 'Gambar Dihapus',
            description: 'Gambar telah dihapus dari penyimpanan.',
        });
    } catch (error: any) {
         // If it's a 404, the file doesn't exist, which is fine. Just clear the UI.
        if (error.code === 'storage/object-not-found') {
             onChange(null);
        } else {
            console.error("Error deleting image:", error);
            toast({
                variant: 'destructive',
                title: 'Gagal Menghapus Gambar',
                description: 'Gambar tidak dapat dihapus dari server, tetapi link akan dihapus dari form.',
            });
            // Still clear it from the UI
            onChange(null);
        }
    }
  };


  return (
    <div className="space-y-3">
        {!value && (
             <div className="flex items-center gap-2">
                <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    className="flex-grow text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                 {isUploading && <Loader2 className="h-5 w-5 animate-spin" />}
             </div>
        )}
      
        {isUploading && <Progress value={uploadProgress} className="w-full h-2" />}

        {value && (
            <div className="relative group w-full p-2 border rounded-md min-h-[100px] flex justify-center items-center">
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
