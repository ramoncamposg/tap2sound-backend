# Tap2Sound Backend

API REST en Node.js + Express + Postgres para emparejar tags NFC con dispositivos Bluetooth.

## Stack
- Node.js 18+ / Express 4
- Postgres (pg)
- Auth: bcryptjs (hash de contrasenas) + JWT de un solo token (caduca a 30 dias)

## Estructura
```
server.js              Arranque, salud, montaje de rutas, init de BD, admin inicial
db.js                  Pool de Postgres + initDb (ejecuta schema.sql al arrancar)
schema.sql             Las 4 tablas (idempotente, CREATE TABLE IF NOT EXISTS)
middleware/auth.js     signToken, requireAuth, requireAdmin
routes/auth.js         /api/auth/register, /api/auth/login
routes/users.js        /api/users (admin), /api/users/me
routes/tags.js         /api/tags (POST, GET)
routes/bindings.js     /api/bindings (POST, GET), /api/bindings/device/:mac
```

## Variables de entorno
Ver `.env.example`. Las importantes:
- `DATABASE_URL` — cadena de conexion a Postgres.
- `JWT_SECRET` — secreto para firmar tokens. **Cambialo.**
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — (opcional) crea un admin inicial al arrancar.
- `PORT` — Railway lo inyecta solo.

## Endpoints
| Metodo | Ruta | Auth | Body / Notas |
|---|---|---|---|
| POST | /api/auth/register | no | `{ email, password, nombre? }` -> `{ user, token }` |
| POST | /api/auth/login | no | `{ email, password }` -> `{ user, token }` |
| GET | /api/users | admin | lista todos los usuarios |
| GET | /api/users/me | token | datos del usuario actual |
| POST | /api/tags | token | `{ tag_uid, descripcion? }` |
| GET | /api/tags | token | tags del usuario |
| POST | /api/bindings | token | `{ nfc_tag_uid, bluetooth_mac, device_name?, descripcion? }` |
| GET | /api/bindings | token | bindings activos del usuario |
| GET | /api/bindings/device/:mac | token | bindings de un dispositivo (para cache) |

Autenticacion: enviar header `Authorization: Bearer <token>`.

## Correr en local
```bash
npm install
cp .env.example .env   # edita DATABASE_URL y JWT_SECRET
npm start
```

## Desplegar en Railway
1. Sube este codigo al repo `ramoncamposg/tap2sound-backend` (ver abajo).
2. En el proyecto de Railway, el servicio del backend ya esta enlazado al repo: cada push a `main` redepliega solo.
3. En **Variables** del servicio backend, anade:
   - `DATABASE_URL` = `${{ Postgres.DATABASE_URL }}`  (referencia al plugin de Postgres)
   - `JWT_SECRET` = una cadena larga aleatoria
   - `ADMIN_EMAIL` y `ADMIN_PASSWORD` (opcional)
4. Railway detecta `npm start` automaticamente. Al primer arranque, `initDb()` crea las 4 tablas (esto resuelve el "BD vacia").

### Subir al repo de GitHub
```bash
cd tap2sound-backend
git init
git add .
git commit -m "Backend completo: auth, tags, bindings"
git branch -M main
git remote add origin https://github.com/ramoncamposg/tap2sound-backend.git
git push -u origin main
```
(Si el repo ya tiene commits, usa `git pull --rebase origin main` antes del push, o haz push forzado si quieres reemplazarlo.)

## Corregir el DNS de tap2sound.com (Squarespace -> Railway)
Ahora mismo `tap2sound.com` apunta a Squarespace. Para apuntarlo a Railway:

1. En Railway, abre el servicio backend -> **Settings -> Networking -> Custom Domain** -> escribe `tap2sound.com` (o `api.tap2sound.com`). Railway te dara un destino CNAME (algo como `xxxx.up.railway.app`).
2. Entra al panel donde gestionas el DNS del dominio (Squarespace -> Settings -> Domains -> tap2sound.com -> DNS Settings).
3. Recomendado: usa un subdominio para la API y deja la web en Squarespace:
   - Anade un registro **CNAME**: host `api` -> valor `xxxx.up.railway.app`.
   - La app Android usaria `https://api.tap2sound.com/`.
4. Si quieres que el dominio raiz `tap2sound.com` apunte a Railway:
   - El apex no admite CNAME en muchos DNS. Usa el **CNAME/ALIAS aplanado** que ofrezca el panel, o el registro que indique Railway. Squarespace tiene soporte limitado para apex personalizado, asi que el subdominio `api.` es lo mas sencillo.
5. Espera la propagacion (minutos a unas horas). Railway emite el certificado HTTPS solo.

> Nota: si mueves el apex fuera de Squarespace, tu web actual de Squarespace dejaria de resolver. Por eso lo mas limpio es `api.tap2sound.com` para el backend y dejar `tap2sound.com` como esta.
