# 📅 Sistema de Agendamiento de Reuniones Comerciales

## 🧩 Descripcion breve del sistema

Sistema interno para asistir el agendamiento y seguimiento de reuniones comerciales desde una extension de Chrome integrada con Respond.io y Google Meet.

El proyecto esta compuesto por:

- Una extension de Chrome que inyecta una interfaz lateral en Respond.io y Google Meet.
- Un backend Node.js con Express que expone endpoints para autenticacion, disponibilidad y actualizacion de reuniones.
- Airtable como base de datos para contactos, reuniones y usuarios autenticados.

## 🎯 Objetivo del negocio

Centralizar informacion comercial y reducir friccion operativa durante el proceso de agendamiento. El sistema permite consultar datos del contacto, revisar reuniones asociadas, validar disponibilidad de vendedoras y actualizar informacion de reuniones desde las herramientas que usa el equipo.

## 🏗️ Arquitectura

### 🧭 Extension de Chrome

Archivos principales:

- `manifest.json`: define la extension, permisos y sitios donde se ejecuta.
- `content.js`: inyecta el boton flotante, panel lateral, consulta datos al backend y actualiza reuniones.
- `content.css`: estilos de la interfaz inyectada.

La extension se ejecuta en:

- `https://app.respond.io/space/342593/*`
- `https://meet.google.com/*`

El frontend de la extension consume el backend local en:

```text
http://localhost:3000/api
```

### ⚙️ Backend

El backend esta ubicado en la carpeta `backend/` y utiliza:

- Node.js
- Express
- dotenv
- express-session
- googleapis
- axios

Archivo de entrada:

```text
backend/app.js
```

Scripts disponibles:

```bash
npm start
npm run dev
```

El backend escucha por defecto en el puerto `3000`.

### 🗄️ Airtable

Airtable se usa como persistencia principal para:

- Clientes comerciales mediante la tabla `Clientes`.
- Usuarios internos mediante la tabla `Usuarios`.
- Reuniones mediante la tabla `Reuniones`.
- Usuarios autenticados en Google OAuth mediante la tabla `AuthUsuarios`.

El backend accede a Airtable usando `AIRTABLE_API_KEY` y `AIRTABLE_BASE_ID`.

Tablas usadas en la base `Auto-FielData`:

- `Clientes`: clientes comerciales. Campos principales usados: `Nombre`, `Telefono`, `Correo`, `Cantidad de Reuniones`, `Ultima Reunion`, `Estado Ult Reunion`, `Nota Ultima Reunion`.
- `Usuarios`: usuarios internos del negocio. Campos actuales: `Id`, `Nombre`, `Telefono`, `Correo`. Todavia no participa del flujo OAuth.
- `Reuniones`: reuniones comerciales. Campos principales usados: `Nombre`, `Tipo de Reunion`, `ESTADO`, `Notas`, `Vendedora`, `Fase del Momento`, `Link de meet`, `Logramos Registro?`, `Cliente`, `Fecha`, `Duracion`, `Google Calendar Event ID`, `Origen`, `Telefono`.
- `AuthUsuarios`: usuarios autenticados con Google. Campos usados: `Email`, `AccessToken`, `RefreshToken`, `ExpiryDate`, `Rol`, `Activo`.

## 🔄 Flujo del sistema

1. El equipo trabaja desde Respond.io sobre una conversacion de WhatsApp.
2. La extension detecta el telefono del contacto en la vista de Respond.io.
3. La extension consulta al backend para obtener informacion del cliente y reuniones asociadas en Airtable.
4. Desde el panel lateral se puede consultar disponibilidad segun fecha y duracion.
5. La disponibilidad se calcula con Google Calendar `freeBusy` sobre los usuarios activos guardados en `AuthUsuarios`.
6. Las reuniones existentes muestran el link de Google Meet guardado en Airtable.
7. Al ingresar a una sala de Google Meet, la extension busca la reunion por el campo `Link de meet`.
8. Desde Google Meet se puede editar informacion operativa de la reunion y guardar los cambios en Airtable.

## 🔐 Autenticacion

La autenticacion se realiza con Google OAuth.

