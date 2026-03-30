/**
 * caja.js — Rutas de caja con soporte multi-turno
 *
 * Lógica de turnos:
 *  - Un día puede tener múltiples aperturas (turno mañana, turno noche, etc.)
 *  - Solo puede haber UNA caja abierta a la vez
 *  - Al cerrar turno se imprime resumen del turno, no del día completo
 *  - Solo admin y cajero pueden operar la caja
 *
 * Ahora con: Soporte para pagos mixtos, descuentos y puntos
 *
 * Autor: David Navarro Diaz
 */
const router = require('express').Router();
const Caja   = require('../models/Caja');
const Pedido = require('../models/Pedido');
const Egreso = require('../models/Egreso');
const Cliente = require('../models/Cliente');
const Config = require('../models/Config');
const { caja } = require('../validators');
const { auth } = require('../middleware/auth');
const { emit } = require('../config/socket');
const puntosService = require('../services/puntosService');

// Solo admin o cajero pueden operar caja
const soloCaja = (req, res, next) => {
  if (!['admin', 'cajero'].includes(req.usuario?.rol)) {
    return res.status(403).json({ error: 'Solo administrador o cajero pueden operar la caja' });
  }
  next();
};

const hoyPeru = () => {
  const ahora = new Date();
  ahora.setHours(ahora.getHours() - 5);
  return ahora.toISOString().split('T')[0];
};

