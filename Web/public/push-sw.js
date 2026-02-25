// Push notification handler for RunFlow service worker
// This file is imported by the workbox-generated service worker via importScripts

// Handle incoming push notifications
self.addEventListener('push', function (event) {
    if (!event.data) return;

    let payload;
    try {
        payload = event.data.json();
    } catch (e) {
        payload = {
            title: 'RunFlow',
            body: event.data.text(),
        };
    }

    const options = {
        body: payload.body || '',
        icon: payload.icon || '/icons/app-icon-192.png',
        badge: payload.badge || '/icons/app-icon-192.png',
        tag: payload.tag || 'runflow-notification',
        renotify: !!payload.tag, // Only renotify if tag changes
        data: payload.data || {},
        vibrate: [100, 50, 100],
        actions: [
            { action: 'open', title: 'Open' },
            { action: 'dismiss', title: 'Dismiss' },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(payload.title || 'RunFlow', options)
    );
});

// Handle notification click
self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // Try to focus an existing window
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            // Open a new window if none exists
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

// Handle notification close (analytics opportunity)
self.addEventListener('notificationclose', function (event) {
    // Could send analytics here if needed
});
