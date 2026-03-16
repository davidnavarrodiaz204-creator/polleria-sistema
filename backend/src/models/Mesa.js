const mongoose = require('mongoose');

const mesaSchema = new mongoose.Schema({
  numero:       { type: Number, required: true, unique: true },
  capacidad:    { type: Number, default: 4 },
  estado:       { type: String, enum: ['libre', 'ocupada', 'lista', 'reservada'], default: 'libre' },
  mozo:         { type: String, default: null },
  pedidoActual: { type: mongoose.Schema.Types.ObjectId, ref: 'Pedido', default: null },
  activa:       { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Mesa', mesaSchema);