Endpoints relacionados:

- `GET /auth/google`: inicia el flujo de login con Google.
- `GET /auth/callback`: recibe el codigo OAuth, obtiene tokens y guarda el usuario en Airtable.

Scopes configurados:

```text
openid
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/calendar
```

Luego del login, el backend guarda en `AuthUsuarios`:

- Email
- AccessToken
- RefreshToken
- ExpiryDate
- Rol
- Activo

Roles soportados actualmente:

- `Vendedora`
- `Gerente`

Si no se informa rol, se usa `Vendedora` como valor por defecto.

## 🗓️ Disponibilidad

La disponibilidad se calcula usando Google Calendar `freeBusy` sobre el calendario principal de cada usuario activo.

Endpoint:

```text
GET /api/availability?date=YYYY-MM-DD&duration=30
```

Parametros:

- `date`: fecha en formato `YYYY-MM-DD`.
- `duration`: duracion de la reunion. Valores permitidos: `15`, `30`, `60`.

Zona horaria:

```text
America/Argentina/Buenos_Aires
```

Reglas horarias actuales:

- La disponibilidad se toma desde Airtable, tabla `HorariosVendedoras`.
- Al crear una vendedora, el backend guarda automaticamente su horario por defecto: lunes a viernes de `08:00` a `12:00` y de `16:00` a `20:00`.
- Si una vendedora existente no tiene filas cargadas, el backend crea y guarda ese mismo horario personalizado por defecto.
- Los bloqueos temporales y eventos ocupados de Google Calendar se descuentan sobre ese horario guardado.

El resultado incluye horarios disponibles y usuarios disponibles para cada horario.

## 🔌 Endpoints principales

### ✅ Salud del backend

```text
GET /health
```

Respuesta esperada:

```json
{
  "ok": true
}
```

### 🔐 Autenticacion

```text
GET /auth/google
GET /auth/callback
```

### 👤 Contactos

```text
GET /api/contact/:phone
```

Busca un cliente en Airtable, tabla `Clientes`, por el campo `Telefono`.

### 📞 Reuniones por telefono

```text
GET /api/meetings/:phone
```

Busca reuniones en Airtable, tabla `Reuniones`, por el campo calculado `Telefono`.

### 🎥 Reunion por link de Meet

```text
GET /api/meetings/by-link?meetUrl=https://meet.google.com/xxx-yyyy-zzz
```

Busca una reunion en Airtable, tabla `Reuniones`, por el campo `Link de meet`.

### ✏️ Actualizar reunion

```text
PATCH /api/meetings/:id
```

Actualiza campos de una reunion existente en Airtable.

Ejemplo de body:

```json
{
  "Nombre": "Nombre del contacto",
  "ESTADO": "Realizada",
  "Notas": "Notas internas",
  "Vendedora": "FLORENCIA",
  "Fase del Momento": "FASE 1",
  "Logramos Registro?": true,
  "Fecha": "2026-05-06T15:00:00.000Z",
  "Duracion": 30,
  "Google Calendar Event ID": "event_id",
  "Origen": "API"
}
```

### Reservar reunion

```text
POST /api/book
```

Crea una reunion completa: busca vendedoras activas en `AuthUsuarios`, elige una disponible, cruza su email con `Usuarios.Correo` para resolver el nombre comercial cuando exista, crea el evento con Google Meet en su calendario, vincula/crea el cliente en `Clientes` y guarda la reunion en `Reuniones`.

Ejemplo de body:

```json
{
  "telefono": "5493777316555",
  "nombre": "Gabriel Veron",
  "email": "cliente@example.com",
  "date": "2026-05-06",
  "time": "15:00",
  "duration": 30
}
```

Respuesta esperada:

```json
{
  "meetLink": "https://meet.google.com/xxx-yyyy-zzz",
  "vendedora": "FLORENCIA",
  "assignedUser": "florencia@example.com",
  "calendarEventId": "event_id",
  "meetingRecordId": "recXXXXXXXXXXXXXX"
}
```

### 🗓️ Disponibilidad

```text
GET /api/availability?date=2026-05-06&duration=30
```

