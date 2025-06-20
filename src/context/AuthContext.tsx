
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
        setUser(fbUser); // Set Firebase user immediately
        try {
          const userDocRef = doc(db as Firestore, 'users', fbUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const profileDataFromDb = userDocSnap.data();

            // Critical: Ensure the role exists and is valid from Firestore data.
            if (profileDataFromDb &&
                typeof profileDataFromDb.role === 'string' &&
                (profileDataFromDb.role === 'admin' || profileDataFromDb.role === 'guru')) {

              // Construct the UserProfile object.
              // Prioritize fbUser.uid as the source of truth for the UID.
              const constructedProfile: UserProfile = {
                uid: fbUser.uid, // Use UID from Firebase Auth user
                email: fbUser.email, // Use email from Firebase Auth user
                displayName: profileDataFromDb.displayName || fbUser.displayName || fbUser.email?.split('@')[0] || 'Pengguna',
                role: profileDataFromDb.role as Role,
                assignedMapel: profileDataFromDb.assignedMapel || [],
                createdAt: profileDataFromDb.createdAt, // Keep existing timestamps if they exist
                updatedAt: profileDataFromDb.updatedAt,
              };

              // Optional: Check for uid mismatch if profileDataFromDb.uid exists (for data integrity checks)
              if (profileDataFromDb.uid && profileDataFromDb.uid !== fbUser.uid) {
                console.warn(`AuthContext: UID mismatch for user ${fbUser.uid}. Firestore document has UID ${profileDataFromDb.uid}, but Auth UID is authoritative. Profile data used:`, constructedProfile);
                // This is a data inconsistency but might not be a reason to log out if role is fine.
              }

              setUserProfile(constructedProfile);
            } else {
              // Role is missing or invalid in Firestore document
              console.warn(`AuthContext: Firestore profile for UID ${fbUser.uid} has missing, malformed, or invalid 'role'. Logging out. Firestore Data:`, profileDataFromDb);
              setUserProfile(null);
              await signOut(auth);
              // setLoading(false) will be handled by the next onAuthStateChanged call after signOut
              return;
            }
          } else {
            // Firestore document does not exist for this authenticated user
            console.warn(`AuthContext: Firestore profile document for UID ${fbUser.uid} not found. Logging out.`);
            setUserProfile(null);
            await signOut(auth);
            // setLoading(false) will be handled by the next onAuthStateChanged call
            return;
          }
        } catch (error) {
          console.error(`AuthContext: Error fetching/processing user profile for UID ${fbUser.uid}. Logging out. Error:`, error);
          setUserProfile(null);
          await signOut(auth);
          // setLoading(false) will be handled by the next onAuthStateChanged call
          return;
        }
      } else {
        // fbUser is null (logged out or initial state)
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

