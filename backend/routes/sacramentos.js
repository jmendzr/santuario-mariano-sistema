// routes/sacramentos.js — Sacramentos + Documentos + Agenda + Config + Reportes
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');
const { authMiddleware, requireEdit, requireParroco, audit } = require('../middleware/auth');

// ── MULTER CONFIG ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `${uuidv4()}${ext}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf','.jpg','.jpeg','.png','.doc','.docx'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Tipo de archivo no permitido. Use PDF, JPG, PNG o DOC.'));
  }
});

// ════════════════════════════════════════════════
// SACRAMENTOS
// ════════════════════════════════════════════════

// GET /api/sacramentos?tipo=bautismo
router.get('/', authMiddleware, async (req, res) => {
  const { tipo } = req.query;
  try {
    let sql = `
      SELECT s.*,
        f.nombres, f.apellidos, f.dni,
        p.nombres AS padrino_nombres, p.apellidos AS padrino_apellidos,
        m.nombres AS madrina_nombres, m.apellidos AS madrina_apellidos,
        c.nombres AS conyuge_nombres, c.apellidos AS conyuge_apellidos,
        (SELECT COUNT(*) FROM documentos d WHERE d.sacramento_id = s.id) AS total_docs
      FROM sacramentos s
      JOIN feligreses f ON s.feligres_id = f.id
      LEFT JOIN feligreses p ON s.padrino_id = p.id
      LEFT JOIN feligreses m ON s.madrina_id = m.id
      LEFT JOIN feligreses c ON s.conyuge_id = c.id
      WHERE f.activo = true
    `;
    const params = [];
    if (tipo) { sql += ` AND s.tipo = $1`; params.push(tipo); }
    sql += ` ORDER BY s.fecha DESC`;

    const r = await db.query(sql, params);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener sacramentos' });
  }
});

// POST /api/sacramentos — Crear o actualizar
router.post('/', authMiddleware, requireEdit, async (req, res) => {
  const { feligres_id, tipo, fecha, parroquia, libro, folio, partida,
          padrino_id, madrina_id, conyuge_id, notas } = req.body;

  if (!feligres_id || !tipo || !fecha)
    return res.status(400).json({ error: 'feligres_id, tipo y fecha son requeridos' });

  const TIPOS = ['bautismo','eucaristia','confirmacion','penitencia','matrimonio','uncion','ordenacion'];
  if (!TIPOS.includes(tipo))
    return res.status(400).json({ error: 'Tipo de sacramento inválido' });

  try {
    const r = await db.query(`
      INSERT INTO sacramentos
        (feligres_id, tipo, fecha, parroquia, libro, folio, partida,
         padrino_id, madrina_id, conyuge_id, notas, creado_por)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (feligres_id, tipo) DO UPDATE SET
        fecha=$3, parroquia=$4, libro=$5, folio=$6, partida=$7,
        padrino_id=$8, madrina_id=$9, conyuge_id=$10, notas=$11,
        actualizado_en=NOW()
      RETURNING *
    `, [feligres_id, tipo, fecha, parroquia, libro, folio, partida,
        padrino_id || null, madrina_id || null, conyuge_id || null, notas, req.user.id]);

    await audit(db, req.user.id, 'SACRAMENTO', 'sacramentos', r.rows[0].id,
      { tipo, feligres_id }, req.ip);

    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar sacramento' });
  }
});

// DELETE /api/sacramentos/:id
router.delete('/:id', authMiddleware, requireEdit, async (req, res) => {
  try {
    // Eliminar documentos físicos asociados
    const docs = await db.query(`SELECT nombre_archivo FROM documentos WHERE sacramento_id = $1`, [req.params.id]);
    for (const d of docs.rows) {
      const fp = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads', d.nombre_archivo);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await db.query(`DELETE FROM sacramentos WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Sacramento eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar sacramento' });
  }
});

// ════════════════════════════════════════════════
// DOCUMENTOS
// ════════════════════════════════════════════════

