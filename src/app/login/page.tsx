
"use client";

import { useState, type FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

export default function LoginPage() {
  const router = useRouter();
  const { user, userProfile, loading: authContextLoading } = useAuth();

  useEffect(() => {
    // This effect handles redirection:
    // 1. If the user is already logged in when they land on /login.
    // 2. After a successful login attempt updates the AuthContext.
    if (!authContextLoading && user && userProfile) {
      if (userProfile.role === 'admin') {
        router.replace('/admin');
      } else if (userProfile.role === 'guru') {
        router.replace('/guru');
      } else {
        // Should not happen if AuthContext handles invalid roles by logging out
        console.warn("LoginPage: User has profile but unexpected role:", userProfile.role);
        // Stay on login or redirect to a generic error page if you have one.
        // For now, let AuthContext's logout handle it if role is truly invalid.
      }
    }
    // If !authContextLoading and !user (meaning truly logged out or initial unauthed state),
    // they stay on the login page, which is correct.
    // If authContextLoading is true, this effect does nothing, waiting for context to settle.
  }, [user, userProfile, authContextLoading, router]);


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
      <footer className="mt-8 text-center text-sm text-primary-foreground/80">
        © {new Date().getFullYear()} SiAP Smapna. Hak Cipta Dilindungi.
      </footer>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorLoginForm, setErrorLoginForm] = useState<string | null>(null);
  const [loadingLoginForm, setLoadingLoginForm] = useState(false);
  // Removed router from LoginForm as LoginPage now handles redirection
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorLoginForm(null);
    setLoadingLoginForm(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Login Berhasil",
        description: "Mengarahkan ke dasbor...", // Updated message
      });
      // DO NOT router.push('/') here. LoginPage's useEffect will handle redirection.
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

