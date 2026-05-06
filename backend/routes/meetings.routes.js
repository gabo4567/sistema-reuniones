const express = require('express');
const {
  getContactByPhone,
  getMeetingsByPhone,
  getMeetingByMeetLink,
  updateMeeting
} = require('../services/airtable.service');
const { getActiveUsers } = require('../services/users.service');
const {
  TIMEZONE,
  buildLocalDateTime,
  getBusyTimes,
  getAvailableSlots
} = require('../services/calendar.service');

const router = express.Router();

function wantsHtml(req) {
  const accept = req.get('accept') || '';
  return accept.includes('text/html') && !accept.includes('application/json');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderAvailabilityPage({ date, duration, slots = [], error = '' }) {
  const safeDate = escapeHtml(date || 'Sin fecha');
  const safeDuration = escapeHtml(duration || 'Sin duracion');
  const safeError = escapeHtml(error);
  const hasSlots = Array.isArray(slots) && slots.length > 0;
  const slotItems = hasSlots
    ? slots.map((slot) => {
        const users = (slot.available_users || []).map(escapeHtml).join(', ');
        return `
          <article class="slot">
            <div>
              <span class="label">Horario</span>
              <strong>${escapeHtml(slot.time)}</strong>
            </div>
            <div>
              <span class="label">Disponible</span>
              <strong>${users || 'Sin usuarios'}</strong>
            </div>
          </article>
        `;
      }).join('')
    : '';

  const stateContent = safeError
    ? `
      <section class="state state-error">
        <h2>No se pudo calcular la disponibilidad</h2>
        <p>${safeError}</p>
      </section>
    `
    : hasSlots
      ? `<section class="slots">${slotItems}</section>`
      : `
        <section class="state">
          <h2>Sin horarios disponibles para mostrar</h2>
          <p>No hay slots disponibles para esta fecha o no se pudo consultar ningun calendario activo.</p>
          <p class="hint">Si acabas de configurar OAuth, volve a iniciar sesion desde <code>/auth/google</code>.</p>
        </section>
      `;

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Disponibilidad | Extension FD Backend</title>
        <style>
          :root {
            --bg: #f4f7fb;
            --surface: #ffffff;
            --text: #172033;
            --muted: #5f6b7a;
            --border: #dfe6ef;
            --primary: #0b57d0;
            --success: #138a4a;
            --danger: #b42318;
            --danger-bg: #fff1f0;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            font-family: Arial, sans-serif;
            background: var(--bg);
            color: var(--text);
          }
          .page {
            width: min(980px, calc(100% - 32px));
            margin: 0 auto;
            padding: 34px 0;
          }
          header, .state, .slots {
            background: var(--surface);
            border: 1px solid var(--border);
            box-shadow: 0 18px 48px rgba(23, 32, 51, 0.08);
          }
          header {
            padding: 30px;
            border-radius: 18px;
          }
          .eyebrow {
            margin: 0 0 10px;
            color: var(--primary);
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
          }
          h1 {
            margin: 0;
            font-size: clamp(28px, 4vw, 42px);
            line-height: 1.1;
            letter-spacing: 0;
          }
          p {
            margin: 10px 0 0;
            color: var(--muted);
            line-height: 1.5;
          }
          .meta {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 22px;
          }
          .pill {
            padding: 8px 11px;
            border: 1px solid var(--border);
            border-radius: 999px;
            background: #f8fafc;
            color: var(--text);
            font-weight: 700;
          }
          .slots {
            display: grid;
            gap: 12px;
            margin-top: 18px;
            padding: 18px;
            border-radius: 16px;
          }
          .slot {
            display: grid;
            grid-template-columns: 160px 1fr;
            gap: 16px;
            padding: 16px;
            border: 1px solid var(--border);
            border-radius: 12px;
            background: #ffffff;
          }
          .label {
            display: block;
            margin-bottom: 5px;
            color: var(--muted);
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
          }
          .state {
            margin-top: 18px;
            padding: 26px;
            border-radius: 16px;
          }
          .state h2 {
            margin: 0;
            font-size: 22px;
          }
          .state-error {
            border-color: #ffd0cc;
            background: var(--danger-bg);
          }
          .state-error h2 {
            color: var(--danger);
          }
          code {
            padding: 3px 6px;
            border-radius: 6px;
            background: #eef3fb;
            color: var(--primary);
          }
          .actions {
            display: flex;
            gap: 12px;
            margin-top: 18px;
          }
          a {
            display: inline-flex;
            min-height: 40px;
            align-items: center;
            justify-content: center;
            padding: 0 14px;
            border-radius: 9px;
            border: 1px solid var(--border);
            color: var(--text);
            text-decoration: none;
            font-weight: 700;
            background: #ffffff;
          }
          a.primary {
            border-color: var(--primary);
            color: #ffffff;
            background: var(--primary);
          }
          @media (max-width: 680px) {
            .slot {
              grid-template-columns: 1fr;
            }
            .actions {
              flex-direction: column;
            }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <header>
            <p class="eyebrow">Extension FD Backend</p>
            <h1>Disponibilidad comercial</h1>
            <p>Consulta visual de horarios disponibles calculados con Google Calendar freeBusy.</p>
            <div class="meta">
              <span class="pill">Fecha: ${safeDate}</span>
              <span class="pill">Duracion: ${safeDuration} min</span>
              <span class="pill">Zona horaria: ${escapeHtml(TIMEZONE)}</span>
            </div>
          </header>
          ${stateContent}
          <nav class="actions" aria-label="Accesos rapidos">
            <a class="primary" href="/auth/google">Login con Google</a>
            <a href="/health">Health JSON</a>
            <a href="/">Inicio</a>
          </nav>
        </main>
      </body>
    </html>
  `;
}

function formatValue(value) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (value && typeof value === 'object') {
    return JSON.stringify(value);
  }

  if (value === true) return 'Si';
  if (value === false) return 'No';
  return value || 'Sin dato';
}

function renderFieldRows(fields = {}) {
  const entries = Object.entries(fields);

  if (!entries.length) {
    return '<div class="empty">No hay campos para mostrar.</div>';
  }

  return entries.map(([key, value]) => `
    <article class="row">
      <span class="label">${escapeHtml(key)}</span>
      <strong>${escapeHtml(formatValue(value))}</strong>
    </article>
  `).join('');
}

function getMeetingTitle(record) {
  const fields = record?.fields || {};
  return fields.Nombre || fields['Tipo de Reunion'] || fields.Telefono || record?.id || 'Reunion';
}

function renderDataPage({ title, subtitle, badge, fields = null, records = null, emptyMessage, error = '' }) {
  const hasError = Boolean(error);
  const hasRecords = Array.isArray(records);
  const recordCards = hasRecords
    ? records.map((record) => `
      <article class="card">
        <div class="card-title">${escapeHtml(getMeetingTitle(record))}</div>
        <div class="card-id">${escapeHtml(record.id || 'Sin record id')}</div>
        <div class="fields">${renderFieldRows(record.fields || {})}</div>
      </article>
    `).join('')
    : '';

  const content = hasError
    ? `
      <section class="state state-error">
        <h2>No se pudo completar la consulta</h2>
        <p>${escapeHtml(error)}</p>
      </section>
    `
    : hasRecords
      ? records.length
        ? `<section class="cards">${recordCards}</section>`
        : `
          <section class="state">
            <h2>Sin resultados</h2>
            <p>${escapeHtml(emptyMessage || 'No se encontraron registros para esta consulta.')}</p>
          </section>
        `
      : fields
        ? `<section class="fields panel">${renderFieldRows(fields)}</section>`
        : `
          <section class="state">
            <h2>Sin resultados</h2>
            <p>${escapeHtml(emptyMessage || 'No se encontro informacion para esta consulta.')}</p>
          </section>
        `;

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(title)} | Extension FD Backend</title>
        <style>
          :root {
            --bg: #f4f7fb;
            --surface: #ffffff;
            --text: #172033;
            --muted: #5f6b7a;
            --border: #dfe6ef;
            --primary: #0b57d0;
            --danger: #b42318;
            --danger-bg: #fff1f0;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            font-family: Arial, sans-serif;
            background: var(--bg);
            color: var(--text);
          }
          .page {
            width: min(1040px, calc(100% - 32px));
            margin: 0 auto;
            padding: 34px 0;
          }
          header, .panel, .card, .state {
            background: var(--surface);
            border: 1px solid var(--border);
            box-shadow: 0 18px 48px rgba(23, 32, 51, 0.08);
          }
          header {
            padding: 30px;
            border-radius: 18px;
          }
          .badge {
            display: inline-flex;
            margin-bottom: 14px;
            padding: 7px 11px;
            border-radius: 999px;
            color: var(--primary);
            background: #eef3fb;
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
          }
          h1 {
            margin: 0;
            font-size: clamp(28px, 4vw, 42px);
            line-height: 1.1;
            letter-spacing: 0;
          }
          h2, p {
            margin: 10px 0 0;
          }
          p {
            color: var(--muted);
            line-height: 1.5;
          }
          .panel, .cards, .state {
            margin-top: 18px;
          }
          .panel {
            overflow: hidden;
            border-radius: 16px;
          }
          .fields {
            display: grid;
          }
          .row {
            display: grid;
            grid-template-columns: minmax(160px, 240px) 1fr;
            gap: 16px;
            padding: 15px 18px;
            border-bottom: 1px solid var(--border);
          }
          .row:last-child {
            border-bottom: 0;
          }
          .label {
            color: var(--muted);
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
          }
          strong {
            overflow-wrap: anywhere;
          }
          .cards {
            display: grid;
            gap: 14px;
          }
          .card {
            padding: 18px;
            border-radius: 16px;
          }
          .card-title {
            font-size: 18px;
            font-weight: 800;
          }
          .card-id {
            margin-top: 5px;
            color: var(--muted);
            font-size: 13px;
          }
          .card .fields {
            margin-top: 14px;
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
          }
          .state {
            padding: 26px;
            border-radius: 16px;
          }
          .state h2 {
            margin: 0;
            font-size: 22px;
          }
          .state-error {
            border-color: #ffd0cc;
            background: var(--danger-bg);
          }
          .state-error h2 {
            color: var(--danger);
          }
          .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 18px;
          }
          a {
            display: inline-flex;
            min-height: 40px;
            align-items: center;
            justify-content: center;
            padding: 0 14px;
            border-radius: 9px;
            border: 1px solid var(--border);
            color: var(--text);
            text-decoration: none;
            font-weight: 700;
            background: #ffffff;
          }
          a.primary {
            border-color: var(--primary);
            color: #ffffff;
            background: var(--primary);
          }
          .empty {
            padding: 18px;
            color: var(--muted);
          }
          @media (max-width: 680px) {
            .row {
              grid-template-columns: 1fr;
              gap: 6px;
            }
            .actions {
              flex-direction: column;
            }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <header>
            <div class="badge">${escapeHtml(badge || 'Consulta')}</div>
            <h1>${escapeHtml(title)}</h1>
            <p>${escapeHtml(subtitle || '')}</p>
          </header>
          ${content}
          <nav class="actions" aria-label="Accesos rapidos">
            <a class="primary" href="/">Inicio</a>
            <a href="/health">Health JSON</a>
            <a href="/auth/google">Login con Google</a>
          </nav>
        </main>
      </body>
    </html>
  `;
}

router.get('/contact/:phone', async (req, res) => {
  try {
    const contact = await getContactByPhone(req.params.phone);
    if (wantsHtml(req)) {
      return res.send(renderDataPage({
        title: 'Ficha de contacto',
        subtitle: `Consulta de Airtable para el telefono ${req.params.phone}.`,
        badge: 'Contactos',
        fields: contact?.fields || null,
        emptyMessage: 'No se encontro un contacto con ese telefono.'
      }));
    }
    res.json(contact?.fields || null);
  } catch (error) {
    if (wantsHtml(req)) {
      return res.status(500).send(renderDataPage({
        title: 'Ficha de contacto',
        subtitle: `Consulta de Airtable para el telefono ${req.params.phone}.`,
        badge: 'Contactos',
        error: 'Ocurrio un error al consultar el contacto.'
      }));
    }
    res.status(500).json({
      error: 'Failed to fetch contact',
      details: error.response?.data || error.message
    });
  }
});

router.get('/meetings/by-link', async (req, res) => {
  try {
    const { meetUrl } = req.query;

    if (!meetUrl) {
      if (wantsHtml(req)) {
        return res.status(400).send(renderDataPage({
          title: 'Reunion por link de Meet',
          subtitle: 'Consulta una reunion usando el parametro meetUrl.',
          badge: 'Reuniones',
          error: 'Falta el parametro meetUrl.'
        }));
      }
      return res.status(400).json({ error: 'meetUrl is required' });
    }

    const meeting = await getMeetingByMeetLink(meetUrl);
    if (wantsHtml(req)) {
      return res.send(renderDataPage({
        title: 'Reunion por link de Meet',
        subtitle: `Consulta de Airtable para ${meetUrl}.`,
        badge: 'Reuniones',
        fields: meeting?.fields || null,
        emptyMessage: 'No se encontro una reunion asociada a ese link de Meet.'
      }));
    }
    return res.json(meeting);
  } catch (error) {
    if (wantsHtml(req)) {
      return res.status(500).send(renderDataPage({
        title: 'Reunion por link de Meet',
        subtitle: 'Consulta de Airtable por link de Google Meet.',
        badge: 'Reuniones',
        error: 'Ocurrio un error al consultar la reunion.'
      }));
    }
    return res.status(500).json({
      error: 'Failed to fetch meeting by link',
      details: error.response?.data || error.message
    });
  }
});

router.get('/meetings/:phone', async (req, res) => {
  try {
    const meetings = await getMeetingsByPhone(req.params.phone);
    if (wantsHtml(req)) {
      return res.send(renderDataPage({
        title: 'Reuniones del contacto',
        subtitle: `Listado de reuniones para el telefono ${req.params.phone}.`,
        badge: 'Reuniones',
        records: meetings,
        emptyMessage: 'No se encontraron reuniones para ese telefono.'
      }));
    }
    res.json(meetings);
  } catch (error) {
    if (wantsHtml(req)) {
      return res.status(500).send(renderDataPage({
        title: 'Reuniones del contacto',
        subtitle: `Listado de reuniones para el telefono ${req.params.phone}.`,
        badge: 'Reuniones',
        error: 'Ocurrio un error al consultar reuniones.'
      }));
    }
    res.status(500).json({
      error: 'Failed to fetch meetings',
      details: error.response?.data || error.message
    });
  }
});

router.patch('/meetings/:id', async (req, res) => {
  try {
    const updatedMeeting = await updateMeeting(req.params.id, req.body);
    res.json(updatedMeeting);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update meeting',
      details: error.response?.data || error.message
    });
  }
});

