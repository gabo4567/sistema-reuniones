const express = require('express');
const {
  createSellerBlock,
  deactivateSellerBlock,
  listSellerBlocks,
  updateSellerBlock
} = require('../services/seller-blocks.service');
const { listSellers } = require('../services/sellers.service');

const router = express.Router();

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isManagerRole(role) {
  const roleValue = Array.isArray(role) ? role[0] : role;
  return String(roleValue || '').trim().toLowerCase() === 'gerente';
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function validateCreateBlock(body = {}) {
  const usuarioRecordId = body.usuarioRecordId || body.Usuario;
  const fecha = body.fecha || body.Fecha;
  const fechaFin = body.fecha_fin || body['Fecha fin'] || body['Fecha final'] || fecha;

  if (!usuarioRecordId) {
    return 'usuarioRecordId is required';
  }

  if (!fecha) {
    return 'fecha is required';
  }

  if (!isValidDate(fecha)) {
    return 'fecha must be provided in YYYY-MM-DD format';
  }

  if (!isValidDate(fechaFin)) {
    return 'fecha_fin must be provided in YYYY-MM-DD format';
  }

  if (fechaFin < fecha) {
    return 'fecha_fin must be same day or later than fecha';
  }

  return '';
}

function validateUpdateBlock(body = {}) {
  const fecha = body.fecha || body.Fecha;
  const fechaFin = body.fecha_fin || body['Fecha fin'] || body['Fecha final'];

  if (fecha && !isValidDate(fecha)) {
    return 'fecha must be provided in YYYY-MM-DD format';
  }

  if (fechaFin && !isValidDate(fechaFin)) {
    return 'fecha_fin must be provided in YYYY-MM-DD format';
  }

  if (fecha && fechaFin && fechaFin < fecha) {
    return 'fecha_fin must be same day or later than fecha';
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
    'fecha_fin',
    'Fecha fin',
    'Fecha final',
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

router.get('/seller-blocks', async (req, res) => {
  try {
    const [blocks, sellers] = await Promise.all([
      listSellerBlocks(),
      listSellers()
    ]);

    if (isManagerRole(req.authUser?.rol)) {
      return res.json(blocks);
    }

    const currentSeller = sellers.find((seller) => normalizeEmail(seller.correo) === normalizeEmail(req.authUser?.email));
    if (!currentSeller?.recordId) {
      return res.json([]);
    }

    return res.json(blocks.filter((block) => Array.isArray(block.usuario) && block.usuario.includes(currentSeller.recordId)));
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
    const usuarioRecordId = req.body.usuarioRecordId || req.body.Usuario;
    const sellers = await listSellers();
    const sellerExists = sellers.some((seller) => seller.recordId === usuarioRecordId);
    if (!sellerExists) {
      return res.status(404).json({
        error: 'Seller not found for block',
        message: 'No existe una vendedora con ese usuarioRecordId.'
      });
    }

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

  const validationError = validateUpdateBlock(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const usuarioRecordId = req.body.usuarioRecordId || req.body.Usuario;
    if (usuarioRecordId) {
      const sellers = await listSellers();
      const sellerExists = sellers.some((seller) => seller.recordId === usuarioRecordId);
      if (!sellerExists) {
        return res.status(404).json({
          error: 'Seller not found for block',
          message: 'No existe una vendedora con ese usuarioRecordId.'
        });
      }
    }

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
