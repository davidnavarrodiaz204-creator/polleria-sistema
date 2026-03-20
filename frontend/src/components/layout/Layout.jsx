/**
 * Layout.jsx — Estructura principal: sidebar + topbar + contenido
 * Autor: David Navarro Diaz
 */
import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import './Layout.css'

// Navegación organizada por grupos
const NAV = [
  // Operaciones del día
  { to: '/',             icon: '📊', label: 'Dashboard',      roles: ['admin','mozo','cocina','delivery'] },
  { to: '/mesas',        icon: '🪑', label: 'Mesas',           roles: ['admin','mozo'] },
  { to: '/pedidos',      icon: '📋', label: 'Nuevo Pedido',    roles: ['admin','mozo'] },
  { to: '/reservas',     icon: '📅', label: 'Reservas',        roles: ['admin','mozo'] },
  { to: '/cocina',       icon: '👨‍🍳', label: 'Cocina',           roles: ['admin','cocina'] },
  { to: '/delivery',     icon: '🛵', label: 'Delivery',        roles: ['admin','mozo','delivery'] },
  // Caja y ventas
  { to: '/caja',         icon: '💵', label: 'Caja',            roles: ['admin'] },
  { to: '/historial',    icon: '🧾', label: 'Historial',       roles: ['admin'] },
  { to: '/comprobantes', icon: '📄', label: 'Comprobantes',    roles: ['admin'] },
  { to: '/nota-credito', icon: '↩️', label: 'Nota de Crédito',  roles: ['admin'] },
  // Gestión
  { to: '/inventario',   icon: '📦', label: 'Inventario',      roles: ['admin'] },
  { to: '/clientes',     icon: '👤', label: 'Clientes',         roles: ['admin'] },
  { to: '/carta',        icon: '📖', label: 'Carta / Menú',    roles: ['admin'] },
  // Administración
  { to: '/usuarios',     icon: '👥', label: 'Usuarios',        roles: ['admin'] },
  { to: '/reportes',     icon: '📈', label: 'Reportes',        roles: ['admin'] },
  { to: '/whatsapp',     icon: '💬', label: 'WhatsApp',         roles: ['admin'] },
  { to: '/configuracion',icon: '⚙️', label: 'Configuración',    roles: ['admin'] },
]

export default function Layout() {
  const { usuario, logout } = useAuth()
  const { config, notificaciones } = useApp()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = NAV.filter(n => n.roles.includes(usuario?.rol))
  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">{config.logo || '🍗'}</div>
          <div>
            <div className="logo-name">{config.nombre || 'PollerOS'}</div>
            <div className="logo-sub">Sistema de Restaurante</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">{usuario?.nombre?.[0]?.toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name">{usuario?.nombre}</div>
            <div className="user-role">{usuario?.rol}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">↩</button>
        </div>
      </aside>

      <header className="topbar no-print">
        <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
        <div className="topbar-brand">{config.nombre || 'PollerOS'}</div>
        <div className="topbar-right">
          {notificaciones.length > 0 && (
            <div className="notif-indicator">
              <span className="notif-count">{notificaciones.length}</span>🔔
            </div>
          )}
          <div className="topbar-user">{usuario?.nombre}</div>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
