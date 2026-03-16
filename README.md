# 🍗 PollerOS — Sistema de Restaurante

Sistema completo para pollería: mesas, pedidos, cocina, delivery, caja chica, egresos e impresión de boletas.
Stack: **React + Node.js + MongoDB Atlas** — 100% gratuito.

---

## 🚀 CÓMO PONER EN LÍNEA (paso a paso, sin saber programar)

### PASO 1 — Crea tus 3 cuentas gratuitas
| Servicio | Link | Para qué sirve |
|----------|------|----------------|
| GitHub | https://github.com | Guardar tu código |
| MongoDB Atlas | https://mongodb.com/atlas | Base de datos gratis |
| Render | https://render.com | Servidor gratis |

---

### PASO 2 — Sube el código a GitHub
1. Descarga **GitHub Desktop**: https://desktop.github.com
2. Instálalo y entra con tu cuenta GitHub
3. Click en **"Add an Existing Repository"**
4. Selecciona esta carpeta `polleria`
5. Click **"Publish repository"** → nombre: `polleria-sistema`

---

### PASO 3 — Configura MongoDB Atlas (base de datos)
1. Entra a https://mongodb.com/atlas → **Try Free**
2. Crea un cluster gratis (**M0 Sandbox**)
3. En **Security → Database Access**: crea usuario y contraseña (anótalos)
4. En **Security → Network Access**: click **"Allow access from anywhere"**
5. En **Database → Connect → Drivers**: copia el string que se ve así:
   ```
   mongodb+srv://TU_USUARIO:TU_PASSWORD@cluster0.xxxxx.mongodb.net/polleria
   ```
   ⚠️ Reemplaza `TU_USUARIO` y `TU_PASSWORD` con los que creaste

---

### PASO 4 — Despliega el Backend en Render
1. Entra a https://render.com → **New → Web Service**
2. Conecta tu cuenta GitHub y selecciona `polleria-sistema`
3. Configuración:
   - **Name**: `polleria-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
4. En **Environment Variables** agrega:
   - `MONGODB_URI` → tu string de MongoDB Atlas
   - `JWT_SECRET` → cualquier texto: `MiPolleriaSecreta2024!`
   - `NODE_ENV` → `production`
5. Click **"Create Web Service"** — espera 3 minutos
6. Copia la URL que te da (ej: `https://polleria-backend.onrender.com`)

---

### PASO 5 — Despliega el Frontend en Render
1. En Render → **New → Static Site**
2. Selecciona el mismo repositorio
3. Configuración:
   - **Name**: `polleria-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. En **Environment Variables**:
   - `VITE_API_URL` → URL de tu backend (del paso 4)
5. Click **"Create Static Site"**
6. ¡Listo! Tendrás una URL para compartir con tus mozos

---

## 👤 Usuarios por defecto
| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `admin123` | Administrador |
| `carlos` | `mozo123` | Mozo |
| `miguel` | `cocina123` | Cocina |
| `luis` | `delivery123` | Repartidor |

> ⚠️ Cambia las contraseñas después de entrar por primera vez

---

## 📱 Uso en celular para mozos
Los mozos abren la URL en su celular → menú del navegador → **"Agregar a pantalla de inicio"** → funciona como app.

## 🖨️ Impresión de boletas y pedidos
- Compatible con impresoras térmicas USB de 80mm (ej: Epson TM-T20, BIXOLON)
- También imprime en cualquier impresora normal desde el navegador
- Formato optimizado para ticket de cocina y boleta de venta

---

## 📁 Estructura del proyecto
```
polleria/
├── backend/          ← Servidor Node.js + Express
│   └── src/
│       ├── models/   ← Esquemas MongoDB
│       ├── routes/   ← Endpoints API
│       ├── controllers/ ← Lógica de negocio
│       ├── middleware/  ← Auth JWT
│       ├── config/   ← DB y Socket.io
│       └── utils/    ← Helpers
├── frontend/         ← Aplicación React
│   └── src/
│       ├── pages/    ← Páginas principales
│       ├── components/ ← Componentes reutilizables
│       ├── context/  ← Estado global
│       ├── hooks/    ← Hooks personalizados
│       └── utils/    ← Helpers frontend
└── docs/             ← Documentación adicional
```
