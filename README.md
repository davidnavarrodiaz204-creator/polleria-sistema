# PollerOS — Sistema de Restaurante

Sistema completo para polleria: mesas, pedidos, cocina, delivery, caja, clientes, WhatsApp y reportes.
Stack: React + Node.js + MongoDB Atlas. 100% gratuito.

---

## COMO SUBIR A INTERNET (paso a paso)

### PASO 1 — Crear cuentas gratuitas
- GitHub: https://github.com — guardar codigo
- MongoDB Atlas: https://mongodb.com/atlas — base de datos
- Render: https://render.com — servidor gratis

### PASO 2 — Subir codigo a GitHub
1. Descarga GitHub Desktop: https://desktop.github.com
2. Instala y entra con tu cuenta GitHub
3. Click "Add an Existing Repository from your local drive"
4. Selecciona esta carpeta
5. Click "Publish repository" con nombre: polleria-sistema

### PASO 3 — Crear base de datos MongoDB Atlas
1. Entra a mongodb.com/atlas y crea cuenta
2. Crea cluster gratis M0
3. En Security > Database Access: crea usuario y contrasena
4. En Security > Network Access: agrega 0.0.0.0/0
5. En Database > Connect > Drivers: copia el string de conexion:
   mongodb+srv://USUARIO:PASSWORD@cluster0.xxxxx.mongodb.net/polleria

### PASO 4 — Desplegar Backend en Render
1. render.com > New > Web Service
2. Conecta GitHub y selecciona polleria-sistema
3. Root Directory: backend
4. Build Command: npm install
5. Start Command: npm start
6. Plan: Free
7. Environment Variables:
   - MONGODB_URI = tu string de MongoDB
   - JWT_SECRET = MiClaveSegura2024!
   - NODE_ENV = production
8. Espera 3 minutos. Copia la URL que te da.

### PASO 5 — Desplegar Frontend en Render
1. New > Static Site
2. Mismo repositorio
3. Root Directory: frontend
4. Build Command: npm install && npm run build
5. Publish Directory: dist
6. Environment Variables:
   - VITE_API_URL = URL del backend del paso 4
7. Tu sistema estara en la URL que te da Render.

### PASO 6 — Conectar backend con frontend
1. Ve al backend en Render > Environment
2. Agrega: FRONTEND_URL = URL del frontend del paso 5
3. Save Changes

---

## USUARIOS POR DEFECTO
- admin / admin123 (Administrador)
- carlos / mozo123 (Mozo)
- miguel / cocina123 (Cocina)
- luis / delivery123 (Repartidor)

Cambia las contrasenas despues de entrar.

---

## WHATSAPP PARA PROMOCIONES
1. Agrega +34 644 61 91 29 a tus contactos de WhatsApp
2. Enviala: I allow callmebot to send me messages
3. Recibiras tu API key
4. En Render > backend > Environment agrega:
   CALLMEBOT_APIKEY = tu key

---

## CONSULTA DNI/RUC AUTOMATICA
1. Registrate gratis en https://apis.net.pe
2. Copia tu token
3. En Render > backend > Environment agrega:
   APIS_PERU_TOKEN = tu token

---

## COMO USAR LA CAJA CADA DIA
1. Al llegar: Caja > Abrir Caja > ingresa efectivo inicial
2. Durante el dia: cobras pedidos desde la pestana Cobrar
3. Al cerrar: Cerrar Caja > imprime resumen automaticamente
4. Al dia siguiente: abre una nueva caja

---

## ESTRUCTURA DEL PROYECTO
polleria/
  backend/          <- API Node.js + Express
    src/
      models/       <- Esquemas MongoDB
      routes/       <- Endpoints API
      config/       <- DB y Socket.io
      middleware/   <- Autenticacion JWT
  frontend/         <- App React + Vite
    src/
      pages/        <- Pantallas del sistema
      components/   <- Componentes reutilizables
      context/      <- Estado global
      utils/        <- API client e impresion
  render.yaml       <- Config automatica Render
  README.md
