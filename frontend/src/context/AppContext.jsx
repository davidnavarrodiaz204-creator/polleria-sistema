import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import api from '../utils/api'
import { useAuth } from './AuthContext'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const { usuario } = useAuth()
  const [config, setConfig] = useState({ nombre: 'PollerOS', colorPrimario: '#F5C518', logo: '🍗' })
  const [notificaciones, setNotificaciones] = useState([])
  const socketRef = useRef(null)

  // Cargar config del servidor
  useEffect(() => {
    if (!usuario) return
    api.get('/config').then(r => {
      setConfig(r.data)
      document.documentElement.style.setProperty('--primary', r.data.colorPrimario)
      document.title = r.data.nombre || 'PollerOS'
    }).catch(() => {})
  }, [usuario])

  // Conectar socket
  useEffect(() => {
    if (!usuario) return
    const BASE = import.meta.env.VITE_API_URL || ''
    const socket = io(BASE, { auth: { token: localStorage.getItem('token') } })
    socketRef.current = socket

    socket.emit('join', { rol: usuario.rol, userId: usuario.id })

    socket.on('notificacion', (data) => {
      const id = Date.now()
      setNotificaciones(prev => [...prev, { ...data, id }])
      setTimeout(() => setNotificaciones(prev => prev.filter(n => n.id !== id)), 5000)
    })

    return () => socket.disconnect()
  }, [usuario])

  const cerrarNotif = (id) => setNotificaciones(prev => prev.filter(n => n.id !== id))

  const guardarConfig = async (datos) => {
    const { data } = await api.put('/config', datos)
    setConfig(data)
    document.documentElement.style.setProperty('--primary', data.colorPrimario)
    document.title = data.nombre || 'PollerOS'
    return data
  }

  return (
    <AppContext.Provider value={{ config, guardarConfig, notificaciones, cerrarNotif, socket: socketRef.current }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
