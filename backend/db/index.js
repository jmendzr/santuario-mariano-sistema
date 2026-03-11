// db/index.js — Pool de conexiones PostgreSQL
const { Pool } = require('pg');
require('dotenv').config();

// Supabase y servicios cloud usan DATABASE_URL directamente.
// Si no existe, se construye desde las variables individuales.
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Requerido por Supabase / Render
    }
  : {
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME     || 'parroquia_db',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool({
  ...poolConfig,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de BD:', err.message);
});

// Helper: ejecutar query con manejo de errores
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    if (process.env.NODE_ENV === 'development') {
      console.log(`🗄️  Query [${Date.now()-start}ms]: ${text.substring(0,60)}...`);
    }
    return res;
  } catch (err) {
    console.error('❌ Error en query:', err.message, '\nSQL:', text);
    throw err;
  }
}

// Helper: transacción
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { query, transaction, pool };
