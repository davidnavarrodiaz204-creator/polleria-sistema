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

----

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
