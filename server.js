try { require('dotenv').config(); } catch (_) {} // dotenv es opcional
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { initDb, query } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Rutas de salud (compatibilidad con lo que ya existia)
app.get('/', (req, res) => res.json({ name: 'tap2sound-backend', status: 'ok' }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Rutas de negocio
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/tags', require('./routes/tags'));
app.use('/api/bindings', require('./routes/bindings'));

// 404 JSON
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

const PORT = process.env.PORT || 3000;

// Crea un admin inicial si se definen ADMIN_EMAIL/ADMIN_PASSWORD y no existe.
async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const exists = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (exists.rows.length) return;
  const hash = await bcrypt.hash(password, 10);
  await query(
    `INSERT INTO users (email, password_hash, nombre, role)
     VALUES ($1, $2, 'Admin', 'admin')`,
    [email.toLowerCase(), hash]
  );
  console.log(`[init] Admin creado: ${email}`);
}

(async () => {
  try {
    await initDb();
    await ensureAdmin();
    app.listen(PORT, () => console.log(`[server] Escuchando en puerto ${PORT}`));
  } catch (err) {
    console.error('[server] Fallo al arrancar:', err);
    process.exit(1);
  }
})();
