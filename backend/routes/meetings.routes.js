const express = require('express');
const {
  findOrCreateClient,
  getBusinessUserByEmail,
  getContactByPhone,
  getMeetingsByPhone,
  getMeetingByMeetLink,
  listMeetingsByDateRange,
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

function getRequestLogContext(req) {
  return {
    requestId: req.get('x-request-id') || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method: req.method,
    path: req.originalUrl || req.url,
    userEmail: req.authUser?.email || req.session?.googleUserEmail || ''
  };
}

function getErrorLogDetails(error) {
  return {
    message: error?.message || String(error || ''),
    status: error?.response?.status || error?.status || null,
    data: error?.response?.data || null
  };
}

function logRender(level, event, req, details = {}) {
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...getRequestLogContext(req),
    ...details
  };
  const message = JSON.stringify(payload);
  if (level === 'error') {
    console.error(message);
  } else if (level === 'warn') {
    console.warn(message);
  } else {
    console.log(message);
  }
}

function logInfo(event, req, details = {}) {
  logRender('info', event, req, details);
}

function logWarn(event, req, details = {}) {
  logRender('warn', event, req, details);
}

function logError(event, req, error, details = {}) {
  logRender('error', event, req, {
    ...details,
    error: getErrorLogDetails(error)
  });
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
  return String(value || '').trim();
}

function normalizeAirtableSelectValue(value) {
  return normalizeSellerName(value).toLocaleUpperCase('es-AR');
}

function isAirtableSelectOptionError(error) {
  const details = error?.response?.data || error;
  const message = JSON.stringify(details);
  return message.includes('INVALID_MULTIPLE_CHOICE_OPTIONS') ||
    message.includes('Insufficient permissions to create new select option');
}

function markAirtableSelectOptionError(error, fieldName, fieldValue) {
  error.status = 409;
  error.publicMessage = `Airtable no tiene creada la opcion "${fieldValue}" en el campo ${fieldName}.`;
  return error;
}

function normalizeMeetingPhase(value) {
  const match = String(value || '').match(/\bfase\s*([12])\b/i);
  return match ? `FASE ${match[1]}` : '';
}

function normalizeLookupValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isManagerRoleValue(role) {
  return normalizeLookupValue(role) === 'gerente';
}

function isSellerRoleValue(role) {
  return normalizeLookupValue(role) === 'vendedora';
}

function getEntryDisplayName(entry) {
  return entry?.seller?.nombre || entry?.user?.email || '';
}

function buildAvailableSellerPayload(entry, load = {}) {
  return {
    recordId: entry.seller.recordId,
    nombre: getEntryDisplayName(entry),
    correo: entry.seller.correo || entry.user.email || '',
    color: entry.seller.color || '',
    load: {
      todayCount: load.todayCount || 0,
      weekCount: load.weekCount || 0,
      nextMeetingTime: load.nextMeetingTime || ''
    }
  };
}

function findRequestedSellerEntry(entries, { assignedSellerRecordId = '', assignedSellerName = '' } = {}) {
  const requestedRecordId = String(assignedSellerRecordId || '').trim();
  const requestedName = normalizeLookupValue(assignedSellerName);

  return entries.find((entry) => {
    if (requestedRecordId && entry.seller.recordId === requestedRecordId) return true;
    return requestedName && normalizeLookupValue(getEntryDisplayName(entry)) === requestedName;
  }) || null;
}

async function isRequestingUserManager(req) {
  const email = req.authUser?.email || req.session.googleUserEmail || '';
  if (!email) return isManagerRoleValue(req.authUser?.rol);

  try {
    const businessUser = await getBusinessUserByEmail(email);
    if (businessUser?.fields) {
      return isManagerRoleValue(businessUser.fields.Rol);
    }
  } catch (error) {
    console.error(`Error verificando rol gerente ${email}:`, error.response?.data || error.message);
  }

  return isManagerRoleValue(req.authUser?.rol);
}

function findRequestingSellerEntry(entries = [], req) {
  const email = normalizeEmail(req.authUser?.email || req.session.googleUserEmail || '');
  if (!email) return null;

  return entries.find((entry) => {
    return normalizeEmail(entry.user?.email) === email ||
      normalizeEmail(entry.seller?.correo) === email;
  }) || null;
}

function isSameSellerEntry(a, b) {
  if (!a || !b) return false;
  if (a.seller?.recordId && b.seller?.recordId && a.seller.recordId === b.seller.recordId) return true;
  const aEmail = normalizeEmail(a.user?.email || a.seller?.correo);
  const bEmail = normalizeEmail(b.user?.email || b.seller?.correo);
  return Boolean(aEmail && bEmail && aEmail === bEmail);
}