// GET /api/documentos — Todos los documentos (repositorio)
router.get('/documentos', authMiddleware, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT d.*, f.nombres, f.apellidos, f.dni, s.tipo AS sacramento_tipo
      FROM documentos d
      JOIN feligreses f ON d.feligres_id = f.id
      LEFT JOIN sacramentos s ON d.sacramento_id = s.id
      ORDER BY d.subido_en DESC
    `);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener documentos' });
  }
});

// POST /api/documentos/upload — Subir archivo
router.post('/documentos/upload', authMiddleware, requireEdit, upload.single('archivo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

  const { feligres_id, sacramento_id, categoria, descripcion } = req.body;
  if (!feligres_id) return res.status(400).json({ error: 'feligres_id es requerido' });

  try {
    const r = await db.query(`
      INSERT INTO documentos
        (feligres_id, sacramento_id, nombre_archivo, nombre_original,
         tipo_mime, tamanio_bytes, categoria, descripcion, ruta_almacen, subido_por)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `, [feligres_id, sacramento_id || null, req.file.filename, req.file.originalname,
        req.file.mimetype, req.file.size, categoria || 'General',
        descripcion, req.file.path, req.user.id]);

    await audit(db, req.user.id, 'SUBIR_DOC', 'documentos', r.rows[0].id,
      { feligres_id, archivo: req.file.originalname }, req.ip);

    res.status(201).json(r.rows[0]);
  } catch (err) {
    // Limpiar archivo si falla BD
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Error al guardar documento' });
  }
});

// GET /api/documentos/file/:filename — Descargar archivo
router.get('/documentos/file/:filename', authMiddleware, (req, res) => {
  const filename = path.basename(req.params.filename); // Sanitize
  const filepath = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads', filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Archivo no encontrado' });
  res.download(filepath);
});

// DELETE /api/documentos/:id
router.delete('/documentos/:id', authMiddleware, requireEdit, async (req, res) => {
  try {
    const r = await db.query(`SELECT nombre_archivo FROM documentos WHERE id = $1`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Documento no encontrado' });

    const fp = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads', r.rows[0].nombre_archivo);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);

    await db.query(`DELETE FROM documentos WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Documento eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar documento' });
  }
});

// ════════════════════════════════════════════════
// AGENDA
// ════════════════════════════════════════════════

router.get('/agenda', authMiddleware, async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM agenda ORDER BY fecha, hora`);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener agenda' });
  }
});

router.post('/agenda', authMiddleware, requireEdit, async (req, res) => {
  const { fecha, hora, tipo, titulo, descripcion, celebrante, lugar, estado } = req.body;
  if (!fecha || !titulo || !tipo) return res.status(400).json({ error: 'fecha, tipo y título son requeridos' });
  try {
    const r = await db.query(`
      INSERT INTO agenda (fecha, hora, tipo, titulo, descripcion, celebrante, lugar, estado, creado_por)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [fecha, hora, tipo, titulo, descripcion, celebrante, lugar, estado || 'programado', req.user.id]);
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear evento' });
  }
});

router.put('/agenda/:id', authMiddleware, requireEdit, async (req, res) => {
  const { fecha, hora, tipo, titulo, descripcion, celebrante, lugar, estado } = req.body;
  try {
    const r = await db.query(`
      UPDATE agenda SET fecha=$1, hora=$2, tipo=$3, titulo=$4, descripcion=$5, celebrante=$6, lugar=$7, estado=$8
      WHERE id=$9 RETURNING *
    `, [fecha, hora, tipo, titulo, descripcion, celebrante, lugar, estado, req.params.id]);
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar evento' });
  }
});

router.delete('/agenda/:id', authMiddleware, requireEdit, async (req, res) => {
  try {
    await db.query(`DELETE FROM agenda WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Evento eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar evento' });
  }
});

// ════════════════════════════════════════════════
// CONFIGURACIÓN
// ════════════════════════════════════════════════

router.get('/config', authMiddleware, async (req, res) => {
  try {
    const r = await db.query(`SELECT clave, valor FROM configuracion ORDER BY clave`);
    const cfg = {};
    r.rows.forEach(row => { cfg[row.clave] = row.valor; });
    res.json(cfg);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

router.put('/config', authMiddleware, requireParroco, async (req, res) => {
  try {
    for (const [clave, valor] of Object.entries(req.body)) {
      await db.query(
        `INSERT INTO configuracion (clave, valor) VALUES ($1, $2)
         ON CONFLICT (clave) DO UPDATE SET valor = $2`,
        [clave, valor]
      );
    }
    res.json({ message: 'Configuración guardada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar configuración' });
  }
});

// ════════════════════════════════════════════════
// REPORTES
// ════════════════════════════════════════════════

router.get('/reportes', authMiddleware, async (req, res) => {
  try {
    const [totales, porSac, porSexo, porEstado, recientes] = await Promise.all([
      db.query(`SELECT
        (SELECT COUNT(*) FROM feligreses) AS total_feligreses,
        (SELECT COUNT(*) FROM feligreses WHERE activo=true) AS activos,
        (SELECT COUNT(*) FROM sacramentos) AS total_sacramentos,
        (SELECT COUNT(*) FROM documentos) AS total_documentos
      `),
      db.query(`SELECT tipo, COUNT(*) AS total FROM sacramentos GROUP BY tipo ORDER BY total DESC`),
      db.query(`SELECT sexo, COUNT(*) AS total FROM feligreses WHERE activo=true GROUP BY sexo`),
      db.query(`SELECT estado_civil, COUNT(*) AS total FROM feligreses WHERE activo=true GROUP BY estado_civil ORDER BY total DESC`),
      db.query(`SELECT nombres, apellidos, dni, creado_en FROM feligreses ORDER BY creado_en DESC LIMIT 5`),
    ]);

    res.json({
      totales:   totales.rows[0],
      porSacramento: porSac.rows,
      porSexo:   porSexo.rows,
      porEstado: porEstado.rows,
      recientes: recientes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar reporte' });
  }
});

module.exports = router;
