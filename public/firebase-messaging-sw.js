// This service worker file is intentionally left almost empty.
// It will be populated with the necessary Firebase scripts and configuration
// dynamically when it's registered by the application.

// The importScripts line will be added by the Firebase SDK automatically.
// We just need this file to exist.
self.addEventListener('push', (event) => {
  // Optional: Handle push events if needed, but for simple notifications,
  // Firebase handles this automatically when the app is in the background.
  console.log('[Service Worker] Push Received.');
  console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);

  // To display a notification:
  const notificationTitle = event.data.json().notification.title;
  const notificationOptions = {
    body: event.data.json().notification.body,
    icon: '/icons/icon-192x192.png' // Optional: path to an icon
  };

  event.waitUntil(self.registration.showNotification(notificationTitle, notificationOptions));
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close();
  // Optional: define what happens when the user clicks the notification
  event.waitUntil(
    clients.openWindow('/')
  );
});
