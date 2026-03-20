const router  = require('express').Router();
const axios   = require('axios');
const Cliente = require('../models/Cliente');
const { auth, soloAdmin } = require('../middleware/auth');
const Config  = require('../models/Config');

// ── Enviar WhatsApp via CallMeBot (gratis) ────────────────────────────────────
// INSTRUCCIONES para activar:
// 1. Guarda el número +34 644 61 91 29 en tus contactos de WhatsApp
// 2. Envíale EXACTAMENTE este mensaje: I allow callmebot to send me messages
// 3. Recibirás tu API key. Agrégala en .env: CALLMEBOT_APIKEY=tu_key
const enviarWhatsApp = async (celular, mensaje) => {
  // Prioridad: variable de entorno → configuración del panel
  const config = await Config.findOne() || {};
  const apikey = process.env.CALLMEBOT_APIKEY || config.whatsapp?.apikey || '';

  if (!apikey) {
    throw new Error('WhatsApp no configurado. Ve a Configuración → WhatsApp y agrega tu API key de CallMeBot.');
  }

  // Limpiar y formatear número peruano
  let num = celular.replace(/\D/g, '');
  if (!num.startsWith('51')) num = '51' + num;

  const url = 'https://api.callmebot.com/whatsapp.php';
  const params = { phone: num, text: mensaje, apikey };

  const { data } = await axios.get(url, { params, timeout: 15000 });

  if (typeof data === 'string' && data.toLowerCase().includes('error')) {
    throw new Error('CallMeBot error: ' + data);
  }

  return { ok: true };
};

// GET stats para la pantalla de WhatsApp
router.get('/stats', auth, soloAdmin, async (_req, res) => {
  try {
    const total    = await Cliente.countDocuments({ activo: true });
    const conPromo = await Cliente.countDocuments({ activo: true, aceptaPromo: true, celular: { $nin: ['', null] } });
    const conCump  = await Cliente.countDocuments({ activo: true, cumpleanos: { $nin: ['', null] } });

    const mesActual = String(new Date().getMonth() + 1).padStart(2, '0');
    const cumpleMes = await Cliente.countDocuments({
      activo: true,
      cumpleanos: { $regex: `^${mesActual}-` },
    });

    const config  = await Config.findOne() || {};
    const apikey  = process.env.CALLMEBOT_APIKEY || config.whatsapp?.apikey || '';
    res.json({
      total, conPromo, conCump, cumpleMes,
      whatsappActivo: !!apikey,
      numeroConfigurado: config.whatsapp?.numero || '',
      modoConfig: process.env.CALLMEBOT_APIKEY ? 'railway' : (config.whatsapp?.apikey ? 'panel' : 'ninguno'),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST enviar promoción masiva
router.post('/enviar-promo', auth, soloAdmin, async (req, res) => {
  const { mensaje } = req.body;
  if (!mensaje) return res.status(400).json({ error: 'El mensaje es requerido' });

  try {
    const clientes = await Cliente.find({
      activo: true, aceptaPromo: true,
      celular: { $nin: ['', null] },
    });

    if (!clientes.length) {
      return res.json({ enviados: 0, errores: 0, mensaje: 'No hay clientes con WhatsApp registrado y promos activadas.' });
    }

    let enviados = 0, errores = 0;
    const detalles = [];

    for (const c of clientes) {
      try {
        await enviarWhatsApp(c.celular, mensaje);
        enviados++;
        detalles.push({ nombre: c.nombre, celular: c.celular, ok: true });
        await new Promise(r => setTimeout(r, 1500)); // esperar entre mensajes
      } catch (e) {
        errores++;
        detalles.push({ nombre: c.nombre, celular: c.celular, ok: false, error: e.message });
      }
    }

    res.json({ enviados, errores, total: clientes.length, detalles });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST enviar a cumpleañeros del día
router.post('/enviar-cumpleanos', auth, soloAdmin, async (req, res) => {
  const hoy  = new Date();
  const mmdd = `${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;
  const nombre = process.env.RESTAURANTE_NOMBRE || 'nuestra pollería';

  try {
    const clientes = await Cliente.find({
      activo: true, aceptaPromo: true,
      cumpleanos: mmdd,
      celular: { $nin: ['', null] },
    });

    if (!clientes.length) {
      return res.json({ enviados: 0, mensaje: 'No hay cumpleañeros hoy con WhatsApp registrado.' });
    }

    const msgBase = req.body.mensaje ||
      `Hoy es tu día especial! Te deseamos un feliz cumpleaños de parte de ${nombre}! Ven hoy y te invitamos un postre gratis. Muestra este mensaje al llegar.`;

    let enviados = 0;
    for (const c of clientes) {
      try {
        const nombre1 = c.nombre.split(' ')[0];
        await enviarWhatsApp(c.celular, `Hola ${nombre1}! ${msgBase}`);
        enviados++;
        await new Promise(r => setTimeout(r, 1500));
      } catch {}
    }

    res.json({ enviados, total: clientes.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST enviar mensaje individual
router.post('/enviar-individual', auth, soloAdmin, async (req, res) => {
  const { celular, mensaje } = req.body;
  if (!celular || !mensaje) return res.status(400).json({ error: 'Faltan datos' });

  try {
    await enviarWhatsApp(celular, mensaje);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
