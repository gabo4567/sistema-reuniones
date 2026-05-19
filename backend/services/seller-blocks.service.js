const axios = require('axios');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const SELLER_BLOCKS_TABLE_NAME = 'BloqueosVendedoras';

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

function getFirstValue(data, keys, fallback = '') {
  const key = keys.find((candidate) => Object.prototype.hasOwnProperty.call(data, candidate));
  return key ? data[key] : fallback;
}

function hasAny(data, keys) {
  return keys.some((key) => Object.prototype.hasOwnProperty.call(data, key));
}

function mapRecordToSellerBlock(record) {
  const fields = record.fields || {};
  return {
    recordId: record.id,
    id: fields.Id || '',
    usuario: fields.Usuario || [],
    fecha: fields.Fecha || '',
    fecha_fin: fields['Fecha fin'] || fields['Fecha final'] || '',
    todo_el_dia: fields['Todo el dia'] === true,
    hora_inicio: fields['Hora inicio'] || '',
    hora_fin: fields['Hora fin'] || '',
    motivo: fields.Motivo || '',
    activo: fields.Activo === true
  };
}

function normalizeBlockDate(value) {
  return String(value || '').trim();
}

function normalizeBlockTime(value) {
  return String(value || '').trim();
}

function getBlockEndDate(block = {}) {
  return normalizeBlockDate(block.fecha_fin || block.fecha);
}

function sameUserBlock(block, usuarioRecordId) {
  return Array.isArray(block.usuario) && block.usuario.includes(usuarioRecordId);
}

function sameBlockWindow(block, data = {}) {
  const fecha = normalizeBlockDate(data.fecha || data.Fecha);
  const fechaFin = normalizeBlockDate(data.fecha_fin || data['Fecha fin'] || data['Fecha final'] || fecha);
  const todoElDia = getFirstValue(data, ['todo_el_dia', 'Todo el dia'], true) !== false;
  const horaInicio = normalizeBlockTime(data.hora_inicio || data['Hora inicio']);
  const horaFin = normalizeBlockTime(data.hora_fin || data['Hora fin']);

  return normalizeBlockDate(block.fecha) === fecha &&
    getBlockEndDate(block) === fechaFin &&
    block.todo_el_dia === todoElDia &&
    normalizeBlockTime(block.hora_inicio) === horaInicio &&
    normalizeBlockTime(block.hora_fin) === horaFin;
}

function buildSellerBlockFields(data = {}, { partial = false } = {}) {
  const fields = {};

  if (!partial || hasAny(data, ['id', 'Id'])) {
    fields.Id = getFirstValue(data, ['id', 'Id']);
  }

  if (!partial || hasAny(data, ['usuarioRecordId', 'Usuario'])) {
    const usuario = getFirstValue(data, ['usuarioRecordId', 'Usuario']);
    fields.Usuario = Array.isArray(usuario) ? usuario : [usuario];
  }

  if (!partial || hasAny(data, ['fecha', 'Fecha'])) {
    fields.Fecha = getFirstValue(data, ['fecha', 'Fecha']);
  }

  if (hasAny(data, ['fecha_fin', 'Fecha fin', 'Fecha final'])) {
    fields['Fecha fin'] = getFirstValue(data, ['fecha_fin', 'Fecha fin', 'Fecha final', 'fecha', 'Fecha']);
  }

  if (!partial || hasAny(data, ['todo_el_dia', 'Todo el dia'])) {
    fields['Todo el dia'] = getFirstValue(data, ['todo_el_dia', 'Todo el dia'], true) !== false;
  }

  if (!partial || hasAny(data, ['hora_inicio', 'Hora inicio'])) {
    fields['Hora inicio'] = getFirstValue(data, ['hora_inicio', 'Hora inicio']);
  }

  if (!partial || hasAny(data, ['hora_fin', 'Hora fin'])) {
    fields['Hora fin'] = getFirstValue(data, ['hora_fin', 'Hora fin']);
  }

  if (!partial || hasAny(data, ['motivo', 'Motivo'])) {
    fields.Motivo = getFirstValue(data, ['motivo', 'Motivo']);
  }

  if (!partial || hasAny(data, ['activo', 'Activo'])) {
    fields.Activo = getFirstValue(data, ['activo', 'Activo'], true) !== false;
  }

  return fields;
}

async function listSellerBlocks() {
  const response = await airtableClient.get(`/${SELLER_BLOCKS_TABLE_NAME}`);
  return (response.data.records || []).map(mapRecordToSellerBlock);
}

async function findDuplicateActiveSellerBlock(data = {}) {
  const usuarioRecordId = data.usuarioRecordId || data.Usuario;
  if (!usuarioRecordId) return null;

  const blocks = await listSellerBlocks();
  return blocks.find((block) =>
    block.activo !== false &&
    sameUserBlock(block, usuarioRecordId) &&
    sameBlockWindow(block, data)
  ) || null;
}

async function createSellerBlock(data) {
  const fields = buildSellerBlockFields(data);
  const response = await airtableClient.post(`/${SELLER_BLOCKS_TABLE_NAME}`, {
    records: [{ fields }]
  });

  return mapRecordToSellerBlock(response.data.records[0]);
}

async function updateSellerBlock(recordId, data) {
  const fields = buildSellerBlockFields(data, { partial: true });
  const response = await airtableClient.patch(`/${SELLER_BLOCKS_TABLE_NAME}`, {
    records: [
      {
        id: recordId,
        fields
      }
    ]
  });

  return mapRecordToSellerBlock(response.data.records[0]);
}

async function deactivateSellerBlock(recordId) {
  return updateSellerBlock(recordId, { activo: false });
}

module.exports = {
  createSellerBlock,
  deactivateSellerBlock,
  findDuplicateActiveSellerBlock,
  listSellerBlocks,
  updateSellerBlock
};
