require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');

const adminRouter = require('./routes/admin.routes');
const authRouter = require('./routes/auth.routes');
const meetingsRouter = require('./routes/meetings.routes');
const sellerBlocksRouter = require('./routes/seller-blocks.routes');
const sellersRouter = require('./routes/sellers.routes');
const workHoursRouter = require('./routes/work-hours.routes');
const { getActiveUsers, resetUsers } = require('./services/users.service');

const app = express();
const PORT = process.env.PORT || 3000;

function wantsHtml(req) {
  const accept = req.get('accept') || '';
  return accept.includes('text/html') && !accept.includes('application/json');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderDebugResetPage({ activeUsers = [], error = '' }) {
  const hasError = Boolean(error);
  const usersList = activeUsers.length
    ? activeUsers.map((user) => `<li>${escapeHtml(user.email)}</li>`).join('')
    : '<li>No quedan usuarios activos.</li>';

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Reset de usuarios | Extension FD Backend</title>
        <style>
          :root {
            --bg: #f4f7fb;
            --surface: #ffffff;
            --text: #172033;
            --muted: #5f6b7a;
            --border: #dfe6ef;
            --primary: #0b57d0;
            --warning: #9a5b00;
            --warning-bg: #fff7e6;
            --danger: #b42318;
            --danger-bg: #fff1f0;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            font-family: Arial, sans-serif;
            background: var(--bg);
            color: var(--text);
          }
          .page {
            width: min(820px, calc(100% - 32px));
            min-height: 100vh;
            margin: 0 auto;
            display: grid;
            place-items: center;
            padding: 32px 0;
          }
          main {
            width: 100%;
            overflow: hidden;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 18px;
            box-shadow: 0 24px 70px rgba(23, 32, 51, 0.10);
          }
          .hero {
            padding: 32px;
            border-bottom: 1px solid var(--border);
          }
          .status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 18px;
            padding: 7px 11px;
            border-radius: 999px;
            color: ${hasError ? 'var(--danger)' : 'var(--warning)'};
            background: ${hasError ? 'var(--danger-bg)' : 'var(--warning-bg)'};
            font-size: 14px;
            font-weight: 700;
          }
          .dot {
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: ${hasError ? 'var(--danger)' : 'var(--warning)'};
          }
          h1 {
            margin: 0;
            font-size: clamp(28px, 4vw, 42px);
            line-height: 1.1;
            letter-spacing: 0;
          }
          p {
            margin: 12px 0 0;
            color: var(--muted);
            line-height: 1.5;
          }
          .content {
            padding: 24px 32px;
          }
          ul {
            margin: 12px 0 0;
            padding-left: 20px;
            color: var(--text);
          }
          li {
            margin: 8px 0;
          }
          .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            padding: 0 32px 28px;
          }
          a {
            display: inline-flex;
            min-height: 42px;
            align-items: center;
            justify-content: center;
            padding: 0 16px;
            border-radius: 9px;
            border: 1px solid var(--border);
            color: var(--text);
            text-decoration: none;
            font-weight: 700;
            background: #ffffff;
          }
          a.primary {
            border-color: var(--primary);
            color: #ffffff;
            background: var(--primary);
          }
        </style>
      </head>
      <body>
        <div class="page">
          <main>
            <section class="hero">
              <div class="status"><span class="dot"></span> ${hasError ? 'Reset fallido' : 'Debug ejecutado'}</div>
              <h1>${hasError ? 'No se pudo resetear usuarios' : 'Usuarios reseteados correctamente'}</h1>
              <p>${hasError ? escapeHtml(error) : 'Se limpiaron tokens y se desactivaron usuarios activos en AuthUsuarios.'}</p>
            </section>
            <section class="content">
              <strong>Usuarios activos restantes</strong>
              <ul>${usersList}</ul>
            </section>
            <nav class="actions" aria-label="Accesos rapidos">
              <a class="primary" href="/">Ir al inicio</a>
              <a href="/auth/google">Login con Google</a>
              <a href="/health">Health JSON</a>
            </nav>
          </main>
        </div>
      </body>
    </html>
  `;
}

function renderDebugResetConfirmPage() {
  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Confirmar reset | Extension FD Backend</title>
        <style>
          :root {
            --bg: #f4f7fb;
            --surface: #ffffff;
            --text: #172033;
            --muted: #5f6b7a;
            --border: #dfe6ef;
            --primary: #0b57d0;
            --danger: #b42318;
            --danger-bg: #fff1f0;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            font-family: Arial, sans-serif;
            background: var(--bg);
            color: var(--text);
          }
          .page {
            width: min(820px, calc(100% - 32px));
            min-height: 100vh;
            margin: 0 auto;
            display: grid;
            place-items: center;
            padding: 32px 0;
          }
          main {
            width: 100%;
            overflow: hidden;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 18px;
            box-shadow: 0 24px 70px rgba(23, 32, 51, 0.10);
          }
          .hero {
            padding: 32px;
            border-bottom: 1px solid var(--border);
          }
          .status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 18px;
            padding: 7px 11px;
            border-radius: 999px;
            color: var(--danger);
            background: var(--danger-bg);
            font-size: 14px;
            font-weight: 700;
          }
          .dot {
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: var(--danger);
          }
          h1 {
            margin: 0;
            font-size: clamp(28px, 4vw, 42px);
            line-height: 1.1;
            letter-spacing: 0;
          }
          p {
            margin: 12px 0 0;
            color: var(--muted);
            line-height: 1.5;
          }
          .content {
            padding: 24px 32px;
          }
          ul {
            margin: 12px 0 0;
            padding-left: 20px;
            color: var(--text);
          }
          li {
            margin: 8px 0;
          }
          .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            padding: 0 32px 28px;
          }
          button, a {
            display: inline-flex;
            min-height: 42px;
            align-items: center;
            justify-content: center;
            padding: 0 16px;
            border-radius: 9px;
            border: 1px solid var(--border);
            color: var(--text);
            text-decoration: none;
            font: inherit;
            font-weight: 700;
            background: #ffffff;
            cursor: pointer;
          }
          button.danger {
            border-color: var(--danger);
            color: #ffffff;
            background: var(--danger);
          }
          a.primary {
            border-color: var(--primary);
            color: #ffffff;
            background: var(--primary);
          }
        </style>
      </head>
      <body>
        <div class="page">
          <main>
            <section class="hero">
              <div class="status"><span class="dot"></span> Confirmacion requerida</div>
              <h1>Resetear usuarios activos</h1>
              <p>Esta accion limpia tokens OAuth y desactiva usuarios activos en AuthUsuarios.</p>
            </section>
            <section class="content">
              <strong>Antes de continuar</strong>
              <ul>
                <li>Los usuarios deberan iniciar sesion nuevamente con Google.</li>
                <li>La disponibilidad puede devolver resultados vacios hasta reconectar usuarios.</li>
                <li>Usar solo en desarrollo o tareas controladas.</li>
              </ul>
            </section>
            <div class="actions">
              <form method="post" action="/debug/reset-users">
                <button class="danger" type="submit">Confirmar reset</button>
              </form>
              <a class="primary" href="/">Cancelar e ir al inicio</a>
              <a href="/health">Health JSON</a>
            </div>
          </main>
        </div>
      </body>
    </html>
  `;
}

