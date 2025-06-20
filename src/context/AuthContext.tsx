
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
    const processAuthState = async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        setUser(fbUser);
        try {
          const userDocRef = doc(db as Firestore, 'users', fbUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data();
            // Runtime validation for essential fields
            if (profileData && 
                typeof profileData.uid === 'string' && 
                profileData.uid.trim() !== '' && 
                profileData.role &&
                (profileData.role === 'admin' || profileData.role === 'guru')) {
              setUserProfile(profileData as UserProfile);
            } else {
              console.warn(`AuthContext: Firestore profile for UID ${fbUser.uid} is malformed or missing essential fields (uid, role). Logging out. Data:`, profileData);
              setUserProfile(null);
              await signOut(auth);
              // setLoading(false) will be handled in the 'else' branch of the next onAuthStateChanged call
              return; // Exit early as state will change again
            }
          } else {
            console.warn(`AuthContext: Firestore profile for UID ${fbUser.uid} not found. Logging out.`);
            setUserProfile(null);
            await signOut(auth);
            return;
          }
        } catch (error) {
          console.error("AuthContext: Error fetching user profile for UID " + fbUser.uid + ". Logging out.", error);
          setUserProfile(null);
          await signOut(auth);
          return;
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