function addDaysToDateString(date, daysToAdd) {
  const baseDate = new Date(`${date}T12:00:00-03:00`);
  baseDate.setUTCDate(baseDate.getUTCDate() + daysToAdd);
  return baseDate.toISOString().slice(0, 10);
}

function getWeekBounds(date) {
  const dayIndex = new Date(buildLocalDateTime(date, '00:00')).getUTCDay();
  const daysFromMonday = (dayIndex + 6) % 7;
  const start = addDaysToDateString(date, -daysFromMonday);
  return {
    start,
    end: addDaysToDateString(start, 7)
  };
}

function getRangeBounds(date) {
  const week = getWeekBounds(date);
  return {
    dayStart: buildLocalDateTime(date, '00:00'),
    dayEnd: buildLocalDateTime(addDaysToDateString(date, 1), '00:00'),
    weekStart: buildLocalDateTime(week.start, '00:00'),
    weekEnd: buildLocalDateTime(week.end, '00:00')
  };
}

function isMeetingInRange(meetingDate, startDateTime, endDateTime) {
  const value = new Date(meetingDate).getTime();
  return !Number.isNaN(value) &&
    value >= new Date(startDateTime).getTime() &&
    value < new Date(endDateTime).getTime();
}

function isCancelledMeetingStatus(status = '') {
  const normalizedStatus = normalizeLookupValue(status);
  return normalizedStatus === 'cancelada' ||
    normalizedStatus === 'cancelado' ||
    normalizedStatus === 'canceled' ||
    normalizedStatus === 'cancelled';
}

function getMeetingDurationMinutes(fields = {}) {
  const duration = Number(fields.Duracion || fields['Duracion'] || fields['Duración'] || fields['Duracion minutos']);
  return Number.isFinite(duration) && duration > 0 ? duration : 30;
}

function getMeetingBusyRange(record) {
  const fields = record?.fields || {};
  const start = fields.Fecha;
  if (!start || isCancelledMeetingStatus(fields.ESTADO)) return null;

  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return null;

  const endDate = new Date(startDate.getTime() + (getMeetingDurationMinutes(fields) * 60 * 1000));
  return {
    start: startDate.toISOString(),
    end: endDate.toISOString()
  };
}

function meetingMatchesSeller(record, entry) {
  const sellerName = normalizeLookupValue(record?.fields?.Vendedora);
  if (!sellerName) return false;

  const names = [
    getEntryDisplayName(entry),
    entry?.seller?.nombre,
    entry?.seller?.correo,
    entry?.user?.email
  ].map(normalizeLookupValue).filter(Boolean);

  return names.some((name) => name === sellerName || name.includes(sellerName) || sellerName.includes(name));
}

function getAirtableMeetingBusyTimesForSeller(entry, meetings = [], { excludeRecordId = '' } = {}) {
  return meetings
    .filter((record) => record?.id !== excludeRecordId)
    .filter((record) => meetingMatchesSeller(record, entry))
    .map(getMeetingBusyRange)
    .filter(Boolean);
}

async function getAirtableBusyBySeller(entries = [], date, options = {}) {
  const { dayStart, dayEnd } = getRangeBounds(date);
  const meetings = await listMeetingsByDateRange(dayStart, dayEnd);

  return Object.fromEntries(entries.map((entry) => [
    entry.seller.recordId,
    getAirtableMeetingBusyTimesForSeller(entry, meetings, options)
  ]));
}

async function deleteCalendarEventSafely(user, calendarEventId) {
  if (!user || !calendarEventId) return false;
  try {
    await deleteCalendarEvent(user, calendarEventId);
    return true;
  } catch (error) {
    console.warn('No se pudo eliminar evento de Calendar durante rollback:', error.response?.data || error.message);
    return false;
  }
}

function isActiveFutureMeeting(record, { excludeRecordId = '' } = {}) {
  if (!record || record.id === excludeRecordId) return false;
  const range = getMeetingBusyRange(record);
  if (!range) return false;
  return new Date(range.end).getTime() > Date.now();
}

async function findActiveFutureMeetingForPhone(phone, options = {}) {
  const meetings = await getMeetingsByPhone(phone);
  return meetings.find((record) => isActiveFutureMeeting(record, options)) || null;
}

function buildSellerLoadMap(records = [], date) {
  const { dayStart, dayEnd } = getRangeBounds(date);
  const loadMap = new Map();

  records.forEach((record) => {
    const fields = record.fields || {};
    const sellerName = normalizeLookupValue(fields.Vendedora);
    const meetingDate = fields.Fecha;
    if (!sellerName || !meetingDate) return;

    const current = loadMap.get(sellerName) || {
      todayCount: 0,
      weekCount: 0,
      nextMeetingTime: '',
      todayMeetingTimes: []
    };

    current.weekCount += 1;
    if (isMeetingInRange(meetingDate, dayStart, dayEnd)) {
      current.todayCount += 1;
      const time = new Date(meetingDate).toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: TIMEZONE
      });
      current.todayMeetingTimes.push(time);
      current.todayMeetingTimes.sort();
      current.nextMeetingTime = current.todayMeetingTimes[0] || '';
    }

    loadMap.set(sellerName, current);
  });

  return loadMap;
}

