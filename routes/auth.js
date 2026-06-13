const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { signToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register  { email, password, nombre }
router.post('/register', async (req, res) => {
  const { email, password, nombre } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email y password son obligatorios' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (email, password_hash, nombre, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, email, nombre, role, created_at`,
      [email.toLowerCase().trim(), hash, nombre || null]
    );
    const user = result.rows[0];
    const token = signToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ese email ya esta registrado' });
    }
    console.error('[register]', err);
    res.status(500).json({ error: 'Error al registrar' });
  }
});

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email y password son obligatorios' });
  }
  try {
    const result = await query(
      `SELECT id, email, password_hash, nombre, role FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    const row = result.rows[0];
    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    const user = { id: row.id, email: row.email, nombre: row.nombre, role: row.role };
    const token = signToken(user);
    res.json({ user, token });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Error al iniciar sesion' });
  }
});

module.exports = router;
