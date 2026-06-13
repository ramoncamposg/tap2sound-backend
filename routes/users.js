const express = require('express');
const { query } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/users  (solo admin) - lista todos los usuarios
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, nombre, role, created_at
       FROM users ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[users]', err);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

// GET /api/users/me - datos del usuario autenticado
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, nombre, role, created_at FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[users/me]', err);
    res.status(500).json({ error: 'Error' });
  }
});

module.exports = router;
