/**
 * App.jsx — Rutas principales de PollerOS
 * Autor: David Navarro Diaz
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Mesas from './pages/Mesas'
import Pedidos from './pages/Pedidos'
import Cocina from './pages/Cocina'
import Delivery from './pages/Delivery'
import Caja from './pages/Caja'
import Carta from './pages/Carta'
import Clientes from './pages/Clientes'
import Usuarios from './pages/Usuarios'
import Reportes from './pages/Reportes'
import WhatsApp from './pages/WhatsApp'
import Configuracion from './pages/Configuracion'
import Historial from './pages/Historial'
import Inventario from './pages/Inventario'
import Reservas from './pages/Reservas'
import Comprobantes from './pages/Comprobantes'
import NotaCredito from './pages/NotaCredito'
import Notificaciones from './components/ui/Notificaciones'

function RutaProtegida({ children, roles }) {
  const { usuario, cargando } = useAuth()
  if (cargando) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'32px'}}>🍗</div>
  if (!usuario) return <Navigate to="/login" replace />
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { usuario } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<RutaProtegida><AppProvider><Layout /></AppProvider></RutaProtegida>}>
        <Route index element={<Dashboard />} />
        <Route path="mesas"        element={<Mesas />} />
        <Route path="pedidos"      element={<Pedidos />} />
        <Route path="cocina"       element={<RutaProtegida roles={['admin','cocina']}><Cocina /></RutaProtegida>} />
        <Route path="delivery"     element={<Delivery />} />
        <Route path="caja"         element={<RutaProtegida roles={['admin','cajero']}><Caja /></RutaProtegida>} />
        <Route path="historial"    element={<RutaProtegida roles={['admin','cajero']}><Historial /></RutaProtegida>} />
        <Route path="comprobantes"  element={<RutaProtegida roles={['admin']}><Comprobantes /></RutaProtegida>} />
        <Route path="nota-credito"  element={<RutaProtegida roles={['admin']}><NotaCredito /></RutaProtegida>} />
        <Route path="inventario"   element={<RutaProtegida roles={['admin']}><Inventario /></RutaProtegida>} />
        <Route path="reservas"     element={<RutaProtegida roles={['admin','mozo']}><Reservas /></RutaProtegida>} />
        <Route path="clientes"     element={<RutaProtegida roles={['admin']}><Clientes /></RutaProtegida>} />
        <Route path="carta"        element={<RutaProtegida roles={['admin']}><Carta /></RutaProtegida>} />
        <Route path="usuarios"     element={<RutaProtegida roles={['admin']}><Usuarios /></RutaProtegida>} />
        <Route path="reportes"     element={<RutaProtegida roles={['admin']}><Reportes /></RutaProtegida>} />
        <Route path="whatsapp"     element={<RutaProtegida roles={['admin']}><WhatsApp /></RutaProtegida>} />
        <Route path="configuracion" element={<RutaProtegida roles={['admin']}><Configuracion /></RutaProtegida>} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Notificaciones />
      </AuthProvider>
    </BrowserRouter>
  )
}
