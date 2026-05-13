(function() {
  if (document.getElementById('custom-calendar-btn')) return;
  const API_BASE_URL = 'http://localhost:3000/api';

  function isAllowedUrl() {
    const url = window.location.href;
    const isMeet = window.location.hostname === 'meet.google.com';
    const isInbox = url.includes('https://app.respond.io/space/342593/inbox');
    return isMeet || isInbox;
  }

  function buildRescheduleFormHTML(today) {
    return `
      <button type="button" class="reschedule-btn">Reprogramar reunion</button>
      <div class="reschedule-form" style="display:none;">
        <div class="reschedule-form-title">Nueva fecha y horario</div>
        <input type="date" class="reschedule-date" min="${today}" value="${today}" />
        <select class="reschedule-duration">
          <option value="15">15 min</option>
          <option value="30" selected>30 min</option>
          <option value="60">60 min</option>
        </select>
        <button type="button" class="reschedule-check-btn">Ver horarios disponibles</button>
        <div class="reschedule-slots"></div>
        <button type="button" class="reschedule-confirm-btn" disabled>Confirmar reprogramacion</button>
        <div class="reschedule-message" style="display:none;"></div>
      </div>
    `;
  }

  function getMeetingScheduleMeta(fields = {}) {
    const rawDate = fields['Fecha'];
    const date = rawDate ? new Date(rawDate) : null;
    const hasValidDate = date && !Number.isNaN(date.getTime());
    const durationValue = fields['Duracion'] || fields['Duración'] || fields['Duracion minutos'] || '';

    return {
      date: hasValidDate
        ? date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'N/A',
      time: hasValidDate
        ? `${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} hs`
        : '',
      duration: durationValue ? `${durationValue} min` : ''
    };
  }

  function getMeetCardsHTML(meetings = []) {
    if (!meetings || meetings.length === 0) {
      return '<div class="fd-empty-state">No hay reuniones registradas</div>';
    }

    const today = getTodayDateValue();

    return meetings.map(record => {
      const fields = record.fields;
      const recordId = record.id || '';
      const calendarEventId = fields['Google Calendar Event ID'] || '';
      const vendedora = fields['Vendedora'] || 'N/A';
      const schedule = getMeetingScheduleMeta(fields);
      const status = fields['ESTADO'] || '';
      const type = fields['Tipo de Reunion'] || 'Meet';
      const phase = fields['Fase del Momento'] || 'N/A';
      const meetLink = fields['Link de meet'] || '';
      const registered = fields['Logramos Registro?'] === true ? '✅' : '❌';
      const notes = getDisplayMeetingNote(fields['Notas']);
      const statusClass = getStatusBadgeClass(status);

      return `
        <div class="meet-card"
             data-record-id="${escapeHtml(recordId)}"
             data-calendar-event-id="${escapeHtml(calendarEventId)}"
             data-vendedora="${escapeHtml(vendedora)}">
          <div class="fd-card">
            <div class="fd-card-header meet-card-header">
              <div class="fd-card-row">
                <span class="fd-card-type">${escapeHtml(schedule.time ? `${schedule.time} - ${type}` : type)}</span>
                <span class="fd-badge fd-badge--gray">${escapeHtml(schedule.date)}</span>
              </div>
              <div class="fd-card-divider"></div>
              <div class="fd-card-row">
                <span class="fd-card-vendedora">${escapeHtml(vendedora)}</span>
                <span class="${statusClass}">${escapeHtml(status || '–')}</span>
              </div>
              <div class="meet-card-extra-info" style="display:none;">
                <div class="fd-card-extra">
                  <div class="fd-card-details">
                    <div class="fd-card-detail-row">
                      <span class="fd-card-detail-label">Fase</span>
                      <span class="fd-card-detail-value">${escapeHtml(phase)}</span>
                    </div>
                    ${schedule.duration ? `
                    <div class="fd-card-detail-row">
                      <span class="fd-card-detail-label">Duracion</span>
                      <span class="fd-card-detail-value">${escapeHtml(schedule.duration)}</span>
                    </div>
                    ` : ''}
                    <div class="fd-card-detail-row">
                      <span class="fd-card-detail-label">Registro</span>
                      <span class="fd-card-detail-value">${registered}</span>
                    </div>
                  </div>
                  ${notes ? `<div class="fd-card-notes">${escapeHtml(notes)}</div>` : ''}
                  ${meetLink ? `<a href="${escapeHtml(meetLink)}" class="fd-card-link" target="_blank"><span>${escapeHtml(meetLink)}</span><i data-component="FontIcon" class="icon icon-redirect dls-size-icon-sm dls-text-icon-sm"></i></a>` : ''}
                  ${buildRescheduleFormHTML(today)}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function getGerenteMeetCardsHTML(meetings = []) {
    if (!meetings || meetings.length === 0) {
      return '<div class="fd-empty-state">No hay reuniones registradas</div>';
    }

    const today = getTodayDateValue();

    return meetings.map(record => {
      const fields = record.fields;
      const recordId = record.id || '';
      const calendarEventId = fields['Google Calendar Event ID'] || '';
      const vendedora = fields['Vendedora'] || 'N/A';
      const schedule = getMeetingScheduleMeta(fields);
      const status = fields['ESTADO'] || '';
      const type = fields['Tipo de Reunion'] || 'Meet';
      const phase = fields['Fase del Momento'] || 'N/A';
      const meetLink = fields['Link de meet'] || '';
      const registered = fields['Logramos Registro?'] === true ? '✅' : '❌';
      const notes = getDisplayMeetingNote(fields['Notas']);
      const statusClass = getStatusBadgeClass(status);

      return `
        <div class="meet-card"
             data-record-id="${escapeHtml(recordId)}"
             data-calendar-event-id="${escapeHtml(calendarEventId)}"
             data-vendedora="${escapeHtml(vendedora)}">
          <div class="fd-card fd-card--gerente">
            <div class="fd-card-header meet-card-header">
              <div class="fd-card-row">
                <span class="fd-card-type">${escapeHtml(schedule.time ? `${schedule.time} - ${type}` : type)}</span>
                <span class="fd-badge fd-badge--gray">${escapeHtml(schedule.date)}</span>
              </div>
              <div class="fd-card-divider"></div>
              <div class="fd-card-row">
                <span class="fd-card-vendedora" style="font-weight:600;">${escapeHtml(vendedora)}</span>
                <span class="${statusClass}">${escapeHtml(status || '–')}</span>
              </div>
            </div>
            <div class="fd-card-body meet-card-extra-info" style="display:none;">
              <div class="fd-card-details">
                <div class="fd-card-detail-row">
                  <span class="fd-card-detail-label">Fase</span>
                  <span class="fd-card-detail-value">${escapeHtml(phase)}</span>
                </div>
                <div class="fd-card-detail-row">
                  <span class="fd-card-detail-label">Duracion</span>
                  <span class="fd-card-detail-value">${escapeHtml(schedule.duration || 'N/A')}</span>
                </div>
                <div class="fd-card-detail-row">
                  <span class="fd-card-detail-label">Registro</span>
                  <span class="fd-card-detail-value">${registered}</span>
                </div>
              </div>
              ${notes ? `<div class="fd-card-notes">${escapeHtml(notes)}</div>` : ''}
              ${meetLink ? `<a href="${escapeHtml(meetLink)}" class="fd-card-link" target="_blank"><span>${escapeHtml(meetLink)}</span><i data-component="FontIcon" class="icon icon-redirect dls-size-icon-sm dls-text-icon-sm"></i></a>` : ''}
              ${buildRescheduleFormHTML(today)}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function addMeetCardListeners(container) {
    container.addEventListener('click', async (e) => {
      // Toggle extra info on card header click (skip for links and reschedule elements)
      const header = e.target.closest('.meet-card-header');
      if (header) {
        if (e.target.closest('a') || e.target.tagName === 'A') return;
        if (!e.target.closest('.reschedule-btn') && !e.target.closest('.reschedule-form')) {
          const card = header.closest('.meet-card');
          const extraInfo = card?.querySelector('.meet-card-extra-info');
          if (extraInfo) {
            const isHidden = extraInfo.style.display === 'none';
            extraInfo.style.display = isHidden ? 'block' : 'none';
            header.classList.toggle('is-open', isHidden);
            header.closest('.fd-card')?.classList.toggle('is-open', isHidden);
          }
        }
      }

      // Toggle reschedule form
      const rescheduleBtn = e.target.closest('.reschedule-btn');
      if (rescheduleBtn) {
        const card = rescheduleBtn.closest('.meet-card');
        const form = card?.querySelector('.reschedule-form');
        if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
        return;
      }

      // Check availability for reschedule
      const checkBtn = e.target.closest('.reschedule-check-btn');
      if (checkBtn) {
        const form = checkBtn.closest('.reschedule-form');
        const card = checkBtn.closest('.meet-card');
        const dateInput = form?.querySelector('.reschedule-date');
        const durationSelect = form?.querySelector('.reschedule-duration');
        const slotsContainer = form?.querySelector('.reschedule-slots');
        const confirmBtn = form?.querySelector('.reschedule-confirm-btn');
        const date = dateInput?.value;
        const duration = durationSelect?.value || '30';

        if (!date) {
          setRescheduleMessage(form, 'Selecciona una fecha.', true);
          return;
        }

        checkBtn.disabled = true;
        checkBtn.textContent = 'Cargando...';
        if (slotsContainer) slotsContainer.innerHTML = '';
        if (confirmBtn) confirmBtn.disabled = true;
        if (card) card.dataset.rescheduleSelectedTime = '';

        try {
          const slots = await fetchAvailability(date, duration);
          if (!Array.isArray(slots) || !slots.length) {
            if (slotsContainer) slotsContainer.innerHTML = '<div class="fd-empty-state">No hay horarios disponibles para este dia.</div>';
          } else {
            if (slotsContainer) slotsContainer.innerHTML = slots.map(slot => `
              <button type="button" class="fd-slot-item reschedule-slot-item" data-time="${slot.time}" data-selected="false">
                <span class="fd-slot-time">${slot.time}</span>
                <span class="fd-slot-users">${slot.available_users.length} disponible${slot.available_users.length !== 1 ? 's' : ''}</span>
              </button>
            `).join('');
          }
          setRescheduleMessage(form, '');
        } catch (err) {
          setRescheduleMessage(form, 'Error al consultar disponibilidad.', true);
        } finally {
          checkBtn.disabled = false;
          checkBtn.textContent = 'Ver horarios disponibles';
        }
        return;
      }

      // Select reschedule slot
      const slotBtn = e.target.closest('.reschedule-slot-item');
      if (slotBtn) {
        const form = slotBtn.closest('.reschedule-form');
        const card = slotBtn.closest('.meet-card');
        const confirmBtn = form?.querySelector('.reschedule-confirm-btn');

        form?.querySelectorAll('.reschedule-slot-item').forEach(s => {
          s.dataset.selected = 'false';
          s.classList.remove('fd-slot-item--selected');
        });
        slotBtn.dataset.selected = 'true';
        slotBtn.classList.add('fd-slot-item--selected');

        if (card) card.dataset.rescheduleSelectedTime = slotBtn.dataset.time || '';
        if (confirmBtn) confirmBtn.disabled = false;
        return;
      }

      // Confirm reschedule
      const confirmBtn = e.target.closest('.reschedule-confirm-btn');
      if (confirmBtn && !confirmBtn.disabled) {
        const form = confirmBtn.closest('.reschedule-form');
        const card = confirmBtn.closest('.meet-card');
        const dateInput = form?.querySelector('.reschedule-date');
        const durationSelect = form?.querySelector('.reschedule-duration');

        const recordId = card?.dataset.recordId || '';
        const oldCalendarEventId = card?.dataset.calendarEventId || '';
        const oldVendedora = card?.dataset.vendedora || '';
        const date = dateInput?.value || '';
        const time = card?.dataset.rescheduleSelectedTime || '';
        const duration = durationSelect?.value || '30';

        const panel = document.getElementById('custom-side-panel');
        const nombre = panel?.dataset.currentName || '';
        const telefono = panel?.dataset.currentPhone || '';
        const email = panel?.dataset.currentEmail || '';

        if (!recordId || !date || !time) {
          setRescheduleMessage(form, 'Faltan datos para reprogramar.', true);
          return;
        }

        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Reprogramando...';
        setRescheduleMessage(form, '');

        try {
          await rescheduleMeeting({ recordId, oldCalendarEventId, oldVendedora, date, time, duration, nombre, telefono, email });
          if (telefono) {
            const meetings = await fetchMeetingsData(telefono);
            updatePanelWithData(null, meetings);
          }
          setAvailabilityMessage(panel, 'Reunion reprogramada correctamente.');
        } catch (err) {
          console.error('Extension FD: error al reprogramar', err);
          setRescheduleMessage(form, 'No se pudo reprogramar la reunion.', true);
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Confirmar reprogramacion';
        }
      }
    });
  }

  /** Toma el número de conversación en Respond.io desde el subtítulo (ej. "Fase 1 - para: 5493777316555"). */
  function getRespondPagePhone() {
    const nodes = document.querySelectorAll('div.dls-whitespace-nowrap.dls-truncate');
    for (const el of nodes) {
      const text = (el.textContent || '').trim();
      const match = text.match(/para:\s*(\d+)/i);
      if (match) return match[1];
    }
    return null;
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'include',
      ...options
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  /** URL de la sala actual (sin query ni hash), p. ej. https://meet.google.com/yru-ptbw-xaf */
  function getCurrentMeetLinkForAirtable() {
    if (window.location.hostname !== 'meet.google.com') return '';
    const u = new URL(window.location.href);
    const codeMatch = (u.pathname || '').match(/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
    if (codeMatch) return `${u.origin}/${codeMatch[1].toLowerCase()}`;
    let path = u.pathname || '';
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return `${u.origin}${path}`;
  }

  function toDatetimeLocalValue(value) {
    if (value == null || value === '') return '';
    const raw = Array.isArray(value) ? value[0] : value;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function getScalarFieldValue(value) {
    if (Array.isArray(value)) return value[0];
    return value;
  }

  /** Registro de Reuniones cuyo {Link de meet} coincide con la URL actual de Meet. */
  async function fetchMeetingRecordByMeetLink(meetUrl) {
    if (!meetUrl) return null;
    try {
      const url = `${API_BASE_URL}/meetings/by-link?meetUrl=${encodeURIComponent(meetUrl)}`;
      return await fetchJson(url);
    } catch (error) {
      console.error('Extension FD: error al obtener reunión por Link de meet', error);
    }
    return null;
  }

  function applyMeetingFieldsToMeetForm(meetForm, fields) {
    if (!meetForm || !fields) return;
    const nombre = getScalarFieldValue(fields['Nombre']);
    const tipoReunion = getScalarFieldValue(fields['Tipo de Reunion']);
    const fecha = getScalarFieldValue(fields['Fecha']);
    const estado = getScalarFieldValue(fields['ESTADO']);
    const fase = getScalarFieldValue(fields['Fase del Momento']);
    const vendedora = getScalarFieldValue(fields['Vendedora']);
    const notasValue = getScalarFieldValue(fields['Notas']);

    const titleEl = meetForm.querySelector('.fd-meet-form-title');
    if (titleEl && !titleEl.querySelector('input')) {
      const name = nombre || tipoReunion;
      if (name) titleEl.textContent = String(name);
    }
    const fechaInput = meetForm.querySelector('#fd-meet-fecha');
    if (fechaInput && fecha) {
      fechaInput.value = toDatetimeLocalValue(fecha);
    }
    const estadoSel = meetForm.querySelector('#fd-meet-estado');
    if (estadoSel && estado != null) {
      const v = String(estado).trim();
      const opt = Array.from(estadoSel.options).find(o => o.value === v || o.textContent.trim() === v);
      if (opt) estadoSel.value = opt.value;
    }
    const vendSel = meetForm.querySelector('#fd-meet-vendedora');
    if (vendSel && vendedora != null) {
      const v = String(vendedora).trim();
      const opt = Array.from(vendSel.options).find(o => o.value === v || o.textContent.trim() === v);
      if (opt) vendSel.value = opt.value;
    }
    const reg = meetForm.querySelector('#fd-meet-registro');
    if (reg) reg.checked = fields['Logramos Registro?'] === true;
    const faseSel = meetForm.querySelector('#fd-meet-fase');
    if (faseSel && fase != null) {
      const v = String(fase).trim();
      const opt = Array.from(faseSel.options).find(o => o.value === v || o.textContent.trim() === v);
      if (opt) faseSel.value = opt.value;
    }
    const notas = meetForm.querySelector('#fd-meet-notas');
    if (notas && notasValue != null) notas.value = getDisplayMeetingNote(notasValue);
  }

  async function saveMeetingFormToAirtable(meetForm) {
    if (!meetForm) return;
    const guardarBtn = meetForm.querySelector('#fd-meet-guardar');
    if (guardarBtn?.dataset.loading === 'true') return;

    let loadingInterval = null;
    const startLoadingState = () => {
      if (!guardarBtn) return;
      guardarBtn.dataset.loading = 'true';
      guardarBtn.disabled = true;
      guardarBtn.style.opacity = '0.8';
      guardarBtn.style.cursor = 'wait';
      guardarBtn.style.minWidth = '110px';
      let dots = 0;
      loadingInterval = setInterval(() => {
        dots = (dots + 1) % 4;
        guardarBtn.textContent = `Guardando${'.'.repeat(dots)}`;
      }, 220);
    };

    const stopLoadingState = () => {
      if (loadingInterval) clearInterval(loadingInterval);
      if (!guardarBtn) return;
      guardarBtn.dataset.loading = 'false';
      guardarBtn.disabled = false;
      guardarBtn.style.opacity = '';
      guardarBtn.style.cursor = '';
      guardarBtn.textContent = 'Guardar';
    };

    const recordId = meetForm.dataset.airtableRecordId;
    if (!recordId) {
      console.warn('Extension FD: no hay id de record para guardar.');
      return;
    }

    const nombreEl = meetForm.querySelector('.fd-meet-form-title');
    const estadoEl = meetForm.querySelector('#fd-meet-estado');
    const notasEl = meetForm.querySelector('#fd-meet-notas');
    const vendedoraEl = meetForm.querySelector('#fd-meet-vendedora');
    const faseEl = meetForm.querySelector('#fd-meet-fase');
    const registroEl = meetForm.querySelector('#fd-meet-registro');
    const fechaEl = meetForm.querySelector('#fd-meet-fecha');

    const rawFecha = fechaEl?.value ? new Date(fechaEl.value) : null;
    const fechaIso = rawFecha && !Number.isNaN(rawFecha.getTime()) ? rawFecha.toISOString() : null;

    const body = {
      'Nombre': (nombreEl?.textContent || '').trim(),
      'ESTADO': estadoEl?.value || '',
      'Notas': notasEl?.value || '',
      'Vendedora': vendedoraEl?.value || '',
      'Fase del Momento': faseEl?.value || 'FASE 1',
      'Logramos Registro?': Boolean(registroEl?.checked),
      ...(fechaIso ? { 'Fecha': fechaIso } : {})
    };

    startLoadingState();
    try {
      const result = await fetchJson(`${API_BASE_URL}/meetings/${encodeURIComponent(recordId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      console.log('Extension FD: reunión guardada correctamente', result);
    } catch (error) {
      console.error('Extension FD: error de red al guardar reunión', error);
    } finally {
      stopLoadingState();
    }
  }

  async function fetchContactData(phone) {
    try {
      return await fetchJson(`${API_BASE_URL}/contact/${encodeURIComponent(phone)}`);
    } catch (error) {
      console.error('Extension FD: error al obtener contacto', error);
    }
    return null;
  }

  async function fetchMeetingsData(phone) {
    try {
      return await fetchJson(`${API_BASE_URL}/meetings/${encodeURIComponent(phone)}`);
    } catch (error) {
      console.error('Extension FD: error al obtener reuniones', error);
      return [];
    }
  }

  function getTodayDateValue() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async function fetchAvailability(date, duration) {
    const params = new URLSearchParams({
      date,
      duration: String(duration)
    });
    return fetchJson(`${API_BASE_URL}/availability?${params.toString()}`);
  }

  async function fetchCurrentUser() {
    return fetchJson(`${API_BASE_URL}/me`);
  }

  async function bookMeeting({ telefono, nombre, email, date, time, duration }) {
    return fetchJson(`${API_BASE_URL}/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        telefono,
        nombre,
        email,
        date,
        time,
        duration: Number(duration)
      })
    });
  }

  async function rescheduleMeeting({ recordId, oldCalendarEventId, oldVendedora, date, time, duration, nombre, telefono, email }) {
    return fetchJson(`${API_BASE_URL}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId, oldCalendarEventId, oldVendedora, date, time, duration: Number(duration), nombre, telefono, email })
    });
  }

  async function updateSellerAvailability(recordId, puedeRecibirReuniones) {
    return fetchJson(`${API_BASE_URL}/sellers/${encodeURIComponent(recordId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        puede_recibir_reuniones: Boolean(puedeRecibirReuniones)
      })
    });
  }

  async function fetchWorkHours(recordId) {
    return fetchJson(`${API_BASE_URL}/work-hours/${encodeURIComponent(recordId)}`);
  }

  async function saveWorkHours(recordId, { enabled, ranges, weekly }) {
    return fetchJson(`${API_BASE_URL}/work-hours/${encodeURIComponent(recordId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        enabled: Boolean(enabled),
        ranges,
        weekly
      })
    });
  }

  async function createSellerBlock({ usuarioRecordId, fecha, todoElDia = true, horaInicio = '', horaFin = '', motivo }) {
    return fetchJson(`${API_BASE_URL}/seller-blocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: `bloq-${usuarioRecordId}-${fecha}-${Date.now()}`,
        usuarioRecordId,
        fecha,
        todo_el_dia: Boolean(todoElDia),
        hora_inicio: todoElDia ? '' : horaInicio,
        hora_fin: todoElDia ? '' : horaFin,
        motivo: motivo || 'Bloqueo creado desde la extension',
        activo: true
      })
    });
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  function getAvailabilityItemClass(isSelected = false) {
    return isSelected ? 'fd-slot-item fd-slot-item--selected' : 'fd-slot-item';
  }

  function setAvailabilityMessage(panel, message, isError = false) {
    const results = panel?.querySelector('#availability-results');
    if (!results) return;
    results.innerHTML = `<div class="fd-msg${isError ? ' fd-msg--error' : ''}">${escapeHtml(message)}</div>`;
  }

  function setBookingMessage(panel, message, isError = false, link = '') {
    const messageEl = panel?.querySelector('#booking-message');
    if (!messageEl) return;

    if (!message) {
      messageEl.textContent = '';
      messageEl.style.display = 'none';
      return;
    }

    const safeMessage = escapeHtml(message);
    const safeLink = escapeHtml(link);
    messageEl.className = `fd-msg${isError ? ' fd-msg--error' : ' fd-msg--success'}`;
    messageEl.innerHTML = safeLink
      ? `${safeMessage}<a href="${safeLink}" target="_blank" rel="noopener noreferrer" class="fd-msg-link">Abrir Meet</a>`
      : safeMessage;
    messageEl.style.display = 'block';
  }

  function setBookingButtonState(panel, enabled) {
    const bookButton = panel?.querySelector('#booking-create-btn');
    if (!bookButton) return;
    bookButton.disabled = !enabled;
  }

  function getStatusBadgeClass(status) {
    const s = (status || '').toLowerCase();
    if (s === 'realizada') return 'fd-badge fd-badge--green';
    if (s === 'pendiente') return 'fd-badge fd-badge--amber';
    if (s === 'cancelada') return 'fd-badge fd-badge--gray';
    return 'fd-badge fd-badge--gray';
  }

  function getInitials(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  function normalizeUserRole(role) {
    return String(role || '').trim().toLowerCase();
  }

  function isManagerRole(role) {
    return normalizeUserRole(role) === 'gerente';
  }

  function getPanelRole(panel) {
    return panel?.dataset.currentUserRole || '';
  }

  function activatePanelTab(panel, tabName) {
    if (!panel) return;

    const canSeeTeam = isManagerRole(getPanelRole(panel));
    const nextTab = tabName === 'team' && !canSeeTeam ? 'summary' : (tabName || 'summary');

    panel.querySelectorAll('.fd-tab-btn').forEach(btn => {
      const isActive = btn.dataset.tab === nextTab;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    panel.querySelectorAll('.fd-tab-panel').forEach(tabPanel => {
      const isActive = tabPanel.dataset.tabPanel === nextTab;
      tabPanel.classList.toggle('is-active', isActive);
      tabPanel.hidden = !isActive;
    });

    if (nextTab === 'team') {
      const teamPanel = panel.querySelector('#fd-team-panel');
      if (teamPanel && teamPanel.dataset.loaded !== 'true') {
        renderEquipoView(panel, teamPanel, { embedded: true });
        teamPanel.dataset.loaded = 'true';
      }
    }
  }

  function configureRoleTabs(panel, role) {
    if (!panel) return;

    const canSeeTeam = isManagerRole(role);
    const teamTab = panel.querySelector('[data-tab="team"]');
    const teamPanel = panel.querySelector('#fd-team-panel');

    if (teamTab) teamTab.hidden = !canSeeTeam;
    if (teamPanel) {
      teamPanel.hidden = true;
      teamPanel.classList.remove('is-active');
      if (!canSeeTeam) {
        teamPanel.innerHTML = '';
        teamPanel.dataset.loaded = 'false';
      }
    }

    const activeTab = panel.querySelector('.fd-tab-btn.is-active')?.dataset.tab || 'summary';
    activatePanelTab(panel, activeTab === 'team' && !canSeeTeam ? 'summary' : activeTab);
  }

  function bindPanelTabs(panel) {
    const tabList = panel?.querySelector('#fd-panel-tabs');
    if (!tabList || tabList.dataset.bound === 'true') return;
    tabList.dataset.bound = 'true';

    tabList.addEventListener('click', (event) => {
      const btn = event.target.closest('.fd-tab-btn');
      if (!btn || btn.hidden) return;
      activatePanelTab(panel, btn.dataset.tab);
    });
  }

  function renderCurrentUser(panel, currentUser) {
    const container = panel?.querySelector('#fd-current-user');
    if (!container) return;

    if (!currentUser?.authenticated) {
      renderRoleActions(panel, null);
      container.innerHTML = `
        <div class="fd-user-status fd-user-status--warning">
          <div class="fd-user-identity">
            <div class="fd-user-avatar fd-user-avatar--warning">!</div>
            <div class="fd-user-info">
              <div class="fd-user-name">Google no conectado</div>
              <div class="fd-user-email">Conecta tu cuenta para continuar</div>
            </div>
          </div>
          <button type="button" id="fd-login-google-btn">Conectar con Google</button>
        </div>
      `;
      container.querySelector('#fd-login-google-btn')?.addEventListener('click', () => {
        window.open('http://localhost:3000/auth/google', '_blank', 'noopener,noreferrer');
      });
      return;
    }

    const usuario = currentUser.usuario;
    const displayName = usuario?.nombre || currentUser.email;
    const role = usuario?.rol || currentUser.auth?.rol || 'Sin rol';
    const initials = getInitials(displayName);

    if (isManagerRole(role)) {
      const puedeAtender = usuario?.puede_crear_meets === true;
      container.innerHTML = `
        <div class="fd-user-status">
          <div class="fd-user-identity">
            <div class="fd-user-avatar fd-user-avatar--gerente">${escapeHtml(initials)}</div>
            <div class="fd-user-info">
              <div class="fd-user-name">${escapeHtml(displayName)}</div>
              <div class="fd-user-email">${escapeHtml(currentUser.email)}</div>
            </div>
          </div>
          <div class="fd-badges">
            <span class="fd-badge fd-badge--blue">Gerente</span>
            ${puedeAtender
              ? '<span class="fd-badge fd-badge--green">Atiende reuniones</span>'
              : '<span class="fd-badge fd-badge--gray">No atiende reuniones</span>'
            }
          </div>
        </div>
      `;
    } else {
      const recibe = usuario?.puede_recibir_reuniones;
      const meet = usuario?.puede_crear_meets;
      container.innerHTML = `
        <div class="fd-user-status">
          <div class="fd-user-identity">
            <div class="fd-user-avatar fd-user-avatar--vendedora">${escapeHtml(initials)}</div>
            <div class="fd-user-info">
              <div class="fd-user-name">${escapeHtml(displayName)}</div>
              <div class="fd-user-email">${escapeHtml(currentUser.email)}</div>
            </div>
          </div>
          <div class="fd-badges">
            <span class="fd-badge fd-badge--violet">Vendedora</span>
            <span class="fd-badge ${recibe ? 'fd-badge--green' : 'fd-badge--gray'}">${recibe ? 'Recibe reuniones' : 'No recibe'}</span>
            ${meet ? '<span class="fd-badge fd-badge--blue">Meet</span>' : ''}
          </div>
        </div>
      `;
    }

    renderRoleActions(panel, currentUser);
  }

  function setRescheduleMessage(form, message, isError = false) {
    const el = form?.querySelector('.reschedule-message');
    if (!el) return;
    el.textContent = message || '';
    el.style.display = message ? 'block' : 'none';
    el.className = `reschedule-message fd-msg${message ? (isError ? ' fd-msg--error' : ' fd-msg--success') : ''}`;
  }

  function setRoleActionMessage(panel, message, isError = false) {
    const messageEl = panel?.querySelector('#fd-role-action-message');
    if (!messageEl) return;
    messageEl.textContent = message || '';
    messageEl.style.display = message ? 'block' : 'none';
    messageEl.className = `fd-role-action-message fd-msg${message ? (isError ? ' fd-msg--error' : '') : ''}`;
  }

  function setReceiveMeetingsLabel(panel, recibe) {
    const statusEl = panel?.querySelector('#fd-receive-status');
    const toggle = panel?.querySelector('#fd-receive-toggle');
    if (statusEl) {
      statusEl.textContent = recibe ? 'Puede recibir reuniones' : 'No puede recibir reuniones';
      statusEl.className = `fd-badge ${recibe ? 'fd-badge--green' : 'fd-badge--gray'}`;
    }
    if (toggle) {
      toggle.textContent = recibe ? 'Pausar recepcion' : 'Activar recepcion';
      toggle.dataset.receives = recibe ? 'true' : 'false';
    }
  }

  const WORK_HOUR_DAYS = [
    ['monday', 'Lunes'],
    ['tuesday', 'Martes'],
    ['wednesday', 'Miercoles'],
    ['thursday', 'Jueves'],
    ['friday', 'Viernes'],
    ['saturday', 'Sabado'],
    ['sunday', 'Domingo']
  ];

  function getDefaultWorkHourRanges(day = 'monday') {
    if (day === 'saturday') return [{ start: '08:00', end: '12:00' }];
    if (day === 'sunday') return [];
    return [
      { start: '09:00', end: '12:00' },
      { start: '14:00', end: '18:00' }
    ];
  }

  function getDefaultWeeklyWorkHours() {
    return Object.fromEntries(WORK_HOUR_DAYS.map(([day]) => [
      day,
      {
        enabled: !['saturday', 'sunday'].includes(day),
        ranges: getDefaultWorkHourRanges(day)
      }
    ]));
  }

  function renderWorkHourRows(container, day, ranges = []) {
    const list = container?.querySelector('#fd-work-hours-list');
    if (!list) return;

    const dayList = list.querySelector(`[data-work-day-ranges="${day}"]`);
    if (!dayList) return;

    const normalizedRanges = ranges.length ? ranges : getDefaultWorkHourRanges(day);
    dayList.innerHTML = normalizedRanges.map((range, index) => `
      <div class="fd-work-hour-row" data-day="${escapeHtml(day)}">
        <input type="time" class="fd-work-hour-start" value="${escapeHtml(range.start || '09:00')}" aria-label="Inicio rango ${index + 1}" />
        <input type="time" class="fd-work-hour-end" value="${escapeHtml(range.end || '12:00')}" aria-label="Fin rango ${index + 1}" />
        <button type="button" class="fd-work-hour-remove" aria-label="Quitar rango">Quitar</button>
      </div>
    `).join('');
  }

  function renderWeeklyWorkHours(container, weekly = getDefaultWeeklyWorkHours()) {
    const list = container?.querySelector('#fd-work-hours-list');
    if (!list) return;

    const defaults = getDefaultWeeklyWorkHours();
    list.innerHTML = WORK_HOUR_DAYS.map(([day, label]) => {
      const config = weekly?.[day] || defaults[day];
      return `
        <div class="fd-work-day" data-work-day="${escapeHtml(day)}">
          <label class="fd-check-row fd-work-day-head">
            <input type="checkbox" class="fd-work-day-enabled" ${config.enabled ? 'checked' : ''} />
            <span>${escapeHtml(label)}</span>
          </label>
          <div class="fd-work-day-ranges" data-work-day-ranges="${escapeHtml(day)}"></div>
          <button type="button" class="fd-work-hour-add-day fd-secondary-action" data-day="${escapeHtml(day)}">Agregar rango</button>
        </div>
      `;
    }).join('');

    WORK_HOUR_DAYS.forEach(([day]) => {
      renderWorkHourRows(container, day, weekly?.[day]?.ranges || defaults[day].ranges);
    });
  }

  function collectWorkHourRanges(container, day) {
    return Array.from(container?.querySelectorAll(`[data-work-day-ranges="${day}"] .fd-work-hour-row`) || [])
      .map((row) => ({
        start: row.querySelector('.fd-work-hour-start')?.value || '',
        end: row.querySelector('.fd-work-hour-end')?.value || ''
      }))
      .filter((range) => range.start && range.end);
  }

  function collectWeeklyWorkHours(container) {
    return Object.fromEntries(WORK_HOUR_DAYS.map(([day]) => {
      const dayEl = container?.querySelector(`[data-work-day="${day}"]`);
      return [
        day,
        {
          enabled: dayEl?.querySelector('.fd-work-day-enabled')?.checked === true,
          ranges: collectWorkHourRanges(container, day)
        }
      ];
    }));
  }

  function setWorkHoursMessage(panel, message, isError = false) {
    const messageEl = panel?.querySelector('#fd-work-hours-message');
    if (!messageEl) return;
    messageEl.textContent = message || '';
    messageEl.style.display = message ? 'block' : 'none';
    messageEl.className = `fd-role-action-message fd-msg${message ? (isError ? ' fd-msg--error' : '') : ''}`;
  }

  function renderRoleActions(panel, currentUser) {
    const container = panel?.querySelector('#fd-role-actions');
    if (!container) return;

    const usuario = currentUser?.usuario;
    const role = usuario?.rol || currentUser?.auth?.rol || '';

    const normalizedRole = normalizeUserRole(role);
    const canManageOwnAvailability = normalizedRole === 'vendedora' || normalizedRole === 'gerente';
    const canUseCustomWorkHours = normalizedRole === 'vendedora' || (normalizedRole === 'gerente' && usuario?.puede_crear_meets === true);
    if (!currentUser?.authenticated || !canManageOwnAvailability || !usuario?.recordId) {
      container.innerHTML = '';
      return;
    }

    const recibe = usuario?.puede_recibir_reuniones === true;

    container.innerHTML = `
      <div class="fd-role-card">
        <div class="fd-role-card-head">
          <strong>Mi disponibilidad</strong>
          <span>Configura si puedes recibir reuniones y bloquea dias o rangos horarios.</span>
          <span id="fd-receive-status" class="fd-badge ${recibe ? 'fd-badge--green' : 'fd-badge--gray'}">${recibe ? 'Puede recibir reuniones' : 'No puede recibir reuniones'}</span>
        </div>
        <button type="button" id="fd-receive-toggle" class="fd-secondary-action" data-receives="${recibe ? 'true' : 'false'}">${recibe ? 'Pausar recepcion' : 'Activar recepcion'}</button>
        <div class="fd-role-divider"></div>
        ${canUseCustomWorkHours ? `
        <div>
          <strong>Horario laboral personalizado</strong>
          <span>Configura la semana laboral por día. Puedes agregar mañana y tarde, o sábado al mediodía.</span>
        </div>
        <label class="fd-check-row">
          <input id="fd-work-hours-enabled" type="checkbox" />
          <span>Usar horario personalizado</span>
        </label>
        <div id="fd-work-hours-list" class="fd-work-hours-list"></div>
        <button type="button" id="fd-work-hours-save">Guardar horario</button>
        <div id="fd-work-hours-message" class="fd-role-action-message"></div>
        <div class="fd-role-divider"></div>
        ` : ''}
        <div>
          <strong>Bloqueos temporales</strong>
          <span>Usa dia completo para hoy o vacaciones, o rango horario para cortes puntuales.</span>
        </div>
        <select id="fd-block-type">
          <option value="day">Dia completo</option>
          <option value="range">Rango horario</option>
        </select>
        <input id="fd-block-date" type="date" />
        <div id="fd-block-time-row" class="fd-time-row" hidden>
          <input id="fd-block-start" type="time" value="14:00" />
          <input id="fd-block-end" type="time" value="18:00" />
        </div>
        <textarea id="fd-block-reason" rows="2" placeholder="Motivo opcional"></textarea>
        <button type="button" id="fd-block-day-btn">Crear bloqueo</button>
        <div id="fd-role-action-message" class="fd-role-action-message"></div>
      </div>
    `;

    const receiveToggle = container.querySelector('#fd-receive-toggle');
    const workHoursEnabled = container.querySelector('#fd-work-hours-enabled');
    const workHoursSave = container.querySelector('#fd-work-hours-save');
    const workHoursList = container.querySelector('#fd-work-hours-list');
    const blockType = container.querySelector('#fd-block-type');
    const dateInput = container.querySelector('#fd-block-date');
    const timeRow = container.querySelector('#fd-block-time-row');
    const startInput = container.querySelector('#fd-block-start');
    const endInput = container.querySelector('#fd-block-end');
    const reasonInput = container.querySelector('#fd-block-reason');
    const blockButton = container.querySelector('#fd-block-day-btn');

    if (dateInput && !dateInput.value) {
      dateInput.value = getTodayDateValue();
      dateInput.min = getTodayDateValue();
    }

    if (canUseCustomWorkHours && workHoursList) {
      renderWeeklyWorkHours(container, getDefaultWeeklyWorkHours());
      fetchWorkHours(usuario.recordId)
        .then((workHours) => {
          if (workHoursEnabled) workHoursEnabled.checked = workHours?.enabled === true;
          renderWeeklyWorkHours(container, workHours?.weekly || getDefaultWeeklyWorkHours());
        })
        .catch((error) => {
          console.error('Extension FD: error al cargar horario laboral', error);
          setWorkHoursMessage(panel, 'No se pudo cargar el horario personalizado.', true);
        });
    }

    workHoursList?.addEventListener('click', (event) => {
      const removeButton = event.target.closest('.fd-work-hour-remove');
      const addButton = event.target.closest('.fd-work-hour-add-day');

      if (addButton) {
        const day = addButton.dataset.day;
        const ranges = collectWorkHourRanges(container, day);
        if (ranges.length >= 4) {
          setWorkHoursMessage(panel, 'Puedes cargar hasta 4 rangos por dia.', true);
          return;
        }
        renderWorkHourRows(container, day, [...ranges, { start: day === 'saturday' ? '08:00' : '14:00', end: day === 'saturday' ? '12:00' : '18:00' }]);
        setWorkHoursMessage(panel, '');
        return;
      }

      if (!removeButton) return;
      const day = removeButton.closest('.fd-work-hour-row')?.dataset.day;
      const rows = workHoursList.querySelectorAll(`[data-work-day-ranges="${day}"] .fd-work-hour-row`);
      if (rows.length <= 1) {
        setWorkHoursMessage(panel, 'Debe quedar al menos un rango si el dia esta activo.', true);
        return;
      }
      removeButton.closest('.fd-work-hour-row')?.remove();
      setWorkHoursMessage(panel, '');
    });

    workHoursSave?.addEventListener('click', async () => {
      const weekly = collectWeeklyWorkHours(container);
      const enabled = workHoursEnabled?.checked === true;

      const enabledDays = WORK_HOUR_DAYS.filter(([day]) => weekly[day].enabled);
      if (enabled && !enabledDays.length) {
        setWorkHoursMessage(panel, 'Activa al menos un dia para usar horario personalizado.', true);
        return;
      }

      const invalidDay = enabledDays.find(([day]) => {
        return !weekly[day].ranges.length || weekly[day].ranges.some((range) => range.start >= range.end);
      });
      if (invalidDay) {
        setWorkHoursMessage(panel, 'Cada dia activo debe tener rangos validos.', true);
        return;
      }

      workHoursSave.disabled = true;
      workHoursSave.textContent = 'Guardando...';
      setWorkHoursMessage(panel, 'Guardando horario personalizado...');

      try {
        const saved = await saveWorkHours(usuario.recordId, { enabled, weekly });
        if (workHoursEnabled) workHoursEnabled.checked = saved.enabled === true;
        renderWeeklyWorkHours(container, saved.weekly || getDefaultWeeklyWorkHours());
        setWorkHoursMessage(panel, saved.enabled ? 'Horario personalizado guardado.' : 'Horario personalizado desactivado.');
      } catch (error) {
        console.error('Extension FD: error al guardar horario laboral', error);
        setWorkHoursMessage(panel, 'No se pudo guardar el horario personalizado.', true);
      } finally {
        workHoursSave.disabled = false;
        workHoursSave.textContent = 'Guardar horario';
      }
    });

    blockType?.addEventListener('change', () => {
      const isRange = blockType.value === 'range';
      if (timeRow) timeRow.hidden = !isRange;
      if (startInput) startInput.disabled = !isRange;
      if (endInput) endInput.disabled = !isRange;
    });

    receiveToggle?.addEventListener('click', async () => {
      const nextValue = receiveToggle.dataset.receives !== 'true';
      receiveToggle.disabled = true;
      receiveToggle.textContent = 'Guardando...';
      setRoleActionMessage(panel, nextValue ? 'Activando recepcion de reuniones...' : 'Pausando recepcion de reuniones...');

      try {
        await updateSellerAvailability(usuario.recordId, nextValue);
        usuario.puede_recibir_reuniones = nextValue;
        setReceiveMeetingsLabel(panel, nextValue);
        renderCurrentUser(panel, currentUser);
        setRoleActionMessage(panel, nextValue ? 'Ya puedes recibir reuniones.' : 'Recepcion de reuniones pausada.');
      } catch (error) {
        console.error('Extension FD: error al actualizar recepcion de reuniones', error);
        setReceiveMeetingsLabel(panel, !nextValue);
        setRoleActionMessage(panel, 'No se pudo actualizar la recepcion de reuniones.', true);
      } finally {
        receiveToggle.disabled = false;
      }
    });

    blockButton?.addEventListener('click', async () => {
      const fecha = dateInput?.value || '';
      const isRange = blockType?.value === 'range';
      const horaInicio = startInput?.value || '';
      const horaFin = endInput?.value || '';
      if (!fecha) {
        setRoleActionMessage(panel, 'Selecciona una fecha para bloquear.', true);
        return;
      }

      if (isRange && (!horaInicio || !horaFin)) {
        setRoleActionMessage(panel, 'Completa hora de inicio y fin.', true);
        return;
      }

      if (isRange && horaInicio >= horaFin) {
        setRoleActionMessage(panel, 'La hora de fin debe ser posterior al inicio.', true);
        return;
      }

      blockButton.disabled = true;
      blockButton.textContent = 'Bloqueando...';
      setRoleActionMessage(panel, 'Creando bloqueo...');

      try {
        await createSellerBlock({
          usuarioRecordId: usuario.recordId,
          fecha,
          todoElDia: !isRange,
          horaInicio,
          horaFin,
          motivo: reasonInput?.value || ''
        });
        setRoleActionMessage(panel, isRange ? 'Rango horario bloqueado correctamente.' : 'Dia bloqueado correctamente.');
        if (reasonInput) reasonInput.value = '';
        panel.dataset.selectedBookingTime = '';
        setBookingButtonState(panel, false);
        setAvailabilityMessage(panel, 'Bloqueo creado. Volve a consultar disponibilidad si necesitas revisar horarios.');
      } catch (error) {
        console.error('Extension FD: error al crear bloqueo', error);
        setRoleActionMessage(panel, 'No se pudo crear el bloqueo.', true);
      } finally {
        blockButton.disabled = false;
        blockButton.textContent = 'Crear bloqueo';
      }
    });
  }

  function renderGerenteSection(panel) {
    const container = panel?.querySelector('#fd-gerente-section');
    if (!container) return;

    if (!isManagerRole(getPanelRole(panel))) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <button type="button" id="fd-equipo-btn">
        <span>Gestion del equipo</span>
        <i data-component="FontIcon" class="icon icon-chevron-right dls-size-icon-lg dls-text-icon-lg"></i>
      </button>
    `;

    container.querySelector('#fd-equipo-btn')?.addEventListener('click', () => openEquipoView(panel));
  }

  function openEquipoView(panel) {
    if (!isManagerRole(getPanelRole(panel))) return;

    const main = panel?.querySelector('#fd-panel-main');
    const view = panel?.querySelector('#fd-equipo-view');
    if (!main || !view) return;
    main.style.display = 'none';
    view.style.display = 'flex';
    renderEquipoView(panel, view);
  }

  function closeEquipoView(panel) {
    const main = panel?.querySelector('#fd-panel-main');
    const view = panel?.querySelector('#fd-equipo-view');
    if (!main || !view) return;
    view.style.display = '';
    main.style.display = '';
  }

  async function loadSellersIntoView(view) {
    const panel = view?.closest('#custom-side-panel');
    if (!isManagerRole(getPanelRole(panel))) return;

    const listEl = view.querySelector('#fd-equipo-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="fd-empty-state">Cargando vendedoras...</div>';

    try {
      const sellers = await fetchJson(`${API_BASE_URL}/sellers`);
      if (!sellers.length) {
        listEl.innerHTML = '<div class="fd-empty-state">Sin vendedoras registradas.</div>';
        return;
      }

      listEl.innerHTML = sellers.map(seller => {
        const activa = seller.activa;
        const recibe = seller.puede_recibir_reuniones;
        const rid = escapeHtml(seller.recordId || '');
        return `
          <div class="fd-seller-card">
            <div class="fd-seller-top">
              <span class="fd-seller-name">${escapeHtml(seller.nombre || seller.correo)}</span>
              <div class="fd-badges">
                <span class="fd-badge ${activa ? 'fd-badge--green' : 'fd-badge--gray'}">${activa ? 'Activa' : 'Inactiva'}</span>
                <span class="fd-badge ${recibe ? 'fd-badge--blue' : 'fd-badge--gray'}">${recibe ? 'Recibe reuniones' : 'Reuniones pausadas'}</span>
              </div>
            </div>
            <div class="fd-seller-email">${escapeHtml(seller.correo || '')}</div>
            <div class="fd-seller-actions">
              <button type="button" class="fd-seller-btn fd-seller-toggle" data-id="${rid}" data-action="toggle-active">${activa ? 'Desactivar usuaria' : 'Activar usuaria'}</button>
              <button type="button" class="fd-seller-btn fd-seller-toggle" data-id="${rid}" data-action="toggle-receives">${recibe ? 'Pausar reuniones' : 'Recibir reuniones'}</button>
            </div>
          </div>
        `;
      }).join('');

      listEl.querySelectorAll('.fd-seller-toggle').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const action = btn.dataset.action;
          if (!id) return;

          btn.disabled = true;
          btn.textContent = '···';

          try {
            const currentSellers = await fetchJson(`${API_BASE_URL}/sellers`);
            const seller = currentSellers.find(s => s.recordId === id);
            if (!seller) throw new Error('Vendedora no encontrada');

            let body;
            if (action === 'toggle-active') {
              body = { activa: !seller.activa, puede_recibir_reuniones: seller.activa ? false : seller.puede_recibir_reuniones };
            } else {
              body = { puede_recibir_reuniones: !seller.puede_recibir_reuniones };
            }

            await fetchJson(`${API_BASE_URL}/sellers/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
            });

            await loadSellersIntoView(view);
          } catch (err) {
            console.error('Extension FD: error al actualizar vendedora', err);
            btn.disabled = false;
            btn.textContent = 'Error';
            setTimeout(() => loadSellersIntoView(view), 1200);
          }
        });
      });
    } catch (err) {
      console.error('Extension FD: error al cargar vendedoras', err);
      listEl.innerHTML = '<div class="fd-msg fd-msg--error">Error al cargar las vendedoras.</div>';
    }
  }

  function setAddSellerMessage(msgEl, text, isError) {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.className = `fd-msg ${isError ? 'fd-msg--error' : 'fd-msg--success'}`;
    msgEl.style.display = text ? 'block' : 'none';
  }

  function renderEquipoView(panel, view, options = {}) {
    if (!isManagerRole(getPanelRole(panel))) {
      if (view) view.innerHTML = '';
      return;
    }

    const isEmbedded = options.embedded === true;

    view.innerHTML = `
      <div class="fd-equipo-topbar">
        <button type="button" id="fd-equipo-back" class="fd-equipo-back-btn" ${isEmbedded ? 'hidden' : ''}>
          Volver
        </button>
        <span class="fd-equipo-title">Gestion del equipo</span>
      </div>

      <div id="fd-equipo-list"></div>

      <div class="fd-add-seller-section">
        <div class="fd-add-seller-title">Agregar vendedora</div>
        <div class="fd-add-seller-form">
          <input id="fd-new-seller-id" type="text" placeholder="ID (ej: V001)" />
          <input id="fd-new-seller-nombre" type="text" placeholder="Nombre completo" />
          <input id="fd-new-seller-correo" type="email" placeholder="Correo electronico" />
          <input id="fd-new-seller-telefono" type="text" placeholder="Telefono (opcional)" />
          <button type="button" id="fd-add-seller-btn" class="fd-add-seller-btn">Agregar vendedora</button>
          <div id="fd-add-seller-msg" class="fd-msg" style="display:none;"></div>
        </div>
      </div>
    `;

    if (!isEmbedded) {
      view.querySelector('#fd-equipo-back')?.addEventListener('click', () => closeEquipoView(panel));
    }

    loadSellersIntoView(view);

    view.querySelector('#fd-add-seller-btn')?.addEventListener('click', async () => {
      const idInput = view.querySelector('#fd-new-seller-id');
      const nombreInput = view.querySelector('#fd-new-seller-nombre');
      const correoInput = view.querySelector('#fd-new-seller-correo');
      const telefonoInput = view.querySelector('#fd-new-seller-telefono');
      const msgEl = view.querySelector('#fd-add-seller-msg');
      const addBtn = view.querySelector('#fd-add-seller-btn');

      const id = idInput?.value.trim();
      const nombre = nombreInput?.value.trim();
      const correo = correoInput?.value.trim();
      const telefono = telefonoInput?.value.trim();

      if (!id || !nombre || !correo) {
        setAddSellerMessage(msgEl, 'ID, nombre y correo son obligatorios.', true);
        return;
      }

      addBtn.disabled = true;
      addBtn.textContent = 'Agregando...';
      msgEl.style.display = 'none';

      try {
        await fetchJson(`${API_BASE_URL}/sellers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, nombre, correo, telefono })
        });

        if (idInput) idInput.value = '';
        if (nombreInput) nombreInput.value = '';
        if (correoInput) correoInput.value = '';
        if (telefonoInput) telefonoInput.value = '';
        setAddSellerMessage(msgEl, 'Vendedora agregada correctamente.', false);
        await loadSellersIntoView(view);
      } catch (err) {
        console.error('Extension FD: error al agregar vendedora', err);
        const errorMessage = String(err?.message || '');
        const isDuplicateEmail = errorMessage.includes('409') || errorMessage.includes('Seller email already exists') || errorMessage.includes('Ya existe un usuario');
        setAddSellerMessage(
          msgEl,
          isDuplicateEmail ? 'Ya existe un usuario con ese correo.' : 'No se pudo agregar la vendedora.',
          true
        );
      } finally {
        addBtn.disabled = false;
        addBtn.textContent = 'Agregar vendedora';
      }
    });
  }

  async function refreshCurrentUser(panel) {
    const container = panel?.querySelector('#fd-current-user');
    if (container) {
      container.innerHTML = `
        <div class="fd-user-status">
          <div class="fd-user-identity">
            <div class="fd-user-avatar fd-user-avatar--gray">···</div>
            <div class="fd-user-info">
              <div class="fd-user-name">Cargando usuario...</div>
              <div class="fd-user-email">Consultando sesion actual</div>
            </div>
          </div>
        </div>
      `;
    }

    try {
      const currentUser = await fetchCurrentUser();
      panel.dataset.currentUserRole = currentUser?.usuario?.rol || currentUser?.auth?.rol || '';
      panel.dataset.currentUserEmail = currentUser?.email || '';
      renderCurrentUser(panel, currentUser);
      configureRoleTabs(panel, panel.dataset.currentUserRole);

      const gerenteSection = panel?.querySelector('#fd-gerente-section');
      if (gerenteSection) {
        gerenteSection.innerHTML = '';
      }
    } catch (error) {
      console.error('Extension FD: error al obtener usuario actual', error);
      panel.dataset.currentUserRole = '';
      panel.dataset.currentUserEmail = '';
      configureRoleTabs(panel, '');
      if (container) {
        container.innerHTML = `
          <div class="fd-user-status fd-user-status--warning">
            <div class="fd-user-identity">
              <div class="fd-user-avatar fd-user-avatar--warning">!</div>
              <div class="fd-user-info">
                <div class="fd-user-name">No se pudo cargar la sesion</div>
                <div class="fd-user-email">Revisa que el backend este activo.</div>
              </div>
            </div>
          </div>
        `;
      }
    }
  }

  function clearSelectedBookingSlot(panel) {
    if (!panel) return;

    panel.dataset.selectedBookingTime = '';
    panel.querySelectorAll('.availability-slot-item').forEach(slotItem => {
      slotItem.dataset.selected = 'false';
      slotItem.classList.remove('fd-slot-item--selected');
    });
    setBookingButtonState(panel, false);
  }

  function renderAvailabilityResults(panel, slots = []) {
    const results = panel?.querySelector('#availability-results');
    if (!results) return;

    if (!slots.length) {
      panel.dataset.selectedBookingTime = '';
      setAvailabilityMessage(panel, 'No hay disponibilidad para este dia');
      setBookingButtonState(panel, false);
      return;
    }

    panel.dataset.selectedBookingTime = '';
    setBookingMessage(panel, '');
    setBookingButtonState(panel, false);

    results.innerHTML = slots.map(slot => `
      <button type="button" class="fd-slot-item availability-slot-item" data-time="${slot.time}" data-selected="false">
        <span class="fd-slot-time">${slot.time}</span>
        <span class="fd-slot-users">${slot.available_users.length} disponible${slot.available_users.length === 1 ? '' : 's'}</span>
      </button>
    `).join('');
  }

  function bindAvailabilityInteractions(panel) {
    if (!panel || panel.dataset.availabilityBound === 'true') return;
    panel.dataset.availabilityBound = 'true';

    const dateInput = panel.querySelector('#availability-date');
    const durationSelect = panel.querySelector('#availability-duration');
    const actionButton = panel.querySelector('#availability-check-btn');
    const bookButton = panel.querySelector('#booking-create-btn');
    const results = panel.querySelector('#availability-results');

    if (dateInput && !dateInput.value) {
      dateInput.value = getTodayDateValue();
      dateInput.min = getTodayDateValue();
    }

    actionButton?.addEventListener('click', async () => {
      const date = dateInput?.value;
      const duration = durationSelect?.value || '30';
      panel.dataset.selectedBookingTime = '';
      setBookingMessage(panel, '');
      setBookingButtonState(panel, false);

      if (!date) {
        setAvailabilityMessage(panel, 'Selecciona una fecha para continuar', true);
        return;
      }

      actionButton.disabled = true;
      actionButton.textContent = 'Cargando...';
      setAvailabilityMessage(panel, 'Consultando disponibilidad...');

      try {
        const availability = await fetchAvailability(date, duration);
        if (!Array.isArray(availability)) {
          throw new Error('Invalid availability response');
        }

        renderAvailabilityResults(panel, availability);
      } catch (error) {
        console.error('Extension FD: error al cargar disponibilidad', error);
        setAvailabilityMessage(panel, 'Error al cargar disponibilidad', true);
      } finally {
        actionButton.disabled = false;
        actionButton.textContent = 'Ver disponibilidad';
      }
    });

    results?.addEventListener('click', (event) => {
      const item = event.target.closest('.availability-slot-item');
      if (!item) return;

      results.querySelectorAll('.availability-slot-item').forEach(s => {
        s.dataset.selected = 'false';
        s.classList.remove('fd-slot-item--selected');
      });

      item.dataset.selected = 'true';
      item.classList.add('fd-slot-item--selected');
      panel.dataset.selectedBookingTime = item.dataset.time || '';
      setBookingMessage(panel, '');
      setBookingButtonState(panel, true);
    });

    dateInput?.addEventListener('change', () => {
      panel.dataset.selectedBookingTime = '';
      setBookingMessage(panel, '');
      setBookingButtonState(panel, false);
    });

    durationSelect?.addEventListener('change', () => {
      panel.dataset.selectedBookingTime = '';
      setBookingMessage(panel, '');
      setBookingButtonState(panel, false);
    });

    bookButton?.addEventListener('click', async () => {
      if (panel.dataset.bookingInProgress === 'true') return;

      const telefono = panel.dataset.currentPhone || '';
      const nombre = panel.dataset.currentName || '';
      const email = panel.dataset.currentEmail || '';
      const date = dateInput?.value || '';
      const duration = durationSelect?.value || '30';
      const time = panel.dataset.selectedBookingTime || '';

      if (!telefono || !nombre) {
        setBookingMessage(panel, 'Faltan datos del cliente para agendar.', true);
        return;
      }

      if (!email) {
        setBookingMessage(panel, 'Este cliente no tiene correo cargado. Agrega un correo antes de agendar.', true);
        return;
      }

      if (!isValidEmail(email)) {
        setBookingMessage(panel, 'El correo del cliente no parece valido. Revisalo antes de agendar.', true);
        return;
      }

      if (!date || !time) {
        setBookingMessage(panel, 'Selecciona un horario disponible antes de agendar.', true);
        return;
      }

      panel.dataset.bookingInProgress = 'true';
      bookButton.disabled = true;
      bookButton.textContent = 'Agendando...';
      setBookingMessage(panel, 'Creando evento y link de Meet...');

      try {
        const booking = await bookMeeting({ telefono, nombre, email, date, time, duration });
        const fields = await fetchContactData(telefono);
        const meetings = await fetchMeetingsData(telefono);
        updatePanelWithData(fields || {
          Nombre: nombre,
          Telefono: telefono,
          Correo: email
        }, meetings);

        const meetLink = booking?.meetLink || '';
        setBookingMessage(
          panel,
          meetLink ? 'Reunion agendada correctamente.' : 'Reunion agendada correctamente, pero no se recibio link de Meet.',
          false,
          meetLink
        );
        clearSelectedBookingSlot(panel);
        setAvailabilityMessage(panel, 'Reunion agendada. Volve a consultar disponibilidad para reservar otro horario.');
      } catch (error) {
        console.error('Extension FD: error al agendar reunion', error);
        setBookingMessage(panel, 'No se pudo agendar la reunion.', true);
        setBookingButtonState(panel, true);
      } finally {
        panel.dataset.bookingInProgress = 'false';
        bookButton.textContent = 'Agendar reunion';
      }
    });
  }

  function formatAirtableDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return `${date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short'
    })}, ${date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })} hs`;
  }

  function formatDisplayStatus(status) {
    const clean = String(status || '').trim();
    if (!clean) return '–';
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  }

  function formatDisplayNote(note) {
    return String(note || '')
      .replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, '$3/$2/$1')
      .replace(/\ba las (\d{2}:\d{2})\b/gi, 'a las $1 hs')
      .replace(/\bDuracion\b/g, 'Duración')
      .trim();
  }

  function isAutomaticNote(note) {
    const clean = String(note || '').trim();
    return /^Reprogramada para \d{4}-\d{2}-\d{2} a las \d{2}:\d{2}\. Duracion: \d+ min\.?$/i.test(clean) ||
      /^Agendada automaticamente\. Duracion: \d+ minutos\.?$/i.test(clean);
  }

  function getDisplayMeetingNote(note) {
    if (isAutomaticNote(note)) return '';
    return formatDisplayNote(note);
  }

  function buildLeadQuickSummary(note) {
    return getDisplayMeetingNote(note);
  }

  function updatePanelWithData(fields, meetings = []) {
    const panel = document.getElementById('custom-side-panel');

    if (panel && fields) {
      panel.dataset.currentPhone = fields['Telefono'] || panel.dataset.currentPhone || '';
      panel.dataset.currentName = fields['Nombre'] || panel.dataset.currentName || '';
      panel.dataset.currentEmail = fields['Correo'] || panel.dataset.currentEmail || '';

      if (!panel.dataset.currentEmail) {
        setBookingMessage(panel, 'Este cliente no tiene correo cargado. Agrega uno para poder agendar.', true);
        setBookingButtonState(panel, false);
      } else {
        setBookingMessage(panel, '');
      }
    }

    if (fields && fields['Nombre']) {
      if (panel) {
        const subtitle = panel.querySelector('.panel-subtitle');
        if (subtitle) subtitle.textContent = fields['Nombre'];
      }
    }

    const role = panel?.dataset.currentUserRole || '';
    const meetingsHTML = isManagerRole(role) ? getGerenteMeetCardsHTML(meetings) : getMeetCardsHTML(meetings);
    const panelMeetingsContainer = panel?.querySelector('.panel-section-summary > div');
    if (panelMeetingsContainer) {
      const count = meetings?.length || 0;
      const headerHTML = `<div class="fd-meets-header"><span class="fd-meets-title">Reuniones</span><span class="fd-meets-count">${count}</span></div>`;
      panelMeetingsContainer.innerHTML = headerHTML + meetingsHTML;
    }

    // Stats from meetings array
    if (panel) {
      const sorted = [...meetings].sort((a, b) => new Date(b.fields['Fecha'] || 0) - new Date(a.fields['Fecha'] || 0));
      const last = sorted[0];
      const status = last?.fields['ESTADO'] || '';
      const note = getDisplayMeetingNote(last?.fields['Notas']);

      const countEl = panel.querySelector('#fd-stat-count');
      const dateEl = panel.querySelector('#fd-stat-date');
      const statusEl = panel.querySelector('#fd-stat-status');
      const noteEl = panel.querySelector('#fd-stat-note');
      const quickSummaryEl = panel.querySelector('#fd-lead-quick-summary');

      if (countEl) countEl.textContent = `${meetings.length} reunion${meetings.length === 1 ? '' : 'es'}`;
      if (dateEl) dateEl.textContent = last ? formatAirtableDate(last.fields['Fecha']) : '–';
      if (statusEl) statusEl.innerHTML = `<span class="${getStatusBadgeClass(status)}">${escapeHtml(status || '–')}</span>`;
      if (noteEl) {
        noteEl.textContent = note || '-';
        noteEl.classList.toggle('is-empty', !note);
      }
      if (statusEl) statusEl.innerHTML = `<span class="${getStatusBadgeClass(status)}">${escapeHtml(formatDisplayStatus(status))}</span>`;
      if (quickSummaryEl) {
        const summaryText = buildLeadQuickSummary(note);
        quickSummaryEl.textContent = summaryText;
        quickSummaryEl.hidden = !summaryText;
      }
    }

    if (!panel || !fields) return;

    const phoneEl = panel.querySelector('#fd-contact-phone');
    if (phoneEl) {
      const v = fields['Telefono'] || '';
      phoneEl.querySelector('.fd-contact-value').textContent = v || 'N/A';
      phoneEl.setAttribute('data-copy', v);
    }

    const emailEl = panel.querySelector('#fd-contact-email');
    if (emailEl) {
      const v = fields['Correo'] || '';
      emailEl.querySelector('.fd-contact-value').textContent = v || 'N/A';
      emailEl.setAttribute('data-copy', v);
    }
  }

  const btn = document.createElement('div');
  btn.id = 'custom-calendar-btn';
  btn.title = 'Abrir Reuniones';
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
    </svg>
  `;

  // Set initial visibility
  btn.style.display = isAllowedUrl() ? 'flex' : 'none';

  const isMeet = window.location.hostname === 'meet.google.com';
  const isRespond = window.location.hostname === 'app.respond.io';

  if (isMeet) {
    btn.classList.add('fd-btn--meet');
  }

  document.body.appendChild(btn);

  // Monitor URL changes for SPAs
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      const visible = isAllowedUrl();
      btn.style.display = visible ? 'flex' : 'none';
      if (panelOrForm) {
        if (!visible) {
          panelOrForm.classList.remove('open', 'qdulke');
          if (isRespond) panelOrForm.style.right = `-${panelOrForm.offsetWidth}px`;
        }
      }
    }
  }).observe(document, {subtree: true, childList: true});

  let isDragging = false;
  let dragStarted = false;
  let startY;
  let initialTop;
  let clickStartTime;

  // Position persistence
  const storageKey = isMeet ? 'meetBtnTop' : 'btnTop';
  chrome.storage.local.get([storageKey], function(result) {
    if (result[storageKey]) {
      btn.style.top = result[storageKey];
      btn.style.transform = 'none';
    }
  });

  // SITE-SPECIFIC ELEMENTS
  let panelOrForm;

  if (isRespond) {
    panelOrForm = document.createElement('div');
    panelOrForm.id = 'custom-side-panel';
    panelOrForm.innerHTML = `
      <div id="panel-resize-handle"></div>
      <div class="panel-header">
        <div class="header-top">
          <div id="panel-minimize-btn">
            <i data-component="FontIcon" class="icon icon-sidebar-right dls-size-icon-lg dls-text-icon-lg"></i>
          </div>
          <div class="dls-txt-h4">Reuniones</div>
        </div>
        <div class="separator"></div>
        <div id="fd-panel-main">
        <div id="fd-panel-tabs" class="fd-tabs" role="tablist" aria-label="Secciones del panel">
          <button type="button" class="fd-tab-btn is-active" data-tab="summary" role="tab" aria-selected="true">Resumen</button>
          <button type="button" class="fd-tab-btn" data-tab="team" role="tab" aria-selected="false" hidden>Equipo</button>
          <button type="button" class="fd-tab-btn" data-tab="availability" role="tab" aria-selected="false">Mi disponibilidad</button>
        </div>
        <div class="fd-tab-panel is-active" data-tab-panel="summary">
        <div class="panel-subtitle">Contacto sin Reuniones</div>
        <div class="fd-lead-quick-summary" id="fd-lead-quick-summary" hidden></div>
        <div class="fd-contact-fields">
          <div class="copyable-item" id="fd-contact-phone" data-copy="465498765346">
            <span class="fd-contact-label">Tel.</span>
            <span class="fd-contact-value">465498765346</span>
            <i data-component="FontIcon" class="icon icon-copy dls-size-icon-sm dls-text-icon-sm"></i>
          </div>
          <div class="copyable-item" id="fd-contact-email" data-copy="sincorreo">
            <span class="fd-contact-label">Email</span>
            <span class="fd-contact-value">sincorreo</span>
            <i data-component="FontIcon" class="icon icon-copy dls-size-icon-sm dls-text-icon-sm"></i>
          </div>
        </div>
        <div class="fd-stats-grid">
          <div class="fd-stat-card">
            <div class="fd-stat-label">Historial</div>
            <div class="fd-stat-value fd-stat-value--text" id="fd-stat-count">–</div>
          </div>
          <div class="fd-stat-card">
            <div class="fd-stat-label">Ultima reunion</div>
            <div class="fd-stat-value fd-stat-value--sm" id="fd-stat-date">–</div>
          </div>
          <div class="fd-stat-card fd-stat-card--full">
            <div class="fd-stat-label">Estado</div>
            <div id="fd-stat-status"><span class="fd-badge fd-badge--gray">–</span></div>
          </div>
        </div>
        <div class="fd-note-card">
          <div class="fd-note-label">Ultima interaccion / notas</div>
          <div class="nota-valor is-empty" id="fd-stat-note">-</div>
        </div>
        <div class="separator"></div>
        <div class="availability-section">
          <div class="fd-section-title">Agendar reunion</div>
          <div class="fd-form-stack">
            <input id="availability-date" type="date" />
            <select id="availability-duration">
              <option value="15">15 min</option>
              <option value="30" selected>30 min</option>
              <option value="60">60 min</option>
            </select>
            <button id="availability-check-btn" type="button">Ver disponibilidad</button>
          </div>
          <div id="availability-results">
            <div class="fd-empty-state">Selecciona una fecha y duracion para consultar horarios</div>
          </div>
          <button id="booking-create-btn" type="button" disabled>Agendar reunion</button>
          <div id="booking-message" style="display:none;"></div>
        </div>
        <div class="separator"></div>
        <div class="panel-section-summary">
          <div style="overflow-anchor: none; flex: 0 0 auto; position: relative; width: 100%;">
            ${getMeetCardsHTML()}
          </div>
        </div>
        </div>
        <div class="fd-tab-panel" id="fd-team-panel" data-tab-panel="team" hidden></div>
        <div class="fd-tab-panel" data-tab-panel="availability" hidden>
          <div id="fd-current-user">
            <div class="fd-user-status">
              <div>
                <strong>Cargando usuario...</strong>
                <span>Consultando sesion actual</span>
              </div>
            </div>
          </div>
          <div id="fd-role-actions"></div>
          <div id="fd-gerente-section"></div>
        </div>
      </div>
      <div id="fd-equipo-view"></div>
    `;
    document.body.appendChild(panelOrForm);

    // Add listeners for the meet cards
    const sectionSummary = panelOrForm.querySelector('.panel-section-summary');
    if (sectionSummary) addMeetCardListeners(sectionSummary);
    bindPanelTabs(panelOrForm);
    bindAvailabilityInteractions(panelOrForm);

    // Respond side-panel specific logic
    const resizeHandle = panelOrForm.querySelector('#panel-resize-handle');
    let isResizing = false;

    chrome.storage.local.get(['panelWidth'], function(result) {
      if (result.panelWidth) {
        panelOrForm.style.width = result.panelWidth;
        if (!panelOrForm.classList.contains('open')) {
          panelOrForm.style.right = `-${result.panelWidth}`;
        }
      }
    });

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      document.body.style.cursor = 'ew-resize';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (isResizing) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 200 && newWidth < window.innerWidth * 0.8) {
          panelOrForm.style.width = `${newWidth}px`;
          chrome.storage.local.set({ panelWidth: `${newWidth}px` });
        }
      }
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
      }
    });

    const minimizeBtn = panelOrForm.querySelector('#panel-minimize-btn');
    minimizeBtn.addEventListener('click', (e) => {
      panelOrForm.classList.remove('open');
      const currentWidth = panelOrForm.offsetWidth;
      panelOrForm.style.right = `-${currentWidth}px`;
      e.stopPropagation();
    });

    document.addEventListener('mousedown', (e) => {
      if (panelOrForm.classList.contains('open') && 
          !panelOrForm.contains(e.target) && 
          !btn.contains(e.target)) {
        panelOrForm.classList.remove('open');
        const currentWidth = panelOrForm.offsetWidth;
        panelOrForm.style.right = `-${currentWidth}px`;
      }
    });

    panelOrForm.querySelectorAll('.copyable-item').forEach(item => {
      item.addEventListener('click', () => {
        const text = item.getAttribute('data-copy');
        navigator.clipboard.writeText(text).then(() => {
          const icon = item.querySelector('i');
          if (icon) {
            icon.classList.add('fd-copy-flash');
            setTimeout(() => icon.classList.remove('fd-copy-flash'), 600);
          }
        });
      });
    });
  }

  // MEET FORM INJECTION LOGIC
  function toggleMeetMainContainer(isOpening) {
    const mainContainer = document.querySelector('.dkjMxf.i8wGAe.iPFm3e.MVbbRb.tSl2vc');
    if (!mainContainer) return;

    if (isOpening) {
      mainContainer.style.width = '77vw';
    } else {
      mainContainer.style.width = '98vw';
    }
  }

  function bindMeetEditableTitle(meetForm) {
    const titleEl = meetForm.querySelector('.fd-meet-form-title');
    if (!titleEl) return;

    titleEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (titleEl.querySelector('input')) return;

      const previous = titleEl.textContent.trim();
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'fd-meet-form-title-input';
      input.value = previous;
      titleEl.replaceChildren(input);
      input.focus();
      input.select();

      function commit() {
        const next = input.value.trim() || 'Gabriel Veron';
        titleEl.textContent = next;
      }

      input.addEventListener('blur', commit);
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          input.removeEventListener('blur', commit);
          commit();
        }
        if (ev.key === 'Escape') {
          ev.preventDefault();
          input.removeEventListener('blur', commit);
          titleEl.textContent = previous;
        }
      });
    });
  }

  function injectMeetForm() {
    let meetForm = document.getElementById('custom-meet-form');
    if (meetForm) return meetForm;

    const container = document.getElementById('ME4pNd') || document.body;

    const vendedoras = ['FLORENCIA', 'SILVINA', 'ITATI', 'SARITA', 'ORNELLA', 'LIZ', 'INES', 'Milbia'];
    const vendedoraOptions = vendedoras.map(v => `<option value="${v}">${v}</option>`).join('');
    const estadoOptions = ['Realizada', 'Cancelada', 'PENDIENTE']
      .map(v => `<option value="${v}">${v}</option>`).join('');

    meetForm = document.createElement('div');
    meetForm.id = 'custom-meet-form';
    panelOrForm = meetForm;
    meetForm.className = 'fJsklc Didmac ZmuLbd nulMpf Y7BRKe';
    meetForm.style.position = 'fixed';
    meetForm.style.right = '0px';
    meetForm.style.top = '50px';
    meetForm.style.bottom = '80px';
    meetForm.style.zIndex = '999998';
    meetForm.style.width = '20%';
    meetForm.style.display = 'none';

    meetForm.innerHTML = `
      <aside class="R3Gmyc WSJBnb P9KVBf fd-meet-aside" aria-label="Formulario reunión" style="height: 100%; width: 100%; display: flex; flex-direction: column;">
        <div data-panel-container-id="sidePanel2" jsname="OmTKLc" style="height: 100%;">
          <div jsname="b0t70b" class="WUFI9b" data-panel-id="2" style="height: 100%; display: flex; flex-direction: column;">
            <div class="fd-meet-header-block CYZUZd" style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
              <div class="fd-meet-form-title J8vCN" role="heading" aria-level="2" tabindex="0" title="Clic para editar">Gabriel Veron</div>
              <div class="VUk8eb">
                <button type="button" class="pYTkkf-Bz112c-LgbsSe pYTkkf-Bz112c-LgbsSe-OWXEXe-SfQLQb-suEOdc JAUIm" aria-label="Cerrar" role="button">
                  <span class="XjoK4b pYTkkf-Bz112c-UHGRz"></span>
                  <span class="pYTkkf-Bz112c-kBDsod-Rtc0Jf">
                    <i class="google-material-icons notranslate VfPpkd-kBDsod" aria-hidden="true">close</i>
                  </span>
                </button>
              </div>
            </div>
            <div class="hWX4r fd-meet-form-scroll" style="flex: 1; overflow-y: auto; padding: 0 16px 16px;">
              <div class="fd-meet-form-fields">
                <div class="fd-form-row">
                  <label class="qdOxv-fmcmS-wGMbrd" for="fd-meet-vendedora">Vendedora:</label>
                  <select id="fd-meet-vendedora" class="fd-meet-select">${vendedoraOptions}</select>
                </div>
                <div class="fd-form-row">
                  <label class="qdOxv-fmcmS-wGMbrd" for="fd-meet-fecha">Fecha:</label>
                  <input type="datetime-local" id="fd-meet-fecha" class="fd-meet-input" />
                </div>
                <div class="fd-form-row">
                  <label class="qdOxv-fmcmS-wGMbrd" for="fd-meet-estado">Estado:</label>
                  <select id="fd-meet-estado" class="fd-meet-select">${estadoOptions}</select>
                </div>
                <div class="fd-form-row">
                  <label class="qdOxv-fmcmS-wGMbrd" for="fd-meet-fase">Fase del Momento:</label>
                  <select id="fd-meet-fase" class="fd-meet-select">
                    <option value="FASE 1">FASE 1</option>
                    <option value="FASE 2">FASE 2</option>
                  </select>
                </div>
                <div class="fd-form-row">
                  <label class="qdOxv-fmcmS-wGMbrd" for="fd-meet-registro">Logramos el Registro?:</label>
                  <div class="fd-meet-control-shell fd-meet-control-shell--checkbox">
                    <input type="checkbox" id="fd-meet-registro" class="fd-meet-checkbox" />
                  </div>
                </div>
                <div class="fd-form-row fd-form-row-stack">
                  <label class="qdOxv-fmcmS-wGMbrd" for="fd-meet-notas">Notas:</label>
                  <div jsname="pob9Hc" class="fd-meet-notas-wrap">
                    <div jsshadow="" class="qdOxv-fmcmS-yrriRe-OWXEXe-H9tDt tnr1Oc IPsaZc" data-idom-container-class="WXLFfb">
                      <div class="hsLqkc" aria-disabled="false">
                        <span class="o50S1d-NSFCdd-i5vt6e o50S1d-NSFCdd-i5vt6e-OWXEXe-di8rgd-V67aGc qdOxv-fmcmS-B5Olfe">
                          <span class="o50S1d-NSFCdd-Brv4Fb"></span>
                          <span class="o50S1d-NSFCdd-Ra9xwd"></span>
                          <span class="o50S1d-NSFCdd-MpmGFe"></span>
                        </span>
                        <textarea id="fd-meet-notas" rows="4" class="qdOxv-fmcmS-wGMbrd xYOaDe" aria-label="Notas" placeholder="Notas" maxlength="8000"></textarea>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="fd-meet-guardar-row">
                  <button type="button" class="fd-meet-guardar-btn" id="fd-meet-guardar">Guardar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    `;

    container.appendChild(meetForm);

    bindMeetEditableTitle(meetForm);

    // Meet close button logic (header; no confundir con Guardar)
    const closeBtn = meetForm.querySelector('.fd-meet-header-block button');
    closeBtn.addEventListener('click', (e) => {
      if (meetForm.classList.contains('qdulke')) {
        meetForm.classList.remove('qdulke');
        meetForm.style.display = 'none';
        meetForm.style.right = '0px';
        toggleMeetMainContainer(false);
      }
      e.stopPropagation();
    });

    const guardarBtn = meetForm.querySelector('#fd-meet-guardar');
    guardarBtn?.addEventListener('click', () => {
      saveMeetingFormToAirtable(meetForm);
    });

    return meetForm;
  }

  // DRAG LOGIC (Shared)
  btn.addEventListener('mousedown', (e) => {
    isDragging = false;
    dragStarted = false;
    startY = e.clientY;
    initialTop = btn.offsetTop;
    clickStartTime = Date.now();
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (startY === undefined) return;
    const deltaY = e.clientY - startY;

    if (!dragStarted && Math.abs(deltaY) > 5) {
      dragStarted = true;
      isDragging = true;
      btn.style.cursor = 'grabbing';
      if (isRespond && panelOrForm) {
        panelOrForm.classList.remove('open');
        panelOrForm.style.right = `-${panelOrForm.offsetWidth}px`;
      }
      // For Meet, maybe we don't want to auto-close when dragging? 
      // User said "solo se minimizará al hacer click en el boton nuevamente"
    }

    if (!isDragging) return;
    let newTop = initialTop + deltaY;
    const btnHeight = btn.offsetHeight;
    const viewportHeight = window.innerHeight;
    if (newTop < 0) newTop = 0;
    if (newTop > viewportHeight - btnHeight) newTop = viewportHeight - btnHeight;
    btn.style.top = `${newTop}px`;
    btn.style.transform = 'none';
  });

  document.addEventListener('mouseup', () => {
    const clickDuration = Date.now() - clickStartTime;
    if (isDragging) {
      isDragging = false;
      btn.style.cursor = 'grab';
      chrome.storage.local.set({ [storageKey]: btn.style.top });
    } else if (startY !== undefined && clickDuration < 300) {
      if (isRespond && panelOrForm) {
        const isOpen = panelOrForm.classList.toggle('open');
        panelOrForm.style.right = isOpen ? '0' : `-${panelOrForm.offsetWidth}px`;
        
        if (isOpen) {
          const phone = getRespondPagePhone();
          if (!phone) {
            console.warn('Extension FD: no se encontró un número tras "para:" en un div con clases dls-whitespace-nowrap dls-truncate');
            refreshCurrentUser(panelOrForm);
          } else {
            (async () => {
              await refreshCurrentUser(panelOrForm);
              const fields = await fetchContactData(phone);
              const meetings = await fetchMeetingsData(phone);
              if (fields) updatePanelWithData(fields, meetings);
            })();
          }
        }
      } else if (isMeet) {
        const meetForm = injectMeetForm();
        if (meetForm) {
          const isOpening = !meetForm.classList.contains('qdulke');
          meetForm.classList.toggle('qdulke');
          meetForm.style.display = isOpening ? 'flex' : 'none';

          if (isOpening) {
            meetForm.style.right = '0px';
            meetForm.dataset.airtableRecordId = '';
            const meetLink = getCurrentMeetLinkForAirtable();
            fetchMeetingRecordByMeetLink(meetLink).then(record => {
              if (record?.id) meetForm.dataset.airtableRecordId = record.id;
              if (record?.fields) applyMeetingFieldsToMeetForm(meetForm, record.fields);
            });
          }

          toggleMeetMainContainer(isOpening);
        }
      }
    }
    startY = undefined;
    dragStarted = false;
  });

  window.addEventListener('resize', () => {
    const btnHeight = btn.offsetHeight;
    const viewportHeight = window.innerHeight;
    const currentTop = parseInt(btn.style.top);
    if (currentTop > viewportHeight - btnHeight) {
      btn.style.top = `${viewportHeight - btnHeight}px`;
      chrome.storage.local.set({ [storageKey]: btn.style.top });
    }
  });

})();
