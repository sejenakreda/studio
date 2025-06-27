"use client";

import type React from 'react';
import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { doc, getDoc, Firestore, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db, isFirebaseConfigValid } from '@/lib/firebase';
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
  isStafTu: boolean;
  isSatpam: boolean;
  isPenjagaSekolah: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety check: If Firebase isn't configured, don't set up the listener.
    // This prevents the app from crashing if environment variables are missing.
    if (!isFirebaseConfigValid || !auth) {
      console.warn("AuthContext: Firebase is not configured correctly. Please check your environment variables. Auth features will be disabled.");
      setLoading(false);
      return; // Early return
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);

      if (fbUser) {
        try {
          // First, try to get the user document directly by UID
          const userDocRef = doc(db as Firestore, 'users', fbUser.uid);
          let userDocSnap = await getDoc(userDocRef);

          // Fallback: If not found by UID (e.g., mismatch), query by email
          if (!userDocSnap.exists()) {
              console.warn(`AuthContext: User document not found for UID ${fbUser.uid}. Attempting fallback query by email.`);
              const usersCollection = collection(db, 'users');
              const q = query(usersCollection, where("email", "==", fbUser.email), limit(1));
              const querySnapshot = await getDocs(q);

              if (!querySnapshot.empty) {
                  userDocSnap = querySnapshot.docs[0];
                  console.log(`AuthContext: Fallback successful. Found user document for email ${fbUser.email} with doc ID ${userDocSnap.id}.`);
              }
          }

          if (userDocSnap.exists()) {
            const profileDataFromDb = userDocSnap.data();

            if (profileDataFromDb &&
                typeof profileDataFromDb.role === 'string' &&
                (profileDataFromDb.role === 'admin' || profileDataFromDb.role === 'guru')) {

              const constructedProfile: UserProfile = {
                uid: fbUser.uid, // Always use the auth UID
                email: fbUser.email,
                displayName: profileDataFromDb.displayName || fbUser.displayName || fbUser.email?.split('@')[0] || 'Pengguna',
                role: profileDataFromDb.role as Role,
                assignedMapel: profileDataFromDb.assignedMapel || [],
                tugasTambahan: profileDataFromDb.tugasTambahan || [],
                createdAt: profileDataFromDb.createdAt,
                updatedAt: profileDataFromDb.updatedAt,
              };
              
              setUser(fbUser); 
              setUserProfile(constructedProfile);

            } else {
              console.warn(`AuthContext: Firestore profile for UID ${fbUser.uid} has missing, malformed, or invalid 'role'. Logging out. Firestore Data:`, profileDataFromDb);
              await signOut(auth);
            }
          } else {
            console.warn(`AuthContext: Firestore profile document for UID ${fbUser.uid} not found, even with email fallback. Logging out.`);
            await signOut(auth);
          }
        } catch (error) {
          console.error(`AuthContext: Error fetching/processing user profile for UID ${fbUser.uid}. Logging out. Error:`, error);
          await signOut(auth);
        } finally {
            setLoading(false);
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
  const isStafTu = useMemo(() => hasTugas('staf_tu'), [userProfile]);
  const isSatpam = useMemo(() => hasTugas('satpam'), [userProfile]);
  const isPenjagaSekolah = useMemo(() => hasTugas('penjaga_sekolah'), [userProfile]);

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
    isStafTu,
    isSatpam,
    isPenjagaSekolah,
  }), [
    user, userProfile, loading, isAdmin, isGuru, 
    isKesiswaan, isKurikulum, isPembinaOsis, isKepalaSekolah,
    isOperator, isBendahara, isBk, isPembinaEskul, isKepalaTataUsaha,
    isStafTu, isSatpam, isPenjagaSekolah
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
