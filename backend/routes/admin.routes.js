const express = require('express');

const router = express.Router();

function renderSellersAdminPage() {
  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Admin vendedoras | Extension FD</title>
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
            --success: #138a4a;
            --success-bg: #e8f7ef;
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
            width: min(1180px, calc(100% - 32px));
            margin: 0 auto;
            padding: 28px 0;
          }
          header {
            padding: 26px 0 20px;
          }
          h1 {
            margin: 0;
            font-size: clamp(28px, 4vw, 42px);
            line-height: 1.1;
          }
          p {
            margin: 10px 0 0;
            color: var(--muted);
            line-height: 1.5;
          }
          .layout {
            display: grid;
            grid-template-columns: minmax(320px, 420px) 1fr;
            gap: 18px;
            align-items: start;
          }
          section {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 14px;
            box-shadow: 0 16px 42px rgba(23, 32, 51, 0.08);
            overflow: hidden;
          }
          .section-head {
            padding: 18px;
            border-bottom: 1px solid var(--border);
          }
          h2 {
            margin: 0;
            font-size: 20px;
          }
          form, .content {
            padding: 18px;
          }
          label {
            display: grid;
            gap: 7px;
            margin-bottom: 12px;
            color: var(--muted);
            font-size: 13px;
            font-weight: 700;
          }
          input, select, textarea {
            width: 100%;
            min-height: 40px;
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 9px 10px;
            color: var(--text);
            background: #ffffff;
            font: inherit;
          }
          textarea {
            min-height: 76px;
            resize: vertical;
          }
          .checks {
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
            margin: 10px 0 14px;
          }
          .checks label {
            display: flex;
            align-items: center;
            gap: 9px;
            margin: 0;
            color: var(--text);
            font-weight: 600;
          }
          .checks input {
            width: 16px;
            min-height: 16px;
          }
          .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }
          button, a.button {
            display: inline-flex;
            min-height: 40px;
            align-items: center;
            justify-content: center;
            padding: 0 13px;
            border-radius: 8px;
            border: 1px solid var(--border);
            background: #ffffff;
            color: var(--text);
            font: inherit;
            font-weight: 700;
            text-decoration: none;
            cursor: pointer;
          }
          button.primary {
            border-color: var(--primary);
            background: var(--primary);
            color: #ffffff;
          }
          button.danger {
            border-color: var(--danger);
            background: var(--danger);
            color: #ffffff;
          }
          button:disabled {
            opacity: 0.55;
            cursor: not-allowed;
          }
          .stack {
            display: grid;
            gap: 18px;
          }
          .table-wrap {
            overflow-x: auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            min-width: 760px;
          }
          th, td {
            padding: 12px;
            border-bottom: 1px solid var(--border);
            text-align: left;
            vertical-align: top;
            font-size: 14px;
          }
          th {
            color: var(--muted);
            font-size: 12px;
            text-transform: uppercase;
          }
          .pill {
            display: inline-flex;
            padding: 5px 8px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 800;
          }
          .pill.ok {
            color: var(--success);
            background: var(--success-bg);
          }
          .pill.off {
            color: var(--danger);
            background: var(--danger-bg);
          }
          .status {
            display: none;
            margin: 0 0 14px;
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid var(--border);
            color: var(--muted);
            background: #ffffff;
          }
          .status.ok {
            display: block;
            color: var(--success);
            border-color: #bbebd0;
            background: var(--success-bg);
          }
          .status.error {
            display: block;
            color: var(--danger);
            border-color: #ffd0cc;
            background: var(--danger-bg);
          }
          .muted {
            color: var(--muted);
          }
          @media (max-width: 920px) {
            .layout {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <header>
            <h1>Admin de vendedoras</h1>
            <p>Gestiona usuarios internos, permisos para recibir reuniones y bloqueos de agenda.</p>
          </header>

          <div id="status" class="status"></div>

          <div class="layout">
            <div class="stack">
              <section>
                <div class="section-head">
                  <h2>Crear vendedora</h2>
                </div>
                <form id="seller-form">
                  <label>Id
                    <input name="id" placeholder="u-florencia" required />
                  </label>
                  <label>Nombre
                    <input name="nombre" placeholder="FLORENCIA" required />
                  </label>
                  <label>Telefono
                    <input name="telefono" placeholder="549..." />
                  </label>
                  <label>Correo
                    <input name="correo" type="email" placeholder="florencia@example.com" required />
                  </label>
                  <label>Rol
                    <select name="rol">
                      <option value="Vendedora">Vendedora</option>
                      <option value="Gerente">Gerente</option>
                    </select>
                  </label>
                  <div class="checks">
                    <label><input name="activa" type="checkbox" checked /> Activa</label>
                    <label><input name="puede_recibir_reuniones" type="checkbox" checked /> Puede recibir reuniones</label>
                  </div>
                  <div class="actions">
                    <button class="primary" type="submit">Crear</button>
                  </div>
                </form>
              </section>

              <section>
                <div class="section-head">
                  <h2>Bloquear agenda</h2>
                </div>
                <form id="block-form">
                  <label>Vendedora
                    <select name="usuarioRecordId" id="block-seller" required></select>
                  </label>
                  <label>Fecha
                    <input name="fecha" type="date" required />
                  </label>
                  <div class="checks">
                    <label><input name="todo_el_dia" type="checkbox" checked /> Todo el dia</label>
                  </div>
                  <label>Hora inicio
                    <input name="hora_inicio" placeholder="09:00" />
                  </label>
                  <label>Hora fin
                    <input name="hora_fin" placeholder="13:00" />
                  </label>
                  <label>Motivo
                    <textarea name="motivo" placeholder="Franco, capacitacion, tramite..."></textarea>
                  </label>
                  <div class="actions">
                    <button class="primary" type="submit">Crear bloqueo</button>
                  </div>
                </form>
              </section>
            </div>

            <div class="stack">
              <section>
                <div class="section-head">
                  <h2>Vendedoras</h2>
                </div>
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Correo</th>
                        <th>Rol</th>
                        <th>Permisos</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody id="sellers-body">
                      <tr><td colspan="5" class="muted">Cargando...</td></tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <div class="section-head">
                  <h2>Bloqueos</h2>
                </div>
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Usuario</th>
                        <th>Horario</th>
                        <th>Motivo</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody id="blocks-body">
                      <tr><td colspan="6" class="muted">Cargando...</td></tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        </main>

        <script>
          const state = {
            sellers: [],
            blocks: []
          };

          const statusEl = document.getElementById('status');
          const sellersBody = document.getElementById('sellers-body');
          const blocksBody = document.getElementById('blocks-body');
          const blockSellerSelect = document.getElementById('block-seller');

          function showStatus(message, type = 'ok') {
            statusEl.textContent = message;
            statusEl.className = 'status ' + type;
            setTimeout(() => {
              statusEl.className = 'status';
              statusEl.textContent = '';
            }, 4500);
          }

          async function api(path, options = {}) {
            const response = await fetch(path, options);
            const text = await response.text();
            const data = text ? JSON.parse(text) : null;
            if (!response.ok) {
              throw new Error(data?.error || 'Request failed');
            }
            return data;
          }

          function yesNo(value) {
            return value ? '<span class="pill ok">Si</span>' : '<span class="pill off">No</span>';
          }

          function sellerNameByRecordId(recordId) {
            return state.sellers.find((seller) => seller.recordId === recordId)?.nombre || recordId || 'Sin usuario';
          }

          function renderSellers() {
            if (!state.sellers.length) {
              sellersBody.innerHTML = '<tr><td colspan="5" class="muted">No hay vendedoras cargadas.</td></tr>';
              blockSellerSelect.innerHTML = '<option value="">Sin vendedoras</option>';
              return;
            }

            sellersBody.innerHTML = state.sellers.map((seller) => {
              return '<tr>' +
                '<td><strong>' + seller.nombre + '</strong><br><span class="muted">' + seller.id + '</span></td>' +
                '<td>' + seller.correo + '<br><span class="muted">' + (seller.telefono || 'Sin telefono') + '</span></td>' +
                '<td>' + seller.rol + '</td>' +
                '<td>' +
                  'Activa: ' + yesNo(seller.activa) + '<br>' +
                  'Recibe: ' + yesNo(seller.puede_recibir_reuniones) +
                '</td>' +
                '<td class="actions">' +
                  '<button type="button" data-action="toggle-active" data-id="' + seller.recordId + '">' + (seller.activa ? 'Desactivar' : 'Activar') + '</button>' +
                  '<button type="button" data-action="toggle-receives" data-id="' + seller.recordId + '">' + (seller.puede_recibir_reuniones ? 'No recibe' : 'Recibe') + '</button>' +
                '</td>' +
              '</tr>';
            }).join('');

            blockSellerSelect.innerHTML = state.sellers.map((seller) => {
              return '<option value="' + seller.recordId + '">' + seller.nombre + ' - ' + seller.correo + '</option>';
            }).join('');
          }

          function renderBlocks() {
            if (!state.blocks.length) {
              blocksBody.innerHTML = '<tr><td colspan="6" class="muted">No hay bloqueos cargados.</td></tr>';
              return;
            }

            blocksBody.innerHTML = state.blocks.map((block) => {
              const sellerId = Array.isArray(block.usuario) ? block.usuario[0] : '';
              const horario = block.todo_el_dia ? 'Todo el dia' : ((block.hora_inicio || '-') + ' a ' + (block.hora_fin || '-'));
              return '<tr>' +
                '<td>' + block.fecha + '<br><span class="muted">' + block.id + '</span></td>' +
                '<td>' + sellerNameByRecordId(sellerId) + '</td>' +
                '<td>' + horario + '</td>' +
                '<td>' + (block.motivo || 'Sin motivo') + '</td>' +
                '<td>' + yesNo(block.activo) + '</td>' +
                '<td class="actions">' +
                  '<button type="button" data-action="disable-block" data-id="' + block.recordId + '"' + (block.activo ? '' : ' disabled') + '>Desactivar</button>' +
                '</td>' +
              '</tr>';
            }).join('');
          }

          async function loadAll() {
            const [sellers, blocks] = await Promise.all([
              api('/api/sellers'),
              api('/api/seller-blocks')
            ]);
            state.sellers = sellers;
            state.blocks = blocks;
            renderSellers();
            renderBlocks();
          }

          document.getElementById('seller-form').addEventListener('submit', async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);
            const body = {
              id: formData.get('id'),
              nombre: formData.get('nombre'),
              telefono: formData.get('telefono'),
              correo: formData.get('correo'),
              rol: formData.get('rol'),
              activa: formData.has('activa'),
              puede_recibir_reuniones: formData.has('puede_recibir_reuniones')
            };

            try {
              await api('/api/sellers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
              });
              form.reset();
              form.querySelector('[name="activa"]').checked = true;
              form.querySelector('[name="puede_recibir_reuniones"]').checked = true;
              await loadAll();
              showStatus('Vendedora creada.');
            } catch (error) {
              showStatus(error.message, 'error');
            }
          });

          document.getElementById('block-form').addEventListener('submit', async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);
            const usuarioRecordId = formData.get('usuarioRecordId');
            const fecha = formData.get('fecha');
            const body = {
              id: 'bloq-' + usuarioRecordId + '-' + fecha + '-' + Date.now(),
              usuarioRecordId,
              fecha,
              todo_el_dia: formData.has('todo_el_dia'),
              hora_inicio: formData.get('hora_inicio'),
              hora_fin: formData.get('hora_fin'),
              motivo: formData.get('motivo'),
              activo: true
            };

            try {
              await api('/api/seller-blocks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
              });
              form.reset();
              form.querySelector('[name="todo_el_dia"]').checked = true;
              await loadAll();
              showStatus('Bloqueo creado.');
            } catch (error) {
              showStatus(error.message, 'error');
            }
          });

          sellersBody.addEventListener('click', async (event) => {
            const button = event.target.closest('button[data-action]');
            if (!button) return;
            const seller = state.sellers.find((item) => item.recordId === button.dataset.id);
            if (!seller) return;

            if (button.dataset.action === 'toggle-active' && seller.activa) {
              const confirmed = window.confirm('Desactivar a ' + (seller.nombre || seller.correo || 'esta vendedora') + '? No podra recibir reuniones hasta que se vuelva a activar.');
              if (!confirmed) return;
            }

            const body = button.dataset.action === 'toggle-active'
              ? {
                  activa: !seller.activa,
                  puede_recibir_reuniones: seller.activa ? false : seller.puede_recibir_reuniones
                }
              : { puede_recibir_reuniones: !seller.puede_recibir_reuniones };

            try {
              await api('/api/sellers/' + seller.recordId, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
              });
              await loadAll();
              showStatus('Vendedora actualizada.');
            } catch (error) {
              showStatus(error.message, 'error');
            }
          });

          blocksBody.addEventListener('click', async (event) => {
            const button = event.target.closest('button[data-action="disable-block"]');
            if (!button) return;

            try {
              await api('/api/seller-blocks/' + button.dataset.id, { method: 'DELETE' });
              await loadAll();
              showStatus('Bloqueo desactivado.');
            } catch (error) {
              showStatus(error.message, 'error');
            }
          });

          loadAll().catch((error) => showStatus(error.message, 'error'));
        </script>
      </body>
    </html>
  `;
}

router.get('/sellers', (_req, res) => {
  res.send(renderSellersAdminPage());
});

module.exports = router;
