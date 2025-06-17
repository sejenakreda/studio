
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Enhanced logging and error handling
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    "Firebase config is missing critical keys (apiKey or projectId). " +
    "Please check your .env.local file and ensure it's loaded correctly. " +
    "The following configuration was attempted (sensitive values redacted for apiKey if present):",
    {
      apiKey: firebaseConfig.apiKey ? 'PRESENT_BUT_POTENTIALLY_INVALID' : 'MISSING_OR_UNDEFINED',
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId || 'MISSING_OR_UNDEFINED',
    }
  );
}

let app: FirebaseApp;

if (!getApps().length) {
  try {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      throw new Error("Firebase apiKey or projectId is missing. Check your .env.local file.");
    }
    app = initializeApp(firebaseConfig);
  } catch (error: any) {
    console.error("Firebase initialization error in initializeApp:", error);
    throw new Error(
      `Firebase initialization failed: ${error.message}. ` +
      "Please check your Firebase configuration in .env.local and ensure all NEXT_PUBLIC_ variables are set correctly and your server has been restarted."
    );
  }
} else {
  app = getApp();
}

let auth: Auth;
let db: Firestore;

try {
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error: any) {
  console.error("Error getting Firebase Auth or Firestore instance:", error);
  throw new Error(
    `Failed to get Firebase Auth/Firestore services: ${error.message}. ` +
    "Ensure these services are enabled in your Firebase project and your client-side configuration is correct."
  );
}

export { app, auth, db };

