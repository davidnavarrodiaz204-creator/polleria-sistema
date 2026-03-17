const router  = require('express').Router();
const axios   = require('axios');
const Cliente = require('../models/Cliente');
const { auth, soloAdmin } = require('../middleware/auth');

// ── Enviar mensaje individual por WhatsApp (CallMeBot — gratis) ───────────────
// Cada cliente debe añadir el número de WhatsApp Business al contacto y enviar
// "I allow callmebot to send me messages" al número +34 644 61 91 29
// Luego recibirá su API key personal. El restaurante puede usar su propia key.
const enviarWhatsApp = async (celular, mensaje) => {
  const num     = celular.replace(/\D/g, '')
  const numPeru = num.startsWith('51') ? num : '51' + num
  const apikey  = process.env.CALLMEBOT_APIKEY || ''

  if (!apikey) throw new Error('Configura CALLMEBOT_APIKEY en el .env')

  await axios.get('https://api.callmebot.com/whatsapp.php', {
    params: { phone: numPeru, text: mensaje, apikey },
    timeout: 10000,
  })
}

// ── GET estadísticas de clientes para promociones ─────────────────────────────
router.get('/stats', auth, soloAdmin, async (_req, res) => {
  try {
    const total    = await Cliente.countDocuments({ activo: true })
    const conPromo = await Cliente.countDocuments({ activo: true, aceptaPromo: true, celular: { $ne: '' } })
    const conCump  = await Cliente.countDocuments({ activo: true, cumpleanos: { $ne: '' } })

    // Clientes con cumpleaños este mes
    const mesActual = String(new Date().getMonth() + 1).padStart(2, '0')
    const cumpleMes = await Cliente.countDocuments({
      activo: true,
      cumpleanos: { $regex: `^${mesActual}-` },
    })

    res.json({ total, conPromo, conCump, cumpleMes })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST Enviar promoción a todos los clientes que aceptan ────────────────────
router.post('/enviar-promo', auth, soloAdmin, async (req, res) => {
  const { mensaje, soloConCelular = true } = req.body
  if (!mensaje) return res.status(400).json({ error: 'El mensaje es requerido' })

  try {
    const filtro = { activo: true, aceptaPromo: true }
    if (soloConCelular) filtro.celular = { $ne: '' }

    const clientes = await Cliente.find(filtro)
    if (!clientes.length) return res.json({ enviados: 0, errores: 0, mensaje: 'Sin clientes con WhatsApp registrado' })

    let enviados = 0
    let errores  = 0
    const detalles = []

    for (const c of clientes) {
      if (!c.celular) { errores++; continue }
      try {
        await enviarWhatsApp(c.celular, mensaje)
        enviados++
        detalles.push({ nombre: c.nombre, celular: c.celular, ok: true })
        // Esperar 1 segundo entre mensajes para no saturar la API
        await new Promise(r => setTimeout(r, 1000))
      } catch (e) {
        errores++
        detalles.push({ nombre: c.nombre, celular: c.celular, ok: false, error: e.message })
      }
    }

    res.json({ enviados, errores, total: clientes.length, detalles })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST Enviar mensaje a cumpleañeros del día ────────────────────────────────
router.post('/enviar-cumpleanos', auth, soloAdmin, async (req, res) => {
  const { mensaje } = req.body
  const hoy = new Date()
  const mmdd = `${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`

  try {
    const clientes = await Cliente.find({
      activo: true, aceptaPromo: true,
      cumpleanos: mmdd, celular: { $ne: '' },
    })

    if (!clientes.length) return res.json({ enviados: 0, mensaje: 'Sin cumpleañeros hoy con WhatsApp' })

    const nombre    = process.env.RESTAURANTE_NOMBRE || 'PollerOS'
    const msgFinal  = mensaje || `Hola! Te deseamos un feliz cumpleaños de parte de ${nombre}! Ven hoy y te invitamos un postre gratis. Muestra este mensaje al llegar.`

    let enviados = 0
    for (const c of clientes) {
      try {
        await enviarWhatsApp(c.celular, `Hola ${c.nombre.split(' ')[0]}! ${msgFinal}`)
        enviados++
        await new Promise(r => setTimeout(r, 1000))
      } catch {}
    }

    res.json({ enviados, total: clientes.length })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST Enviar mensaje individual ────────────────────────────────────────────
router.post('/enviar-individual', auth, soloAdmin, async (req, res) => {
  const { clienteId, celular, mensaje } = req.body
  if (!mensaje) return res.status(400).json({ error: 'El mensaje es requerido' })

  const numCel = celular || (clienteId ? (await Cliente.findById(clienteId))?.celular : null)
  if (!numCel) return res.status(400).json({ error: 'Número de celular requerido' })

  try {
    await enviarWhatsApp(numCel, mensaje)
    res.json({ ok: true, mensaje: 'Mensaje enviado correctamente' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
