const axios = require('axios');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const BUSINESS_USERS_TABLE_NAME = 'Usuarios';
const VALID_ROLES = ['Vendedora', 'Gerente'];
const DEFAULT_ROLE = 'Vendedora';

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

function mapRecordToSeller(record) {
  const fields = record.fields || {};
  return {
    recordId: record.id,
    id: fields.Id || '',
    nombre: fields.Nombre || '',
    telefono: fields.Telefono || '',
    correo: fields.Correo || '',
    color: fields.Color || '',
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
  createSeller,
  deactivateSeller,
  getSellerByEmail,
  listSellers,
  updateSeller
};
