
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// TEMPORARY HARDCODED CONFIG FOR TESTING - REMOVE AND USE .env.local FOR PRODUCTION/SECURITY
const firebaseConfig = {
  apiKey: "AIzaSyAAuN0z5IUP7m7AZ2UkEmqJ8LoJHjcMT48",
  authDomain: "device-streaming-923d7bd9.firebaseapp.com",
  projectId: "device-streaming-923d7bd9",
  storageBucket: "device-streaming-923d7bd9.firebasestorage.app",
  messagingSenderId: "96364387257",
  appId: "1:96364387257:web:3c07beab20637de09d3468",
};

// Enhanced logging and error handling
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    "Firebase config is missing critical keys (apiKey or projectId). " +
    "This might be due to hardcoded values being incorrect or an issue with .env.local if not hardcoding. " +
    "Current configuration (sensitive values may be partly redacted for apiKey if present):",
    {
      apiKey: firebaseConfig.apiKey ? 'PRESENT_BUT_POTENTIALLY_INVALID' : 'MISSING_OR_UNDEFINED',
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId || 'MISSING_OR_UNDEFINED',
    }
  );
  throw new Error(
    "Firebase initialization failed: Firebase apiKey or projectId is missing. Check your .env.local file " +
    "or hardcoded values. Please check your Firebase configuration and ensure all NEXT_PUBLIC_ variables " +
    "are set correctly and your server has been restarted if using .env.local."
  );
}

let app: FirebaseApp;

if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    console.log("Firebase app initialized successfully with hardcoded config (FOR TESTING).");
  } catch (error: any) {
    console.error("Firebase initialization error in initializeApp (hardcoded config):", error);
    throw new Error(
      `Firebase initialization failed (hardcoded config): ${error.message}. ` +
      "Check the hardcoded Firebase configuration values."
    );
  }
} else {
  app = getApp();
  console.log("Firebase app already initialized (hardcoded config - FOR TESTING).");
}

let auth: Auth;
let db: Firestore;

try {
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error: any) {
  console.error("Error getting Firebase Auth or Firestore instance (hardcoded config):", error);
  throw new Error(
    `Failed to get Firebase Auth/Firestore services (hardcoded config): ${error.message}. ` +
    "Ensure these services are enabled in your Firebase project."
  );
}

export { app, auth, db };

