const router  = require('express').Router();
const mongoose = require('mongoose');
const { auth, soloAdmin } = require('../middleware/auth');

// ── Backup automático en MongoDB Atlas ────────────────────────────────────────
// MongoDB Atlas Free ya hace backups automáticos cada 6 horas.
// Esta ruta crea un snapshot manual de las colecciones críticas
// y lo guarda como un documento en la misma base de datos.

const Backup = mongoose.model('Backup', new mongoose.Schema({
  fecha:       { type: Date, default: Date.now },
  tipo:        { type: String, default: 'manual' },
  colecciones: { type: Object },
  tamaño:      { type: Number, default: 0 },
}, { timestamps: true }));

// GET historial de backups
router.get('/', auth, soloAdmin, async (_req, res) => {
  try {
    const backups = await Backup.find().sort({ fecha: -1 }).limit(10).select('-colecciones');
    res.json(backups);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST crear backup manual
router.post('/crear', auth, soloAdmin, async (req, res) => {
  try {
    const db = mongoose.connection.db;

    // Obtener todas las colecciones importantes
    const colecciones = {};
    const nombres = ['usuarios', 'mesas', 'productos', 'pedidos', 'deliveries', 'cajas', 'egresos', 'clientes', 'configs'];

    let totalDocs = 0;
    for (const nombre of nombres) {
      try {
        const docs = await db.collection(nombre).find({}).toArray();
        colecciones[nombre] = docs;
        totalDocs += docs.length;
      } catch {}
    }

    const backup = await Backup.create({
      tipo: req.body.tipo || 'manual',
      colecciones,
      tamaño: totalDocs,
    });

    res.json({
      ok: true,
      id: backup._id,
      fecha: backup.fecha,
      tamaño: totalDocs,
      mensaje: `Backup creado con ${totalDocs} registros`,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET descargar backup como JSON
router.get('/:id/descargar', auth, soloAdmin, async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id);
    if (!backup) return res.status(404).json({ error: 'Backup no encontrado' });

    const fecha = new Date(backup.fecha).toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="polleria-backup-${fecha}.json"`);
    res.json({
      fecha: backup.fecha,
      version: '1.0',
      datos: backup.colecciones,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE eliminar backup antiguo
router.delete('/:id', auth, soloAdmin, async (req, res) => {
  try {
    await Backup.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
