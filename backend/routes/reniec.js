// routes/reniec.js — Consulta DNI via API Inti (app.apiinti.dev)
const express = require('express');
const router  = express.Router();
const fetch   = require('node-fetch');
const { authMiddleware } = require('../middleware/auth');
const db = require('../db');

/**
 * GET /api/reniec/:dni
 * Consulta datos de una persona por DNI usando API Inti.
 * Requiere: APIINTI_KEY en .env
 * Docs: https://app.apiinti.dev
 */
router.get('/:dni', authMiddleware, async (req, res) => {
  const { dni } = req.params;

  // Validación básica
  if (!/^\d{8}$/.test(dni)) {
    return res.status(400).json({ error: 'El DNI debe tener exactamente 8 dígitos numéricos' });
  }

  const apiKey = process.env.APIINTI_KEY;

  // Modo demo si no hay API key configurada
  if (!apiKey || apiKey === 'inti_live_TU_API_KEY_AQUI') {
    return res.json({
      fuente: 'demo',
      advertencia: 'Configure APIINTI_KEY en .env para consultas reales. Obtenga su clave en https://app.apiinti.dev',
      data: {
        dni,
        nombres:         'NOMBRES DEMO',
        apellidoPaterno: 'APELLIDO',
        apellidoMaterno: 'PATERNO',
        nombreCompleto:  'NOMBRES DEMO APELLIDO PATERNO',
        fechaNacimiento: null,
        sexo: null,
        direccion: null,
      }
    });
  }

  try {
    const url = `https://app.apiinti.dev/api/v1/dni/${dni}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    // DNI no encontrado
    if (response.status === 404) {
      return res.status(404).json({ error: 'DNI no encontrado en el padrón electoral' });
    }

    // Error de autenticación
    if (response.status === 401 || response.status === 403) {
      console.error(`API Inti: error de autenticación [${response.status}]`);
      return res.status(502).json({ error: 'API key inválida o sin permisos. Verifique APIINTI_KEY en su configuración.' });
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`API Inti error [${response.status}]:`, errText);
      return res.status(502).json({ error: `Error al consultar el servicio DNI (HTTP ${response.status})` });
    }

    const json = await response.json();

    // Normalizar respuesta de API Inti
    // Estructura: { data: { nombreCompleto, nombres, apellidoPaterno, apellidoMaterno, ... } }
    const raw = json.data || json;

    const data = {
      dni,
      nombres:         raw.nombres         || raw.prenombres   || '',
      apellidoPaterno: raw.apellidoPaterno  || raw.apPrimer     || '',
      apellidoMaterno: raw.apellidoMaterno  || raw.apSegundo    || '',
      nombreCompleto:  raw.nombreCompleto   ||
                       `${raw.nombres || raw.prenombres || ''} ${raw.apellidoPaterno || raw.apPrimer || ''} ${raw.apellidoMaterno || raw.apSegundo || ''}`.replace(/\s+/g, ' ').trim(),
      fechaNacimiento: (raw.fechaNacimiento || raw.feNacimiento)
                       ? parseFechaPeru(raw.fechaNacimiento || raw.feNacimiento)
                       : null,
      sexo:            raw.sexo ? (raw.sexo.toUpperCase().startsWith('M') ? 'M' : 'F') : null,
      direccion:       raw.direccion || null,
      verificado:      true,
    };

    // Actualizar caché en BD si el feligrés ya existe
    try {
      await db.query(
        `UPDATE feligreses SET reniec_data = $1, dni_verificado = true WHERE dni = $2`,
        [JSON.stringify(data), dni]
      );
    } catch (_) { /* No crítico, continuar */ }

    res.json({ fuente: 'apiinti', data });

  } catch (err) {
    if (err.name === 'FetchError' || err.code === 'ECONNREFUSED' || err.type === 'request-timeout') {
      return res.status(503).json({ error: 'No se pudo conectar con el servicio de consulta DNI. Intente más tarde.' });
    }
    console.error('Error consultando DNI:', err.message);
    res.status(500).json({ error: 'Error interno al consultar el DNI' });
  }
});

// Parsear fecha "DD/MM/YYYY" → "YYYY-MM-DD"
function parseFechaPeru(f) {
  if (!f) return null;
  const m = f.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

module.exports = router;
