
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
import { AlertTriangle, LogIn, Loader2, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
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
    const projId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    setConfigStatus({
      projectId: projId,
      hasApiKey: !!apiKey && apiKey.length > 10,
      isPlaceholder: apiKey === 'your_api_key_here' || projId === 'your_project_id_here'
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
    <div className="min-h-screen bg-gradient-to-br from-primary/90 to-accent/90 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md bg-card/95 backdrop-blur-md shadow-2xl rounded-2xl p-8 space-y-8 z-10 border border-white/20">
        <div className="text-center">
           <div className="mx-auto h-20 w-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
             <svg
              className="h-12 w-12 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              xmlns="http://www.w3.org/2000/svg"
              >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  <path d="m9 12 2 2 4-4" />
              </svg>
           </div>
          <h1 className="text-4xl font-black text-primary font-headline tracking-tighter">
            SiAP Smapna
          </h1>
          <p className="mt-3 text-muted-foreground font-medium">
            Sistem Informasi Akademik & Penilaian <br/> SMAS PGRI Naringgul
          </p>
        </div>

        { authContextLoading && !userProfile ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-sm font-bold text-muted-foreground animate-pulse uppercase tracking-widest">Sinkronisasi Data...</p>
          </div>
        ) : (
          <LoginForm />
        )}
      </div>

      <footer className="mt-8 text-center space-y-4 z-10 w-full max-w-xs">
        <div className="p-4 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">System Status</span>
              <ShieldCheck className="h-3 w-3 text-green-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-white/70">
                  <span>PROJECT:</span>
                  <div className="flex items-center gap-1">
                    <span className="truncate max-w-[80px]">{configStatus.projectId || "KOSONG"}</span>
                    {configStatus.projectId && configStatus.projectId !== 'your_project_id_here' ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <XCircle className="h-3 w-3 text-red-400" />}
                  </div>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-white/70">
                  <span>API AUTH:</span>
                  <div className="flex items-center gap-1">
                    <span>{configStatus.isPlaceholder ? "INVALID" : configStatus.hasApiKey ? "VERIFIED" : "NONE"}</span>
                    {configStatus.hasApiKey && !configStatus.isPlaceholder ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <XCircle className="h-3 w-3 text-red-400" />}
                  </div>
              </div>
            </div>
        </div>
        <p className="text-xs font-bold text-primary-foreground/60 uppercase tracking-widest">© {new Date().getFullYear()} Hak Cipta Dilindungi</p>
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
        setErrorLoginForm("Konfigurasi Firebase tidak valid. Pastikan variabel lingkungan sudah terpasang dengan benar.");
        setLoadingLoginForm(false);
        return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Akses Diterima",
        description: "Membuka gerbang data...",
      });
    } catch (e: any) {
      console.error("Login Error:", e);

      let friendlyMessage = 'Terjadi kesalahan sistem. Silakan coba lagi.';
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        friendlyMessage = 'Email atau password tidak sesuai.';
      } else if (e.code === 'auth/too-many-requests') {
        friendlyMessage = 'Terlalu banyak percobaan. Tunggu beberapa menit.';
      } else if (e.code === 'auth/network-request-failed') {
          friendlyMessage = 'Koneksi internet terganggu.';
      }
      
      setErrorLoginForm(friendlyMessage);
      toast({
        variant: "destructive",
        title: "Akses Ditolak",
        description: friendlyMessage,
      });
    } finally {
      setLoadingLoginForm(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorLoginForm && (
        <Alert variant="destructive" className="rounded-xl bg-destructive/10 border-destructive/20 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-bold uppercase text-[10px] tracking-widest">Peringatan</AlertTitle>
          <AlertDescription className="text-sm font-medium">{errorLoginForm}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="email-login" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
          Alamat Email
        </Label>
        <Input
          id="email-login"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="email@sekolah.com"
          className="h-12 rounded-xl bg-background border-2 focus-visible:ring-primary shadow-sm"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password-login" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
          Kata Sandi
        </Label>
        <Input
          id="password-login"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          className="h-12 rounded-xl bg-background border-2 focus-visible:ring-primary shadow-sm"
        />
      </div>
      <Button
        type="submit"
        className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg rounded-xl shadow-xl shadow-primary/20 transition-all duration-300 transform active:scale-95"
        disabled={loadingLoginForm}
      >
        {loadingLoginForm ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> VERIFIKASI...</>
        ) : (
          <><LogIn className="mr-2 h-5 w-5" /> MASUK KE SISTEM</>
        )}
      </Button>
    </form>
  );
}
