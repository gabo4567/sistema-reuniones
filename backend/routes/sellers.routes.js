const express = require('express');
const { getActiveUsers, getAuthUserByEmail, listAuthUsers } = require('../services/users.service');
const {
  createSeller,
  deactivateSeller,
  getSellerByEmail,
  listSellers,
  updateSeller
} = require('../services/sellers.service');
const { getDefaultWeeklySchedule, listWorkHours, saveWorkHours } = require('../services/work-hours.service');

const router = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeValue(value) {
  return String(value || '').trim().toLowerCase();
}

function getRoleValue(role) {
  const roleValue = Array.isArray(role) ? role[0] : role;
  return String(roleValue || '').trim();
}

function isValidRole(role) {
  const normalizedRole = getRoleValue(role).toLowerCase();
  return !normalizedRole || ['vendedora', 'gerente'].includes(normalizedRole);
}

function buildSellerAuthStatus(seller, authUser) {
  const hasAccessToken = Boolean(authUser?.access_token);
  const hasRefreshToken = Boolean(authUser?.refresh_token);
  const isActive = authUser?.activo === true;
  const isReady = Boolean(authUser && isActive && hasAccessToken && hasRefreshToken);

  let label = 'Falta autorizar Google';
  let reason = authUser ? 'missing_tokens' : 'missing_auth_user';

  if (isReady) {
    label = 'Lista para Calendar';
    reason = 'ready';
  } else if (authUser && !isActive) {
    label = 'Google desactivado';
    reason = 'inactive_auth_user';
  } else if (authUser && hasAccessToken && !hasRefreshToken) {
    label = 'Debe reconectar Google';
    reason = 'missing_refresh_token';
  } else if (!seller?.correo) {
    label = 'Falta correo';
    reason = 'missing_seller_email';
  }

  return {
    ready: isReady,
    label,
    reason,
    authRecordId: authUser?.recordId || '',
    active: isActive,
    hasAccessToken,
    hasRefreshToken,
    expiry_date: authUser?.expiry_date || null
  };
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

  if (!isValidRole(body.rol || body.Rol)) {
    return 'rol must be Vendedora or Gerente';
  }

  return '';
}

function validateUpdateSeller(body = {}) {
  const email = body.correo || body.Correo;
  if (email && !isValidEmail(email)) {
    return 'correo must be valid';
  }

  if (!isValidRole(body.rol || body.Rol)) {
    return 'rol must be Vendedora or Gerente';
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
    'Puede recibir reuniones'
  ].some((field) => Object.prototype.hasOwnProperty.call(body, field));
}

router.get('/sellers', async (_req, res) => {
  try {
    const [sellers, authUsers, workHoursBySeller] = await Promise.all([
      listSellers(),
      listAuthUsers(),
      listWorkHours()
    ]);
    const authByEmail = new Map(authUsers.map((user) => [normalizeEmail(user.email), user]));

    return res.json(sellers.map((seller) => ({
      ...seller,
      auth: buildSellerAuthStatus(seller, authByEmail.get(normalizeEmail(seller.correo))),
      workHours: workHoursBySeller?.[seller.recordId] || null
    })));
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to list sellers',
      details: error.response?.data || error.message
    });
  }
});

router.get('/me', async (req, res) => {
  const extensionEmailHeader = normalizeEmail(req.get('x-fd-user-email'));
  const extensionEmail = isValidEmail(extensionEmailHeader) ? extensionEmailHeader : '';
  let email = extensionEmail || req.session.googleUserEmail;
  let resolvedFrom = extensionEmail ? 'extension_storage' : 'session';

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

    if (!authUser?.activo) {
      return res.json({
        authenticated: false,
        resolvedFrom,
        email,
        reason: authUser ? 'inactive_auth_user' : 'auth_user_not_found'
      });
    }

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
    const email = req.body.correo || req.body.Correo;
    const sellerId = req.body.id || req.body.Id;
    const sellers = await listSellers();
    const existingSeller = sellers.find((seller) => normalizeEmail(seller.correo) === normalizeEmail(email));
    if (existingSeller) {
      return res.status(409).json({
        error: 'Seller email already exists',
        message: 'Ya existe un usuario con ese correo.',
        seller: {
          recordId: existingSeller.recordId,
          nombre: existingSeller.nombre,
          correo: existingSeller.correo,
          rol: existingSeller.rol
        }
      });
    }

    const existingSellerId = sellers.find((seller) => normalizeValue(seller.id) === normalizeValue(sellerId));
    if (existingSellerId) {
      return res.status(409).json({
        error: 'Seller id already exists',
        message: 'Ya existe un usuario con ese ID.',
        seller: {
          recordId: existingSellerId.recordId,
          id: existingSellerId.id,
          nombre: existingSellerId.nombre,
          correo: existingSellerId.correo,
          rol: existingSellerId.rol
        }
      });
    }

    const seller = await createSeller(req.body);
    const workHours = await saveWorkHours(seller.recordId, {
      weekly: getDefaultWeeklySchedule()
    });

    return res.status(201).json({
      ...seller,
      workHours
    });
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

  const validationError = validateUpdateSeller(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const sellers = await listSellers();
    const currentSeller = sellers.find((seller) => seller.recordId === req.params.id);
    if (!currentSeller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    const nextEmail = req.body.correo || req.body.Correo;
    if (nextEmail) {
      const existingSeller = sellers.find((seller) =>
        seller.recordId !== req.params.id &&
        normalizeEmail(seller.correo) === normalizeEmail(nextEmail)
      );

      if (existingSeller) {
        return res.status(409).json({
          error: 'Seller email already exists',
          message: 'Ya existe otro usuario con ese correo.'
        });
      }
    }

    const nextSellerId = req.body.id || req.body.Id;
    if (nextSellerId) {
      const existingSellerId = sellers.find((seller) =>
        seller.recordId !== req.params.id &&
        normalizeValue(seller.id) === normalizeValue(nextSellerId)
      );

      if (existingSellerId) {
        return res.status(409).json({
          error: 'Seller id already exists',
          message: 'Ya existe otro usuario con ese ID.'
        });
      }
    }

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
