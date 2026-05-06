const express = require('express');
const { google } = require('googleapis');
const { saveUser, getActiveUsers, normalizeRole } = require('../services/users.service');

const router = express.Router();

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

router.get('/google', (req, res) => {
  req.session.googleUserEmail = null;
  const oauth2Client = createOAuthClient();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/calendar'
    ]
  });

  res.redirect(authUrl);
});
router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Missing code parameter' });
  }

  try {
    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2'
    });

    const { data } = await oauth2.userinfo.get();
    const email = data.email;

    console.log('OAuth user received', {
      email: email || null
    });

    if (!email) {
      return res.status(500).json({ error: 'Unable to resolve Google account email' });
    }

    const userData = {
      email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      rol: normalizeRole(),
      activo: true
    };

    console.log('Saving user to Airtable...', {
      email: userData.email,
      rol: userData.rol,
      hasAccessToken: !!userData.access_token,
      hasRefreshToken: !!userData.refresh_token,
      expiry_date: userData.expiry_date || null
    });

    const user = await saveUser(userData);

    let activeUsers = [];
    try {
      activeUsers = await getActiveUsers();
    } catch (error) {
      console.error('Airtable error while reading active users:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    }

    req.session.googleUserEmail = email;
    console.log('Usuario guardado:', email);
    console.log('Tokens:', {
      access_token: !!user.access_token,
      refresh_token: !!user.refresh_token
    });
    console.log('Usuarios actuales:', activeUsers.map((activeUser) => activeUser.email));

    return res.status(200).send(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 24px;">
          <h2>Google login OK</h2>
          <p>Usuario conectado: ${user.email}</p>
          <p>Ya podés volver a la extensión.</p>
        </body>
      </html>
    `);
  } catch (error) {
    return res.status(500).json({
      error: 'Google OAuth callback failed',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;
