
"use client";

import type React from 'react';
import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { doc, getDoc, Firestore } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile, Role } from '@/types';

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
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true); // Indicate processing has started for this auth state event

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
                createdAt: profileDataFromDb.createdAt,
                updatedAt: profileDataFromDb.updatedAt,
              };
              
              setUser(fbUser); 
              setUserProfile(constructedProfile);
              setLoading(false); // Successfully loaded user and profile

            } else {
              console.warn(`AuthContext: Firestore profile for UID ${fbUser.uid} has missing, malformed, or invalid 'role'. Logging out. Firestore Data:`, profileDataFromDb);
              setUser(null);
              setUserProfile(null);
              await signOut(auth); // This will trigger another onAuthStateChanged(null)
              // setLoading will be handled by the next onAuthStateChanged(null) cycle.
            }
          } else {
            console.warn(`AuthContext: Firestore profile document for UID ${fbUser.uid} not found. Logging out.`);
            setUser(null);
            setUserProfile(null);
            await signOut(auth); // This will trigger another onAuthStateChanged(null)
          }
        } catch (error) {
          console.error(`AuthContext: Error fetching/processing user profile for UID ${fbUser.uid}. Logging out. Error:`, error);
          setUser(null);
          setUserProfile(null);
          await signOut(auth); // This will trigger another onAuthStateChanged(null)
        }
      } else { // fbUser is null (logged out or initial state)
        setUser(null);
        setUserProfile(null);
        setLoading(false); // Processing of "logged out" state is complete
      }
    });

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

