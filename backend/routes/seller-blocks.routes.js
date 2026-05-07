const express = require('express');
const {
  createSellerBlock,
  deactivateSellerBlock,
  listSellerBlocks,
  updateSellerBlock
} = require('../services/seller-blocks.service');

const router = express.Router();

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function isValidTime(value) {
  return !value || /^\d{2}:\d{2}$/.test(String(value));
}

function validateCreateBlock(body = {}) {
  const usuarioRecordId = body.usuarioRecordId || body.Usuario;
  const fecha = body.fecha || body.Fecha;
  const horaInicio = body.hora_inicio || body['Hora inicio'];
  const horaFin = body.hora_fin || body['Hora fin'];

  if (!usuarioRecordId) {
    return 'usuarioRecordId is required';
  }

  if (!fecha) {
    return 'fecha is required';
  }

  if (!isValidDate(fecha)) {
    return 'fecha must be provided in YYYY-MM-DD format';
  }

  if (!isValidTime(horaInicio) || !isValidTime(horaFin)) {
    return 'hora_inicio and hora_fin must be provided in HH:mm format';
  }

  const todoElDia = body.todo_el_dia ?? body['Todo el dia'] ?? true;
  if (todoElDia === false && (!horaInicio || !horaFin)) {
    return 'hora_inicio and hora_fin are required when todo_el_dia is false';
  }

  return '';
}

function hasEditableFields(body = {}) {
  return [
    'id',
    'Id',
    'usuarioRecordId',
    'Usuario',
    'fecha',
    'Fecha',
    'todo_el_dia',
    'Todo el dia',
    'hora_inicio',
    'Hora inicio',
    'hora_fin',
    'Hora fin',
    'motivo',
    'Motivo',
    'activo',
    'Activo'
  ].some((field) => Object.prototype.hasOwnProperty.call(body, field));
}

router.get('/seller-blocks', async (_req, res) => {
  try {
    const blocks = await listSellerBlocks();
    return res.json(blocks);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to list seller blocks',
      details: error.response?.data || error.message
    });
  }
});

router.post('/seller-blocks', async (req, res) => {
  const validationError = validateCreateBlock(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const block = await createSellerBlock(req.body);
    return res.status(201).json(block);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to create seller block',
      details: error.response?.data || error.message
    });
  }
});

router.patch('/seller-blocks/:id', async (req, res) => {
  if (!hasEditableFields(req.body)) {
    return res.status(400).json({ error: 'No editable fields provided' });
  }

  try {
    const block = await updateSellerBlock(req.params.id, req.body);
    return res.json(block);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to update seller block',
      details: error.response?.data || error.message
    });
  }
});

router.delete('/seller-blocks/:id', async (req, res) => {
  try {
    const block = await deactivateSellerBlock(req.params.id);
    return res.json({
      ok: true,
      status: 'seller_block_deactivated',
      block
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to deactivate seller block',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;