// GET /api/caja/hoy — caja abierta en este momento
router.get('/hoy', auth, async (_req, res) => {
  try {
    const caja = await Caja.findOne({ estado: 'abierta' }).sort({ createdAt: -1 });
    res.json(caja || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/caja — historial de cajas (últimas 60)
router.get('/', auth, async (_req, res) => {
  try {
    if (!['admin', 'cajero'].includes(req.usuario?.rol)) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    const cajas = await Caja.find().sort({ createdAt: -1 }).limit(60);
    res.json(cajas);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/caja/abrir — abrir turno de caja
router.post('/abrir', auth, soloCaja, caja.abrir, async (req, res) => {
  try {
    // Verificar que no haya otra caja abierta
    const yaAbierta = await Caja.findOne({ estado: 'abierta' });
    if (yaAbierta) return res.json(yaAbierta); // devolver la existente sin error

    const caja = await Caja.create({
      fecha:         hoyPeru(),
      montoApertura: Number(req.body.montoApertura) || 0,
      abiertaPor:    req.usuario.nombre,
      estado:        'abierta',
    });

    emit.cajaActualizada(req.io, caja);
    res.status(201).json(caja);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/caja/puntos/:clienteId — Obtener resumen de puntos de un cliente
router.get('/puntos/:clienteId', auth, async (req, res) => {
  try {
    const resumen = await puntosService.obtenerResumenPuntos(req.params.clienteId);
    if (!resumen) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }
    res.json({ success: true, data: resumen });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/caja/canjear-puntos — Canjear puntos de un cliente
router.post('/canjear-puntos', auth, async (req, res) => {
  try {
    const { clienteId, puntos } = req.body;

    if (!clienteId || !puntos || puntos <= 0) {
      return res.status(400).json({ success: false, message: 'Cliente y puntos requeridos' });
    }

    const config = await Config.findOne();
    const configPuntos = config?.puntos || {};
    const cliente = await Cliente.findById(clienteId);

    // Verificar si puede canjear
    const verificacion = puntosService.verificarCanje(cliente, puntos, configPuntos);
    if (!verificacion.puede) {
      return res.status(400).json({ success: false, message: verificacion.mensaje });
    }

    // Calcular valor
    const valor = puntosService.calcularValorPuntos(puntos, configPuntos);

    res.json({
      success: true,
      data: {
        puntosCanjear: puntos,
        valorDescuento: valor,
        puntosRestantes: cliente.puntos - puntos,
        mensaje: `Canje válido: ${puntos} puntos = S/ ${valor.toFixed(2)} de descuento`
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/caja/cerrar — cerrar turno actual
router.post('/cerrar', auth, soloCaja, caja.cerrar, async (req, res) => {
  try {
    const caja = await Caja.findOne({ estado: 'abierta' }).sort({ createdAt: -1 });
    if (!caja) return res.status(404).json({ error: 'No hay caja abierta' });

    // Calcular ventas DESDE que se abrió este turno
    const inicio = new Date(caja.createdAt);
    const fin    = new Date();

    const pedidos = await Pedido.find({ pagado: true, creadoEn: { $gte: inicio, $lt: fin } });
    const egresos = await Egreso.find({
      createdAt: { $gte: inicio, $lt: fin }
    });

    // Calcular totales por método de pago (incluyendo pagos mixtos)
    let totalEfectivo = 0, totalYape = 0, totalPlin = 0, totalTarjeta = 0, totalTransferencia = 0;
    let totalVentas = 0, totalDescuentos = 0, pagosMixtosCount = 0, montoPagosMixtos = 0;

    pedidos.forEach(p => {
      const monto = p.total || 0;
      totalVentas += monto;
      totalDescuentos += p.descuento || 0;

      // Si tiene pagos mixtos, distribuir por método
      if (p.pagosMixtos && p.pagosMixtos.length > 0) {
        pagosMixtosCount++;
        montoPagosMixtos += monto;
        p.pagosMixtos.forEach(pago => {
          const montoPago = pago.monto || 0;
          switch (pago.metodo) {
            case 'efectivo':      totalEfectivo += montoPago; break;
            case 'yape':          totalYape += montoPago; break;
            case 'plin':          totalPlin += montoPago; break;
            case 'tarjeta':       totalTarjeta += montoPago; break;
            case 'transferencia': totalTransferencia += montoPago; break;
          }
        });
      } else {
        // Pago simple
        switch (p.metodoPago) {
          case 'efectivo':      totalEfectivo += monto; break;
          case 'yape':          totalYape += monto; break;
          case 'plin':          totalPlin += monto; break;
          case 'tarjeta':       totalTarjeta += monto; break;
          case 'transferencia': totalTransferencia += monto; break;
        }
      }
    });

    caja.totalVentas        = totalVentas;
    caja.totalEfectivo      = totalEfectivo;
    caja.totalYape          = totalYape;
    caja.totalPlin          = totalPlin;
    caja.totalTarjeta       = totalTarjeta;
    caja.totalTransferencia = totalTransferencia;
    caja.totalPagosMixtos   = pagosMixtosCount;
    caja.montoPagosMixtos    = montoPagosMixtos;
    caja.totalDescuentos    = pedidos.filter(p => p.descuento > 0).length;
    caja.montoDescuentos    = totalDescuentos;

    const tickets  = pedidos.filter(p => p.tipoComprobante === 'ticket');
    const boletas  = pedidos.filter(p => p.tipoComprobante === 'boleta');
    const facturas = pedidos.filter(p => p.tipoComprobante === 'factura');
    caja.totalTickets  = tickets.length;
    caja.totalBoletas  = boletas.length;
    caja.totalFacturas = facturas.length;
    caja.montoTickets  = tickets.reduce((s, p) => s + p.total, 0);
    caja.montoBoletas  = boletas.reduce((s, p) => s + p.total, 0);
    caja.montoFacturas = facturas.reduce((s, p) => s + p.total, 0);

    caja.subTotal  = Math.round((caja.totalVentas / 1.18) * 100) / 100;
    caja.totalIGV  = Math.round((caja.totalVentas - caja.subTotal) * 100) / 100;

    caja.totalEgresos  = egresos.reduce((s, e) => s + e.monto, 0);
    caja.montoCierre   = Number(req.body.montoCierre) || 0;
    caja.saldoFinal    = caja.montoApertura + totalEfectivo - caja.totalEgresos;
    caja.observaciones = req.body.observaciones || '';
    caja.cerradaPor    = req.usuario.nombre;
    caja.estado        = 'cerrada';

    await caja.save();
    emit.cajaActualizada(req.io, caja);
    res.json(caja);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
