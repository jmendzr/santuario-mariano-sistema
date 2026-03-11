require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  console.log('🔧 Iniciando setup...');

  try {
    // Generar hash de la contraseña
    const hash = await bcrypt.hash('parroco123', 10);
    console.log('🔑 Hash generado:', hash);

    // Insertar o actualizar usuario admin
    await pool.query(`
      INSERT INTO usuarios (username, password_hash, nombre, rol, activo)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (username) DO UPDATE
      SET password_hash = EXCLUDED.password_hash,
          activo = true
    `, ['parroco', hash, 'Párroco Administrador', 'parroco', true]);

    console.log('✅ Usuario admin creado/actualizado correctamente');
    console.log('👤 Usuario: parroco');
    console.log('🔒 Contraseña: parroco123');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

setup();