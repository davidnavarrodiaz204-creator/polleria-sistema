# PollerOS — Sistema de Gestión para Pollerías

Sistema completo para administrar una pollería: mesas, pedidos, cocina, delivery, caja, clientes, WhatsApp y reportes.

**Stack:** React + Vite · Node.js + Express · MongoDB Atlas  
**Deploy:** Render (backend + frontend estático)  
**Autor:** David Navarro Diaz

---

## Funcionalidades

- **Mesas** — gestión de mesas con estados (libre / ocupada / por pagar)
- **Pedidos** — tomar pedidos por mesa, delivery o para llevar
- **Cocina** — pantalla en tiempo real con cronómetro por pedido
- **Delivery** — seguimiento de pedidos a domicilio
- **Caja** — apertura, cobro, egresos y cierre con resumen diario
- **Comprobantes** — ticket, boleta, factura y nota de crédito (con IGV)
- **Clientes** — registro con consulta automática de DNI/RUC (SUNAT/RENIEC)
- **WhatsApp** — envío de promociones y recordatorios de cumpleaños (CallMeBot)
- **Reportes** — ventas por día, semana y mes con gráficos
- **Backup** — descarga en JSON o Excel con historial de backups
- **Configuración** — nombre, apariencia, módulos y variables de entorno

---

## Estructura del proyecto

```
polleria-sistema/
├── backend/                    # API REST Node.js + Express
│   └── src/
│       ├── config/             # Conexión MongoDB y Socket.io
│       ├── middleware/         # Autenticación JWT
│       ├── models/             # Esquemas Mongoose
│       └── routes/             # Endpoints de la API
└── frontend/                   # App React + Vite
    └── src/
        ├── components/         # Componentes reutilizables
        ├── context/            # Estado global (Auth + App)
        ├── pages/              # Pantallas del sistema
        └── utils/              # Cliente API e impresión
```

---

## Variables de entorno

### Backend (`backend/.env`)

```env
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/polleria
JWT_SECRET=clave_secreta_larga
NODE_ENV=production
RESTAURANTE_NOMBRE=PollerOS
FRONTEND_URL=https://tu-frontend.onrender.com
APIS_PERU_TOKEN=tu_token_apis_net_pe     # Consulta DNI/RUC (gratis en apis.net.pe)
CALLMEBOT_APIKEY=tu_api_key              # WhatsApp gratis (callmebot.com)
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=https://tu-backend.onrender.com
```

---

## Usuarios por defecto

| Usuario | Contraseña | Rol |
|---|---|---|
| admin | admin123 | Administrador |
| carlos | mozo123 | Mozo |
| miguel | cocina123 | Cocina |
| luis | delivery123 | Repartidor |

> Cambiar las contraseñas después del primer login.

---

## Deploy en Render

### Backend (Web Service)
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Plan: Free

### Frontend (Static Site)
- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`

---

## API Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Login con JWT |
| GET | `/api/mesas` | Listar mesas |
| GET/POST | `/api/pedidos` | Pedidos |
| GET | `/api/clientes/consultar/:numero` | Consultar DNI o RUC |
| GET | `/api/backup/descargar?formato=json` | Descargar backup JSON |
| GET | `/api/backup/descargar?formato=excel` | Descargar backup Excel |
| GET | `/api/caja/hoy` | Estado de caja del día |
| POST | `/api/caja/cerrar` | Cerrar caja con resumen |

---

## Roadmap

- [ ] PWA instalable para mozos (celular)
- [ ] Historial de pedidos por mesa
- [ ] Inventario básico de ingredientes
- [ ] Reservas de mesa con fecha/hora
- [ ] Facturación electrónica SUNAT (Nubefact API)
- [ ] Multi-negocio para vender como SaaS

---

## Licencia

Uso privado — David Navarro Diaz © 2025
