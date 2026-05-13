const express = require('express');
const {
  findOrCreateClient,
  getBusinessUserByEmail,
  getContactByPhone,
  getMeetingsByPhone,
  getMeetingByMeetLink,
  createMeeting,
  updateMeeting
} = require('../services/airtable.service');
const { listSellerBlocks } = require('../services/seller-blocks.service');
const { listSellers } = require('../services/sellers.service');
const { listWorkHours, toMinutes } = require('../services/work-hours.service');
const { getActiveUsers } = require('../services/users.service');
const {
  TIMEZONE,
  addMinutesToTime,
  buildLocalDateTime,
  createMeetEvent,
  deleteCalendarEvent,
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

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function isSlotBusy(startDateTime, endDateTime, busyTimes = []) {
  const slotStart = new Date(startDateTime);
  const slotEnd = new Date(endDateTime);

  return busyTimes.some((busyRange) => {
    const busyStart = new Date(busyRange.start);
    const busyEnd = new Date(busyRange.end);
    return slotStart < busyEnd && slotEnd > busyStart;
  });
}

function normalizeSellerName(value) {
  const sellerOptions = ['FLORENCIA', 'SILVINA', 'ITATI', 'SARITA', 'ORNELLA', 'LIZ', 'INES', 'Milbia'];
  const normalizedValue = String(value || '').toLowerCase();

  return sellerOptions.find((seller) => normalizedValue.includes(seller.toLowerCase())) || '';
}

async function getSellerNameFromUser(user) {
  try {
    const businessUser = await getBusinessUserByEmail(user.email);
    const businessUserName = businessUser?.fields?.Nombre;
    const sellerName = normalizeSellerName(businessUserName);
    if (sellerName) {
      return sellerName;
    }
  } catch (error) {
    console.error(`Error buscando usuario interno ${user.email}:`, error.response?.data || error.message);
  }

  return normalizeSellerName(String(user?.email || '').split('@')[0]);
}

async function getAssignedByName(req) {
  const email = req.authUser?.email || req.session.googleUserEmail || '';
  if (!email) return '';

  try {
    const businessUser = await getBusinessUserByEmail(email);
    const name = String(businessUser?.fields?.Nombre || '').trim();
    if (name) return name;
  } catch (error) {
    console.error(`Error buscando asignador ${email}:`, error.response?.data || error.message);
  }

  return email;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isSellerOperational(seller) {
  return seller?.activa === true &&
    seller?.puede_recibir_reuniones === true &&
    seller?.puede_crear_meets === true;
}

function isSellerBlocked(sellerRecordId, date, startDateTime, endDateTime, blocks = []) {
  return blocks.some((block) => {
    if (!block.activo || block.fecha !== date) {
      return false;
    }

    if (!Array.isArray(block.usuario) || !block.usuario.includes(sellerRecordId)) {
      return false;
    }

    if (block.todo_el_dia || !block.hora_inicio || !block.hora_fin) {
      return true;
    }

    const blockStart = buildLocalDateTime(date, block.hora_inicio);
    const blockEnd = buildLocalDateTime(date, block.hora_fin);
    return isSlotBusy(startDateTime, endDateTime, [{ start: blockStart, end: blockEnd }]);
  });
}

function getSellerBlockBusyTimes(sellerRecordId, date, blocks = []) {
  return blocks
    .filter((block) => block.activo && block.fecha === date)
    .filter((block) => Array.isArray(block.usuario) && block.usuario.includes(sellerRecordId))
    .map((block) => {
      if (block.todo_el_dia || !block.hora_inicio || !block.hora_fin) {
        return {
          start: buildLocalDateTime(date, '00:00'),
          end: buildLocalDateTime(date, '23:59')
        };
      }

      return {
        start: buildLocalDateTime(date, block.hora_inicio),
        end: buildLocalDateTime(date, block.hora_fin)
      };
    });
}

function getWorkHourRangesForSeller(sellerRecordId, workHoursBySeller = {}) {
  const entry = workHoursBySeller[sellerRecordId];
  if (!entry?.enabled) {
    return [];
  }

  return Array.isArray(entry.ranges) ? entry.ranges : [];
}

function getDayKeyForDate(date) {
  const dayIndex = new Date(buildLocalDateTime(date, '00:00')).getUTCDay();
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayIndex];
}

function getWorkHourRangesForDate(sellerRecordId, date, workHoursBySeller = {}) {
  const entry = workHoursBySeller[sellerRecordId];
  if (!entry?.enabled) return [];

  const dayKey = getDayKeyForDate(date);
  const dayConfig = entry.weekly?.[dayKey];

  if (dayConfig) {
    return dayConfig.enabled === true && Array.isArray(dayConfig.ranges) ? dayConfig.ranges : [];
  }

  return getWorkHourRangesForSeller(sellerRecordId, workHoursBySeller);
}

function isWithinCustomWorkHours(sellerRecordId, date, startDateTime, endDateTime, workHoursBySeller = {}) {
  const entry = workHoursBySeller[sellerRecordId];
  if (!entry?.enabled) return true;

  const ranges = getWorkHourRangesForDate(sellerRecordId, date, workHoursBySeller);
  if (!ranges.length) return false;

  const startMinutes = toMinutes(String(startDateTime).slice(11, 16));
  const endMinutes = toMinutes(String(endDateTime).slice(11, 16));

  return ranges.some((range) => {
    return startMinutes >= toMinutes(range.start) && endMinutes <= toMinutes(range.end);
  });
}

function getCustomWorkHourBusyTimes(sellerRecordId, date, workHoursBySeller = {}) {
  const entry = workHoursBySeller[sellerRecordId];
  if (!entry?.enabled) return [];

  const ranges = getWorkHourRangesForDate(sellerRecordId, date, workHoursBySeller);
  if (!ranges.length) {
    return [{
      start: buildLocalDateTime(date, '00:00'),
      end: buildLocalDateTime(date, '23:59')
    }];
  }

  const busyTimes = [];
  let cursor = '00:00';

  ranges.forEach((range) => {
    if (toMinutes(cursor) < toMinutes(range.start)) {
      busyTimes.push({
        start: buildLocalDateTime(date, cursor),
        end: buildLocalDateTime(date, range.start)
      });
    }
    cursor = range.end;
  });

  if (toMinutes(cursor) < toMinutes('23:59')) {
    busyTimes.push({
      start: buildLocalDateTime(date, cursor),
      end: buildLocalDateTime(date, '23:59')
    });
  }

  return busyTimes;
}

async function getOperationalSellerEntries(authUsers) {
  const sellers = await listSellers();
  const sellersByEmail = new Map(
    sellers
      .filter((seller) => seller.correo)
      .map((seller) => [normalizeEmail(seller.correo), seller])
  );

  return authUsers
    .map((user) => {
      const seller = sellersByEmail.get(normalizeEmail(user.email));
      return seller ? { user, seller } : null;
    })
    .filter(Boolean)
    .filter(({ seller }) => isSellerOperational(seller));
}

async function getEligibleSellerEntries(authUsers, { date, startDateTime, endDateTime }) {
  const blocks = await listSellerBlocks();
  const workHoursBySeller = await listWorkHours();
  const entries = await getOperationalSellerEntries(authUsers);

  return entries
    .filter(({ seller }) => !isSellerBlocked(seller.recordId, date, startDateTime, endDateTime, blocks))
    .filter(({ seller }) => isWithinCustomWorkHours(seller.recordId, date, startDateTime, endDateTime, workHoursBySeller));
}

async function findAvailableUser(entries, startDateTime, endDateTime) {
  for (const entry of entries) {
    const user = entry.user;
    try {
      const busyTimes = await getBusyTimes(user, startDateTime, endDateTime);
      if (!isSlotBusy(startDateTime, endDateTime, busyTimes)) {
        return entry;
      }
    } catch (error) {
      console.error(`Error verificando disponibilidad de ${user.email}:`, error.response?.data || error.message);
    }
  }

  return null;
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

router.post('/book', async (req, res) => {
  const { telefono, nombre, email, date, time, duration } = req.body || {};
  const parsedDuration = Number(duration);

  if (!telefono || !nombre || !email || !date || !time || !duration) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['telefono', 'nombre', 'email', 'date', 'time', 'duration']
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'email must be valid' });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be provided in YYYY-MM-DD format' });
  }

  if (!/^\d{2}:\d{2}$/.test(time)) {
    return res.status(400).json({ error: 'time must be provided in HH:mm format' });
  }

  if (![15, 30, 60].includes(parsedDuration)) {
    return res.status(400).json({ error: 'duration must be one of: 15, 30, 60' });
  }

  const endTime = addMinutesToTime(time, parsedDuration);
  const startDateTime = buildLocalDateTime(date, time);
  const endDateTime = buildLocalDateTime(date, endTime);

  if (Number.isNaN(new Date(startDateTime).getTime()) || Number.isNaN(new Date(endDateTime).getTime())) {
    return res.status(400).json({ error: 'date/time combination is invalid' });
  }

  const workingSlotExists = getAvailableSlots(date, parsedDuration, { slot_check: [] })
    .some((slot) => slot.time === time);
  if (!workingSlotExists) {
    return res.status(400).json({ error: 'Requested time is outside configured working slots' });
  }

  try {
    const activeUsers = await getActiveUsers();
    const eligibleSellers = await getEligibleSellerEntries(activeUsers, { date, startDateTime, endDateTime });
    if (!eligibleSellers.length) {
      return res.status(409).json({ error: 'No active sellers available' });
    }

    const assignedEntry = await findAvailableUser(eligibleSellers, startDateTime, endDateTime);
    if (!assignedEntry) {
      return res.status(409).json({ error: 'No users available for requested slot' });
    }

    const assignedUser = assignedEntry.user;
    const calendarEvent = await createMeetEvent(assignedUser, {
      summary: `Reunion comercial - ${nombre}`,
      description: [
        `Cliente: ${nombre}`,
        `Telefono: ${telefono}`,
        `Email: ${email}`,
        'Creado desde Extension FD.'
      ].join('\n'),
      startDateTime,
      endDateTime,
      attendees: [{ email }]
    });

    const meetLink = calendarEvent.hangoutLink || calendarEvent.conferenceData?.entryPoints?.find(
      (entryPoint) => entryPoint.entryPointType === 'video'
    )?.uri || '';

    const client = await findOrCreateClient({ telefono, nombre, email });
    const sellerName = normalizeSellerName(assignedEntry.seller.nombre) || await getSellerNameFromUser(assignedUser);
    const assignedBy = await getAssignedByName(req);
    const meetingFields = {
      Id: `${telefono}-${date}-${time}`,
      Nombre: nombre,
      'Tipo de Reunion': 'MEET',
      ESTADO: 'PENDIENTE',
      'Fase del Momento': 'FASE 1',
      'Link de meet': meetLink,
      'Logramos Registro?': false,
      Fecha: startDateTime,
      Duracion: parsedDuration,
      'Google Calendar Event ID': calendarEvent.id,
      ...(assignedBy ? { 'Asignado por': assignedBy } : {}),
      Origen: 'API',
      ...(sellerName ? { Vendedora: sellerName } : {}),
      ...(client?.id ? { Cliente: [client.id] } : {})
    };

    const meeting = await createMeeting(meetingFields);

    return res.status(201).json({
      meetLink,
      vendedora: sellerName || assignedUser.email,
      assignedUser: assignedUser.email,
      calendarEventId: calendarEvent.id,
      meetingRecordId: meeting?.id || null
    });
  } catch (error) {
    console.error('Error booking meeting:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to book meeting',
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
    const operationalSellerEntries = await getOperationalSellerEntries(loggedUsers);
    const sellerBlocks = await listSellerBlocks();
    const workHoursBySeller = await listWorkHours();
    const busyByUser = {};

    if (operationalSellerEntries.length === 0) {
      if (wantsHtml(req)) {
        return res.send(renderAvailabilityPage({
          date,
          duration: parsedDuration,
          error: 'No hay vendedoras activas y habilitadas para recibir reuniones.'
        }));
      }
      return res.json({ error: 'No active sellers enabled' });
    }

    for (const entry of operationalSellerEntries) {
      const user = entry.user;
      const seller = entry.seller;
      try {
        console.log('Procesando usuario:', user.email, '->', seller.nombre);
        const busyTimes = await getBusyTimes(user, timeMin, timeMax);
        const blockBusyTimes = getSellerBlockBusyTimes(seller.recordId, date, sellerBlocks);
        const workHourBusyTimes = getCustomWorkHourBusyTimes(seller.recordId, date, workHoursBySeller);
        busyByUser[seller.nombre || user.email] = [...busyTimes, ...blockBusyTimes, ...workHourBusyTimes];
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

router.post('/reschedule', async (req, res) => {
  const { recordId, oldCalendarEventId, oldVendedora, date, time, duration, nombre, telefono, email } = req.body || {};
  const parsedDuration = Number(duration);

  if (!recordId || !date || !time || !duration) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['recordId', 'date', 'time', 'duration']
    });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be provided in YYYY-MM-DD format' });
  }

  if (!/^\d{2}:\d{2}$/.test(time)) {
    return res.status(400).json({ error: 'time must be provided in HH:mm format' });
  }

  if (![15, 30, 60].includes(parsedDuration)) {
    return res.status(400).json({ error: 'duration must be one of: 15, 30, 60' });
  }

  const endTime = addMinutesToTime(time, parsedDuration);
  const startDateTime = buildLocalDateTime(date, time);
  const endDateTime = buildLocalDateTime(date, endTime);

  if (Number.isNaN(new Date(startDateTime).getTime()) || Number.isNaN(new Date(endDateTime).getTime())) {
    return res.status(400).json({ error: 'date/time combination is invalid' });
  }

  const workingSlotExists = getAvailableSlots(date, parsedDuration, { slot_check: [] })
    .some((slot) => slot.time === time);
  if (!workingSlotExists) {
    return res.status(400).json({ error: 'Requested time is outside configured working slots' });
  }

  try {
    const activeUsers = await getActiveUsers();
    const eligibleSellers = await getEligibleSellerEntries(activeUsers, { date, startDateTime, endDateTime });

    if (!eligibleSellers.length) {
      return res.status(409).json({ error: 'No active sellers available for the new slot' });
    }

    const assignedEntry = await findAvailableUser(eligibleSellers, startDateTime, endDateTime);
    if (!assignedEntry) {
      return res.status(409).json({ error: 'No sellers available for the requested time' });
    }

    const assignedUser = assignedEntry.user;
    const calendarEvent = await createMeetEvent(assignedUser, {
      summary: `Reunion comercial${nombre ? ` - ${nombre}` : ''}`,
      description: [
        nombre ? `Cliente: ${nombre}` : '',
        telefono ? `Telefono: ${telefono}` : '',
        email ? `Email: ${email}` : '',
        'Reprogramada desde Extension FD.'
      ].filter(Boolean).join('\n'),
      startDateTime,
      endDateTime,
      attendees: email ? [{ email }] : []
    });

    const meetLink = calendarEvent.hangoutLink ||
      calendarEvent.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video')?.uri || '';

    if (oldCalendarEventId && oldVendedora) {
      try {
        const sellers = await listSellers();
        const oldSeller = sellers.find((s) =>
          normalizeEmail(s.nombre || '') === normalizeEmail(oldVendedora) ||
          (s.nombre || '').toLowerCase().includes((oldVendedora || '').toLowerCase()) ||
          (oldVendedora || '').toLowerCase().includes((s.nombre || '').toLowerCase())
        );
        if (oldSeller?.correo) {
          const oldUser = activeUsers.find((u) => normalizeEmail(u.email) === normalizeEmail(oldSeller.correo));
          if (oldUser) {
            await deleteCalendarEvent(oldUser, oldCalendarEventId);
          }
        }
      } catch (deleteErr) {
        console.warn('No se pudo eliminar el evento anterior del calendario:', deleteErr.message);
      }
    }

    const sellerName = normalizeSellerName(assignedEntry.seller.nombre) || await getSellerNameFromUser(assignedUser);
    const assignedBy = await getAssignedByName(req);

    await updateMeeting(recordId, {
      Fecha: startDateTime,
      'Link de meet': meetLink,
      'Google Calendar Event ID': calendarEvent.id,
      ESTADO: 'PENDIENTE',
      ...(assignedBy ? { 'Asignado por': assignedBy } : {}),
      ...(sellerName ? { Vendedora: sellerName } : {})
    });

    return res.json({
      meetLink,
      vendedora: sellerName || assignedUser.email,
      calendarEventId: calendarEvent.id
    });
  } catch (error) {
    console.error('Error rescheduling meeting:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to reschedule meeting',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;
