const mongoose = require('mongoose');

// Apertura/cierre de caja diario
const cajaSchema = new mongoose.Schema({
  fecha:          { type: String, required: true }, // YYYY-MM-DD
  montoApertura:  { type: Number, default: 0 },
  montoCierre:    { type: Number, default: null },
  totalVentas:    { type: Number, default: 0 },
  totalEfectivo:  { type: Number, default: 0 },
  totalYape:      { type: Number, default: 0 },
  totalPlin:      { type: Number, default: 0 },
  totalTarjeta:   { type: Number, default: 0 },
  totalEgresos:   { type: Number, default: 0 },
  saldoFinal:     { type: Number, default: 0 },
  estado:         { type: String, enum: ['abierta', 'cerrada'], default: 'abierta' },
  observaciones:  { type: String, default: '' },
  abiertaPor:     { type: String, default: '' },
  cerradaPor:     { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Caja', cajaSchema);
