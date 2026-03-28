const router = require('express').Router();
const Delivery = require('../models/Delivery');
const Pedido = require('../models/Pedido');
const { auth } = require('../middleware/auth');
const { emit } = require('../config/socket');
const paginate = require('../utils/paginate');

router.get('/', auth, async (req, res) => {
  try {
    const { estado, page, limit } = req.query;
    const filtro = estado ? { estado } : {};

    const resultado = await paginate(Delivery, filtro, {
      page,
      limit,
      sort: { creadoEn: -1 }
    });

    res.json({
      success: true,
      data: { deliveries: resultado.data },
      pagination: resultado.pagination
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { cliente, telefono, direccion, referencia, items, nota, costoEnvio, metodoPago } = req.body;
    if (!cliente || !direccion) return res.status(400).json({ error: 'Cliente y dirección requeridos' });

    const subtotal = (items || []).reduce((s, i) => s + (i.precio * i.cantidad), 0);
    const total = subtotal + (costoEnvio || 0);

    const delivery = await Delivery.create({
      cliente, telefono, direccion, referencia,
      items: items || [],
      total, costoEnvio: costoEnvio || 0,
      nota: nota || '',
      metodoPago: metodoPago || 'efectivo',
    });

    // Crear pedido de cocina automáticamente
    if (items?.length) {
      const pedido = await Pedido.create({
        tipo: 'delivery',
        deliveryId: delivery._id,
        mozo: req.usuario.nombre,
        items, total,
        nota: nota || '',
      });
      emit.nuevoPedido(req.io, pedido);
    }

    emit.deliveryActualizado(req.io, delivery);
    emit.notificacion(req.io, {
      tipo: 'info',
      titulo: `🛵 Nuevo delivery — ${cliente}`,
      mensaje: `S/ ${total.toFixed(2)} · ${direccion}`,
    });

    res.status(201).json(delivery);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const delivery = await Delivery.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!delivery) return res.status(404).json({ error: 'No encontrado' });
    emit.deliveryActualizado(req.io, delivery);
    emit.notificacion(req.io, {
      tipo: delivery.estado === 'entregado' ? 'success' : 'info',
      titulo: `🛵 Delivery #${delivery.numero} — ${delivery.cliente}`,
      mensaje: `Estado actualizado: ${delivery.estado}`,
    });
    res.json(delivery);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Delivery no encontrado' });
    await delivery.softDelete();
    res.json({ ok: true, message: 'Delivery eliminado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
