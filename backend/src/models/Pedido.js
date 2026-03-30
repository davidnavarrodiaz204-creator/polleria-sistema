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

  // Descuentos
  descuento:        { type: Number, default: 0 },
  tipoDescuento:    { type: String, enum: ['porcentaje', 'monto'], default: 'monto' },
  motivoDescuento:  { type: String, default: '' },

  // Puntos canjeados en este pedido
  puntosCanjeados:  { type: Number, default: 0 },
  valorPuntos:      { type: Number, default: 0 }, // S/ equivalente

  nota:          { type: String, default: '' },
  estado:        { type: String, enum: ['en_cocina', 'preparando', 'listo', 'entregado', 'cancelado'], default: 'en_cocina' },
  pagado:        { type: Boolean, default: false },
  metodoPago:    { type: String, enum: ['efectivo', 'tarjeta', 'yape', 'plin', 'transferencia'], default: 'efectivo' },

  // Pago mixto: detalle de cada método usado
  pagosMixtos: [{
    metodo: { type: String, enum: ['efectivo', 'tarjeta', 'yape', 'plin', 'transferencia'] },
    monto:  { type: Number }
  }],
  // Cliente vinculado
  clienteId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', default: null },
  clienteNombre: { type: String, default: '' },
  clienteDoc:    { type: String, default: '' },
  // Comprobante
  tipoComprobante: { type: String, enum: ['ticket','boleta','factura','nota_credito'], default: 'ticket' },
  creadoEn:      { type: Date, default: Date.now },
  // Soft delete
  deletedAt:     { type: Date, default: null },
}, { timestamps: true });

// Middleware: auto-filtrar eliminados en queries find
pedidoSchema.pre(/^find/, function(next) {
  if (!this.getQuery().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Método de instancia para soft delete
pedidoSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

// Autoincremento del número de pedido
pedidoSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  const ultimo = await this.constructor.findOne().sort({ numero: -1 });
  this.numero = (ultimo?.numero || 0) + 1;
  next();
});

// Índices para búsquedas rápidas en historial y reportes
pedidoSchema.index({ creadoEn: -1 });
pedidoSchema.index({ pagado: 1, creadoEn: -1 });
pedidoSchema.index({ tipoComprobante: 1, creadoEn: -1 });
pedidoSchema.index({ clienteDoc: 1 });
pedidoSchema.index({ estado: 1 });
pedidoSchema.index({ numero: -1 });
// Índices nuevos para rendimiento
pedidoSchema.index({ deletedAt: 1 }); // Para soft delete
pedidoSchema.index({ mesaId: 1, estado: 1 }); // Para consultas de mesa
pedidoSchema.index({ tipo: 1, estado: 1 }); // Para dashboard
pedidoSchema.index({ mozo: 1, creadoEn: -1 }); // Para reportes por mozo

module.exports = mongoose.model('Pedido', pedidoSchema);
