const axios = require('axios');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const BUSINESS_USERS_TABLE_NAME = 'Usuarios';
const VALID_ROLES = ['Vendedora', 'Gerente'];
const DEFAULT_ROLE = 'Vendedora';
const USER_COLOR_PALETTE = [
  '#2563EB',
  '#16A34A',
  '#9333EA',
  '#EA580C',
  '#DB2777',
  '#0891B2',
  '#CA8A04',
  '#4F46E5',
  '#DC2626',
  '#059669',
  '#7C3AED',
  '#0D9488'
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

function normalizeRole(role) {
  const roleValue = Array.isArray(role) ? role[0] : role;
  const normalizedRole = VALID_ROLES.find(
    (validRole) => validRole.toLowerCase() === String(roleValue || '').trim().toLowerCase()
  );

  return normalizedRole || DEFAULT_ROLE;
}

function normalizeHexColor(value) {
  const color = String(value || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toUpperCase();
  }
  return '';
}

function getFirstAvailableColor(sellers = [], { excludeRecordId = '' } = {}) {
  const usedColors = new Set(
    sellers
      .filter((seller) => seller.recordId !== excludeRecordId)
      .map((seller) => normalizeHexColor(seller.color))
      .filter(Boolean)
  );

  return USER_COLOR_PALETTE.find((color) => !usedColors.has(color)) || '';
}

function isColorUsedByAnotherSeller(sellers = [], color = '', recordId = '') {
  const normalizedColor = normalizeHexColor(color);
  if (!normalizedColor) return false;

  return sellers.some((seller) =>
    seller.recordId !== recordId &&
    normalizeHexColor(seller.color) === normalizedColor
  );
}

function mapRecordToSeller(record) {
  const fields = record.fields || {};
  return {
    recordId: record.id,
    id: fields.Id || '',
    nombre: fields.Nombre || '',
    telefono: fields.Telefono || '',
    correo: fields.Correo || '',
    color: normalizeHexColor(fields.Color),
    rol: normalizeRole(fields.Rol),
    activa: fields.Activa === true,
    puede_recibir_reuniones: fields['Puede recibir reuniones'] === true
  };
}

function hasAny(data, keys) {
  return keys.some((key) => Object.prototype.hasOwnProperty.call(data, key));
}

function getFirstValue(data, keys, fallback = '') {
  const key = keys.find((candidate) => Object.prototype.hasOwnProperty.call(data, candidate));
  return key ? data[key] : fallback;
}

function escapeFormulaValue(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

function buildSellerFields(data = {}, { partial = false } = {}) {
  const fields = {};

  if (!partial || hasAny(data, ['id', 'Id'])) {
    fields.Id = getFirstValue(data, ['id', 'Id']);
  }

  if (!partial || hasAny(data, ['nombre', 'Nombre'])) {
    fields.Nombre = getFirstValue(data, ['nombre', 'Nombre']);
  }

  if (!partial || hasAny(data, ['telefono', 'Telefono'])) {
    fields.Telefono = getFirstValue(data, ['telefono', 'Telefono']);
  }

  if (!partial || hasAny(data, ['correo', 'Correo'])) {
    fields.Correo = getFirstValue(data, ['correo', 'Correo']);
  }

  if (hasAny(data, ['color', 'Color'])) {
    fields.Color = normalizeHexColor(getFirstValue(data, ['color', 'Color']));
  }

  if (!partial || hasAny(data, ['rol', 'Rol'])) {
    fields.Rol = normalizeRole(getFirstValue(data, ['rol', 'Rol']));
  }

  if (!partial || hasAny(data, ['activa', 'Activa'])) {
    fields.Activa = getFirstValue(data, ['activa', 'Activa'], true) !== false;
  }

  if (!partial || hasAny(data, ['puede_recibir_reuniones', 'Puede recibir reuniones'])) {
    fields['Puede recibir reuniones'] = getFirstValue(
      data,
      ['puede_recibir_reuniones', 'Puede recibir reuniones'],
      true
    ) !== false;
  }

  return fields;
}

async function listSellers() {
  const response = await airtableClient.get(`/${BUSINESS_USERS_TABLE_NAME}`);
  return (response.data.records || []).map(mapRecordToSeller);
}

async function getSellerByEmail(email) {
  const formula = `{Correo}="${escapeFormulaValue(email)}"`;
  const response = await airtableClient.get(`/${BUSINESS_USERS_TABLE_NAME}`, {
    params: {
      filterByFormula: formula,
      maxRecords: 1
    }
  });

  const record = response.data.records?.[0];
  return record ? mapRecordToSeller(record) : null;
}

async function createSeller(data) {
  const fields = buildSellerFields(data);
  const response = await airtableClient.post(`/${BUSINESS_USERS_TABLE_NAME}`, {
    records: [{ fields }]
  });

  return mapRecordToSeller(response.data.records[0]);
}

async function updateSeller(recordId, data) {
  const fields = buildSellerFields(data, { partial: true });
  const response = await airtableClient.patch(`/${BUSINESS_USERS_TABLE_NAME}`, {
    records: [
      {
        id: recordId,
        fields
      }
    ]
  });

  return mapRecordToSeller(response.data.records[0]);
}

async function deactivateSeller(recordId) {
  return updateSeller(recordId, { activa: false, puede_recibir_reuniones: false });
}

module.exports = {
  USER_COLOR_PALETTE,
  createSeller,
  deactivateSeller,
  getFirstAvailableColor,
  getSellerByEmail,
  isColorUsedByAnotherSeller,
  listSellers,
  normalizeHexColor,
  updateSeller
};
