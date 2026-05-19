const axios = require('axios');
const { listSellers } = require('./sellers.service');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const WORK_HOURS_TABLE_NAME = process.env.WORK_HOURS_TABLE_NAME || 'HorariosVendedoras';
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_ORDER = Object.fromEntries(DAY_KEYS.map((day, index) => [day, index + 1]));
const DEFAULT_WORK_HOUR_RANGES = [
  { start: '08:00', end: '12:00' },
  { start: '16:00', end: '20:00' }
];

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  throw new Error('Missing Airtable configuration. Check AIRTABLE_API_KEY and AIRTABLE_BASE_ID.');
}

const airtableClient = axios.create({
  baseURL: `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`,
  headers: {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

function isValidTime(value) {
  return /^\d{2}:\d{2}$/.test(String(value || ''));
}

function normalizeTimeValue(value) {
  const rawValue = String(value || '').trim();
  const match = rawValue.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match) {
    return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
  }

  return rawValue;
}

function normalizeTextKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeDayKey(value) {
  const normalizedDay = normalizeTextKey(value);
  const dayAliases = {
    monday: 'monday',
    lunes: 'monday',
    tuesday: 'tuesday',
    martes: 'tuesday',
    wednesday: 'wednesday',
    miercoles: 'wednesday',
    thursday: 'thursday',
    jueves: 'thursday',
    friday: 'friday',
    viernes: 'friday',
    saturday: 'saturday',
    sabado: 'saturday',
    sunday: 'sunday',
    domingo: 'sunday'
  };

  return dayAliases[normalizedDay] || normalizedDay;
}

function toMinutes(time) {
  const [hours, minutes] = String(time || '00:00').split(':').map(Number);
  return (hours * 60) + minutes;
}

function normalizeRanges(ranges = []) {
  return ranges
    .map((range) => ({
      start: normalizeTimeValue(range.start),
      end: normalizeTimeValue(range.end)
    }))
    .filter((range) => isValidTime(range.start) && isValidTime(range.end) && toMinutes(range.start) < toMinutes(range.end))
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

function getDefaultWorkHourRanges() {
  return DEFAULT_WORK_HOUR_RANGES.map((range) => ({ ...range }));
}

function getDefaultWeeklySchedule() {
  return {
    monday: { enabled: true, ranges: getDefaultWorkHourRanges() },
    tuesday: { enabled: true, ranges: getDefaultWorkHourRanges() },
    wednesday: { enabled: true, ranges: getDefaultWorkHourRanges() },
    thursday: { enabled: true, ranges: getDefaultWorkHourRanges() },
    friday: { enabled: true, ranges: getDefaultWorkHourRanges() },
    saturday: { enabled: true, ranges: getDefaultWorkHourRanges() },
    sunday: { enabled: true, ranges: getDefaultWorkHourRanges() }
  };
}

function normalizeWeeklySchedule(weekly = {}, fallbackRanges = []) {
  const defaults = getDefaultWeeklySchedule();
  const normalizedWeekly = weekly && typeof weekly === 'object'
    ? Object.entries(weekly).reduce((acc, [day, config]) => {
        acc[normalizeDayKey(day)] = config;
        return acc;
      }, {})
    : {};
  const hasWeekly = DAY_KEYS.some((day) => normalizedWeekly[day]);
  const legacyRanges = normalizeRanges(fallbackRanges);

  return Object.fromEntries(DAY_KEYS.map((day) => {
    const source = hasWeekly
      ? (normalizedWeekly[day] || {})
      : {
          enabled: legacyRanges.length > 0 ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day) : false,
          ranges: legacyRanges.length ? legacyRanges : defaults[day].ranges
        };
    const ranges = normalizeRanges(source.ranges || defaults[day].ranges);

    return [
      day,
      {
        enabled: source.enabled === true && ranges.length > 0,
        ranges
      }
    ];
  }));
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function getLinkedSellerRecordIds(fields = {}) {
  return Array.isArray(fields.Usuario) ? fields.Usuario : [];
}

function mapRecordToWorkHourRow(record) {
  const fields = record.fields || {};
  return {
    recordId: record.id,
    sellerRecordIds: getLinkedSellerRecordIds(fields),
    day: normalizeDayKey(fields.Dia),
    enabled: fields.Activo === true,
    start: normalizeTimeValue(fields['Hora inicio']),
    end: normalizeTimeValue(fields['Hora fin']),
    order: Number(fields.Orden || 0)
  };
}

function buildEmptyWorkHours(sellerRecordId) {
  const weekly = getDefaultWeeklySchedule();
  return {
    sellerRecordId,
    enabled: true,
    ranges: [],
    weekly
  };
}

function buildWorkHoursFromRows(sellerRecordId, rows = []) {
  if (!rows.length) {
    return buildEmptyWorkHours(sellerRecordId);
  }

  const defaults = getDefaultWeeklySchedule();
  const weekly = Object.fromEntries(DAY_KEYS.map((day) => {
    const dayRows = rows
      .filter((row) => row.day === day)
      .sort((a, b) => a.order - b.order);
    const activeRanges = dayRows
      .filter((row) => row.enabled)
      .map((row) => ({ start: row.start, end: row.end }));

    return [
      day,
      {
        enabled: dayRows.some((row) => row.enabled) && normalizeRanges(activeRanges).length > 0,
        ranges: normalizeRanges(activeRanges)
      }
    ];
  }));

  return {
    sellerRecordId,
    enabled: DAY_KEYS.some((day) => weekly[day].enabled),
    ranges: [],
    weekly
  };
}

function buildRowsFromWorkHours(sellerRecordId, { weekly }) {
  return DAY_KEYS.flatMap((day) => {
    const dayConfig = weekly[day] || { enabled: false, ranges: [] };
    if (!dayConfig.enabled) {
      return [{
        fields: {
          Usuario: [sellerRecordId],
          Dia: day,
          Activo: false,
          'Hora inicio': '00:00',
          'Hora fin': '00:00',
          Orden: DAY_ORDER[day] * 10
        }
      }];
    }

    return dayConfig.ranges.map((range, index) => ({
      fields: {
        Usuario: [sellerRecordId],
        Dia: day,
        Activo: true,
        'Hora inicio': range.start,
        'Hora fin': range.end,
        Orden: (DAY_ORDER[day] * 10) + index
      }
    }));
  });
}

async function listRawWorkHourRows() {
  const records = [];
  let offset = '';

  do {
    const response = await airtableClient.get(`/${WORK_HOURS_TABLE_NAME}`, {
      params: {
        ...(offset ? { offset } : {}),
        sort: [
          { field: 'Dia', direction: 'asc' },
          { field: 'Orden', direction: 'asc' }
        ]
      }
    });

    records.push(...(response.data.records || []));
    offset = response.data.offset || '';
  } while (offset);

  return records.map(mapRecordToWorkHourRow);
}

async function listRowsForSeller(sellerRecordId) {
  const rows = await listRawWorkHourRows();
  return rows.filter((row) => row.sellerRecordIds.includes(sellerRecordId));
}

async function deleteRows(recordIds = []) {
  for (const batch of chunk(recordIds, 10)) {
    const params = new URLSearchParams();
    batch.forEach((recordId) => params.append('records[]', recordId));

    await airtableClient.delete(`/${WORK_HOURS_TABLE_NAME}`, {
      params
    });
  }
}

async function createRows(rows = []) {
  for (const batch of chunk(rows, 10)) {
    await airtableClient.post(`/${WORK_HOURS_TABLE_NAME}`, {
      records: batch
    });
  }
}

async function getWorkHours(sellerRecordId) {
  const rows = await listRowsForSeller(sellerRecordId);
  return buildWorkHoursFromRows(sellerRecordId, rows);
}

async function listWorkHours() {
  const sellers = await listSellers();
  const rows = await listRawWorkHourRows();
  const rowsBySeller = rows.reduce((acc, row) => {
    row.sellerRecordIds.forEach((sellerRecordId) => {
      if (!acc[sellerRecordId]) acc[sellerRecordId] = [];
      acc[sellerRecordId].push(row);
    });
    return acc;
  }, {});

  return Object.fromEntries(
    sellers
      .filter((seller) => seller.recordId)
      .map((seller) => [
        seller.recordId,
        buildWorkHoursFromRows(seller.recordId, rowsBySeller[seller.recordId] || [])
      ])
  );
}

async function saveWorkHours(sellerRecordId, data = {}) {
  const weekly = normalizeWeeklySchedule(data.weekly, data.ranges || []);
  const existingRows = await listRowsForSeller(sellerRecordId);
  const nextRows = buildRowsFromWorkHours(sellerRecordId, { weekly });

  await deleteRows(existingRows.map((row) => row.recordId));
  await createRows(nextRows);

  return getWorkHours(sellerRecordId);
}

module.exports = {
  DAY_KEYS,
  getDefaultWeeklySchedule,
  getWorkHours,
  listWorkHours,
  saveWorkHours,
  normalizeWeeklySchedule,
  isValidTime,
  toMinutes
};
