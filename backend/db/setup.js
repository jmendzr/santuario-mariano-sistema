// db/setup.js — Ejecuta el schema SQL automáticamente
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setup() {
  console.log('🚀 Iniciando configuración de la base de datos...');

  // Primero crear la BD si no existe
  const adminPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres', // conectar a BD por defecto
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    const dbName = process.env.DB_NAME || 'parroquia_db';
    const exists = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]
    );
    if (exists.rows.length === 0) {
      await adminPool.query(`CREATE DATABASE ${dbName} ENCODING 'UTF8'`);
      console.log(`✅ Base de datos '${dbName}' creada`);
    } else {
      console.log(`ℹ️  Base de datos '${dbName}' ya existe`);
    }
  } finally {
    await adminPool.end();
  }

  // Ahora ejecutar el schema
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'parroquia_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('✅ Tablas y datos iniciales creados correctamente');
    console.log('\n🎉 Base de datos lista. Ejecuta: npm start');
  } catch (err) {
    console.error('❌ Error al ejecutar schema:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setup();
