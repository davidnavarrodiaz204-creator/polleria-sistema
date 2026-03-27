const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  numero:     { type: Number },
  cliente:    { type: String, required: true, trim: true },
  telefono:   { type: String, default: '' },
  direccion:  { type: String, required: true },
  referencia: { type: String, default: '' },
  items: [{
    nombre:   { type: String },
    emoji:    { type: String, default: '🍽️' },
    cantidad: { type: Number },
    precio:   { type: Number },
  }],
  total:        { type: Number, default: 0 },
  costoEnvio:   { type: Number, default: 0 },
  nota:         { type: String, default: '' },
  estado:       { type: String, enum: ['pendiente', 'preparando', 'en_camino', 'entregado', 'cancelado'], default: 'pendiente' },
  repartidor:   { type: String, default: '' },
  pagado:       { type: Boolean, default: false },
  metodoPago:   { type: String, enum: ['efectivo', 'tarjeta', 'yape', 'plin'], default: 'efectivo' },
  creadoEn:     { type: Date, default: Date.now },
  // Soft delete
  deletedAt:    { type: Date, default: null },
}, { timestamps: true });

deliverySchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  const ultimo = await this.constructor.findOne().sort({ numero: -1 });
  this.numero = (ultimo?.numero || 0) + 1;
  next();
});

// Middleware: auto-filtrar eliminados
deliverySchema.pre(/^find/, function(next) {
  if (!this.getQuery().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Método de instancia para soft delete
deliverySchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

// Índices
deliverySchema.index({ creadoEn: -1 });
deliverySchema.index({ estado: 1 });
deliverySchema.index({ repartidor: 1 });
deliverySchema.index({ deletedAt: 1 });
deliverySchema.index({ numero: -1 });

module.exports = mongoose.model('Delivery', deliverySchema);