router.get('/availability', async (req, res) => {
  const { date, duration } = req.query;
  const parsedDuration = Number(duration);

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    if (wantsHtml(req)) {
      return res.status(400).send(renderAvailabilityPage({
        date,
        duration,
        error: 'La fecha debe enviarse en formato YYYY-MM-DD.'
      }));
    }
    return res.status(400).json({ error: 'date must be provided in YYYY-MM-DD format' });
  }

  if (![15, 30, 60].includes(parsedDuration)) {
    if (wantsHtml(req)) {
      return res.status(400).send(renderAvailabilityPage({
        date,
        duration,
        error: 'La duracion debe ser 15, 30 o 60 minutos.'
      }));
    }
    return res.status(400).json({ error: 'duration must be one of: 15, 30, 60' });
  }

  try {
    const loggedUsers = await getActiveUsers();
    console.log('Usuarios cargados desde Airtable:', loggedUsers.map((user) => user.email));
    if (loggedUsers.length === 0) {
      if (wantsHtml(req)) {
        return res.send(renderAvailabilityPage({
          date,
          duration: parsedDuration,
          error: 'No hay usuarios activos conectados. Inicia sesion con Google para consultar disponibilidad.'
        }));
      }
      return res.json({ error: 'No users logged in' });
    }

    const timeMin = buildLocalDateTime(date, '00:00');
    const timeMax = buildLocalDateTime(date, '23:59');
    const busyByUser = {};

    for (const user of loggedUsers) {
      try {
        console.log('Procesando usuario:', user.email);
        const busyTimes = await getBusyTimes(user, timeMin, timeMax);
        busyByUser[user.email] = busyTimes;
      } catch (userError) {
        console.error(`Error procesando usuario ${user.email}:`, userError.response?.data || userError.message);
      }
    }

    if (Object.keys(busyByUser).length === 0) {
      if (wantsHtml(req)) {
        return res.send(renderAvailabilityPage({
          date,
          duration: parsedDuration,
          slots: []
        }));
      }
      return res.json([]);
    }

    const slots = getAvailableSlots(date, parsedDuration, busyByUser);

    if (wantsHtml(req)) {
      return res.send(renderAvailabilityPage({
        date,
        duration: parsedDuration,
        slots
      }));
    }

    return res.json(slots);
  } catch (error) {
    if (wantsHtml(req)) {
      return res.status(500).send(renderAvailabilityPage({
        date,
        duration: parsedDuration,
        error: 'Ocurrio un error al calcular la disponibilidad.'
      }));
    }
    return res.status(500).json({
      error: 'Failed to compute availability',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;
