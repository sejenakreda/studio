
"use client";

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, LogIn, Loader2, UserPlus, KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleForgotPassword = async () => {
    const emailForReset = prompt("Masukkan alamat email Anda untuk reset password:");
    if (emailForReset) {
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, emailForReset);
        toast({
          title: "Email Reset Password Terkirim",
          description: "Silakan periksa inbox email Anda untuk instruksi reset password.",
        });
      } catch (error: any) {
        let friendlyMessage = "Gagal mengirim email reset password.";
        if (error.code === 'auth/user-not-found') {
          friendlyMessage = "Email tidak terdaftar. Pastikan email yang Anda masukkan benar.";
        }
        toast({
          variant: "destructive",
          title: "Gagal Reset Password",
          description: friendlyMessage,
        });
        console.error("Error sending password reset email:", error);
      } finally {
        setLoading(false);
      }
    }
  };

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
            <path d="M10 8H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3" />
            <path d="m10.5 10.5-5 5" />
            <path d="M10 14h.01" />
            <path d="M13 11h.01" />
            <path d="M16 8h.01" />
            <path d="M13 8h.01" />
            <path d="M16 11h.01" />
            <path d="M7 19.5c.942-1.014 2.364-1.501 4-1.5h2" />
            <path d="M12.914 4.914a2 2 0 0 1 2.828 0l1.344 1.344a2 2 0 0 1 0 2.828l-5.086 5.086a2 2 0 0 1-2.828 0l-1.344-1.344a2 2 0 0 1 0-2.828z" />
            <path d="m19 5-4 4" />
          </svg>
          <h1 className="text-4xl font-bold text-primary font-headline tracking-tight">
            SiAP Smapna
          </h1>
          <p className="mt-2 text-muted-foreground">
            Sistem Informasi Akademik & Penilaian Smapna.
          </p>
        </div>
        <LoginForm />
        <div className="mt-6 text-center text-sm">
          <Button
            variant="link"
            onClick={handleForgotPassword}
            className="text-primary hover:text-primary/80 p-0"
            disabled={loading}
          >
            <KeyRound className="mr-1.5 h-4 w-4" />
            Lupa Password?
          </Button>
          <span className="mx-2 text-muted-foreground">|</span>
          <Link href="/register">
            <Button
              variant="link"
              className="text-primary hover:text-primary/80 p-0"
              disabled={loading}
              asChild 
            >
              <span> 
                <UserPlus className="mr-1.5 h-4 w-4" />
                Buat Akun Baru
              </span>
            </Button>
          </Link>
          {/* 
            TODO: Halaman /register perlu dibuat.
            Fungsionalitasnya akan melibatkan form input (nama, email, password, konfirmasi password, mungkin peran jika user bisa memilih),
            validasi, pemanggilan createUserWithEmailAndPassword, dan createUserProfile.
          */}
        </div>
      </div>
      <footer className="mt-8 text-center text-sm text-primary-foreground/80">
        © {new Date().getFullYear()} SiAP Smapna. Hak Cipta Dilindungi.
      </footer>
    </div>
  );
}

// LoginForm component remains the same as provided in context
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorLoginForm, setErrorLoginForm] = useState<string | null>(null); // Renamed to avoid conflict
  const [loadingLoginForm, setLoadingLoginForm] = useState(false); // Renamed to avoid conflict
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorLoginForm(null);
    setLoadingLoginForm(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Login Berhasil",
        description: "Anda akan diarahkan ke dasbor.",
      });
      router.push('/'); 
    } catch (e: any) {
      let friendlyMessage = 'Gagal melakukan login. Periksa kembali email dan password Anda.';
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        friendlyMessage = 'Email atau password yang Anda masukkan salah. Silakan coba lagi.';
      } else if (e.code === 'auth/too-many-requests') {
        friendlyMessage = 'Terlalu banyak percobaan login. Silakan coba lagi nanti.';
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
          placeholder="contoh@email.com"
          className="bg-background/50 border-border focus:border-primary focus:ring-primary"
          aria-label="Alamat Email"
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
          className="bg-background/50 border-border focus:border-primary focus:ring-primary"
          aria-label="Password"
        />
      </div>
      <Button 
        type="submit" 
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        disabled={loadingLoginForm}
        aria-live="polite"
      >
        {loadingLoginForm ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Memproses...
          </>
        ) : (
          <>
            <LogIn className="mr-2 h-4 w-4" />
            Masuk
          </>
        )}
      </Button>
    </form>
  );
}

