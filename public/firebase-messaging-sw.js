// This file must be in the public folder.
// It handles background notifications for the Progressive Web App.

// Import the Firebase app and messaging services.
// Note: This uses the modular SDK syntax.
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// IMPORTANT: Replace this with your project's measurement ID if you have one,
// but it is not strictly required for FCM to work. For now, we can omit it.
const firebaseConfig = {
    apiKey: self.location.search.split('apiKey=')[1].split('&')[0],
    authDomain: self.location.search.split('authDomain=')[1].split('&')[0],
    projectId: self.location.search.split('projectId=')[1].split('&')[0],
    storageBucket: self.location.search.split('storageBucket=')[1].split('&')[0],
    messagingSenderId: self.location.search.split('messagingSenderId=')[1].split('&')[0],
    appId: self.location.search.split('appId=')[1].split('&')[0],
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  if (!payload.notification) {
    return;
  }

  const notificationTitle = payload.notification.title || 'Pemberitahuan Baru';
  const notificationOptions = {
    body: payload.notification.body || 'Anda memiliki pesan baru.',
    icon: '/icons/icon-192x192.png' // Use an icon from your PWA manifest
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
