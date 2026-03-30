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
  fechaNacimiento: { type: String, default: '' }, // YYYY-MM-DD (completo de RENIEC)

  // Sistema de puntos
  puntos:          { type: Number, default: 0 },
  puntosCanjeados: { type: Number, default: 0 },  // Total puntos canjeados históricamente

  // Estadísticas (se actualizan al cobrar)
  totalCompras:    { type: Number, default: 0 },
  montoAcumulado:  { type: Number, default: 0 },
  ultimaVisita:    { type: Date, default: null },

  activo: { type: Boolean, default: true },
  // Soft delete
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

// Middleware: auto-filtrar eliminados
clienteSchema.pre(/^find/, function(next) {
  if (!this.getQuery().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Método de instancia para soft delete
clienteSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

// Índices para rendimiento
clienteSchema.index({ numDoc: 1 }); // Búsqueda por DNI/RUC
clienteSchema.index({ nombre: 'text' }); // Búsqueda por nombre
clienteSchema.index({ deletedAt: 1 }); // Soft delete
clienteSchema.index({ ultimaVisita: -1 }); // Últimos clientes activos
clienteSchema.index({ totalCompras: -1 }); // Mejores clientes
clienteSchema.index({ puntos: -1 }); // Clientes con más puntos

module.exports = mongoose.model('Cliente', clienteSchema);
