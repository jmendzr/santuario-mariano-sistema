// routes/auth.js — Login, logout, perfil de usuario
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { authMiddleware, requireParroco } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

  try {
    const r = await db.query(
      `SELECT id, username, password_hash, nombre, rol, activo FROM usuarios WHERE username = $1`,
      [username.toLowerCase().trim()]
    );
    const user = r.rows[0];
    if (!user || !user.activo)
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok)
      return res.status(401).json({ error: 'Contraseña incorrecta' });

    // Actualizar último login
    await db.query(`UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1`, [user.id]);

    const token = jwt.sign(
      { id: user.id, username: user.username, nombre: user.nombre, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      usuario: { id: user.id, username: user.username, nombre: user.nombre, rol: user.rol }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const r = await db.query(
      `SELECT id, username, nombre, rol, ultimo_login FROM usuarios WHERE id = $1`,
      [req.user.id]
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /api/auth/password — Cambiar contraseña
router.put('/password', authMiddleware, async (req, res) => {
  const { password_actual, password_nuevo } = req.body;
  if (!password_actual || !password_nuevo || password_nuevo.length < 6)
    return res.status(400).json({ error: 'Datos inválidos. La nueva contraseña debe tener mínimo 6 caracteres.' });

  try {
    const r = await db.query(`SELECT password_hash FROM usuarios WHERE id = $1`, [req.user.id]);
    const ok = await bcrypt.compare(password_actual, r.rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    const hash = await bcrypt.hash(password_nuevo, 10);
    await db.query(`UPDATE usuarios SET password_hash = $1 WHERE id = $2`, [hash, req.user.id]);
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /api/auth/usuarios — Lista de usuarios (solo párroco)
router.get('/usuarios', authMiddleware, requireParroco, async (req, res) => {
  try {
    const r = await db.query(`SELECT id, username, nombre, rol, activo, ultimo_login FROM usuarios ORDER BY rol, nombre`);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/auth/usuarios — Crear usuario (solo párroco)
router.post('/usuarios', authMiddleware, requireParroco, async (req, res) => {
  const { username, password, nombre, rol } = req.body;
  if (!username || !password || !nombre || !rol)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  if (!['parroco','secretaria','consulta'].includes(rol))
    return res.status(400).json({ error: 'Rol inválido' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const r = await db.query(
      `INSERT INTO usuarios (username, password_hash, nombre, rol) VALUES ($1,$2,$3,$4) RETURNING id, username, nombre, rol`,
      [username.toLowerCase(), hash, nombre, rol]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El nombre de usuario ya existe' });
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /api/auth/usuarios/:id/password — Reset contraseña (párroco)
router.put('/usuarios/:id/password', authMiddleware, requireParroco, async (req, res) => {
  const { password_nuevo } = req.body;
  if (!password_nuevo || password_nuevo.length < 6)
    return res.status(400).json({ error: 'Mínimo 6 caracteres' });
  try {
    const hash = await bcrypt.hash(password_nuevo, 10);
    await db.query(`UPDATE usuarios SET password_hash = $1 WHERE id = $2`, [hash, req.params.id]);
    res.json({ message: 'Contraseña reseteada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
