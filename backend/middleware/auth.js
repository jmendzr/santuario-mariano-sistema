// middleware/auth.js — Verificación JWT y control de roles
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sesión expirada. Inicie sesión nuevamente.' });
    }
    return res.status(403).json({ error: 'Token inválido' });
  }
}

// Solo puede editar párroco o secretaria
function requireEdit(req, res, next) {
  if (!req.user || !['parroco', 'secretaria'].includes(req.user.rol)) {
    return res.status(403).json({ error: 'Permiso denegado. Se requiere rol de edición.' });
  }
  next();
}

// Solo párroco
function requireParroco(req, res, next) {
  if (!req.user || req.user.rol !== 'parroco') {
    return res.status(403).json({ error: 'Permiso denegado. Solo el párroco puede realizar esta acción.' });
  }
  next();
}

// Registro de auditoría
async function audit(db, userId, accion, tabla, registroId, detalle, ip) {
  try {
    await db.query(
      `INSERT INTO auditoria (usuario_id, accion, tabla, registro_id, detalle, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, accion, tabla, registroId, JSON.stringify(detalle), ip]
    );
  } catch (e) {
    // No interrumpir el flujo por error de auditoría
    console.error('Error de auditoría:', e.message);
  }
}

module.exports = { authMiddleware, requireEdit, requireParroco, audit };
