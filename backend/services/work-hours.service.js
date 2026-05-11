const fs = require('fs/promises');
const path = require('path');

const STORE_DIR = path.join(__dirname, '..', 'data');
const STORE_PATH = path.join(STORE_DIR, 'work-hours.json');
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

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
    monday: { enabled: true, ranges: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
    tuesday: { enabled: true, ranges: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
    wednesday: { enabled: true, ranges: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
    thursday: { enabled: true, ranges: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
    friday: { enabled: true, ranges: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
    saturday: { enabled: false, ranges: [{ start: '08:00', end: '12:00' }] },
    sunday: { enabled: false, ranges: [] }
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
          enabled: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day) && legacyRanges.length > 0,
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

async function ensureStore() {
  await fs.mkdir(STORE_DIR, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch (_error) {
    await fs.writeFile(STORE_PATH, JSON.stringify({}, null, 2));
  }
}

async function readStore() {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, 'utf8');
  try {
    return JSON.parse(raw || '{}');
  } catch (_error) {
    return {};
  }
}

async function writeStore(store) {
  await ensureStore();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

async function getWorkHours(sellerRecordId) {
  const store = await readStore();
  const entry = store[sellerRecordId] || {};
  const weekly = normalizeWeeklySchedule(entry.weekly, entry.ranges || []);
  return {
    sellerRecordId,
    enabled: entry.enabled === true,
    ranges: normalizeRanges(entry.ranges || []),
    weekly
  };
}

async function listWorkHours() {
  const store = await readStore();
  return Object.fromEntries(
    Object.entries(store).map(([sellerRecordId, entry]) => [
      sellerRecordId,
      {
        sellerRecordId,
        enabled: entry.enabled === true,
        ranges: normalizeRanges(entry.ranges || []),
        weekly: normalizeWeeklySchedule(entry.weekly, entry.ranges || [])
      }
    ])
  );
}

async function saveWorkHours(sellerRecordId, data = {}) {
  const weekly = normalizeWeeklySchedule(data.weekly, data.ranges || []);
  const hasEnabledDay = DAY_KEYS.some((day) => weekly[day].enabled && weekly[day].ranges.length > 0);
  const enabled = data.enabled === true && hasEnabledDay;
  const store = await readStore();
  store[sellerRecordId] = { enabled, weekly };
  await writeStore(store);
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
