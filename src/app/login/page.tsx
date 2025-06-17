import LoginForm from '@/components/auth/LoginForm';
import Image from 'next/image';

export default function LoginPage() {
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
      </div>
      <footer className="mt-8 text-center text-sm text-primary-foreground/80">
        © {new Date().getFullYear()} SkorZen. Hak Cipta Dilindungi.
      </footer>
    </div>
  );
}
