const router = require('express').Router();
const Pedido = require('../models/Pedido');
const Mesa = require('../models/Mesa');
const { auth } = require('../middleware/auth');
const { emit } = require('../config/socket');

router.get('/', auth, async (_req, res) => {
  try {
    const pedidos = await Pedido.find().sort({ creadoEn: -1 }).limit(100);
    res.json(pedidos);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/cocina', auth, async (_req, res) => {
  try {
    const pedidos = await Pedido.find({ estado: { $in: ['en_cocina', 'preparando'] } }).sort({ creadoEn: 1 });
    res.json(pedidos);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { tipo, mesaId, mesaNumero, items, nota, metodoPago } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'El pedido necesita productos' });

    const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
    const pedido = await Pedido.create({
      tipo: tipo || 'mesa',
      mesaId, mesaNumero,
      mozo: req.usuario.nombre,
      items, total,
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
      titulo: `🔥 Nuevo pedido — ${tipo === 'mesa' ? 'Mesa ' + mesaNumero : 'Para llevar'}`,
      mensaje: `${items.length} producto(s) · S/ ${total.toFixed(2)}`,
    });

    res.status(201).json(pedido);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const anterior = await Pedido.findById(req.params.id);
    if (!anterior) return res.status(404).json({ error: 'No encontrado' });

    const pedido = await Pedido.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (req.body.estado === 'listo' && anterior.estado !== 'listo') {
      emit.pedidoListo(req.io, pedido);
      emit.notificacion(req.io, {
        tipo: 'success',
        titulo: `✅ Pedido listo — ${pedido.tipo === 'mesa' ? 'Mesa ' + pedido.mesaNumero : 'Para llevar'}`,
        mensaje: 'Listo para servir',
      });
    }

    if (req.body.estado === 'entregado' && pedido.mesaId) {
      await Mesa.findByIdAndUpdate(pedido.mesaId, { estado: 'lista' });
      emit.mesaActualizada(req.io, await Mesa.findById(pedido.mesaId));
    }

    res.json(pedido);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Pedido.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
