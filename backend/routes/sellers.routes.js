const express = require('express');
const { getActiveUsers, getAuthUserByEmail } = require('../services/users.service');
const {
  createSeller,
  deactivateSeller,
  getSellerByEmail,
  listSellers,
  updateSeller
} = require('../services/sellers.service');

const router = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function validateCreateSeller(body = {}) {
  if (!body.id && !body.Id) {
    return 'id is required';
  }

  if (!body.nombre && !body.Nombre) {
    return 'nombre is required';
  }

  const email = body.correo || body.Correo;
  if (!email) {
    return 'correo is required';
  }

  if (!isValidEmail(email)) {
    return 'correo must be valid';
  }

  return '';
}

function hasEditableFields(body = {}) {
  return [
    'id',
    'Id',
    'nombre',
    'Nombre',
    'telefono',
    'Telefono',
    'correo',
    'Correo',
    'rol',
    'Rol',
    'activa',
    'Activa',
    'puede_recibir_reuniones',
    'Puede recibir reuniones',
    'puede_crear_meets',
    'Puede crear meets'
  ].some((field) => Object.prototype.hasOwnProperty.call(body, field));
}

router.get('/sellers', async (_req, res) => {
  try {
    const sellers = await listSellers();
    return res.json(sellers);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to list sellers',
      details: error.response?.data || error.message
    });
  }
});

router.get('/me', async (req, res) => {
  let email = req.session.googleUserEmail;
  let resolvedFrom = 'session';

  if (!email) {
    try {
      const activeUsers = await getActiveUsers();
      if (activeUsers.length === 1) {
        email = activeUsers[0].email;
        resolvedFrom = 'single_active_auth_user';
      } else {
        return res.json({
          authenticated: false,
          reason: activeUsers.length > 1 ? 'multiple_active_users' : 'no_session'
        });
      }
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to resolve active auth users',
        details: error.response?.data || error.message
      });
    }
  }

  try {
    const [authUser, seller] = await Promise.all([
      getAuthUserByEmail(email),
      getSellerByEmail(email)
    ]);

    return res.json({
      authenticated: true,
      resolvedFrom,
      email,
      auth: authUser
        ? {
            recordId: authUser.recordId,
            rol: authUser.rol,
            activo: authUser.activo,
            hasAccessToken: Boolean(authUser.access_token),
            hasRefreshToken: Boolean(authUser.refresh_token),
            expiry_date: authUser.expiry_date
          }
        : null,
      usuario: seller
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to resolve current user',
      details: error.response?.data || error.message
    });
  }
});

router.post('/sellers', async (req, res) => {
  const validationError = validateCreateSeller(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const seller = await createSeller(req.body);
    return res.status(201).json(seller);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to create seller',
      details: error.response?.data || error.message
    });
  }
});

router.patch('/sellers/:id', async (req, res) => {
  if (!hasEditableFields(req.body)) {
    return res.status(400).json({ error: 'No editable fields provided' });
  }

  try {
    const seller = await updateSeller(req.params.id, req.body);
    return res.json(seller);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to update seller',
      details: error.response?.data || error.message
    });
  }
});

router.delete('/sellers/:id', async (req, res) => {
  try {
    const seller = await deactivateSeller(req.params.id);
    return res.json({
      ok: true,
      status: 'seller_deactivated',
      seller
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to deactivate seller',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;
