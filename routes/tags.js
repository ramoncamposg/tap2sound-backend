const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/tags  { tag_uid, descripcion }  - registra un tag NFC
router.post('/', requireAuth, async (req, res) => {
  const { tag_uid, descripcion } = req.body || {};
  if (!tag_uid) return res.status(400).json({ error: 'tag_uid es obligatorio' });
  try {
    // Upsert: si el tag ya existe, devuelve el existente sin duplicar.
    const result = await query(
      `INSERT INTO nfc_tags (tag_uid, descripcion, created_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (tag_uid) DO UPDATE
         SET descripcion = COALESCE(EXCLUDED.descripcion, nfc_tags.descripcion)
       RETURNING id, tag_uid, descripcion, created_by, created_at`,
      [tag_uid.trim(), descripcion || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[tags POST]', err);
    res.status(500).json({ error: 'Error al registrar el tag' });
  }
});

// GET /api/tags  - lista los tags creados por el usuario autenticado
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, tag_uid, descripcion, created_by, created_at
       FROM nfc_tags WHERE created_by = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[tags GET]', err);
    res.status(500).json({ error: 'Error al listar tags' });
  }
});

module.exports = router;
