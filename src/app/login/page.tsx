"use client";

import { useState, type FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, isFirebaseConfigValid } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, LogIn, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { user, userProfile, loading: authContextLoading, isSatpam, isPenjagaSekolah, isStafTu } = useAuth();

  const [configStatus, setConfigStatus] = useState<{
    projectId: string | undefined;
    hasApiKey: boolean;
    isPlaceholder: boolean;
  }>({
    projectId: undefined,
    hasApiKey: false,
    isPlaceholder: false
  });

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    setConfigStatus({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      hasApiKey: !!apiKey && apiKey.length > 10,
      isPlaceholder: apiKey === 'your_api_key_here' || apiKey === 'AIzaSy_your_key'
    });
  }, []);


  useEffect(() => {
    if (!authContextLoading && user && userProfile) {
      if (userProfile.role === 'admin') {
        router.replace('/protected/admin');
      } else if (userProfile.role === 'guru') {
        if (isSatpam) {
          router.replace('/protected/guru/laporan-kegiatan?context=satpam');
        } else if (isPenjagaSekolah) {
          router.replace('/protected/guru/laporan-kegiatan?context=penjaga_sekolah');
        } else if (isStafTu) {
          router.replace('/protected/guru/laporan-kegiatan?context=staf_tu');
        } else {
          router.replace('/protected/guru');
        }
      }
    }
  }, [user, userProfile, authContextLoading, router, isSatpam, isPenjagaSekolah, isStafTu]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-accent flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-card shadow-2xl rounded-xl p-8 space-y-8">
        <div className="text-center">
           <svg
            className="mx-auto h-16 w-auto text-primary mb-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="SiAP Smapna Logo"
            role="img"
            >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                <path d="m9 12 2 2 4-4" />
            </svg>
          <h1 className="text-4xl font-bold text-primary font-headline tracking-tight">
            SiAP Smapna
          </h1>
          <p className="mt-2 text-muted-foreground">
            Sistem Informasi Akademik & Penilaian Smapna.
          </p>
        </div>
        { authContextLoading && !userProfile ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Memeriksa sesi Anda...</p>
          </div>
        ) : (
          <LoginForm />
        )}
      </div>
      <footer className="mt-8 text-center text-sm text-primary-foreground/80 space-y-2">
        <div className="inline-flex flex-col items-center gap-1 p-3 bg-black/30 rounded-lg border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-[10px] font-mono">
                <span>PROJECT: {configStatus.projectId || "KOSONG"}</span>
                {configStatus.projectId && configStatus.projectId !== 'your_project_id_here' ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <XCircle className="h-3 w-3 text-red-400" />}
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono">
                <span>API KEY: {configStatus.isPlaceholder ? "PLACEHOLDER (SALAH)" : configStatus.hasApiKey ? "TERDETEKSI" : "TIDAK ADA"}</span>
                {configStatus.hasApiKey && !configStatus.isPlaceholder ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <XCircle className="h-3 w-3 text-red-400" />}
            </div>
        </div>
        <p className="mt-2">© {new Date().getFullYear()} SiAP Smapna. Hak Cipta Dilindungi.</p>
      </footer>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorLoginForm, setErrorLoginForm] = useState<string | null>(null);
  const [loadingLoginForm, setLoadingLoginForm] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorLoginForm(null);
    setLoadingLoginForm(true);

    if (!auth || !isFirebaseConfigValid) {
        setErrorLoginForm("Konfigurasi Firebase tidak valid. Pastikan file .env.local Anda sudah berisi API Key yang benar.");
        setLoadingLoginForm(false);
        return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Login Berhasil",
        description: "Mengarahkan ke dasbor...",
      });
    } catch (e: any) {
      console.error("Detail Error Login:", e);

      let friendlyMessage = 'Terjadi kesalahan. Silakan coba lagi.';
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        friendlyMessage = 'Email atau password yang Anda masukkan salah.';
      } else if (e.code === 'auth/too-many-requests') {
        friendlyMessage = 'Terlalu banyak percobaan login yang gagal. Silakan tunggu sebentar.';
      } else if (e.code === 'auth/api-key-not-valid') {
          friendlyMessage = 'API Key Firebase tidak valid. Periksa kembali file .env.local Anda.';
      } else if (e.code === 'auth/network-request-failed') {
          friendlyMessage = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
      }
      
      setErrorLoginForm(friendlyMessage);
      toast({
        variant: "destructive",
        title: "Login Gagal",
        description: friendlyMessage,
      });
    } finally {
      setLoadingLoginForm(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorLoginForm && (
        <Alert variant="destructive" role="alert">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Kesalahan Login</AlertTitle>
          <AlertDescription>{errorLoginForm}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="email-login" className="text-sm font-medium text-foreground/80">
          Alamat Email
        </Label>
        <Input
          id="email-login"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="contoh@example.com"
          className="bg-background/50 border-border"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password-login" className="text-sm font-medium text-foreground/80">
          Password
        </Label>
        <Input
          id="password-login"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          className="bg-background/50 border-border"
        />
      </div>
      <Button
        type="submit"
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg shadow-md transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
        disabled={loadingLoginForm}
      >
        {loadingLoginForm ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</>
        ) : (
          <><LogIn className="mr-2 h-4 w-4" /> Masuk</>
        )}
      </Button>
    </form>
  );
}