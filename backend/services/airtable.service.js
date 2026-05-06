const axios = require('axios');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

const CONTACTS_TABLE_ID = 'tblJEqjPXzYgK0WBB';
const MEETINGS_TABLE_ID = 'tblzkdl5c5rhpGXVP';
const MEETINGS_PATCH_TABLE = 'Reuniones';

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

async function getContactByPhone(phone) {
  const formula = `{Telefono}="${escapeFormulaValue(phone)}"`;
  const response = await airtableClient.get(`/${CONTACTS_TABLE_ID}`, {
    params: {
      filterByFormula: formula
    }
  });

  return response.data.records?.[0] || null;
}

async function getMeetingsByPhone(phone) {
  const formula = `{Telefono}="${escapeFormulaValue(phone)}"`;
  const response = await airtableClient.get(`/${MEETINGS_TABLE_ID}`, {
    params: {
      filterByFormula: formula
    }
  });

  return response.data.records || [];
}

async function getMeetingByMeetLink(meetUrl) {
  const formula = `{Link de meet}="${escapeFormulaValue(meetUrl)}"`;
  const response = await airtableClient.get(`/${MEETINGS_TABLE_ID}`, {
    params: {
      filterByFormula: formula
    }
  });

  return response.data.records?.[0] || null;
}

async function updateMeeting(recordId, data) {
  const response = await airtableClient.patch(`/${MEETINGS_PATCH_TABLE}`, {
    records: [
      {
        id: recordId,
        fields: data
      }
    ]
  });

  return response.data.records?.[0] || null;
}

module.exports = {
  getContactByPhone,
  getMeetingsByPhone,
  getMeetingByMeetLink,
  updateMeeting
};
