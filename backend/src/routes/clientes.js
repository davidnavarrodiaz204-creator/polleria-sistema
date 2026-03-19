const express = require('express');
const router = express.Router();
const Cliente = require('../models/Cliente');
const { auth: authMiddleware } = require('../middleware/auth');

// ============================================================
// CONSULTA DNI/RUC - SISTEMA DE FALLBACK TRIPLE SIN TOKEN FIJO
// Token opcional: si existe en ENV lo usa, si no igual funciona
// ============================================================

const consultarDNI = async (dni) => {
  const token = process.env.APIS_PERU_TOKEN || '';

  // === API 1: apis.net.pe con token (si hay token) ===
  if (token) {
    try {
      const res = await fetch(`https://api.apis.net.pe/v2/dni?numero=${dni}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.nombres) {
          return {
            nombre: `${data.nombres} ${data.apellidoPaterno || ''} ${data.apellidoMaterno || ''}`.trim(),
            fuente: 'apis.net.pe'
          };
        }
      }
    } catch (e) {
      console.log('API 1 (apis.net.pe token) falló:', e.message);
    }
  }

  // === API 2: apiperu.dev - SIN TOKEN ===
  try {
    const res = await fetch(`https://apiperu.dev/api/dni/${dni}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.data && data.data.nombre_completo) {
        return {
          nombre: data.data.nombre_completo,
          fuente: 'apiperu.dev'
        };
      }
      if (data.nombre) {
        return { nombre: data.nombre, fuente: 'apiperu.dev' };
      }
    }
  } catch (e) {
    console.log('API 2 (apiperu.dev) falló:', e.message);
  }

  // === API 3: apis.net.pe v1 sin token (fallback público) ===
  try {
    const res = await fetch(`https://api.apis.net.pe/v1/dni?numero=${dni}`, {
      headers: { 'Referer': 'https://apis.net.pe' },
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.nombres) {
        return {
          nombre: `${data.nombres} ${data.apellidoPaterno || ''} ${data.apellidoMaterno || ''}`.trim(),
          fuente: 'apis.net.pe-v1'
        };
      }
    }
  } catch (e) {
    console.log('API 3 (apis.net.pe v1) falló:', e.message);
  }

  throw new Error('No se pudo consultar el DNI en este momento. Ingrese el nombre manualmente.');
};

const consultarRUC = async (ruc) => {
  const token = process.env.APIS_PERU_TOKEN || '';

  // === API 1: apis.net.pe con token (si hay token) ===
  if (token) {
    try {
      const res = await fetch(`https://api.apis.net.pe/v2/ruc?numero=${ruc}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.razonSocial) {
          return {
            nombre: data.razonSocial,
            direccion: data.direccion || '',
            estado: data.estado || '',
            condicion: data.condicion || '',
            fuente: 'apis.net.pe'
          };
        }
      }
    } catch (e) {
      console.log('API 1 RUC (apis.net.pe token) falló:', e.message);
    }
  }

  // === API 2: apiperu.dev - SIN TOKEN ===
  try {
    const res = await fetch(`https://apiperu.dev/api/ruc/${ruc}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.data && data.data.nombre_o_razon_social) {
        return {
          nombre: data.data.nombre_o_razon_social,
          direccion: data.data.direccion || '',
          estado: data.data.estado || '',
          condicion: data.data.condicion || '',
          fuente: 'apiperu.dev'
        };
      }
    }
  } catch (e) {
    console.log('API 2 RUC (apiperu.dev) falló:', e.message);
  }

  // === API 3: apis.net.pe v1 sin token ===
  try {
    const res = await fetch(`https://api.apis.net.pe/v1/ruc?numero=${ruc}`, {
      headers: { 'Referer': 'https://apis.net.pe' },
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.razonSocial) {
        return {
          nombre: data.razonSocial,
          direccion: data.direccion || '',
          estado: data.estado || '',
          fuente: 'apis.net.pe-v1'
        };
      }
    }
  } catch (e) {
    console.log('API 3 RUC (apis.net.pe v1) falló:', e.message);
  }

  throw new Error('No se pudo consultar el RUC en este momento. Ingrese los datos manualmente.');
};

// ============================================================
// ENDPOINTS DNI / RUC
// ============================================================

// GET /api/clientes/consultar-dni/:dni
router.get('/consultar-dni/:dni', authMiddleware, async (req, res) => {
  try {
    const { dni } = req.params;
    if (!/^\d{8}$/.test(dni)) {
      return res.status(400).json({ error: 'DNI debe tener exactamente 8 dígitos' });
    }
    const resultado = await consultarDNI(dni);
    res.json({ success: true, ...resultado });
  } catch (error) {
    res.status(503).json({ success: false, error: error.message });
  }
});

// GET /api/clientes/consultar-ruc/:ruc
router.get('/consultar-ruc/:ruc', authMiddleware, async (req, res) => {
  try {
    const { ruc } = req.params;
    if (!/^\d{11}$/.test(ruc)) {
      return res.status(400).json({ error: 'RUC debe tener exactamente 11 dígitos' });
    }
    const resultado = await consultarRUC(ruc);
    res.json({ success: true, ...resultado });
  } catch (error) {
    res.status(503).json({ success: false, error: error.message });
  }
});

// ============================================================
// CRUD CLIENTES
// ============================================================

// GET /api/clientes — listar todos
router.get('/', authMiddleware, async (req, res) => {
  try {
    const clientes = await Cliente.find().sort({ createdAt: -1 });
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/clientes/:id — obtener uno
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/clientes — crear cliente
router.post('/', authMiddleware, async (req, res) => {
  try {
    const cliente = new Cliente(req.body);
    await cliente.save();
    res.status(201).json(cliente);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Ya existe un cliente con ese DNI/RUC' });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// PUT /api/clientes/:id — actualizar cliente
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/clientes/:id — eliminar cliente
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndDelete(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
