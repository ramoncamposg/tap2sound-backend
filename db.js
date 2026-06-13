const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Railway/Postgres en la nube requiere SSL. En local (DATABASE_URL con localhost)
// lo desactivamos para no exigir certificados.
const connectionString = process.env.DATABASE_URL;
const isLocal = !connectionString || /localhost|127\.0\.0\.1/.test(connectionString);

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

// Ejecuta el esquema al arrancar. Idempotente (IF NOT EXISTS).
async function initDb() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('[db] Esquema verificado/creado.');
}

// Helper corto para queries
function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query, initDb };