function getSellerLoad(loadMap, entry, slotTime = '') {
  const load = loadMap.get(normalizeLookupValue(getEntryDisplayName(entry))) || {
    todayCount: 0,
    weekCount: 0,
    nextMeetingTime: '',
    todayMeetingTimes: []
  };

  if (!slotTime) {
    return load;
  }

  const nextMeetingTime = (load.todayMeetingTimes || []).find((time) => time > slotTime) || '';
  return {
    ...load,
    nextMeetingTime
  };
}

function compareSellerLoad(a, b, loadMap, slotTime = '') {
  const loadA = getSellerLoad(loadMap, a, slotTime);
  const loadB = getSellerLoad(loadMap, b, slotTime);
  const todayDiff = loadA.todayCount - loadB.todayCount;
  if (todayDiff !== 0) return todayDiff;

  const weekDiff = loadA.weekCount - loadB.weekCount;
  if (weekDiff !== 0) return weekDiff;

  if (!loadA.nextMeetingTime && loadB.nextMeetingTime) return -1;
  if (loadA.nextMeetingTime && !loadB.nextMeetingTime) return 1;
  return String(loadB.nextMeetingTime || '').localeCompare(String(loadA.nextMeetingTime || ''));
}

async function getSellerLoadMapForDate(date) {
  const { weekStart, weekEnd } = getRangeBounds(date);
  const meetings = await listMeetingsByDateRange(weekStart, weekEnd);
  return buildSellerLoadMap(meetings, date);
}

async function getSellerNameFromUser(user) {
  try {
    const businessUser = await getBusinessUserByEmail(user.email);
    const sellerName = normalizeSellerName(businessUser?.fields?.Nombre);
    if (sellerName) {
      return sellerName;
    }
  } catch (error) {
    console.error(`Error buscando usuario interno ${user.email}:`, error.response?.data || error.message);
  }

  return String(user?.email || '').split('@')[0].trim();
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
    seller?.puede_recibir_reuniones === true;
}

function isAssignableSeller(seller) {
  return isSellerOperational(seller) && isSellerRoleValue(seller?.rol);
}

