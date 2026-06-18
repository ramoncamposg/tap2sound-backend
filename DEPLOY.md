# Guía de Despliegue — Tap2Sound

Esta guía cubre el despliegue completo: backend en Railway y app Android.

---

## PARTE 1 — Backend (Railway)

### 1.1 Crear repositorio en GitHub

```powershell
cd tap2sound-backend
git init
git add .
git commit -m "Initial commit: Tap2Sound backend"
```

Crea el repo en GitHub (web) como `tap2sound-backend`, luego:

```powershell
git remote add origin https://github.com/ramoncamposg/tap2sound-backend.git
git branch -M main
git push -u origin main
```

### 1.2 Desplegar en Railway

1. En Railway, crea un nuevo proyecto desde el repo `tap2sound-backend`.
2. Añade un servicio **PostgreSQL** al proyecto (Railway genera `DATABASE_URL`).
3. En las variables de entorno del servicio backend, añade:
   - `JWT_SECRET` → una cadena larga y aleatoria
   - `DATABASE_URL` → referencia a `${{Postgres.DATABASE_URL}}`
   - `ADMIN_EMAILS` → tu email admin (p. ej. `ramoncamposg@gmail.com`; admite varios separados por comas)

> El usuario cuyo email esté en `ADMIN_EMAILS` recibe el perfil de administrador
> automáticamente al registrarse o iniciar sesión.

### 1.3 Configurar comandos de build/start en Railway

En **Settings → Deploy** del servicio backend:

- Build Command:
  ```
  npm install && npx prisma generate && npm run build && npx prisma db push
  ```
- Start Command:
  ```
  npm start
  ```

> Nota: usamos `prisma db push` (no `migrate deploy`) para Railway.

### 1.4 Verificar

Una vez desplegado, prueba el health check:

```powershell
curl https://TU-DOMINIO.up.railway.app/health
```

Debe responder `{"status":"OK",...}`.

---

## PARTE 2 — App Android

### 2.1 Configurar la URL del backend

Edita `ApiClient.kt` y reemplaza `BASE_URL` con tu dominio real de Railway:

```kotlin
const val BASE_URL = "https://TU-DOMINIO.up.railway.app"
```

### 2.2 Abrir en Android Studio

1. Abre Android Studio → **Open** → selecciona la carpeta `tap2sound-app`.
2. Espera a que Gradle sincronice (descargará dependencias).
3. Si pide actualizar el Gradle wrapper, acepta.

### 2.3 Compilar APK de prueba (debug)

Desde la terminal de Android Studio (o PowerShell en la carpeta):

```powershell
cd tap2sound-app
.\gradlew assembleDebug
```

El APK quedará en:
```
app\build\outputs\apk\debug\app-debug.apk
```

### 2.4 Instalar en el móvil

Con el móvil conectado por USB y depuración activada:

```powershell
.\gradlew installDebug
```

---

## PARTE 3 — Flujo de uso

### Primer emparejamiento de un altavoz (auto-pair)

1. El usuario conecta su móvil al altavoz Bluetooth **manualmente** (ajustes de Android), como cualquier altavoz.
2. Abre la app Tap2Sound y se registra / inicia sesión.
3. Toca el NFC pegado al altavoz.
4. La app:
   - Lee el UID del NFC.
   - Captura automáticamente la MAC del altavoz BT conectado.
   - Envía `{nfcUid, btMac}` a `/speakers/auto-pair`.
   - El backend comprueba que el UID esté en la lista blanca (registrado por el
     admin). Si lo está, fija la MAC en ese tag y lo vincula al usuario. Si no,
     rechaza el emparejamiento.

### Uso diario

1. El usuario toca el NFC.
2. La app encuentra la MAC en cache local (sin red).
3. Se conecta automáticamente vía Bluetooth.

### Sin app instalada (NDEF a Play Store)

El NDEF escrito en el tag incluye:
- AAR (abre la app si está instalada).
- URI a Play Store (redirige a instalar si no lo está).

> El registro NDEF lo graba el admin en lote desde la pantalla **Admin**
> (ver sección "Modo administrador" más abajo).

---

## Modo administrador (escribir tags NFC)

El usuario admin (definido por `ADMIN_EMAILS`) verá un botón **"Admin"** en la
pantalla principal. Dentro:

1. Activa el interruptor **Modo escritura**.
2. Acerca cada tag NFC en blanco a la parte trasera del móvil.
3. La app hace dos cosas en un solo tap:
   - Graba el NDEF (AAR + URI a Play Store) en el tag.
   - **Registra el UID en la lista blanca** del backend (`/admin/api/register-tag`).
4. Suma 1 al contador. Repite con cada tag.

Así preparas y **autorizas** en lote todos los tags antes de pegarlos a los
altavoces. **Solo los tags que registres aquí podrán emparejarse**: si un usuario
toca un NFC que no está en la lista blanca, `auto-pair` lo rechaza con "Esta
etiqueta NFC no está autorizada".

No se introduce ninguna MAC aquí: la MAC se rellena sola en el primer
emparejamiento del usuario (auto-pair) y queda fijada a ese tag.

> Usa tags regrabables compatibles con NDEF (p. ej. NTAG213/215/216).

### Panel web de administración (`/admin`)

Abre `https://TU-DOMINIO.up.railway.app/admin` en el navegador e inicia sesión
con tu cuenta admin. Verás **todas las asociaciones NFC + MAC con el email del
usuario que las creó**. Desde ahí puedes:

Cuando un usuario te escriba por email pidiendo borrar/resetear sus tags,
**búscalo por su email** (no necesitas que sepa el UID ni la MAC) y elige la
acción adecuada:

- **Desvincular** (la "x" junto a cada email): quita a ESE usuario de un
  altavoz, sin afectar al resto. Ideal si solo quiere dejar de usarlo.
- **Editar MAC**: si se sustituyó el altavoz pero se conserva el tag NFC.
- **Resetear**: desvincula a TODOS los usuarios y borra la MAC, pero **el tag
  sigue autorizado** (lista blanca) y vuelve a estado "sin emparejar", listo
  para re-emparejarse limpio. Esta es la opción habitual para "resetear" un tag.
- **Borrar**: elimina el tag por completo; **sale de la lista blanca** y nadie
  podrá emparejarlo hasta que lo vuelvas a registrar con la app. Úsalo solo para
  retirar un tag definitivamente.

Cada reserva NFC+MAC queda siempre ligada a un email porque `auto-pair` exige
autenticación: este panel es tu herramienta para diagnosticar y resolver
problemas.

Endpoints (todos requieren token de admin):
`GET /admin/api/associations`, `PUT /admin/api/speaker-mac`,
`POST /admin/api/reset-tag`, `DELETE /admin/api/speaker`,
`DELETE /admin/api/unlink`, `POST /admin/api/register-tag`.

---

## Diferencias clave vs. SpeakerRoom

| Aspecto | SpeakerRoom | Tap2Sound |
|---------|-------------|-----------|
| Registro de tag | Admin pre-registra UID+MAC | Admin pre-registra solo el UID (lista blanca) |
| Tags válidos | Los que registra el admin | Solo los que registra el admin |
| Captura de MAC | Manual (admin selecciona) | Automática en el primer emparejamiento |
| Rol del admin | Registrar cada altavoz | Grabar + registrar tags en lote |
| NDEF fallback | App propia | Redirige a Play Store |
| Endpoint clave | `/speakers/link` | `/speakers/auto-pair` |
