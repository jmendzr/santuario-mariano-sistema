// server.js — Servidor principal del Sistema Parroquial
require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const rateLimit = require('express-rate-limit');
const path     = require('path');
const fs       = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Crear carpeta uploads si no existe ────────
const uploadDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ── SEGURIDAD ─────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,    // Desactivado para permitir inline scripts del frontend
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'],
  credentials: true,
}));

// Rate limiting: 100 req/min por IP
app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas solicitudes. Espere un momento.' },
}));

// Rate limiting estricto para login: 10 intentos / 15 min
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de login. Espere 15 minutos.' },
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ── RUTAS API ─────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/reniec',     require('./routes/reniec'));
app.use('/api/feligreses', require('./routes/feligreses'));
app.use('/api',            require('./routes/sacramentos'));  // sacramentos, docs, agenda, config, reportes

// ── FRONTEND ESTÁTICO ─────────────────────────
// Sirve el frontend desde la carpeta /frontend
const frontendDir = path.join(__dirname, '..', 'frontend');
if (fs.existsSync(frontendDir)) {
  app.use(express.static(frontendDir));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(frontendDir, 'index.html'));
    }
  });
}

// ── HEALTH CHECK ──────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    servicio: 'Sistema Parroquial',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── MANEJO DE ERRORES ─────────────────────────
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(413).json({ error: `Archivo demasiado grande. Máximo ${process.env.MAX_FILE_SIZE_MB || 10}MB` });
  console.error('❌ Error no manejado:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ── INICIAR ───────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║   ✝  SISTEMA PARROQUIAL — Nuestra Señora del Rosario   ║
║   🚀  Servidor corriendo en http://localhost:${PORT} ║
║   📂  Uploads: ./${process.env.UPLOAD_DIR || 'uploads'}/                        ║
║   🗄️  BD: ${process.env.DB_NAME || 'parroquia_db'} @ ${process.env.DB_HOST || 'localhost'}              ║
╚══════════════════════════════════════════════════╝
  `);
});

module.exports = app;
