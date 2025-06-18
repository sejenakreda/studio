
"use client";

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, LogIn, Loader2 } from 'lucide-react';
// UserPlus and KeyRound icons are no longer needed

export default function LoginPage() {
  // Removed emailForReset, loadingReset states as "Forgot Password" is removed
  const router = useRouter();
  const { toast } = useToast();

  // handleForgotPassword function removed

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
        <LoginForm />
        {/* "Forgot Password" and "Create New Account" links removed */}
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
