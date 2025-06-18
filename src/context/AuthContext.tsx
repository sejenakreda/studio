
"use client";

import type React from 'react';
import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { doc, getDoc, Firestore } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile, Role } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';


interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isGuru: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const processAuthState = async (fbUser: FirebaseUser | null) => {
      setLoading(true); 
      if (fbUser) {
        setUser(fbUser); 
        try {
          const userDocRef = doc(db as Firestore, 'users', fbUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data() as UserProfile);
            setLoading(false); 
          } else {
            console.warn(`AuthContext: Firestore profile for UID ${fbUser.uid} not found. User might exist in Auth but not in Firestore users collection. Logging out.`);
            setUserProfile(null);
            await signOut(auth); 
          }
        } catch (error) {
          console.error("AuthContext: Error fetching user profile for UID " + fbUser.uid + ". Logging out.", error);
          setUserProfile(null); 
          await signOut(auth); 
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false); 
      }
    };

    const unsubscribe = onAuthStateChanged(auth, processAuthState);
    return () => unsubscribe();
  }, []);


  const isAdmin = useMemo(() => userProfile?.role === 'admin', [userProfile]);
  const isGuru = useMemo(() => userProfile?.role === 'guru', [userProfile]);

  const value = useMemo(() => ({
    user,
    userProfile,
    loading,
    isAdmin,
    isGuru,
  }), [user, userProfile, loading, isAdmin, isGuru]);

  if (loading && typeof window !== 'undefined' && window.location.pathname !== '/login') {
    // Show full page skeleton only if loading and not already on login page (to avoid skeleton flash on login)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-32 w-full" />
           <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary mx-auto my-8"></div>
          <p className="text-center text-lg font-semibold text-foreground">Memuat SkorZen...</p>
        </div>
      </div>
    );
  }


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

