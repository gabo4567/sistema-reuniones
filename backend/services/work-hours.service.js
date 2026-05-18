const axios = require('axios');
const { listSellers } = require('./sellers.service');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const WORK_HOURS_TABLE_NAME = process.env.WORK_HOURS_TABLE_NAME || 'HorariosVendedoras';
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_ORDER = Object.fromEntries(DAY_KEYS.map((day, index) => [day, index + 1]));

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

function toMinutes(time) {
  const [hours, minutes] = String(time || '00:00').split(':').map(Number);
  return (hours * 60) + minutes;
}

function normalizeRanges(ranges = []) {
  return ranges
    .map((range) => ({
      start: String(range.start || '').trim(),
      end: String(range.end || '').trim()
    }))
    .filter((range) => isValidTime(range.start) && isValidTime(range.end) && toMinutes(range.start) < toMinutes(range.end))
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

function getDefaultWeeklySchedule() {
  return {
    monday: { enabled: true, ranges: [{ start: '08:00', end: '20:00' }] },
    tuesday: { enabled: true, ranges: [{ start: '08:00', end: '20:00' }] },
    wednesday: { enabled: true, ranges: [{ start: '08:00', end: '20:00' }] },
    thursday: { enabled: true, ranges: [{ start: '08:00', end: '20:00' }] },
    friday: { enabled: true, ranges: [{ start: '08:00', end: '20:00' }] },
    saturday: { enabled: false, ranges: [{ start: '08:00', end: '20:00' }] },
    sunday: { enabled: false, ranges: [{ start: '08:00', end: '20:00' }] }
  };
}

function normalizeWeeklySchedule(weekly = {}, fallbackRanges = []) {
  const defaults = getDefaultWeeklySchedule();
  const hasWeekly = weekly && typeof weekly === 'object' && DAY_KEYS.some((day) => weekly[day]);
  const legacyRanges = normalizeRanges(fallbackRanges);

  return Object.fromEntries(DAY_KEYS.map((day) => {
    const source = hasWeekly
      ? (weekly[day] || {})
      : {
          enabled: legacyRanges.length > 0 ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day) : defaults[day].enabled,
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
    day: fields.Dia || '',
    enabled: fields.Activo === true,
    start: fields['Hora inicio'] || '',
    end: fields['Hora fin'] || '',
    order: Number(fields.Orden || 0),
    customEnabled: fields['Horario personalizado activo'] === true
  };
}

function buildEmptyWorkHours(sellerRecordId) {
  return {
    sellerRecordId,
    enabled: true,
    ranges: [],
    weekly: normalizeWeeklySchedule()
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
        ranges: normalizeRanges(activeRanges.length ? activeRanges : defaults[day].ranges)
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
  const hasEnabledDay = DAY_KEYS.some((day) => weekly[day]?.enabled && weekly[day]?.ranges?.length);
  return DAY_KEYS.flatMap((day) => {
    const dayConfig = weekly[day] || { enabled: false, ranges: [] };
    if (!dayConfig.enabled) {
      const defaultRange = getDefaultWeeklySchedule()[day].ranges[0] || { start: '08:00', end: '20:00' };
      return [{
        fields: {
          Usuario: [sellerRecordId],
          Dia: day,
          Activo: false,
          'Hora inicio': defaultRange.start,
          'Hora fin': defaultRange.end,
          Orden: DAY_ORDER[day] * 10,
          'Horario personalizado activo': hasEnabledDay
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
        Orden: (DAY_ORDER[day] * 10) + index,
        'Horario personalizado activo': hasEnabledDay
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
  if (!rows.length) {
    await createRows(buildRowsFromWorkHours(sellerRecordId, { weekly: normalizeWeeklySchedule() }));
    return getWorkHours(sellerRecordId);
  }

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

  const sellersWithoutRows = sellers.filter((seller) => seller.recordId && !rowsBySeller[seller.recordId]);
  for (const seller of sellersWithoutRows) {
    const weekly = normalizeWeeklySchedule();
    await createRows(buildRowsFromWorkHours(seller.recordId, { weekly }));
    rowsBySeller[seller.recordId] = buildRowsFromWorkHours(seller.recordId, { weekly })
      .map((record) => mapRecordToWorkHourRow({ id: '', fields: record.fields }));
  }

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
  getWorkHours,
  listWorkHours,
  saveWorkHours,
  normalizeWeeklySchedule,
  isValidTime,
  toMinutes
};
