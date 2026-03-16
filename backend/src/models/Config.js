const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
  nombre:        { type: String, default: 'PollerOS' },
  slogan:        { type: String, default: 'El mejor pollo del barrio' },
  colorPrimario: { type: String, default: '#F5C518' },
  colorTexto:    { type: String, default: '#212121' },
  logo:          { type: String, default: '🍗' },
  ruc:           { type: String, default: '' },
  direccion:     { type: String, default: '' },
  telefono:      { type: String, default: '' },
  modulos: {
    mesas:     { type: Boolean, default: true },
    cocina:    { type: Boolean, default: true },
    delivery:  { type: Boolean, default: true },
    bebidas:   { type: Boolean, default: true },
    caja:      { type: Boolean, default: true },
    reservas:  { type: Boolean, default: false },
  },
  impresora: {
    habilitada: { type: Boolean, default: false },
    ancho:      { type: Number, default: 80 },
  },
}, { timestamps: true });

module.exports = mongoose.model('Config', configSchema);
