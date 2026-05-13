const axios = require('axios');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

const CLIENTS_TABLE_NAME = 'Clientes';
const BUSINESS_USERS_TABLE_NAME = 'Usuarios';
const MEETINGS_TABLE_NAME = 'Reuniones';

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

function escapeFormulaValue(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

function normalizeMeetingFields(fields = {}) {
  const normalizedFields = { ...fields };

  if (Object.prototype.hasOwnProperty.call(normalizedFields, 'Usuarios')) {
    if (!Object.prototype.hasOwnProperty.call(normalizedFields, 'Cliente')) {
      normalizedFields.Cliente = normalizedFields.Usuarios;
    }
    delete normalizedFields.Usuarios;
  }

  return normalizedFields;
}

async function getContactByPhone(phone) {
  const formula = `{Telefono}="${escapeFormulaValue(phone)}"`;
  const response = await airtableClient.get(`/${CLIENTS_TABLE_NAME}`, {
    params: {
      filterByFormula: formula
    }
  });

  return response.data.records?.[0] || null;
}

async function createClient({ telefono, nombre, email }) {
  const response = await airtableClient.post(`/${CLIENTS_TABLE_NAME}`, {
    records: [
      {
        fields: {
          Id: String(telefono),
          Nombre: nombre || '',
          Telefono: String(telefono),
          Correo: email || ''
        }
      }
    ]
  });

  return response.data.records?.[0] || null;
}

async function findOrCreateClient({ telefono, nombre, email }) {
  const existingClient = await getContactByPhone(telefono);
  if (existingClient) {
    return existingClient;
  }

  return createClient({ telefono, nombre, email });
}

async function getBusinessUserByEmail(email) {
  const formula = `{Correo}="${escapeFormulaValue(email)}"`;
  const response = await airtableClient.get(`/${BUSINESS_USERS_TABLE_NAME}`, {
    params: {
      filterByFormula: formula,
      maxRecords: 1
    }
  });

  return response.data.records?.[0] || null;
}

async function getBusinessUsers() {
  const response = await airtableClient.get(`/${BUSINESS_USERS_TABLE_NAME}`);
  return response.data.records || [];
}

function normalizeLookupValue(value) {
  return String(value || '').trim().toLowerCase();
}

function getUserColorByName(records = [], name = '') {
  const normalizedName = normalizeLookupValue(name);
  if (!normalizedName) return '';

  const record = records.find((candidate) => {
    const candidateName = normalizeLookupValue(candidate.fields?.Nombre);
    return candidateName === normalizedName ||
      candidateName.includes(normalizedName) ||
      normalizedName.includes(candidateName);
  });

  return record?.fields?.Color || '';
}

async function enrichMeetingsWithUserColors(records = []) {
  if (!records.length) return records;

  try {
    const users = await getBusinessUsers();
    return records.map((record) => ({
      ...record,
      fields: {
        ...(record.fields || {}),
        'Vendedora Color': getUserColorByName(users, record.fields?.Vendedora),
        'Asignado por Color': getUserColorByName(users, record.fields?.['Asignado por'])
      }
    }));
  } catch (error) {
    console.error('Error enriqueciendo reuniones con colores de usuario:', error.response?.data || error.message);
    return records;
  }
}

async function getMeetingsByPhone(phone) {
  const formula = `{Telefono}="${escapeFormulaValue(phone)}"`;
  const response = await airtableClient.get(`/${MEETINGS_TABLE_NAME}`, {
    params: {
      filterByFormula: formula,
      sort: [{ field: 'Fecha', direction: 'desc' }]
    }
  });

  return enrichMeetingsWithUserColors(response.data.records || []);
}

async function getMeetingByMeetLink(meetUrl) {
  const formula = `{Link de meet}="${escapeFormulaValue(meetUrl)}"`;
  const response = await airtableClient.get(`/${MEETINGS_TABLE_NAME}`, {
    params: {
      filterByFormula: formula
    }
  });

  return response.data.records?.[0] || null;
}

async function updateMeeting(recordId, data) {
  const response = await airtableClient.patch(`/${MEETINGS_TABLE_NAME}`, {
    records: [
      {
        id: recordId,
        fields: normalizeMeetingFields(data)
      }
    ]
  });

  return response.data.records?.[0] || null;
}

async function createMeeting(data) {
  const response = await airtableClient.post(`/${MEETINGS_TABLE_NAME}`, {
    records: [
      {
        fields: normalizeMeetingFields(data)
      }
    ]
  });

  return response.data.records?.[0] || null;
}

module.exports = {
  findOrCreateClient,
  getBusinessUserByEmail,
  getContactByPhone,
  getMeetingsByPhone,
  getMeetingByMeetLink,
  createMeeting,
  updateMeeting
};
