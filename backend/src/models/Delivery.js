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
}, { timestamps: true });

deliverySchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  const ultimo = await this.constructor.findOne().sort({ numero: -1 });
  this.numero = (ultimo?.numero || 0) + 1;
  next();
});

module.exports = mongoose.model('Delivery', deliverySchema);
