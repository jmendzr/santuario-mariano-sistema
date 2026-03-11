// routes/feligreses.js — CRUD completo de feligreses
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authMiddleware, requireEdit, audit } = require('../middleware/auth');

// GET /api/feligreses?q=texto&page=1&limit=20&activo=true
router.get('/', authMiddleware, async (req, res) => {
  const { q = '', page = 1, limit = 50, activo } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let where = [];
    let params = [];
    let i = 1;

    if (q.trim()) {
      where.push(`(
        unaccent(nombres) ILIKE unaccent($${i}) OR
        unaccent(apellidos) ILIKE unaccent($${i}) OR
        dni ILIKE $${i} OR
        unaccent(email) ILIKE unaccent($${i})
      )`);
      params.push(`%${q.trim()}%`);
      i++;
    }

    if (activo !== undefined) {
      where.push(`activo = $${i++}`);
      params.push(activo === 'true');
    }

    const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const countR = await db.query(`SELECT COUNT(*) FROM feligreses ${whereSQL}`, params);
    const total  = parseInt(countR.rows[0].count);

    params.push(parseInt(limit), offset);
    const r = await db.query(`
      SELECT
        f.*,
        (SELECT json_agg(json_build_object(
          'tipo', s.tipo, 'fecha', s.fecha, 'parroquia', s.parroquia,
          'libro', s.libro, 'folio', s.folio, 'partida', s.partida,
          'padrino_id', s.padrino_id, 'madrina_id', s.madrina_id, 'conyuge_id', s.conyuge_id,
          'notas', s.notas
        )) FROM sacramentos s WHERE s.feligres_id = f.id) AS sacramentos,
        (SELECT COUNT(*) FROM documentos d WHERE d.feligres_id = f.id) AS total_docs
      FROM feligreses f ${whereSQL}
      ORDER BY f.apellidos, f.nombres
      LIMIT $${i} OFFSET $${i+1}
    `, params);

    res.json({ total, page: parseInt(page), limit: parseInt(limit), data: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener feligreses' });
  }
});

// GET /api/feligreses/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT
        f.*,
        (SELECT json_agg(json_build_object(
          'id', s.id, 'tipo', s.tipo, 'fecha', s.fecha, 'parroquia', s.parroquia,
          'libro', s.libro, 'folio', s.folio, 'partida', s.partida,
          'padrino_id', s.padrino_id, 'madrina_id', s.madrina_id, 'conyuge_id', s.conyuge_id,
          'notas', s.notas, 'creado_en', s.creado_en
        )) FROM sacramentos s WHERE s.feligres_id = f.id) AS sacramentos,
        (SELECT json_agg(json_build_object(
          'id', d.id, 'nombre_original', d.nombre_original, 'nombre_archivo', d.nombre_archivo,
          'tipo_mime', d.tipo_mime, 'tamanio_bytes', d.tamanio_bytes,
          'categoria', d.categoria, 'sacramento_id', d.sacramento_id, 'subido_en', d.subido_en
        )) FROM documentos d WHERE d.feligres_id = f.id) AS documentos
      FROM feligreses f WHERE f.id = $1
    `, [req.params.id]);

    if (!r.rows[0]) return res.status(404).json({ error: 'Feligrés no encontrado' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/feligreses
router.post('/', authMiddleware, requireEdit, async (req, res) => {
  const { nombres, apellidos, dni, apodo, fecha_nacimiento, sexo, nacionalidad,
          lugar_nacimiento, estado_civil, ocupacion, email, telefono, direccion,
          parroquia_origen, activo = true, notas } = req.body;

  if (!nombres || !apellidos || !dni)
    return res.status(400).json({ error: 'Nombres, apellidos y DNI son requeridos' });
  if (!/^\d{8}$/.test(dni))
    return res.status(400).json({ error: 'DNI debe tener 8 dígitos numéricos' });

  try {
    const r = await db.query(`
      INSERT INTO feligreses
        (nombres, apellidos, dni, apodo, fecha_nacimiento, sexo, nacionalidad,
         lugar_nacimiento, estado_civil, ocupacion, email, telefono, direccion,
         parroquia_origen, activo, notas, creado_por)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *
    `, [nombres.trim(), apellidos.trim(), dni.trim(), apodo, fecha_nacimiento || null,
        sexo, nacionalidad, lugar_nacimiento, estado_civil, ocupacion, email,
        telefono, direccion, parroquia_origen, activo, notas, req.user.id]);

    await audit(db, req.user.id, 'CREAR', 'feligreses', r.rows[0].id,
      { nombres, apellidos, dni }, req.ip);

    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: `Ya existe un feligrés con DNI ${dni}` });
    console.error(err);
    res.status(500).json({ error: 'Error al crear feligrés' });
  }
});

// PUT /api/feligreses/:id
router.put('/:id', authMiddleware, requireEdit, async (req, res) => {
  const { nombres, apellidos, dni, apodo, fecha_nacimiento, sexo, nacionalidad,
          lugar_nacimiento, estado_civil, ocupacion, email, telefono, direccion,
          parroquia_origen, activo, notas } = req.body;

  try {
    const r = await db.query(`
      UPDATE feligreses SET
        nombres=$1, apellidos=$2, dni=$3, apodo=$4, fecha_nacimiento=$5, sexo=$6,
        nacionalidad=$7, lugar_nacimiento=$8, estado_civil=$9, ocupacion=$10,
        email=$11, telefono=$12, direccion=$13, parroquia_origen=$14, activo=$15, notas=$16
      WHERE id = $17 RETURNING *
    `, [nombres, apellidos, dni, apodo, fecha_nacimiento || null, sexo, nacionalidad,
        lugar_nacimiento, estado_civil, ocupacion, email, telefono, direccion,
        parroquia_origen, activo, notas, req.params.id]);

    if (!r.rows[0]) return res.status(404).json({ error: 'Feligrés no encontrado' });
    await audit(db, req.user.id, 'ACTUALIZAR', 'feligreses', req.params.id, req.body, req.ip);
    res.json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: `Ya existe un feligrés con ese DNI` });
    res.status(500).json({ error: 'Error al actualizar feligrés' });
  }
});

// DELETE /api/feligreses/:id — Solo párroco, desactivar
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'parroco')
    return res.status(403).json({ error: 'Solo el párroco puede eliminar feligreses' });
  try {
    await db.query(`UPDATE feligreses SET activo = false WHERE id = $1`, [req.params.id]);
    await audit(db, req.user.id, 'DESACTIVAR', 'feligreses', req.params.id, {}, req.ip);
    res.json({ message: 'Feligrés desactivado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /api/feligreses/buscar/padrinos?q=texto — Para select de padrinos
router.get('/buscar/padrinos', authMiddleware, async (req, res) => {
  const { q = '', exclude = '' } = req.query;
  try {
    const r = await db.query(`
      SELECT id, nombres, apellidos, dni
      FROM feligreses
      WHERE activo = true
        AND id != $1
        AND (
          unaccent(nombres || ' ' || apellidos) ILIKE unaccent($2) OR
          dni ILIKE $2
        )
      ORDER BY apellidos, nombres
      LIMIT 20
    `, [exclude || '00000000-0000-0000-0000-000000000000', `%${q}%`]);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
