const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre:      { type: String, required: true, trim: true },
  categoria:   { type: String, required: true, trim: true },
  precio:      { type: Number, required: true, min: 0 },
  emoji:       { type: String, default: '🍽️' },
  descripcion: { type: String, default: '' },
  activo:      { type: Boolean, default: true },
  orden:       { type: Number, default: 0 },
  // Soft delete
  deletedAt:   { type: Date, default: null },
}, { timestamps: true });

// Middleware: auto-filtrar eliminados
productoSchema.pre(/^find/, function(next) {
  if (!this.getQuery().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Método de instancia para soft delete
productoSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

// Índices para rendimiento
productoSchema.index({ categoria: 1, orden: 1 }); // Listado por categoría
productoSchema.index({ activo: 1 }); // Filtrar activos
productoSchema.index({ deletedAt: 1 }); // Soft delete
productoSchema.index({ nombre: 'text' }); // Búsqueda por nombre

module.exports = mongoose.model('Producto', productoSchema);
