const express = require('express');
const { pool, query } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/bindings
//   { nfc_tag_uid, bluetooth_mac, device_name?, descripcion? }
// Crea el emparejamiento NFC + Bluetooth + usuario.
// Asegura que existan el tag y el dispositivo (los crea si faltan).
router.post('/', requireAuth, async (req, res) => {
  const { nfc_tag_uid, bluetooth_mac, device_name, descripcion } = req.body || {};
  if (!nfc_tag_uid || !bluetooth_mac) {
    return res.status(400).json({ error: 'nfc_tag_uid y bluetooth_mac son obligatorios' });
  }

  const tagUid = nfc_tag_uid.trim();
  const mac = bluetooth_mac.trim().toUpperCase();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Asegurar el tag
    await client.query(
      `INSERT INTO nfc_tags (tag_uid, descripcion, created_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (tag_uid) DO UPDATE
         SET descripcion = COALESCE(EXCLUDED.descripcion, nfc_tags.descripcion)`,
      [tagUid, descripcion || null, req.user.id]
    );

    // 2) Asegurar el dispositivo Bluetooth
    await client.query(
      `INSERT INTO bluetooth_devices (mac_address, device_name)
       VALUES ($1, $2)
       ON CONFLICT (mac_address) DO UPDATE
         SET device_name = COALESCE(EXCLUDED.device_name, bluetooth_devices.device_name)`,
      [mac, device_name || null]
    );

    // 3) Crear el binding (o reactivarlo si ya existia)
    const result = await client.query(
      `INSERT INTO bindings (user_id, nfc_tag_uid, bluetooth_mac, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (user_id, nfc_tag_uid, bluetooth_mac) DO UPDATE
         SET is_active = true
       RETURNING id, user_id, nfc_tag_uid, bluetooth_mac, is_active, created_at`,
      [req.user.id, tagUid, mac]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[bindings POST]', err);
    res.status(500).json({ error: 'Error al crear el emparejamiento' });
  } finally {
    client.release();
  }
});

// GET /api/bindings  - lista los bindings activos del usuario autenticado
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT b.id, b.nfc_tag_uid, b.bluetooth_mac, b.is_active, b.created_at,
              d.device_name, t.descripcion AS tag_descripcion
       FROM bindings b
       LEFT JOIN bluetooth_devices d ON d.mac_address = b.bluetooth_mac
       LEFT JOIN nfc_tags t ON t.tag_uid = b.nfc_tag_uid
       WHERE b.user_id = $1 AND b.is_active = true
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[bindings GET]', err);
    res.status(500).json({ error: 'Error al listar bindings' });
  }
});

// GET /api/bindings/device/:mac
// Devuelve los bindings activos de un dispositivo Bluetooth (para la cache local).
// Es publico-por-token: cualquier usuario autenticado puede consultar por MAC.
router.get('/device/:mac', requireAuth, async (req, res) => {
  const mac = (req.params.mac || '').trim().toUpperCase();
  try {
    const result = await query(
      `SELECT b.id, b.user_id, b.nfc_tag_uid, b.bluetooth_mac, b.is_active, b.created_at,
              d.device_name
       FROM bindings b
       LEFT JOIN bluetooth_devices d ON d.mac_address = b.bluetooth_mac
       WHERE b.bluetooth_mac = $1 AND b.is_active = true
       ORDER BY b.created_at DESC`,
      [mac]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[bindings/device]', err);
    res.status(500).json({ error: 'Error al consultar el dispositivo' });
  }
});

module.exports = router;