### 🧪 Debug

```text
GET /debug/reset-users
```

Desactiva usuarios activos y limpia tokens en `AuthUsuarios`. Debe usarse solo en desarrollo o tareas controladas.

## 💻 Configuracion local

### 1. 📦 Instalar dependencias del backend

```bash
cd backend
npm install
```

### 2. 🔑 Crear archivo de variables de entorno

Crear `backend/.env` con las variables necesarias. Ver la seccion "Variables de entorno".

### 3. 🚀 Iniciar backend

```bash
npm start
```

El servidor queda disponible en:

```text
http://localhost:3000
```

### 4. ✅ Verificar salud del backend

```bash
curl http://localhost:3000/health
```

### 5. 🧩 Cargar extension en Chrome

1. Abrir `chrome://extensions`.
2. Activar "Modo desarrollador".
3. Seleccionar "Cargar descomprimida".
4. Elegir la carpeta raiz del proyecto.

### 6. 🔐 Login con Google

Abrir en el navegador:

```text
http://localhost:3000/auth/google
```

Completar el flujo OAuth para guardar el usuario en Airtable.

## 🔑 Variables de entorno

Ejemplo de `backend/.env`:

```env
PORT=3000
SESSION_SECRET=change-this-local-secret

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

AIRTABLE_API_KEY=your-airtable-api-key
AIRTABLE_BASE_ID=your-airtable-base-id
```

No subir archivos `.env` al repositorio.

## 📌 Estado actual del proyecto

Funcionalidades implementadas:

- Extension de Chrome activa en Respond.io y Google Meet.
- Panel lateral en Respond.io.
- Deteccion de telefono desde la conversacion.
- Consulta de cliente por telefono.
- Consulta de reuniones por telefono.
- Consulta de disponibilidad por fecha y duracion.
- Login con Google OAuth.
- Persistencia de usuarios OAuth en Airtable `AuthUsuarios`.
- Refresco y persistencia de tokens de Google cuando corresponde.
- Busqueda de reunion por link de Google Meet.
- Actualizacion de campos de reuniones existentes en Airtable.
- Reserva de reuniones con asignacion de vendedora, evento de Google Calendar, link de Meet y guardado en Airtable.

Limitaciones actuales:

- No hay suite de tests configurada.
- El backend esta preparado para entorno local en `localhost:3000`.

## 🛠️ Proximos pasos

- Incorporar validaciones mas estrictas sobre payloads de entrada.
- Agregar tests unitarios para servicios de Airtable y calendario.
- Agregar tests de integracion para endpoints principales.
- Documentar la estructura exacta de tablas y campos de Airtable.
- Revisar configuracion de CORS antes de desplegar fuera de local.
- Definir estrategia de despliegue para backend.

## 🛡️ Seguridad

- No commitear `backend/.env` ni credenciales reales.
- Mantener `node_modules/` fuera del repositorio.
- Rotar credenciales si fueron expuestas accidentalmente.
- Usar un `SESSION_SECRET` fuerte fuera de desarrollo.
- Revisar permisos OAuth antes de publicar el sistema.
- Restringir CORS segun el dominio real si se despliega en produccion.
- Evitar exponer endpoints de debug en entornos productivos.
- Proteger tokens OAuth almacenados en Airtable con permisos adecuados.

## 📝 Notas tecnicas

- El backend usa CommonJS (`require` / `module.exports`).
- La extension consume el backend mediante `fetch`.
- La extension requiere permiso para `http://localhost:3000/*` en `manifest.json`.
- Los usuarios activos se leen desde Airtable con el filtro `{Activo}=TRUE()`.
- La disponibilidad se calcula generando slots por duracion y descartando horarios que se superponen con bloques ocupados de Calendar.
- Los clientes se consultan contra el campo `Telefono` de la tabla `Clientes`.
- Las reuniones se consultan contra el campo `Telefono` o `Link de meet`, segun el flujo.
- Las reuniones se vinculan con clientes mediante el campo `Cliente` de la tabla `Reuniones`.
- La actualizacion de reuniones usa la tabla `Reuniones` para operaciones `PATCH`.