function isSellerBlocked(sellerRecordId, date, startDateTime, endDateTime, blocks = []) {
  return blocks.some((block) => {
    const blockEndDate = block.fecha_fin || block.fecha;
    if (!block.activo || !block.fecha || date < block.fecha || date > blockEndDate) {
      return false;
    }

    if (!Array.isArray(block.usuario) || !block.usuario.includes(sellerRecordId)) {
      return false;
    }

    if (block.fecha_fin) {
      return true;
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
    .filter((block) => {
      const blockEndDate = block.fecha_fin || block.fecha;
      return block.activo && block.fecha && date >= block.fecha && date <= blockEndDate;
    })
    .filter((block) => Array.isArray(block.usuario) && block.usuario.includes(sellerRecordId))
    .map((block) => {
      if (block.fecha_fin || block.todo_el_dia || !block.hora_inicio || !block.hora_fin) {
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
    .filter(({ seller }) => isAssignableSeller(seller));
}

async function getEligibleSellerEntries(authUsers, { date, startDateTime, endDateTime }) {
  const blocks = await listSellerBlocks();
  const workHoursBySeller = await listWorkHours();
  const entries = await getOperationalSellerEntries(authUsers);

  return entries
    .filter(({ seller }) => !isSellerBlocked(seller.recordId, date, startDateTime, endDateTime, blocks))
    .filter(({ seller }) => isWithinCustomWorkHours(seller.recordId, date, startDateTime, endDateTime, workHoursBySeller));
}

async function findAvailableUser(entries, startDateTime, endDateTime, busyBySeller = {}) {
  for (const entry of entries) {
    const user = entry.user;
    try {
      const sellerBusyTimes = busyBySeller[entry.seller.recordId] || [];
      if (isSlotBusy(startDateTime, endDateTime, sellerBusyTimes)) {
        continue;
      }

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
    logInfo('contact.fetch.success', req, {
      telefono: req.params.phone,
      found: Boolean(contact?.id),
      contactRecordId: contact?.id || ''
    });
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
    logError('contact.fetch.error', req, error, { telefono: req.params.phone });
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
      logWarn('meeting.fetch_by_link.validation_error', req, { reason: 'missing_meet_url' });
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
    logInfo('meeting.fetch_by_link.success', req, {
      found: Boolean(meeting?.id),
      meetingRecordId: meeting?.id || '',
      meetUrl
    });
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
    logError('meeting.fetch_by_link.error', req, error, { meetUrl: req.query?.meetUrl || '' });
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
    logInfo('meeting.fetch_by_phone.success', req, {
      telefono: req.params.phone,
      meetingsCount: meetings.length,
      meetingRecordIds: meetings.map((meeting) => meeting.id).filter(Boolean)
    });
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
    logError('meeting.fetch_by_phone.error', req, error, { telefono: req.params.phone });
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
    logInfo('meeting.update.start', req, {
      meetingRecordId: req.params.id,
      fields: Object.keys(req.body || {})
    });
    const updatedMeeting = await updateMeeting(req.params.id, req.body);
    logInfo('meeting.update.success', req, {
      meetingRecordId: req.params.id,
      updatedFields: Object.keys(req.body || {})
    });
    res.json(updatedMeeting);
  } catch (error) {
    logError('meeting.update.error', req, error, {
      meetingRecordId: req.params.id,
      fields: Object.keys(req.body || {})
    });
    res.status(500).json({
      error: 'Failed to update meeting',
      details: error.response?.data || error.message
    });
  }
});

router.post('/book', async (req, res) => {
  const { telefono, nombre, email, date, time, duration, phase, assignedSellerRecordId, assignedSellerName } = req.body || {};
  const parsedDuration = Number(duration);
  const hasRequestedSeller = Boolean(String(assignedSellerRecordId || assignedSellerName || '').trim());
  const normalizedPhase = normalizeMeetingPhase(phase) || 'FASE 1';

  if (!telefono || !nombre || !email || !date || !time || !duration) {
    logWarn('meeting.book.validation_error', req, {
      reason: 'missing_required_fields',
      telefono,
      date,
      time,
      duration
    });
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['telefono', 'nombre', 'email', 'date', 'time', 'duration']
    });
  }

  if (!isValidEmail(email)) {
    logWarn('meeting.book.validation_error', req, { reason: 'invalid_email', telefono, date, time });
    return res.status(400).json({ error: 'email must be valid' });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    logWarn('meeting.book.validation_error', req, { reason: 'invalid_date', telefono, date, time });
    return res.status(400).json({ error: 'date must be provided in YYYY-MM-DD format' });
  }

  if (!/^\d{2}:\d{2}$/.test(time)) {
    logWarn('meeting.book.validation_error', req, { reason: 'invalid_time', telefono, date, time });
    return res.status(400).json({ error: 'time must be provided in HH:mm format' });
  }

  if (![15, 30, 60].includes(parsedDuration)) {
    logWarn('meeting.book.validation_error', req, { reason: 'invalid_duration', telefono, date, time, duration });
    return res.status(400).json({ error: 'duration must be one of: 15, 30, 60' });
  }

  const endTime = addMinutesToTime(time, parsedDuration);
  const startDateTime = buildLocalDateTime(date, time);
  const endDateTime = buildLocalDateTime(date, endTime);

  if (Number.isNaN(new Date(startDateTime).getTime()) || Number.isNaN(new Date(endDateTime).getTime())) {
    logWarn('meeting.book.validation_error', req, { reason: 'invalid_datetime', telefono, date, time, duration: parsedDuration });
    return res.status(400).json({ error: 'date/time combination is invalid' });
  }

  const workingSlotExists = getAvailableSlots(date, parsedDuration, { slot_check: [] })
    .some((slot) => slot.time === time);
  if (!workingSlotExists) {
    logWarn('meeting.book.rejected', req, {
      reason: 'outside_working_slots',
      telefono,
      date,
      time,
      duration: parsedDuration
    });
    return res.status(400).json({ error: 'Requested time is outside configured working slots' });
  }

  try {
    logInfo('meeting.book.start', req, {
      telefono,
      date,
      time,
      duration: parsedDuration,
      hasRequestedSeller,
      assignedSellerRecordId: assignedSellerRecordId || '',
      assignedSellerName: assignedSellerName || ''
    });

    const existingMeeting = await findActiveFutureMeetingForPhone(telefono);
    if (existingMeeting) {
      logWarn('meeting.book.rejected', req, {
        reason: 'client_active_future_meeting',
        telefono,
        date,
        time,
        existingMeetingId: existingMeeting.id
      });
      return res.status(409).json({
        error: 'Client already has an active meeting',
        message: 'Este cliente ya tiene una reunion activa o futura asignada.',
        meetingRecordId: existingMeeting.id
      });
    }

    const activeUsers = await getActiveUsers();
    const eligibleSellers = await getEligibleSellerEntries(activeUsers, { date, startDateTime, endDateTime });
    if (!eligibleSellers.length) {
      logWarn('meeting.book.rejected', req, {
        reason: 'no_active_sellers_available',
        telefono,
        date,
        time,
        activeUsersCount: activeUsers.length
      });
      return res.status(409).json({ error: 'No active sellers available' });
    }

    const sellerLoadMap = await getSellerLoadMapForDate(date);
    const canAssignSeller = await isRequestingUserManager(req);
    const requestingSellerEntry = findRequestingSellerEntry(eligibleSellers, req);
    let assignmentPool = eligibleSellers;

    if (hasRequestedSeller) {
      const requestedEntry = findRequestedSellerEntry(eligibleSellers, { assignedSellerRecordId, assignedSellerName });
      if (!requestedEntry) {
        const selectedSeller = (await listSellers()).find((seller) => {
          const requestedRecordId = String(assignedSellerRecordId || '').trim();
          const requestedName = normalizeLookupValue(assignedSellerName);
          return (requestedRecordId && seller.recordId === requestedRecordId) ||
            (requestedName && normalizeLookupValue(seller.nombre) === requestedName);
        });
        if (selectedSeller && isManagerRoleValue(selectedSeller.rol)) {
          logWarn('meeting.book.rejected', req, {
            reason: 'manager_cannot_be_assigned',
            telefono,
            date,
            time,
            assignedSellerRecordId: selectedSeller.recordId,
            assignedSellerName: selectedSeller.nombre
          });
          return res.status(409).json({
            error: 'Manager cannot be assigned meetings',
            message: 'No se puede asignar una reunion a un gerente. Selecciona una vendedora.'
          });
        }
        logWarn('meeting.book.rejected', req, {
          reason: 'requested_seller_not_eligible',
          telefono,
          date,
          time,
          assignedSellerRecordId: assignedSellerRecordId || '',
          assignedSellerName: assignedSellerName || ''
        });
        return res.status(409).json({ error: 'Selected seller is not eligible for the requested slot' });
      }

      if (!canAssignSeller && !isSameSellerEntry(requestedEntry, requestingSellerEntry)) {
        logWarn('meeting.book.rejected', req, {
          reason: 'non_manager_selected_other_seller',
          telefono,
          date,
          time,
          requestedSeller: getEntryDisplayName(requestedEntry)
        });
        return res.status(403).json({ error: 'Only managers can choose another assigned seller' });
      }

      assignmentPool = [requestedEntry];
    } else if (!canAssignSeller) {
      if (!requestingSellerEntry) {
        logWarn('meeting.book.rejected', req, {
          reason: 'requesting_seller_not_eligible',
          telefono,
          date,
          time
        });
        return res.status(409).json({
          error: 'Requesting seller is not eligible for the requested slot'
        });
      }

      assignmentPool = [requestingSellerEntry];
    } else {
      assignmentPool = [...eligibleSellers].sort((a, b) => compareSellerLoad(a, b, sellerLoadMap, time));
    }

    const airtableBusyBySeller = await getAirtableBusyBySeller(assignmentPool, date);
    const assignedEntry = await findAvailableUser(assignmentPool, startDateTime, endDateTime, airtableBusyBySeller);
    if (!assignedEntry) {
      logWarn('meeting.book.rejected', req, {
        reason: hasRequestedSeller ? 'requested_seller_unavailable' : 'no_users_available_for_slot',
        telefono,
        date,
        time,
        duration: parsedDuration,
        assignmentPool: assignmentPool.map(getEntryDisplayName)
      });
      return res.status(409).json({
        error: hasRequestedSeller
          ? 'Selected seller is not available for requested slot'
          : 'No users available for requested slot'
      });
    }

    const assignedUser = assignedEntry.user;
    const calendarEvent = await createMeetEvent(assignedUser, {
      summary: `Reunión - ${nombre}`,
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

    const sellerName = normalizeSellerName(assignedEntry.seller.nombre) || await getSellerNameFromUser(assignedUser);
    const sellerSelectName = normalizeAirtableSelectValue(sellerName);
    const assignedBy = normalizeAirtableSelectValue(await getAssignedByName(req));
    let meeting;
    try {
      const client = await findOrCreateClient({ telefono, nombre, email });
      const meetingFields = {
        Id: `${telefono}-${date}-${time}`,
        Nombre: nombre,
        'Tipo de Reunion': 'MEET',
        ESTADO: 'Pendiente',
        'Fase del Momento': normalizedPhase,
        'Link de meet': meetLink,
        'Logramos Registro?': false,
        Fecha: startDateTime,
        Duracion: parsedDuration,
        'Google Calendar Event ID': calendarEvent.id,
        ...(assignedBy ? { 'Asignado por': assignedBy } : {}),
        Origen: 'API',
        ...(sellerSelectName ? { Vendedora: sellerSelectName } : {}),
        ...(client?.id ? { Cliente: [client.id] } : {})
      };

      meeting = await createMeeting(meetingFields);
    } catch (error) {
      await deleteCalendarEventSafely(assignedUser, calendarEvent.id);
      if (isAirtableSelectOptionError(error)) {
        throw markAirtableSelectOptionError(error, 'Vendedora/Asignado por', sellerSelectName || assignedBy);
      }
      throw error;
    }

    logInfo('meeting.book.success', req, {
      telefono,
      date,
      time,
      duration: parsedDuration,
      sellerName: sellerSelectName || sellerName,
      assignedUser: assignedUser.email,
      calendarEventId: calendarEvent.id,
      meetingRecordId: meeting?.id || null
    });

    return res.status(201).json({
      meetLink,
      vendedora: sellerSelectName || sellerName || assignedUser.email,
      assignedUser: assignedUser.email,
      calendarEventId: calendarEvent.id,
      meetingRecordId: meeting?.id || null
    });
  } catch (error) {
    logError('meeting.book.error', req, error, {
      telefono,
      date,
      time,
      duration: parsedDuration
    });
    const status = error.status || 500;
    return res.status(status).json({
      error: 'Failed to book meeting',
      message: error.publicMessage || undefined,
      details: error.response?.data || error.message
    });
  }
});

router.get('/availability', async (req, res) => {
  const { date, duration } = req.query;
  const parsedDuration = Number(duration);

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    logWarn('availability.validation_error', req, { reason: 'invalid_date', date, duration });
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
    logWarn('availability.validation_error', req, { reason: 'invalid_duration', date, duration });
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
    logInfo('availability.start', req, { date, duration: parsedDuration });
    const loggedUsers = await getActiveUsers();
    logInfo('availability.auth_users_loaded', req, {
      date,
      duration: parsedDuration,
      activeUsersCount: loggedUsers.length,
      activeUsers: loggedUsers.map((user) => user.email)
    });
    if (loggedUsers.length === 0) {
      logWarn('availability.rejected', req, { reason: 'no_logged_users', date, duration: parsedDuration });
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
    const airtableBusyBySeller = await getAirtableBusyBySeller(operationalSellerEntries, date);
    const busyByUser = {};

    if (operationalSellerEntries.length === 0) {
      logWarn('availability.rejected', req, {
        reason: 'no_operational_sellers',
        date,
        duration: parsedDuration,
        activeUsersCount: loggedUsers.length
      });
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
        logInfo('availability.seller_check.start', req, {
          date,
          sellerRecordId: seller.recordId,
          sellerName: seller.nombre,
          userEmail: user.email
        });
        const busyTimes = await getBusyTimes(user, timeMin, timeMax);
        const blockBusyTimes = getSellerBlockBusyTimes(seller.recordId, date, sellerBlocks);
        const workHourBusyTimes = getCustomWorkHourBusyTimes(seller.recordId, date, workHoursBySeller);
        const workHourRanges = getWorkHourRangesForDate(seller.recordId, date, workHoursBySeller);
        const airtableBusyTimes = airtableBusyBySeller[seller.recordId] || [];
        busyByUser[seller.nombre || user.email] = [...busyTimes, ...blockBusyTimes, ...workHourBusyTimes, ...airtableBusyTimes];
        logInfo('availability.seller_check.success', req, {
          date,
          sellerRecordId: seller.recordId,
          sellerName: seller.nombre,
          userEmail: user.email,
          calendarBusyCount: busyTimes.length,
          blockBusyCount: blockBusyTimes.length,
          workHourBusyCount: workHourBusyTimes.length,
          workHourEnabled: workHoursBySeller[seller.recordId]?.enabled === true,
          workHourRanges,
          airtableBusyCount: airtableBusyTimes.length
        });
      } catch (userError) {
        logError('availability.seller_check.error', req, userError, {
          date,
          sellerRecordId: seller.recordId,
          sellerName: seller.nombre,
          userEmail: user.email
        });
      }
    }

    if (Object.keys(busyByUser).length === 0) {
      logWarn('availability.rejected', req, {
        reason: 'no_calendar_checks_completed',
        date,
        duration: parsedDuration,
        operationalSellersCount: operationalSellerEntries.length
      });
      if (wantsHtml(req)) {
        return res.send(renderAvailabilityPage({
          date,
          duration: parsedDuration,
          slots: []
        }));
      }
      return res.json([]);
    }

    const sellerLoadMap = await getSellerLoadMapForDate(date);
    const sellerByAvailabilityName = new Map(
      operationalSellerEntries.map((entry) => [getEntryDisplayName(entry), entry])
    );
    const slots = getAvailableSlots(date, parsedDuration, busyByUser).map((slot) => ({
      ...slot,
      available_sellers: (slot.available_users || [])
        .map((name) => sellerByAvailabilityName.get(name))
        .filter(Boolean)
        .sort((a, b) => compareSellerLoad(a, b, sellerLoadMap, slot.time))
        .map((entry, index) => ({
          ...buildAvailableSellerPayload(entry, getSellerLoad(sellerLoadMap, entry, slot.time)),
          recommended: index === 0
        }))
    }));

    logInfo('availability.success', req, {
      date,
      duration: parsedDuration,
      operationalSellersCount: operationalSellerEntries.length,
      checkedSellersCount: Object.keys(busyByUser).length,
      slotsCount: slots.length,
      availableSellersCount: new Set(slots.flatMap((slot) => (slot.available_sellers || []).map((seller) => seller.recordId || seller.nombre))).size
    });

    if (wantsHtml(req)) {
      return res.send(renderAvailabilityPage({
        date,
        duration: parsedDuration,
        slots
      }));
    }

    return res.json(slots);
  } catch (error) {
    logError('availability.error', req, error, { date, duration: parsedDuration });
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
    logWarn('meeting.reschedule.validation_error', req, {
      reason: 'missing_required_fields',
      recordId,
      telefono,
      date,
      time,
      duration
    });
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['recordId', 'date', 'time', 'duration']
    });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    logWarn('meeting.reschedule.validation_error', req, { reason: 'invalid_date', recordId, telefono, date, time });
    return res.status(400).json({ error: 'date must be provided in YYYY-MM-DD format' });
  }

  if (!/^\d{2}:\d{2}$/.test(time)) {
    logWarn('meeting.reschedule.validation_error', req, { reason: 'invalid_time', recordId, telefono, date, time });
    return res.status(400).json({ error: 'time must be provided in HH:mm format' });
  }

  if (![15, 30, 60].includes(parsedDuration)) {
    logWarn('meeting.reschedule.validation_error', req, { reason: 'invalid_duration', recordId, telefono, date, time, duration });
    return res.status(400).json({ error: 'duration must be one of: 15, 30, 60' });
  }

  const endTime = addMinutesToTime(time, parsedDuration);
  const startDateTime = buildLocalDateTime(date, time);
  const endDateTime = buildLocalDateTime(date, endTime);

  if (Number.isNaN(new Date(startDateTime).getTime()) || Number.isNaN(new Date(endDateTime).getTime())) {
    logWarn('meeting.reschedule.validation_error', req, {
      reason: 'invalid_datetime',
      recordId,
      telefono,
      date,
      time,
      duration: parsedDuration
    });
    return res.status(400).json({ error: 'date/time combination is invalid' });
  }

  const workingSlotExists = getAvailableSlots(date, parsedDuration, { slot_check: [] })
    .some((slot) => slot.time === time);
  if (!workingSlotExists) {
    logWarn('meeting.reschedule.rejected', req, {
      reason: 'outside_working_slots',
      recordId,
      telefono,
      date,
      time,
      duration: parsedDuration
    });
    return res.status(400).json({ error: 'Requested time is outside configured working slots' });
  }

  try {
    logInfo('meeting.reschedule.start', req, {
      recordId,
      telefono,
      date,
      time,
      duration: parsedDuration,
      oldVendedora: oldVendedora || '',
      oldCalendarEventId: oldCalendarEventId || ''
    });

    const activeUsers = await getActiveUsers();
    const eligibleSellers = await getEligibleSellerEntries(activeUsers, { date, startDateTime, endDateTime });

    if (!eligibleSellers.length) {
      logWarn('meeting.reschedule.rejected', req, {
        reason: 'no_active_sellers_available',
        recordId,
        telefono,
        date,
        time,
        activeUsersCount: activeUsers.length
      });
      return res.status(409).json({ error: 'No active sellers available for the new slot' });
    }

    const canAssignSeller = await isRequestingUserManager(req);
    const requestingSellerEntry = findRequestingSellerEntry(eligibleSellers, req);
    let assignmentPool = eligibleSellers;

    if (oldVendedora) {
      const oldSellerEntry = findRequestedSellerEntry(eligibleSellers, { assignedSellerName: oldVendedora });
      if (!oldSellerEntry) {
        const oldSeller = (await listSellers()).find((seller) => normalizeLookupValue(seller.nombre) === normalizeLookupValue(oldVendedora));
        if (oldSeller && isManagerRoleValue(oldSeller.rol)) {
          logWarn('meeting.reschedule.rejected', req, {
            reason: 'manager_cannot_be_assigned',
            recordId,
            telefono,
            date,
            time,
            oldVendedora
          });
          return res.status(409).json({
            error: 'Manager cannot be assigned meetings',
            message: 'No se puede asignar una reunion a un gerente. Selecciona una vendedora.'
          });
        }
        logWarn('meeting.reschedule.rejected', req, {
          reason: 'current_seller_not_eligible',
          recordId,
          telefono,
          date,
          time,
          oldVendedora
        });
        return res.status(409).json({ error: 'Current seller is not eligible for the requested slot' });
      }

      if (!canAssignSeller && !isSameSellerEntry(oldSellerEntry, requestingSellerEntry)) {
        logWarn('meeting.reschedule.rejected', req, {
          reason: 'non_manager_reschedule_other_seller',
          recordId,
          telefono,
          date,
          time,
          oldVendedora
        });
        return res.status(403).json({ error: 'Only managers can reschedule another seller meeting' });
      }

      assignmentPool = [oldSellerEntry];
    } else if (!canAssignSeller) {
      if (!requestingSellerEntry) {
        logWarn('meeting.reschedule.rejected', req, {
          reason: 'requesting_seller_not_eligible',
          recordId,
          telefono,
          date,
          time
        });
        return res.status(409).json({ error: 'Requesting seller is not eligible for the requested slot' });
      }

      assignmentPool = [requestingSellerEntry];
    }

    const airtableBusyBySeller = await getAirtableBusyBySeller(assignmentPool, date, { excludeRecordId: recordId });
    const assignedEntry = await findAvailableUser(assignmentPool, startDateTime, endDateTime, airtableBusyBySeller);
    if (!assignedEntry) {
      logWarn('meeting.reschedule.rejected', req, {
        reason: 'no_sellers_available_for_slot',
        recordId,
        telefono,
        date,
        time,
        duration: parsedDuration,
        assignmentPool: assignmentPool.map(getEntryDisplayName)
      });
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

    const sellerName = normalizeSellerName(assignedEntry.seller.nombre) || await getSellerNameFromUser(assignedUser);
    const sellerSelectName = normalizeAirtableSelectValue(sellerName);
    const assignedBy = normalizeAirtableSelectValue(await getAssignedByName(req));

    try {
      await updateMeeting(recordId, {
        Fecha: startDateTime,
        'Link de meet': meetLink,
        'Google Calendar Event ID': calendarEvent.id,
        ESTADO: 'Pendiente',
        ...(assignedBy ? { 'Asignado por': assignedBy } : {}),
        ...(sellerSelectName ? { Vendedora: sellerSelectName } : {})
      });
    } catch (error) {
      await deleteCalendarEventSafely(assignedUser, calendarEvent.id);
      if (isAirtableSelectOptionError(error)) {
        throw markAirtableSelectOptionError(error, 'Vendedora/Asignado por', sellerSelectName || assignedBy);
      }
      throw error;
    }

    if (oldCalendarEventId && oldVendedora) {
      try {
        const sellers = await listSellers();
        const oldSeller = sellers.find((s) =>
          normalizeLookupValue(s.nombre || '') === normalizeLookupValue(oldVendedora) ||
          normalizeLookupValue(s.nombre || '').includes(normalizeLookupValue(oldVendedora)) ||
          normalizeLookupValue(oldVendedora).includes(normalizeLookupValue(s.nombre || ''))
        );
        if (oldSeller?.correo) {
          const oldUser = activeUsers.find((u) => normalizeEmail(u.email) === normalizeEmail(oldSeller.correo));
          const deleted = await deleteCalendarEventSafely(oldUser, oldCalendarEventId);
          if (deleted) {
            logInfo('meeting.reschedule.old_calendar_deleted', req, {
              recordId,
              oldCalendarEventId,
              oldVendedora,
              oldUserEmail: oldUser?.email || ''
            });
          } else {
            logWarn('meeting.reschedule.old_calendar_delete_skipped', req, {
              reason: oldUser ? 'delete_failed' : 'old_user_not_found',
              recordId,
              oldCalendarEventId,
              oldVendedora,
              oldSellerEmail: oldSeller.correo
            });
          }
        } else {
          logWarn('meeting.reschedule.old_calendar_delete_skipped', req, {
            reason: 'old_seller_not_found',
            recordId,
            oldCalendarEventId,
            oldVendedora
          });
        }
      } catch (deleteErr) {
        logError('meeting.reschedule.old_calendar_delete_error', req, deleteErr, {
          recordId,
          oldCalendarEventId,
          oldVendedora
        });
      }
    }

    logInfo('meeting.reschedule.success', req, {
      recordId,
      telefono,
      date,
      time,
      duration: parsedDuration,
      sellerName: sellerSelectName || sellerName,
      assignedUser: assignedUser.email,
      calendarEventId: calendarEvent.id,
      oldCalendarEventId: oldCalendarEventId || ''
    });

    return res.json({
      meetLink,
      vendedora: sellerSelectName || sellerName || assignedUser.email,
      calendarEventId: calendarEvent.id
    });
  } catch (error) {
    logError('meeting.reschedule.error', req, error, {
      recordId,
      telefono,
      date,
      time,
      duration: parsedDuration
    });
    const status = error.status || 500;
    return res.status(status).json({
      error: 'Failed to reschedule meeting',
      message: error.publicMessage || undefined,
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;
