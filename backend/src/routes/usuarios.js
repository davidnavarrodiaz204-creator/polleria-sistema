const router = require('express').Router();
const Usuario = require('../models/Usuario');
const { auth, soloAdmin } = require('../middleware/auth');

// GET todos
router.get('/', auth, soloAdmin, async (_req, res) => {
  try {
    const usuarios = await Usuario.find().select('-password').sort({ createdAt: -1 });
    res.json(usuarios);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST crear
router.post('/', auth, soloAdmin, async (req, res) => {
  try {
    const { nombre, usuario, password, rol } = req.body;
    if (!nombre || !usuario || !password || !rol) return res.status(400).json({ error: 'Faltan campos' });
    const existe = await Usuario.findOne({ usuario: usuario.toLowerCase() });
    if (existe) return res.status(400).json({ error: 'El usuario ya existe' });
    const nuevo = await Usuario.create({ nombre, usuario, password, rol });
    const { password: _, ...safe } = nuevo.toObject();
    res.status(201).json(safe);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT actualizar
router.put('/:id', auth, soloAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.password) {
      const u = await Usuario.findById(req.params.id);
      if (!u) return res.status(404).json({ error: 'No encontrado' });
      u.password = data.password;
      delete data.password;
      Object.assign(u, data);
      await u.save();
      return res.json({ mensaje: 'Actualizado' });
    }
    const actualizado = await Usuario.findByIdAndUpdate(req.params.id, data, { new: true }).select('-password');
    res.json(actualizado);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE eliminar
router.delete('/:id', auth, soloAdmin, async (req, res) => {
  try {
    if (req.params.id === req.usuario._id.toString()) return res.status(400).json({ error: 'No puedes eliminarte' });
    await Usuario.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
