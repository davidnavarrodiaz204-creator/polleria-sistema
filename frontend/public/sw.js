/**
 * sw.js — Service Worker para PollerOS PWA
 * Permite instalar la app en celular y funcionar offline básico
 * Autor: David Navarro Diaz
 */

const CACHE_NAME = 'polleros-v1'

// Recursos que se cachean para funcionar sin internet
const CACHE_ESTATICO = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

// ── Instalación: cachear recursos estáticos ──────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Cacheando recursos estáticos')
      return cache.addAll(CACHE_ESTATICO).catch(err => {
        console.log('[SW] Error cacheando:', err)
      })
    })
  )
  self.skipWaiting()
})

// ── Activación: limpiar caches viejas ───────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch: estrategia Network First con fallback a cache ─────
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // Las llamadas a la API siempre van a la red (no cachear datos)
  if (url.pathname.startsWith('/api') || url.hostname !== location.hostname) {
    e.respondWith(
      fetch(e.request).catch(() => {
        // Si no hay internet y es una API, devolver error JSON
        if (e.request.headers.get('accept')?.includes('application/json')) {
          return new Response(
            JSON.stringify({ error: 'Sin conexión a internet' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          )
        }
      })
    )
    return
  }

  // Para el resto (HTML, JS, CSS, imágenes): Network First
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Guardar en cache si la respuesta es válida
        if (response && response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
        }
        return response
      })
      .catch(() => {
        // Sin internet: usar cache
        return caches.match(e.request).then(cached => {
          if (cached) return cached
          // Si es navegación (HTML), devolver index.html para que React maneje la ruta
          if (e.request.mode === 'navigate') {
            return caches.match('/index.html')
          }
        })
      })
  )
})

// ── Notificaciones push (base para futuras notificaciones) ───
self.addEventListener('push', (e) => {
  const data = e.data?.json() || {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'PollerOS', {
      body:  data.body  || 'Tienes una notificación',
      icon:  '/icon-192.png',
      badge: '/icon-192.png',
      tag:   data.tag   || 'polleros',
      data:  data.url   || '/',
    })
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(clients.openWindow(e.notification.data || '/'))
})
