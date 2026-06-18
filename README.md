# Tap2Sound Backend

Backend para la aplicación Tap2Sound - Auto-emparejamiento NFC + Bluetooth.

## Instalación

```bash
npm install
```

## Configuración

1. Copiar `.env.example` a `.env`
2. Actualizar valores en `.env`:
   - `DATABASE_URL`: URL de PostgreSQL
   - `JWT_SECRET`: Clave secreta para JWT
   - `PORT`: Puerto (default 3000)

## Base de Datos

```bash
# Crear/migrar base de datos
npm run prisma:push

# Abrir Prisma Studio (ver datos)
npm run prisma:studio
```

## Desarrollo

```bash
npm run dev
```

## Build para Producción

```bash
npm run build
npm start
```

## Endpoints

### Autenticación

- `POST /auth/register` - Registrar usuario
  ```json
  { "email": "user@example.com", "password": "pass123" }
  ```

- `POST /auth/login` - Iniciar sesión
  ```json
  { "email": "user@example.com", "password": "pass123" }
  ```

### Speakers

- `POST /speakers/auto-pair` - **CORE**: Auto-emparejar NFC + BT MAC
  ```json
  { "nfcUid": "ABC123", "btMac": "AA:BB:CC:DD:EE:FF" }
  ```
  Headers: `Authorization: Bearer <token>`

- `GET /speakers` - Obtener altavoces del usuario
  Headers: `Authorization: Bearer <token>`

- `PUT /speakers/rename` - Renombrar altavoz
  ```json
  { "speakerId": "id", "name": "Mi Altavoz" }
  ```
  Headers: `Authorization: Bearer <token>`

## Flujo Auto-Pair

1. Usuario toca NFC sin app instalada → redirige a Play Store
2. Instala app
3. Toca NFC nuevamente → app captura:
   - NFC UID
   - MAC del Bluetooth conectado (automático)
4. App envía `POST /speakers/auto-pair` con ambos datos
5. Backend crea speaker si no existe + vincula a usuario
6. App obtiene MAC y se conecta localmente via Bluetooth
