const mongoose = require('mongoose');

const itemPedidoSchema = new mongoose.Schema({
  productoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' },
  nombre:     { type: String, required: true },
  emoji:      { type: String, default: '🍽️' },
  cantidad:   { type: Number, required: true, min: 1 },
  precio:     { type: Number, required: true },
  nota:       { type: String, default: '' },
}, { _id: false });

const pedidoSchema = new mongoose.Schema({
  numero:        { type: Number },
  tipo:          { type: String, enum: ['mesa', 'delivery', 'para_llevar'], default: 'mesa' },
  mesaId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Mesa', default: null },
  mesaNumero:    { type: Number, default: null },
  deliveryId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery', default: null },
  mozo:          { type: String, default: '' },
  items:         [itemPedidoSchema],
  total:         { type: Number, default: 0 },
  nota:          { type: String, default: '' },
  estado:        { type: String, enum: ['en_cocina', 'preparando', 'listo', 'entregado', 'cancelado'], default: 'en_cocina' },
  pagado:        { type: Boolean, default: false },
  metodoPago:    { type: String, enum: ['efectivo', 'tarjeta', 'yape', 'plin', 'transferencia'], default: 'efectivo' },
  creadoEn:      { type: Date, default: Date.now },
}, { timestamps: true });

// Autoincremento del número de pedido
pedidoSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  const ultimo = await this.constructor.findOne().sort({ numero: -1 });
  this.numero = (ultimo?.numero || 0) + 1;
  next();
});

module.exports = mongoose.model('Pedido', pedidoSchema);
