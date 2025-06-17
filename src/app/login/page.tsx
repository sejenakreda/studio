
"use client";

import { useState } from 'react';
import LoginForm from '@/components/auth/LoginForm';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUserProfile } from '@/lib/firestoreService';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const { toast } = useToast();

  const handleSeedUsers = async () => {
    setIsSeeding(true);
    const adminEmail = 'admin@example.com';
    const adminPass = 'admin123456';
    const guruEmail = 'guru123@example.com';
    const guruPass = 'guru123456';

    let adminCreated = false;
    let guruCreated = false;

    // Create Admin
    try {
      const adminCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
      await createUserProfile(adminCredential.user, 'admin', 'Default Admin');
      toast({ title: "Admin User Created", description: `${adminEmail} registered successfully.` });
      adminCreated = true;
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast({ title: "Admin User Seed Info", description: `${adminEmail} already exists. Login may be possible.`, variant: 'default' });
      } else {
        console.error("Error creating admin user:", error);
        toast({ title: "Admin User Creation Failed", description: error.message, variant: "destructive" });
      }
    }

    // Create Guru
    try {
      const guruCredential = await createUserWithEmailAndPassword(auth, guruEmail, guruPass);
      await createUserProfile(guruCredential.user, 'guru', 'Default Guru');
      toast({ title: "Guru User Created", description: `${guruEmail} registered successfully.` });
      guruCreated = true;
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast({ title: "Guru User Seed Info", description: `${guruEmail} already exists. Login may be possible.`, variant: 'default' });
      } else {
        console.error("Error creating guru user:", error);
        toast({ title: "Guru User Creation Failed", description: error.message, variant: "destructive" });
      }
    }

    if (adminCreated || guruCreated) {
        toast({ title: "Seeding Complete", description: "Attempted to create default users. You can now try logging in." });
    } else if (!adminCreated && !guruCreated) {
      // This case handles if both creations failed for reasons other than 'email-already-in-use'
      // or if they already existed and thus weren't "created" in this run.
      // The individual error toasts would have already appeared.
      // We can add a general message if needed, or rely on the specific failure toasts.
    }


    setIsSeeding(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-accent flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-card shadow-2xl rounded-xl p-8 space-y-8">
        <div className="text-center">
          <svg 
            className="mx-auto h-16 w-auto text-primary mb-4"
            viewBox="0 0 24 24" 
            fill="currentColor" 
            xmlns="http://www.w3.org/2000/svg"
            aria-label="SkorZen Logo"
            role="img"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
          </svg>
          <h1 className="text-4xl font-bold text-primary font-headline tracking-tight">
            SkorZen
          </h1>
          <p className="mt-2 text-muted-foreground">
            Selamat datang! Silakan masuk ke akun Anda.
          </p>
        </div>
        <LoginForm />
        <div className="mt-6 border-t border-border pt-6">
          <p className="mb-3 text-xs text-center text-muted-foreground">
            Untuk keperluan pengembangan, Anda bisa membuat pengguna default:
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground"
            onClick={handleSeedUsers}
            disabled={isSeeding}
          >
            {isSeeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Membuat Pengguna...
              </>
            ) : (
              'Buat Pengguna Default (Admin & Guru)'
            )}
          </Button>
          <p className="mt-2 text-xs text-center text-muted-foreground">
            Admin: admin@example.com / admin123456<br />
            Guru: guru123@example.com / guru123456
          </p>
        </div>
      </div>
      <footer className="mt-8 text-center text-sm text-primary-foreground/80">
        © {new Date().getFullYear()} SkorZen. Hak Cipta Dilindungi.
      </footer>
    </div>
  );
}
