const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
  tipo:     { type: String, default: 'manual' }, // manual | automatico
  tamaño:   { type: Number, default: 0 },        // total de registros
  resumen: {
    usuarios:  { type: Number, default: 0 },
    mesas:     { type: Number, default: 0 },
    productos: { type: Number, default: 0 },
    pedidos:   { type: Number, default: 0 },
    clientes:  { type: Number, default: 0 },
    cajas:     { type: Number, default: 0 },
  },
  creadoPor: { type: String, default: 'admin' },
  // El JSON del backup se descarga en el momento, no se guarda en BD
  // (ahorrar espacio en MongoDB Atlas free)
}, { timestamps: true });

module.exports = mongoose.model('Backup', backupSchema);
