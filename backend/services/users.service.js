const axios = require('axios');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AUTH_USERS_TABLE_NAME = 'AuthUsuarios';
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

function escapeFormulaValue(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

function parseExpiryDate(value) {
  if (!value) return null;

  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    return numericValue;
  }

  const parsedDate = new Date(value);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.getTime();
  }

  return null;
}

function formatExpiryDateForAirtable(value) {
  const expiryDate = parseExpiryDate(value);
  return expiryDate ? new Date(expiryDate).toISOString() : null;
}

function mapRecordToUser(record) {
  const fields = record.fields || {};
  return {
    recordId: record.id,
    email: fields.Email || '',
    access_token: fields.AccessToken || '',
    refresh_token: fields.RefreshToken || '',
    expiry_date: parseExpiryDate(fields.ExpiryDate),
    rol: normalizeRole(fields.Rol),
    activo: fields.Activo === true
  };
}

function normalizeRole(role) {
  const roleValue = Array.isArray(role) ? role[0] : role;
  const normalizedRole = VALID_ROLES.find(
    (validRole) => validRole.toLowerCase() === String(roleValue || '').toLowerCase()
  );

  return normalizedRole || DEFAULT_ROLE;
}

function mapRoleToAirtable(role) {
  return [normalizeRole(role)];
}

function buildUserPayload(userData) {
  return {
    email: userData.email,
    access_token: userData.access_token || '',
    refresh_token: userData.refresh_token || '',
    expiry_date: parseExpiryDate(userData.expiry_date),
    rol: normalizeRole(userData.rol),
    activo: userData.activo !== false
  };
}

function logAirtableError(context, error) {
  console.error('Airtable error while saving user:', {
    context,
    message: error.message,
    status: error.response?.status,
    statusText: error.response?.statusText,
    data: error.response?.data,
    headers: error.response?.headers
  });
}

async function findUserRecordByEmail(email) {
  const formula = `{Email}="${escapeFormulaValue(email)}"`;
  const response = await airtableClient.get(`/${AUTH_USERS_TABLE_NAME}`, {
    params: {
      filterByFormula: formula,
      maxRecords: 1
    }
  });

  return response.data.records?.[0] || null;
}

async function saveUser(userData) {
  const user = buildUserPayload(userData);
  const baseFields = {
    Email: user.email,
    AccessToken: user.access_token,
    RefreshToken: user.refresh_token,
    ExpiryDate: formatExpiryDateForAirtable(user.expiry_date),
    Activo: user.activo
  };
  const createFields = {
    ...baseFields,
    Rol: mapRoleToAirtable(user.rol)
  };

  try {
    const existingRecord = await findUserRecordByEmail(user.email);
    const response = existingRecord
      ? await airtableClient.patch(`/${AUTH_USERS_TABLE_NAME}`, {
          records: [
            {
              id: existingRecord.id,
              fields: baseFields
            }
          ]
        })
      : await airtableClient.post(`/${AUTH_USERS_TABLE_NAME}`, {
          records: [
            {
              fields: createFields
            }
          ]
        });

    const savedUser = mapRecordToUser(response.data.records[0]);
    console.log('User saved successfully', {
      email: savedUser.email,
      rol: savedUser.rol,
      recordId: savedUser.recordId
    });

    return savedUser;
  } catch (error) {
    logAirtableError('saveUser', error);
    return user;
  }
}

async function getActiveUsers() {
  const formula = `{Activo}=TRUE()`;
  const response = await airtableClient.get(`/${AUTH_USERS_TABLE_NAME}`, {
    params: {
      filterByFormula: formula
    }
  });

  return (response.data.records || []).map(mapRecordToUser);
}

async function listAuthUsers() {
  const records = [];
  let offset = '';

  do {
    const response = await airtableClient.get(`/${AUTH_USERS_TABLE_NAME}`, {
      params: {
        ...(offset ? { offset } : {})
      }
    });

    records.push(...(response.data.records || []));
    offset = response.data.offset || '';
  } while (offset);

  return records.map(mapRecordToUser);
}

async function getAuthUserByEmail(email) {
  const record = await findUserRecordByEmail(email);
  return record ? mapRecordToUser(record) : null;
}

async function resetUsers() {
  const activeUsers = await getActiveUsers();

  if (!activeUsers.length) {
    return [];
  }

  const records = activeUsers.map((user) => ({
    id: user.recordId,
    fields: {
      AccessToken: '',
      RefreshToken: '',
      ExpiryDate: null,
      Activo: false
    }
  }));

  const response = await airtableClient.patch(`/${AUTH_USERS_TABLE_NAME}`, { records });
  return (response.data.records || []).map(mapRecordToUser);
}

module.exports = {
  saveUser,
  getAuthUserByEmail,
  getActiveUsers,
  listAuthUsers,
  resetUsers,
  normalizeRole
};
