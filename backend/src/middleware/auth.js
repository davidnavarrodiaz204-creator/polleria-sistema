const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { auth: authMiddleware } = require('../middleware/auth');
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token requerido' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id).select('-password');
    if (!usuario || !usuario.activo) return res.status(401).json({ error: 'Usuario no válido' });

    req.usuario = usuario;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

const soloAdmin = (req, res, next) => {
  if (req.usuario?.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  next();
};

const adminOMozo = (req, res, next) => {
  if (!['admin', 'mozo'].includes(req.usuario?.rol)) return res.status(403).json({ error: 'Sin permiso' });
  next();
};

module.exports = { auth, soloAdmin, adminOMozo };