app.use(cors({
  origin: [
    'https://app.respond.io',
    'https://meet.google.com'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'extension-fd-session-secret',
  resave: false,
  saveUninitialized: false
}));

app.get('/', (_req, res) => {
  res.send(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Extension FD Backend</title>
        <style>
          :root {
            --bg: #f4f7fb;
            --surface: #ffffff;
            --text: #172033;
            --muted: #5f6b7a;
            --border: #dfe6ef;
            --primary: #0b57d0;
            --success: #138a4a;
            --success-bg: #e8f7ef;
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            min-height: 100vh;
            font-family: Arial, sans-serif;
            background: var(--bg);
            color: var(--text);
          }
          .page {
            width: min(920px, calc(100% - 32px));
            min-height: 100vh;
            margin: 0 auto;
            display: grid;
            place-items: center;
            padding: 32px 0;
          }
          main {
            width: 100%;
            overflow: hidden;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 18px;
            box-shadow: 0 24px 70px rgba(23, 32, 51, 0.10);
          }
          .hero {
            padding: 34px;
            border-bottom: 1px solid var(--border);
          }
          .status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 18px;
            padding: 7px 11px;
            border-radius: 999px;
            color: var(--success);
            background: var(--success-bg);
            font-size: 14px;
            font-weight: 700;
          }
          .dot {
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: var(--success);
          }
          h1 {
            margin: 0;
            font-size: clamp(30px, 5vw, 44px);
            line-height: 1.05;
            letter-spacing: 0;
          }
          p {
            margin: 12px 0 0;
            line-height: 1.5;
            color: var(--muted);
            font-size: 16px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            border-bottom: 1px solid var(--border);
          }
          .item {
            padding: 22px;
            border-right: 1px solid var(--border);
          }
          .item:last-child {
            border-right: 0;
          }
          .label {
            margin-bottom: 8px;
            color: var(--muted);
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .value {
            font-size: 17px;
            font-weight: 700;
          }
          .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            padding: 22px;
          }
          a {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 42px;
            padding: 0 16px;
            border-radius: 9px;
            border: 1px solid var(--border);
            color: var(--text);
            text-decoration: none;
            font-weight: 700;
          }
          a.primary {
            border-color: var(--primary);
            background: var(--primary);
            color: #ffffff;
          }
          code {
            padding: 3px 6px;
            border-radius: 6px;
            background: #eef3fb;
            color: var(--primary);
          }
          @media (max-width: 720px) {
            .hero {
              padding: 26px;
            }
            .grid {
              grid-template-columns: 1fr;
            }
            .item {
              border-right: 0;
              border-bottom: 1px solid var(--border);
            }
            .item:last-child {
              border-bottom: 0;
            }
            .actions {
              flex-direction: column;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <main>
            <section class="hero">
              <div class="status"><span class="dot"></span> Backend online</div>
              <h1>Extension FD Backend</h1>
              <p>Servidor activo para la extension de agendamiento comercial, integraciones con Airtable y disponibilidad de Google Calendar.</p>
            </section>
            <section class="grid" aria-label="Resumen del servicio">
              <div class="item">
                <div class="label">Servicio</div>
                <div class="value">API local</div>
              </div>
              <div class="item">
                <div class="label">Puerto</div>
                <div class="value">${PORT}</div>
              </div>
              <div class="item">
                <div class="label">Estado</div>
                <div class="value">Operativo</div>
              </div>
            </section>
            <section class="actions" aria-label="Accesos rapidos">
              <a class="primary" href="/health">Ver health JSON</a>
              <a href="/auth/google">Login con Google</a>
              <a href="/admin/sellers">Admin vendedoras</a>
              <a href="/api/availability?date=2026-05-06&duration=30">Ejemplo disponibilidad</a>
            </section>
          </main>
        </div>
      </body>
    </html>
  `);
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    status: 'healthy',
    service: 'Extension FD Backend',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.get('/debug/reset-users', async (req, res) => {
  if (wantsHtml(req)) {
    return res.send(renderDebugResetConfirmPage());
  }

  return res.status(405).json({
    error: 'Confirmation required',
    message: 'Use POST /debug/reset-users to execute this debug action.'
  });
});

app.post('/debug/reset-users', async (req, res) => {
  try {
    await resetUsers();
    req.session.googleUserEmail = null;
    const activeUsers = await getActiveUsers();
    console.log('Users reset. Usuarios actuales:', activeUsers.map((user) => user.email));
    if (wantsHtml(req)) {
      return res.send(renderDebugResetPage({ activeUsers }));
    }
    return res.json({
      ok: true,
      status: 'users_reset',
      activeUsers: activeUsers.map((user) => user.email)
    });
  } catch (error) {
    if (wantsHtml(req)) {
      return res.status(500).send(renderDebugResetPage({
        error: error.response?.data?.error?.message || error.message
      }));
    }
    return res.status(500).json({
      error: 'Failed to reset users',
      details: error.response?.data || error.message
    });
  }
});

app.use('/admin', adminRouter);
app.use('/auth', authRouter);
app.use('/api', meetingsRouter);
app.use('/api', sellerBlocksRouter);
app.use('/api', sellersRouter);
app.use('/api', workHoursRouter);

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
