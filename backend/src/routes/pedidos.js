/**
 * pedidos.js — Rutas de pedidos
 * Incluye historial con filtros por fecha, tipo, estado y comprobante.
 * Autor: David Navarro Diaz
 */
const router  = require('express').Router();
const Pedido  = require('../models/Pedido');
const Mesa    = require('../models/Mesa');
const Cliente = require('../models/Cliente');
const { auth } = require('../middleware/auth');
const { emit } = require('../config/socket');

// GET /api/pedidos — pedidos activos (sin pagar, no cancelados)
router.get('/', auth, async (_req, res) => {
  try {
    const pedidos = await Pedido.find().sort({ creadoEn: -1 }).limit(100);
    res.json(pedidos);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/pedidos/cocina — solo los que cocina debe preparar
router.get('/cocina', auth, async (_req, res) => {
  try {
    const pedidos = await Pedido.find({ estado: { $in: ['en_cocina', 'preparando'] } }).sort({ creadoEn: 1 });
    res.json(pedidos);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/pedidos/historial — historial con filtros
// Query params: fecha, desde, hasta, tipo, estado, comprobante, pagado, q (búsqueda)
router.get('/historial', auth, async (req, res) => {
  try {
    const { fecha, desde, hasta, tipo, estado, comprobante, pagado, q, limit = 100 } = req.query;
    const filtro = {};

    // Filtro por fecha exacta (YYYY-MM-DD) o rango
    if (fecha) {
      const inicio = new Date(fecha + 'T05:00:00.000Z'); // medianoche Peru UTC-5
      const fin    = new Date(inicio); fin.setDate(fin.getDate() + 1);
      filtro.creadoEn = { $gte: inicio, $lt: fin };
    } else if (desde || hasta) {
      filtro.creadoEn = {};
      if (desde) filtro.creadoEn.$gte = new Date(desde + 'T05:00:00.000Z');
      if (hasta) { const h = new Date(hasta + 'T05:00:00.000Z'); h.setDate(h.getDate()+1); filtro.creadoEn.$lt = h; }
    }

    if (tipo)        filtro.tipo             = tipo;
    if (estado)      filtro.estado           = estado;
    if (comprobante) filtro.tipoComprobante  = comprobante;
    if (pagado !== undefined) filtro.pagado  = pagado === 'true';

    // Búsqueda por texto: nombre cliente, número pedido, mozo
    if (q) {
      const num = parseInt(q);
      filtro.$or = [
        { clienteNombre: { $regex: q, $options: 'i' } },
        { clienteDoc:    { $regex: q, $options: 'i' } },
        { mozo:          { $regex: q, $options: 'i' } },
        ...(isNaN(num) ? [] : [{ numero: num }]),
      ];
    }

    const pedidos = await Pedido.find(filtro).sort({ creadoEn: -1 }).limit(Number(limit));
    res.json(pedidos);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/pedidos/comprobantes — comprobantes emitidos (boletas y facturas)
router.get('/comprobantes', auth, async (req, res) => {
  try {
    const { fecha, desde, hasta } = req.query;
    const filtro = {
      pagado: true,
      tipoComprobante: { $in: ['boleta', 'factura', 'nota_credito'] }
    };
    if (fecha) {
      const inicio = new Date(fecha + 'T05:00:00.000Z');
      const fin    = new Date(inicio); fin.setDate(fin.getDate() + 1);
      filtro.creadoEn = { $gte: inicio, $lt: fin };
    }
    const pedidos = await Pedido.find(filtro).sort({ creadoEn: -1 }).limit(200);
    res.json(pedidos);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/pedidos — crear pedido
router.post('/', auth, async (req, res) => {
  try {
    const { tipo, mesaId, mesaNumero, items, nota, metodoPago } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'El pedido necesita productos' });

    const total    = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
    const subTotal = Math.round((total / 1.18) * 100) / 100;
    const totalIGV = Math.round((total - subTotal) * 100) / 100;

    const pedido = await Pedido.create({
      tipo: tipo || 'mesa',
      mesaId, mesaNumero,
      mozo: req.usuario.nombre,
      items, total, subTotal, totalIGV,
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

    res.status(201).json(pedido);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/pedidos/:id — actualizar pedido
router.put('/:id', auth, async (req, res) => {
  try {
    const anterior = await Pedido.findById(req.params.id);
    if (!anterior) return res.status(404).json({ error: 'No encontrado' });

    const pedido = await Pedido.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (req.body.estado === 'listo' && anterior.estado !== 'listo') {
      emit.pedidoListo(req.io, pedido);
      emit.notificacion(req.io, {
        tipo: 'success',
        titulo: `✅ Listo — ${pedido.tipo === 'mesa' ? 'Mesa ' + pedido.mesaNumero : 'Para llevar'}`,
        mensaje: 'Listo para servir',
      });
    }

    if (req.body.estado === 'entregado' && pedido.mesaId) {
      await Mesa.findByIdAndUpdate(pedido.mesaId, { estado: 'lista' });
      emit.mesaActualizada(req.io, await Mesa.findById(pedido.mesaId));
    }

    // Actualizar estadísticas del cliente al pagar
    if (req.body.pagado === true && !anterior.pagado && pedido.clienteId) {
      await Cliente.findByIdAndUpdate(pedido.clienteId, {
        $inc: { totalCompras: 1, montoAcumulado: pedido.total },
        ultimaVisita: new Date(),
      });
    }

    res.json(pedido);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/pedidos/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await Pedido.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
