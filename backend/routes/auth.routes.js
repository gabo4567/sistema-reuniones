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

function renderLoginSuccessPage(userEmail) {
  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Login completado | Extension FD Backend</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            font-family: Arial, sans-serif;
            background: #f4f7fb;
            color: #172033;
          }
          main {
            width: min(720px, calc(100% - 32px));
            padding: 34px;
            text-align: center;
            background: #ffffff;
            border: 1px solid #dfe6ef;
            border-radius: 18px;
            box-shadow: 0 24px 70px rgba(23, 32, 51, 0.10);
          }
          .status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 18px;
            padding: 7px 11px;
            border-radius: 999px;
            color: #138a4a;
            background: #e8f7ef;
            font-size: 14px;
            font-weight: 700;
          }
          .dot {
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: #138a4a;
          }
          h1 {
            margin: 0;
            font-size: clamp(30px, 5vw, 42px);
            line-height: 1.08;
            letter-spacing: 0;
          }
          p {
            margin: 12px 0 0;
            color: #5f6b7a;
            line-height: 1.5;
          }
          .email {
            display: inline-block;
            margin-top: 20px;
            padding: 10px 13px;
            border: 1px solid #dfe6ef;
            border-radius: 10px;
            background: #f8fafc;
            color: #172033;
            font-weight: 700;
            overflow-wrap: anywhere;
          }
          .actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 12px;
            margin-top: 24px;
          }
          a {
            display: inline-flex;
            min-height: 42px;
            align-items: center;
            justify-content: center;
            padding: 0 16px;
            border-radius: 9px;
            border: 1px solid #dfe6ef;
            color: #172033;
            text-decoration: none;
            font-weight: 700;
          }
          a.primary {
            border-color: #0b57d0;
            background: #0b57d0;
            color: #ffffff;
          }
          @media (max-width: 560px) {
            main {
              padding: 26px;
            }
            .actions {
              flex-direction: column;
            }
          }
        </style>
      </head>
      <body>
        <main>
          <div class="status"><span class="dot"></span> Login completado</div>
          <h1>Google conectado correctamente</h1>
          <p>El usuario quedo activo para consultar disponibilidad desde Google Calendar.</p>
          <div class="email">${userEmail}</div>
          <p>Ya podes volver a la extension y continuar con el agendamiento.</p>
          <nav class="actions" aria-label="Accesos rapidos">
            <a class="primary" href="/">Ir al inicio</a>
            <a href="/health">Ver health JSON</a>
          </nav>
        </main>
        <script>
          (function() {
            var payload = {
              source: 'extension-fd-auth',
              status: 'success',
              email: ${JSON.stringify(userEmail)}
            };

            if (window.opener && !window.opener.closed) {
              window.opener.postMessage(payload, '*');
              window.setTimeout(function() {
                window.close();
              }, 900);
            }
          })();
        </script>
      </body>
    </html>
  `;
}

function renderLoginErrorPage({ title, message, statusText = 'Login no completado' }) {
  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title} | Extension FD Backend</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            font-family: Arial, sans-serif;
            background: #f6f7fb;
            color: #172033;
          }
          main {
            width: min(720px, calc(100% - 32px));
            padding: 34px;
            text-align: center;
            background: #ffffff;
            border: 1px solid #e5e8ef;
            border-radius: 18px;
            box-shadow: 0 24px 70px rgba(23, 32, 51, 0.10);
          }
          .status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 18px;
            padding: 7px 11px;
            border-radius: 999px;
            color: #9a3412;
            background: #fff3e8;
            font-size: 14px;
            font-weight: 700;
          }
          .dot {
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: #f97316;
          }
          h1 {
            margin: 0;
            font-size: clamp(30px, 5vw, 42px);
            line-height: 1.08;
            letter-spacing: 0;
          }
          p {
            margin: 12px 0 0;
            color: #5f6b7a;
            line-height: 1.5;
          }
          .actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 12px;
            margin-top: 24px;
          }
          a {
            display: inline-flex;
            min-height: 42px;
            align-items: center;
            justify-content: center;
            padding: 0 16px;
            border-radius: 9px;
            border: 1px solid #dfe6ef;
            color: #172033;
            text-decoration: none;
            font-weight: 700;
          }
          a.primary {
            border-color: #0b57d0;
            background: #0b57d0;
            color: #ffffff;
          }
          @media (max-width: 560px) {
            main {
              padding: 26px;
            }
            .actions {
              flex-direction: column;
            }
          }
        </style>
      </head>
      <body>
        <main>
          <div class="status"><span class="dot"></span> ${statusText}</div>
          <h1>${title}</h1>
          <p>${message}</p>
          <nav class="actions" aria-label="Accesos rapidos">
            <a class="primary" href="/auth/google">Intentar de nuevo</a>
            <a href="/">Ir al inicio</a>
          </nav>
        </main>
        <script>
          (function() {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({
                source: 'extension-fd-auth',
                status: 'error',
                message: ${JSON.stringify(title)}
              }, '*');
            }
          })();
        </script>
      </body>
    </html>
  `;
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
  const { code, error } = req.query;

  if (error === 'access_denied') {
    return res.status(403).send(renderLoginErrorPage({
      title: 'Permiso de Google cancelado',
      message: 'No se conecto la cuenta porque se cancelo el permiso de acceso. Podes volver a intentarlo cuando quieras.'
    }));
  }

  if (error) {
    return res.status(400).send(renderLoginErrorPage({
      title: 'No se pudo completar el login',
      message: 'Google devolvio un error durante la autorizacion. Proba iniciar sesion nuevamente.'
    }));
  }

  if (!code) {
    return res.status(400).send(renderLoginErrorPage({
      title: 'Falta completar la autorizacion',
      message: 'No recibimos el codigo necesario para conectar Google. Inicia el login otra vez desde el boton de abajo.'
    }));
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

    return res.status(200).send(renderLoginSuccessPage(user.email));
  } catch (error) {
    return res.status(500).json({
      error: 'Google OAuth callback failed',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;
