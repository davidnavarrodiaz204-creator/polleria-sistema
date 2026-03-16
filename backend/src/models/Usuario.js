const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema({
  nombre:   { type: String, required: true, trim: true },
  usuario:  { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  rol:      { type: String, enum: ['admin', 'mozo', 'cocina', 'delivery'], default: 'mozo' },
  activo:   { type: Boolean, default: true },
  online:   { type: Boolean, default: false },
}, { timestamps: true });

// Hash password antes de guardar
usuarioSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

usuarioSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('Usuario', usuarioSchema);
