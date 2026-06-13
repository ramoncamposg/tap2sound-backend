-- Esquema Tap2Sound
-- Se ejecuta automaticamente al arrancar (CREATE TABLE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nombre        TEXT,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nfc_tags (
  id          SERIAL PRIMARY KEY,
  tag_uid     TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bluetooth_devices (
  id          SERIAL PRIMARY KEY,
  mac_address TEXT NOT NULL UNIQUE,
  device_name TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bindings (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nfc_tag_uid   TEXT NOT NULL REFERENCES nfc_tags(tag_uid) ON DELETE CASCADE,
  bluetooth_mac TEXT NOT NULL REFERENCES bluetooth_devices(mac_address) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (user_id, nfc_tag_uid, bluetooth_mac)
);

-- Indice para la consulta de cache por MAC
CREATE INDEX IF NOT EXISTS idx_bindings_mac ON bindings(bluetooth_mac);
CREATE INDEX IF NOT EXISTS idx_bindings_tag ON bindings(nfc_tag_uid);
