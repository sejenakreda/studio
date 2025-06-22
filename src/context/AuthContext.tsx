
"use client";

import type React from 'react';
import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { doc, getDoc, Firestore } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile, Role, TugasTambahan } from '@/types';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isGuru: boolean;
  // Tugas Tambahan helpers
  isKesiswaan: boolean;
  isKurikulum: boolean;
  isPembinaOsis: boolean;
  isKepalaSekolah: boolean;
  isOperator: boolean;
  isBendahara: boolean;
  isBk: boolean;
  isPembinaEskul: boolean;
  isKepalaTataUsaha: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);

      if (fbUser) {
        try {
          const userDocRef = doc(db as Firestore, 'users', fbUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const profileDataFromDb = userDocSnap.data();

            if (profileDataFromDb &&
                typeof profileDataFromDb.role === 'string' &&
                (profileDataFromDb.role === 'admin' || profileDataFromDb.role === 'guru')) {

              const constructedProfile: UserProfile = {
                uid: fbUser.uid,
                email: fbUser.email,
                displayName: profileDataFromDb.displayName || fbUser.displayName || fbUser.email?.split('@')[0] || 'Pengguna',
                role: profileDataFromDb.role as Role,
                assignedMapel: profileDataFromDb.assignedMapel || [],
                tugasTambahan: profileDataFromDb.tugasTambahan || [], // Added this line
                createdAt: profileDataFromDb.createdAt,
                updatedAt: profileDataFromDb.updatedAt,
              };
              
              setUser(fbUser); 
              setUserProfile(constructedProfile);
              setLoading(false);

            } else {
              console.warn(`AuthContext: Firestore profile for UID ${fbUser.uid} has missing, malformed, or invalid 'role'. Logging out. Firestore Data:`, profileDataFromDb);
              setUser(null);
              setUserProfile(null);
              await signOut(auth);
            }
          } else {
            console.warn(`AuthContext: Firestore profile document for UID ${fbUser.uid} not found. Logging out.`);
            setUser(null);
            setUserProfile(null);
            await signOut(auth);
          }
        } catch (error) {
          console.error(`AuthContext: Error fetching/processing user profile for UID ${fbUser.uid}. Logging out. Error:`, error);
          setUser(null);
          setUserProfile(null);
          await signOut(auth);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);


  const isAdmin = useMemo(() => userProfile?.role === 'admin', [userProfile]);
  const isGuru = useMemo(() => userProfile?.role === 'guru', [userProfile]);
  
  const hasTugas = (tugas: TugasTambahan): boolean => {
    return userProfile?.tugasTambahan?.includes(tugas) ?? false;
  }

  const isKesiswaan = useMemo(() => hasTugas('kesiswaan'), [userProfile]);
  const isKurikulum = useMemo(() => hasTugas('kurikulum'), [userProfile]);
  const isPembinaOsis = useMemo(() => hasTugas('pembina_osis'), [userProfile]);
  const isKepalaSekolah = useMemo(() => hasTugas('kepala_sekolah'), [userProfile]);
  const isOperator = useMemo(() => hasTugas('operator'), [userProfile]);
  const isBendahara = useMemo(() => hasTugas('bendahara'), [userProfile]);
  const isBk = useMemo(() => hasTugas('bk'), [userProfile]);
  const isPembinaEskul = useMemo(() => userProfile?.tugasTambahan?.some(t => t.startsWith('pembina_eskul_')) ?? false, [userProfile]);
  const isKepalaTataUsaha = useMemo(() => hasTugas('kepala_tata_usaha'), [userProfile]);

  const value = useMemo(() => ({
    user,
    userProfile,
    loading,
    isAdmin,
    isGuru,
    isKesiswaan,
    isKurikulum,
    isPembinaOsis,
    isKepalaSekolah,
    isOperator,
    isBendahara,
    isBk,
    isPembinaEskul,
    isKepalaTataUsaha,
  }), [
    user, userProfile, loading, isAdmin, isGuru, 
    isKesiswaan, isKurikulum, isPembinaOsis, isKepalaSekolah,
    isOperator, isBendahara, isBk, isPembinaEskul, isKepalaTataUsaha
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
