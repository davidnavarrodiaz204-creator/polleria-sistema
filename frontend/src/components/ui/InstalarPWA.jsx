/**
 * InstalarPWA.jsx — Botón flotante para instalar la app en celular
 *
 * Aparece automáticamente cuando el navegador detecta que la app
 * puede instalarse (Android Chrome, Edge, etc.)
 * En iOS muestra instrucciones manuales (Safari → Compartir → Agregar a inicio)
 *
 * Autor: David Navarro Diaz
 */
import { useState, useEffect } from 'react'

export default function InstalarPWA() {
  const [promptEvento, setPromptEvento] = useState(null)
  const [mostrar, setMostrar]           = useState(false)
  const [esIOS, setEsIOS]               = useState(false)
  const [instalada, setInstalada]       = useState(false)
  const [mostrarIOS, setMostrarIOS]     = useState(false)

  useEffect(() => {
    // Detectar iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const safari = /safari/i.test(navigator.userAgent)
    const enStandalone = window.matchMedia('(display-mode: standalone)').matches
    setEsIOS(ios)
    setInstalada(enStandalone)

    // Android/Chrome/Edge: escuchar el evento de instalación
    const handler = (e) => {
      e.preventDefault()
      setPromptEvento(e)
      setMostrar(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS: mostrar si está en Safari y no está instalada
    if (ios && safari && !enStandalone) {
      // Mostrar después de 3 segundos la primera vez
      const yaVisto = localStorage.getItem('pwa-ios-visto')
      if (!yaVisto) {
        setTimeout(() => setMostrarIOS(true), 3000)
      }
    }

    // Detectar si se instaló
    window.addEventListener('appinstalled', () => {
      setInstalada(true)
      setMostrar(false)
      console.log('[PWA] App instalada exitosamente')
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const instalar = async () => {
    if (!promptEvento) return
    promptEvento.prompt()
    const { outcome } = await promptEvento.userChoice
    if (outcome === 'accepted') {
      setInstalada(true)
      setMostrar(false)
    }
    setPromptEvento(null)
  }

  const cerrarIOS = () => {
    setMostrarIOS(false)
    localStorage.setItem('pwa-ios-visto', '1')
  }

  // Si ya está instalada no mostrar nada
  if (instalada) return null

  // Android/Chrome — botón flotante
  if (mostrar && !esIOS) {
    return (
      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, display: 'flex', alignItems: 'center', gap: 12,
        background: '#1e2130', border: '2px solid #F5C518',
        borderRadius: 16, padding: '12px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        animation: 'slideUp .3s ease',
        maxWidth: 'calc(100vw - 32px)',
      }}>
        <style>{`
          @keyframes slideUp { from { opacity:0; transform:translateX(-50%) translateY(20px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }
        `}</style>
        <span style={{ fontSize: 28 }}>🍗</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>Instalar PollerOS</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Úsala como app en tu celular</div>
        </div>
        <button
          onClick={instalar}
          style={{
            background: '#F5C518', color: '#000', border: 'none',
            borderRadius: 10, padding: '8px 16px', fontWeight: 700,
            fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          Instalar
        </button>
        <button
          onClick={() => setMostrar(false)}
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20, padding: 4 }}
        >
          ✕
        </button>
      </div>
    )
  }

  // iOS Safari — instrucciones manuales
  if (mostrarIOS && esIOS) {
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
        background: '#1e2130', borderTop: '2px solid #F5C518',
        padding: '16px 20px', boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#F5C518' }}>
            🍗 Instalar PollerOS en iPhone
          </div>
          <button onClick={cerrarIOS} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>
        <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.8 }}>
          <div>1. Toca el botón <strong>Compartir</strong> <span style={{fontSize:16}}>⬆️</span> en Safari</div>
          <div>2. Baja y toca <strong>"Agregar a pantalla de inicio"</strong></div>
          <div>3. Toca <strong>"Agregar"</strong> — ¡listo!</div>
        </div>
      </div>
    )
  }

  return null
}
