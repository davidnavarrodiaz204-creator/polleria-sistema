/**
 * pedidos.js — Rutas de pedidos con paginación y service layer
 * Ahora con: paginación, respuestas estandarizadas, filtros optimizados
 * Plus: Soporte para descuentos, puntos y pagos mixtos
 * Autor: David Navarro Diaz
 */
const router = require('express').Router();
const Pedido = require('../models/Pedido');
const Mesa = require('../models/Mesa');
const Cliente = require('../models/Cliente');
const Config = require('../models/Config');
const { auth } = require('../middleware/auth');
const { emit } = require('../config/socket');
const paginate = require('../utils/paginate');
const Logger = require('../utils/logger');
const { pedido } = require('../validators');
const puntosService = require('../services/puntosService');

// GET /api/pedidos — pedidos de HOY (sin paginación, para caja real-time)
router.get('/', auth, async (req, res) => {
  try {
    const inicioHoy = new Date();
    inicioHoy.setUTCHours(5, 0, 0, 0);
    const finHoy = new Date(inicioHoy);
    finHoy.setDate(finHoy.getDate() + 1);

    const pedidos = await Pedido.find({
      creadoEn: { $gte: inicioHoy, $lt: finHoy }
    }).sort({ creadoEn: -1 }).limit(500);

    res.json({
      success: true,
      count: pedidos.length,
      data: { pedidos }
    });
  } catch (err) {
    Logger.error('Error en GET /pedidos:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/pedidos/cocina — solo los que cocina debe preparar
router.get('/cocina', auth, async (req, res) => {
  try {
    const pedidos = await Pedido.find({
      estado: { $in: ['en_cocina', 'preparando'] }
    }).sort({ creadoEn: 1 });

    res.json({
      success: true,
      count: pedidos.length,
      data: { pedidos }
    });
  } catch (err) {
    Logger.error('Error en GET /pedidos/cocina:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/pedidos/historial — historial PAGINADO con filtros
// Query params: fecha, desde, hasta, tipo, estado, comprobante, pagado, q, page, limit
router.get('/historial', auth, async (req, res) => {
  try {
    const { fecha, desde, hasta, tipo, estado, comprobante, pagado, q, page, limit } = req.query;
    const filtro = {};

    // Filtro por fecha
    if (fecha) {
      const inicio = new Date(fecha + 'T05:00:00.000Z');
      const fin = new Date(inicio);
      fin.setDate(fin.getDate() + 1);
      filtro.creadoEn = { $gte: inicio, $lt: fin };
    } else if (desde || hasta) {
      filtro.creadoEn = {};
      if (desde) filtro.creadoEn.$gte = new Date(desde + 'T05:00:00.000Z');
      if (hasta) {
        const h = new Date(hasta + 'T05:00:00.000Z');
        h.setDate(h.getDate() + 1);
        filtro.creadoEn.$lt = h;
      }
    }

    if (tipo) filtro.tipo = tipo;
    if (estado) filtro.estado = estado;
    if (comprobante) filtro.tipoComprobante = comprobante;
    if (pagado !== undefined) filtro.pagado = pagado === 'true';

    // Búsqueda de texto
    if (q) {
      const num = parseInt(q);
      filtro.$or = [
        { clienteNombre: { $regex: q, $options: 'i' } },
        { clienteDoc: { $regex: q, $options: 'i' } },
        { mozo: { $regex: q, $options: 'i' } },
        ...(isNaN(num) ? [] : [{ numero: num }]),
      ];
    }

    const resultado = await paginate(Pedido, filtro, {
      page,
      limit,
      sort: { creadoEn: -1 },
      populate: ['mesaId', { path: 'clienteId', select: 'nombre numDoc' }]
    });

    res.json({
      success: true,
      data: { pedidos: resultado.data },
      pagination: resultado.pagination
    });
  } catch (err) {
    Logger.error('Error en GET /pedidos/historial:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/pedidos/mesa/:mesaId — Historial por mesa
router.get('/mesa/:mesaId', auth, async (req, res) => {
  try {
    const pedidos = await Pedido.find({
      mesaId: req.params.mesaId,
      pagado: true
    }).sort({ creadoEn: -1 }).limit(20);

    res.json({
      success: true,
      count: pedidos.length,
      data: { pedidos }
    });
  } catch (err) {
    Logger.error('Error en GET /pedidos/mesa:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/pedidos/comprobantes — PAGINADO
router.get('/comprobantes', auth, async (req, res) => {
  try {
    const { fecha, desde, hasta, page, limit } = req.query;
    const filtro = {
      pagado: true,
      tipoComprobante: { $in: ['boleta', 'factura', 'nota_credito'] }
    };

    if (fecha) {
      const inicio = new Date(fecha + 'T05:00:00.000Z');
      const fin = new Date(inicio);
      fin.setDate(fin.getDate() + 1);
      filtro.creadoEn = { $gte: inicio, $lt: fin };
    } else if (desde || hasta) {
      filtro.creadoEn = {};
      if (desde) filtro.creadoEn.$gte = new Date(desde + 'T05:00:00.000Z');
      if (hasta) {
        const h = new Date(hasta + 'T05:00:00.000Z');
        h.setDate(h.getDate() + 1);
        filtro.creadoEn.$lt = h;
      }
    }

    const resultado = await paginate(Pedido, filtro, {
      page,
      limit,
      sort: { creadoEn: -1 }
    });

    res.json({
      success: true,
      data: { pedidos: resultado.data },
      pagination: resultado.pagination
    });
  } catch (err) {
    Logger.error('Error en GET /pedidos/comprobantes:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/pedidos — crear pedido (con validación)
router.post('/', auth, pedido.crear, async (req, res) => {
  try {
    const { tipo, mesaId, mesaNumero, items, nota, metodoPago } = req.body;

    if (!items?.length) {
      return res.status(400).json({ success: false, message: 'El pedido necesita productos' });
    }

    const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
    const subTotal = Math.round((total / 1.18) * 100) / 100;
    const totalIGV = Math.round((total - subTotal) * 100) / 100;

    const pedido = await Pedido.create({
      tipo: tipo || 'mesa',
      mesaId,
      mesaNumero,
      mozo: req.usuario.nombre,
      items,
      total,
      subTotal,
      totalIGV,
      nota: nota || '',
      metodoPago: metodoPago || 'efectivo',
    });

    if (mesaId) {
      await Mesa.findByIdAndUpdate(mesaId, {
        estado: 'ocupada',
        mozo: req.usuario.nombre,
        pedidoActual: pedido._id,
      });
      emit.mesaActualizada(req.io, await Mesa.findById(mesaId));
    }

    emit.nuevoPedido(req.io, pedido);
    emit.notificacion(req.io, {
      tipo: 'info',
      titulo: `🔥 Nuevo pedido — ${tipo === 'mesa' ? 'Mesa ' + mesaNumero : tipo === 'delivery' ? 'Delivery' : 'Para llevar'}`,
      mensaje: `${items.length} producto(s) · S/ ${total.toFixed(2)}`,
    });

    Logger.info(`Pedido #${pedido.numero} creado por ${req.usuario.nombre}`);

    res.status(201).json({
      success: true,
      message: 'Pedido creado exitosamente',
      data: { pedido }
    });
  } catch (err) {
    Logger.error('Error en POST /pedidos:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/pedidos/:id — actualizar pedido (con validación)
router.put('/:id', auth, pedido.actualizar, async (req, res) => {
  try {
    const anterior = await Pedido.findById(req.params.id);
    if (!anterior) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
    }

    const updateData = { ...req.body };

    // Si se está marcando como pagado, procesar puntos
    if (req.body.pagado && !anterior.pagado) {
      const config = await Config.findOne();
      const configPuntos = config?.puntos || {};

      // Procesar puntos si hay cliente
      if (req.body.clienteId && configPuntos.activo) {
        const puntosCanjeados = req.body.puntosCanjeados || 0;
        const resultado = await puntosService.procesarPuntosCompra(
          req.body.clienteId,
          req.body.total || anterior.total,
          puntosCanjeados
        );
        updateData.puntosGanados = resultado.puntosGanados;
      }
    }

    const pedido = await Pedido.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (req.body.estado === 'listo' && anterior.estado !== 'listo') {
      emit.pedidoListo(req.io, pedido);
      emit.notificacion(req.io, {
        tipo: 'success',
        titulo: `✅ Listo — ${pedido.tipo === 'mesa' ? 'Mesa ' + pedido.mesaNumero : 'Para llevar'}`,
        mensaje: 'Listo para servir',
      });
    }

    if (req.body.estado === 'entregado' && pedido.mesaId) {
      await Mesa.findByIdAndUpdate(pedido.mesaId, { estado: 'libre', mozo: null, pedidoActual: null });
      emit.mesaActualizada(req.io, await Mesa.findById(pedido.mesaId));
    }

    res.json({
      success: true,
      message: 'Pedido actualizado',
      data: { pedido }
    });
  } catch (err) {
    Logger.error('Error en PUT /pedidos:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/pedidos/:id - Soft delete
router.delete('/:id', auth, async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
    }

    await pedido.softDelete();

    if (pedido.mesaId) {
      emit.mesaActualizada(req.io, await Mesa.findById(pedido.mesaId));
    }

    Logger.info(`Pedido #${pedido.numero} eliminado (soft delete) por ${req.usuario.nombre}`);

    res.json({ success: true, message: 'Pedido eliminado' });
  } catch (err) {
    Logger.error('Error en DELETE /pedidos:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
