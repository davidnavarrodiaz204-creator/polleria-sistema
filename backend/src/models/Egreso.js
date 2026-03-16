const mongoose = require('mongoose');

const egresoSchema = new mongoose.Schema({
  fecha:       { type: String, required: true }, // YYYY-MM-DD
  categoria:   { type: String, required: true, trim: true },
  descripcion: { type: String, required: true, trim: true },
  monto:       { type: Number, required: true, min: 0 },
  comprobante: { type: String, default: '' },
  registradoPor: { type: String, default: '' },
  cajaId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Caja', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Egreso', egresoSchema);
