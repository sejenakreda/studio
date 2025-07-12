
// This service handles requesting notification permission and managing FCM tokens.
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app, isFirebaseConfigValid } from './firebase';
import { updateUserFCMToken } from '@/context/AuthContext';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const initializeNotifications = async (uid: string, toast: (options: any) => void) => {
  if (!isFirebaseConfigValid || !app) {
    throw new Error("Konfigurasi Firebase tidak valid untuk notifikasi.");
  }
  
  const isFCMSupported = await isSupported();
  if (!isFCMSupported) {
    throw new Error("Browser Anda tidak mendukung notifikasi push.");
  }

  const messaging = getMessaging(app);

  // 1. Request Permission
  const permission = await Notification.requestPermission();
  
  if (permission === 'granted') {
    toast({
      title: "Izin Diberikan",
      description: "Mendapatkan token notifikasi...",
    });

    try {
      // 2. Get Token
      const currentToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        // We pass firebase config to the service worker to initialize it
        serviceWorkerRegistration: await navigator.serviceWorker.register(
            `/firebase-messaging-sw.js?apiKey=${firebaseConfig.apiKey}&authDomain=${firebaseConfig.authDomain}&projectId=${firebaseConfig.projectId}&storageBucket=${firebaseConfig.storageBucket}&messagingSenderId=${firebaseConfig.messagingSenderId}&appId=${firebaseConfig.appId}`
        ),
      });

      if (currentToken) {
        // 3. Save Token to Firestore
        await updateUserFCMToken(uid, currentToken);
        console.log('FCM Token:', currentToken);
        toast({
          title: "Notifikasi Diaktifkan!",
          description: "Anda akan menerima pengingat jika belum absen.",
        });
      } else {
        throw new Error("Gagal mendapatkan token notifikasi. Coba aktifkan ulang.");
      }
    } catch (err) {
      console.error('An error occurred while retrieving token. ', err);
      throw new Error("Gagal mendapatkan atau menyimpan token notifikasi.");
    }
  } else if (permission === 'denied') {
    // If permission is denied, we should also update Firestore to remove any old token.
    await updateUserFCMToken(uid, null);
    throw new Error("Izin notifikasi diblokir. Anda bisa mengubahnya di pengaturan browser.");
  } else {
    // If permission is default (dismissed), do nothing.
    toast({
        title: "Izin Diperlukan",
        description: "Anda perlu mengizinkan notifikasi untuk mendapatkan pengingat."
    });
  }
};
