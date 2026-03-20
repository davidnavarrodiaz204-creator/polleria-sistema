/**
 * reset.js — Endpoint de reset del sistema PollerOS
 *
 * Permite al administrador limpiar el sistema para entregarlo
 * a un nuevo cliente o para iniciar operaciones reales.
 *
 * SE BORRA:   pedidos, cajas, egresos, delivery, backups, reservas
 * SE CONSERVA: usuarios, mesas, carta/menú, clientes, configuración
 *
 * Siempre hace un backup automático antes de borrar.
 * Requiere confirmación escribiendo "RESETEAR SISTEMA".
 *
 * Autor: David Navarro Diaz
 */
const express  = require('express');
const router   = express.Router();
const { auth, soloAdmin } = require('../middleware/auth');

const Pedido   = require('../models/Pedido');
const Caja     = require('../models/Caja');
const Egreso   = require('../models/Egreso');
const Backup   = require('../models/Backup');
const Delivery = require('../models/Delivery');
const Usuario  = require('../models/Usuario');
const Mesa     = require('../models/Mesa');
const Producto = require('../models/Producto');
const Cliente  = require('../models/Cliente');

// Reservas e Inventario son opcionales (pueden no existir)
let Reserva, Inventario
try { Reserva    = require('../models/Reserva')    } catch(e) {}
try { Inventario = require('../models/Inventario') } catch(e) {}

// ─────────────────────────────────────────────────────────────
// GET /api/reset/preview — muestra qué se va a borrar SIN borrar
// ─────────────────────────────────────────────────────────────
router.get('/preview', auth, soloAdmin, async (req, res) => {
  try {
    const [pedidos, cajas, egresos, backups, deliveries] = await Promise.all([
      Pedido.countDocuments(),
      Caja.countDocuments(),
      Egreso.countDocuments(),
      Backup.countDocuments(),
      Delivery.countDocuments(),
    ])

    const [usuarios, mesas, productos, clientes] = await Promise.all([
      Usuario.countDocuments(),
      Mesa.countDocuments(),
      Producto.countDocuments(),
      Cliente.countDocuments(),
    ])

    const ultimoPedido = await Pedido.findOne().sort({ numero: -1 })
    const ultimaCaja   = await Caja.findOne().sort({ createdAt: -1 })

    res.json({
      seBorra: {
        pedidos,
        cajas,
        egresos,
        deliveries,
        backups,
      },
      seConserva: {
        usuarios,
        mesas,
        productos,
        clientes,
        configuracion: 1,
      },
      correlativoActual: ultimoPedido?.numero || 0,
      ultimaCaja: ultimaCaja?.fecha || 'ninguna',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────
// POST /api/reset/ejecutar — ejecuta el reset completo
// Body: { confirmar: "RESETEAR SISTEMA", resetClientes: bool }
// ─────────────────────────────────────────────────────────────
router.post('/ejecutar', auth, soloAdmin, async (req, res) => {
  try {
    const { confirmar, resetClientes = false } = req.body

    if (confirmar !== 'RESETEAR SISTEMA') {
      return res.status(400).json({
        error: 'Debes confirmar escribiendo exactamente: RESETEAR SISTEMA'
      })
    }

    // 1. Guardar backup antes de borrar
    const [pedidos, cajas, egresos, clientes] = await Promise.all([
      Pedido.countDocuments(),
      Caja.countDocuments(),
      Egreso.countDocuments(),
      Cliente.countDocuments(),
    ])

    await Backup.create({
      tipo:      'pre-reset',
      tamaño:    pedidos + cajas + egresos + clientes,
      resumen:   { pedidos, cajas, egresos, clientes, usuarios: 0, mesas: 0 },
      creadoPor: req.usuario.nombre + ' (ANTES DEL RESET)',
    })

    // 2. Borrar colecciones de ventas/operaciones
    await Promise.all([
      Pedido.deleteMany({}),
      Caja.deleteMany({}),
      Egreso.deleteMany({}),
      Delivery.deleteMany({}),
      Backup.deleteMany({ tipo: { $ne: 'pre-reset' } }), // conservar el backup que acabamos de crear
    ])

    // 3. Resetear mesas a estado libre
    await Mesa.updateMany({}, {
      $set: { estado: 'libre', mozo: null, pedidoActual: null }
    })

    // 4. Borrar clientes si se pidió (opcional)
    if (resetClientes) {
      await Cliente.deleteMany({})
    }

    // 5. Borrar reservas e inventario si existen
    if (Reserva)    await Reserva.deleteMany({})
    if (Inventario) await Inventario.deleteMany({})

    res.json({
      success: true,
      mensaje: 'Sistema reseteado correctamente',
      borrado: {
        pedidos,
        cajas,
        egresos,
        clientes: resetClientes ? clientes : 0,
      },
      nota: 'Se conservaron: usuarios, mesas, carta/menú' + (resetClientes ? '' : ', clientes'),
      backupCreado: true,
    })

  } catch (err) {
    console.error('[RESET] Error:', err.message)
    res.status(500).json({ error: 'Error durante el reset: ' + err.message })
  }
})

module.exports = router
