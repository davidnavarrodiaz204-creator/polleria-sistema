const mongoose = require('mongoose');

const egresoSchema = new mongoose.Schema({
  fecha:       { type: String, required: true }, // YYYY-MM-DD
  categoria:   { type: String, required: true, trim: true },
  descripcion: { type: String, required: true, trim: true },
  monto:       { type: Number, required: true, min: 0 },
  comprobante: { type: String, default: '' },
  registradoPor: { type: String, default: '' },
  cajaId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Caja', default: null },
  // Soft delete
  deletedAt:   { type: Date, default: null },
}, { timestamps: true });

// Middleware: auto-filtrar eliminados
egresoSchema.pre(/^find/, function(next) {
  if (!this.getQuery().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Método de instancia para soft delete
egresoSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

// Índices
egresoSchema.index({ fecha: -1 });
egresoSchema.index({ cajaId: 1 });
egresoSchema.index({ deletedAt: 1 });
egresoSchema.index({ categoria: 1 });

module.exports = mongoose.model('Egreso', egresoSchema);
