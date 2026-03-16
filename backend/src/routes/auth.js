const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const Config = require('../models/Config');
const Mesa = require('../models/Mesa');
const Producto = require('../models/Producto');
const { auth } = require('../middleware/auth');

// Seed inicial — crea datos si la BD está vacía
const seed = async () => {
  const count = await Usuario.countDocuments();
  if (count > 0) return;

  console.log('🌱 Creando datos iniciales...');

  // Usar create() uno a uno para que el middleware de hash de bcrypt funcione
  await Usuario.create({ nombre: 'Admin Principal', usuario: 'admin',  password: 'admin123',    rol: 'admin' });
  await Usuario.create({ nombre: 'Carlos Quispe',   usuario: 'carlos', password: 'mozo123',     rol: 'mozo' });
  await Usuario.create({ nombre: 'Ana Torres',      usuario: 'ana',    password: 'mozo123',     rol: 'mozo' });
  await Usuario.create({ nombre: 'Miguel Rojas',    usuario: 'miguel', password: 'cocina123',   rol: 'cocina' });
  await Usuario.create({ nombre: 'Luis Huanca',     usuario: 'luis',   password: 'delivery123', rol: 'delivery' });

  await Config.create({});

  for (let i = 1; i <= 10; i++) {
    await Mesa.create({ numero: i, capacidad: i <= 2 ? 2 : i <= 6 ? 4 : 6 });
  }

  await Producto.insertMany([
    { nombre: 'Pollo Entero a la Brasa',  categoria: 'Pollos',           precio: 38, emoji: '🍗' },
    { nombre: '1/2 Pollo a la Brasa',     categoria: 'Pollos',           precio: 22, emoji: '🍗' },
    { nombre: '1/4 Pollo a la Brasa',     categoria: 'Pollos',           precio: 14, emoji: '🍗' },
    { nombre: 'Pechuga',                  categoria: 'Presas',           precio: 10, emoji: '🥩' },
    { nombre: 'Pierna',                   categoria: 'Presas',           precio:  9, emoji: '🦵' },
    { nombre: 'Ala',                      categoria: 'Presas',           precio:  7, emoji: '🍖' },
    { nombre: 'Papas Fritas Grandes',     categoria: 'Acompañamientos',  precio:  8, emoji: '🍟' },
    { nombre: 'Ensalada Fresca',          categoria: 'Acompañamientos',  precio:  5, emoji: '🥗' },
    { nombre: 'Crema Huancaína',          categoria: 'Acompañamientos',  precio:  4, emoji: '🫙' },
    { nombre: 'Yuca Frita',              categoria: 'Acompañamientos',  precio:  6, emoji: '🍠' },
    { nombre: 'Inca Kola 500ml',          categoria: 'Bebidas',          precio:  4, emoji: '🥤' },
    { nombre: 'Coca Cola 500ml',          categoria: 'Bebidas',          precio:  4, emoji: '🥤' },
    { nombre: 'Chicha Morada',            categoria: 'Bebidas',          precio:  5, emoji: '🍇' },
    { nombre: 'Agua San Luis 625ml',      categoria: 'Bebidas',          precio:  3, emoji: '💧' },
    { nombre: 'Kola Escocesa',            categoria: 'Bebidas',          precio:  4, emoji: '🥤' },
    { nombre: 'Jugo de Maracuyá',         categoria: 'Bebidas',          precio:  6, emoji: '🍹' },
    { nombre: 'Arroz con Leche',          categoria: 'Postres',          precio:  6, emoji: '🍮' },
    { nombre: 'Mazamorra Morada',         categoria: 'Postres',          precio:  6, emoji: '🍮' },
  ]);

  console.log('✅ Datos iniciales creados');
};

// Ejecutar seed al iniciar
seed().catch(console.error);

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;
    if (!usuario || !password) return res.status(400).json({ error: 'Faltan credenciales' });

    const user = await Usuario.findOne({ usuario: usuario.toLowerCase(), activo: true });
    if (!user) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const valido = await user.comparePassword(password);
    if (!valido) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const token = jwt.sign({ id: user._id, rol: user.rol }, process.env.JWT_SECRET, { expiresIn: '12h' });

    res.json({
      token,
      usuario: { id: user._id, nombre: user.nombre, usuario: user.usuario, rol: user.rol },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => res.json(req.usuario));

module.exports = router;
