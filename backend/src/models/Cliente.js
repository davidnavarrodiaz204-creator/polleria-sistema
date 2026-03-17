const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
  // Identificación
  tipoDoc:      { type: String, enum: ['dni', 'ruc', 'ce', 'pasaporte'], default: 'dni' },
  numDoc:       { type: String, required: true, unique: true, trim: true },

  // Datos personales / empresa
  nombre:       { type: String, required: true, trim: true },
  razonSocial:  { type: String, default: '' },   // para RUC
  direccion:    { type: String, default: '' },
  ubigeo:       { type: String, default: '' },
  departamento: { type: String, default: '' },

  // Contacto
  telefono:     { type: String, default: '' },
  celular:      { type: String, default: '' },   // para WhatsApp
  email:        { type: String, default: '' },

  // Marketing
  aceptaPromo:  { type: Boolean, default: true },
  cumpleanos:   { type: String, default: '' },   // MM-DD

  // Estadísticas (se actualizan al cobrar)
  totalCompras:    { type: Number, default: 0 },
  montoAcumulado:  { type: Number, default: 0 },
  ultimaVisita:    { type: Date, default: null },

  activo: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Cliente', clienteSchema);
