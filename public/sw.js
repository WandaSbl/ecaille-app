self.__WB_MANIFEST;

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}

  event.waitUntil(
    self.registration.showNotification(
      data.title ?? 'Écaille',
      {
        body: data.body ?? '',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        requireInteraction: true
      }
    )
  )
})