/**
 * Backup.js — Modelo para historial de backups
 * Autor: David Navarro Diaz
 */
const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
  tipo:     { type: String, default: 'manual' },
  tamaño:   { type: Number, default: 0 },
  resumen: {
    usuarios:  { type: Number, default: 0 },
    mesas:     { type: Number, default: 0 },
    productos: { type: Number, default: 0 },
    pedidos:   { type: Number, default: 0 },
    clientes:  { type: Number, default: 0 },
    cajas:     { type: Number, default: 0 },
  },
  creadoPor: { type: String, default: 'admin' },
}, { timestamps: true });

module.exports = mongoose.model('Backup', backupSchema);
