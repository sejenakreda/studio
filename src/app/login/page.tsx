
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

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
      setError(friendlyMessage);
      toast({
        variant: "destructive",
        title: "Login Gagal",
        description: friendlyMessage,
      });
    } finally {
      setLoading(false);
    }
  };

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
            <path d="M9 4h10c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h4" />
            <polyline points="16 12 12 12 12 16" />
            <path d="m10 14 2-2 2 2" />
            <path d="M12 3v2" />
            <path d="M5 2v2" />
            <path d="M19 2v2" />
            <circle cx="12" cy="14" r="4" />
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
          <Link href="/register" passHref legacyBehavior>
            <Button
              variant="link"
              className="text-primary hover:text-primary/80 p-0"
              disabled={loading}
            >
              <UserPlus className="mr-1.5 h-4 w-4" />
              Buat Akun Baru
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
  const [error, setError] = useState<string | null>(null); // Error state for login form specifically
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

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
      setError(friendlyMessage);
      toast({
        variant: "destructive",
        title: "Login Gagal",
        description: friendlyMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Kesalahan Login</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-foreground/80">
          Alamat Email
        </Label>
        <Input
          id="email"
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
        <Label htmlFor="password" className="text-sm font-medium text-foreground/80">
          Password
        </Label>
        <Input
          id="password"
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
        disabled={loading}
        aria-live="polite"
      >
        {loading ? (
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
