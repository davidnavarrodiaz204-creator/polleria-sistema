const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre:      { type: String, required: true, trim: true },
  categoria:   { type: String, required: true, trim: true },
  precio:      { type: Number, required: true, min: 0 },
  emoji:       { type: String, default: '🍽️' },
  descripcion: { type: String, default: '' },
  activo:      { type: Boolean, default: true },
  orden:       { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Producto', productoSchema);
