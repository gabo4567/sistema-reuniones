(function() {
  if (document.getElementById('custom-calendar-btn')) return;
  const API_BASE_URL = 'https://extension-fd-backend.onrender.com/api';
  const AUTH_BASE_URL = API_BASE_URL.replace(/\/api$/, '');
  const FD_AUTH_EMAIL_STORAGE_KEY = 'fdAuthEmail';
  let fdAuthEmail = '';

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
      const vendedoraColorStyle = getUserColorStyle(fields['Vendedora Color']);
      const assignedByColorStyle = getUserColorStyle(fields['Asignado por Color']);
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
                <span class="fd-card-vendedora fd-user-color-chip" ${vendedoraColorStyle ? `style="${vendedoraColorStyle}"` : ''}>${escapeHtml(vendedora)}</span>
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
                    <div class="fd-card-detail-row">
                      <span class="fd-card-detail-label">Asignado por</span>
                      <span class="fd-card-detail-value fd-user-color-text" ${assignedByColorStyle ? `style="${assignedByColorStyle}"` : ''}>${escapeHtml(fields['Asignado por'] || 'N/A')}</span>
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
      const vendedoraColorStyle = getUserColorStyle(fields['Vendedora Color']);
      const assignedByColorStyle = getUserColorStyle(fields['Asignado por Color']);
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
                <span class="fd-card-vendedora fd-user-color-chip" style="font-weight:600;${vendedoraColorStyle}">${escapeHtml(vendedora)}</span>
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
                <div class="fd-card-detail-row">
                  <span class="fd-card-detail-label">Asignado por</span>
                  <span class="fd-card-detail-value fd-user-color-text" ${assignedByColorStyle ? `style="${assignedByColorStyle}"` : ''}>${escapeHtml(fields['Asignado por'] || 'N/A')}</span>
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
        const panel = document.getElementById('custom-side-panel');
        if (!isPanelAuthenticated(panel)) {
          clearProtectedPanelData(panel);
          activatePanelTab(panel, 'summary');
          return;
        }

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
        const panel = document.getElementById('custom-side-panel');
        if (!isPanelAuthenticated(panel)) {
          clearProtectedPanelData(panel);
          activatePanelTab(panel, 'summary');
          return;
        }

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
    const nodes = document.querySelectorAll('div.dls-whitespace-nowrap.dls-truncate, span.hover\\:dls-text-text-selected, span.notranslate, div.notranslate');
    for (const el of nodes) {
      const text = (el.textContent || '').trim();
      const targetMatch = text.match(/para:\s*([+\d][\d\s().-]{7,})/i);
      if (targetMatch) return targetMatch[1].replace(/\D/g, '');
    }

    for (const el of nodes) {
      const text = (el.textContent || '').trim();
      if (/@/.test(text)) continue;
      const phoneMatch = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/);
      if (phoneMatch) {
        const phone = phoneMatch[0].replace(/\D/g, '');
        if (phone.length >= 8) return phone;
      }
    }

    return null;
  }

  function normalizeRespondPhase(value) {
    const match = String(value || '').match(/\bfase\s*([12])\b/i);
    return match ? `FASE ${match[1]}` : '';
  }

  function getRespondPagePhase() {
    const nodes = document.querySelectorAll('div.dls-whitespace-nowrap.dls-truncate');
    for (const el of nodes) {
      const phase = normalizeRespondPhase(el.textContent || '');
      if (phase) return phase;
    }

    return '';
  }

  function getRespondPageName() {
    const nameEl = document.querySelector('span.dls-txt-h6.dls-line-clamp-1.dls-break-all.dls-text-text-primary.dls-font-bold.notranslate[translate="no"]');
    return String(nameEl?.textContent || '').trim();
  }

  function extractEmailFromText(value) {
    const match = String(value || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return match ? match[0].trim() : '';
  }

  function getRespondPageEmail() {
    const emailSpans = Array.from(document.querySelectorAll('span.hover\\:dls-text-text-selected'));
    for (const span of emailSpans) {
      const email = extractEmailFromText(span.textContent || '');
      if (isValidEmail(email)) return email;
    }

    const placeholders = ['Añadir Dirección de correo electrónico', 'Add Email Address'];
    const controls = Array.from(document.querySelectorAll('input[placeholder], textarea[placeholder]'));

    for (const placeholder of placeholders) {
      const control = controls.find((el) => String(el.getAttribute('placeholder') || '').trim() === placeholder);
      const email = extractEmailFromText(control?.value || '');
      if (isValidEmail(email)) return email;
    }

    return '';
  }

  function getStoredAuthEmail() {
    if (fdAuthEmail) return Promise.resolve(fdAuthEmail);

    return new Promise((resolve) => {
      if (!window.chrome?.storage?.local) {
        resolve('');
        return;
      }

      chrome.storage.local.get([FD_AUTH_EMAIL_STORAGE_KEY], (result) => {
        fdAuthEmail = result?.[FD_AUTH_EMAIL_STORAGE_KEY] || '';
        resolve(fdAuthEmail);
      });
    });
  }

  function setStoredAuthEmail(email) {
    fdAuthEmail = String(email || '').trim().toLowerCase();
    if (window.chrome?.storage?.local) {
      chrome.storage.local.set({ [FD_AUTH_EMAIL_STORAGE_KEY]: fdAuthEmail });
    }
  }

  async function fetchJson(url, options = {}) {
    const headers = new Headers(options.headers || {});
    const authEmail = await getStoredAuthEmail();
    if (authEmail && !headers.has('X-FD-User-Email')) {
      headers.set('X-FD-User-Email', authEmail);
    }

    const response = await fetch(url, {
      credentials: 'include',
      ...options,
      headers
    });
    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`HTTP ${response.status}: ${errorText}`);
      error.status = response.status;
      throw error;
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
      if (error?.status === 401) {
        return { authRequired: true };
      }
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

  function setMeetFormAuthRequired(meetForm, authRequired) {
    if (!meetForm) return;
    meetForm.dataset.authRequired = authRequired ? 'true' : 'false';

    meetForm.querySelectorAll('#fd-meet-vendedora, #fd-meet-fecha, #fd-meet-estado, #fd-meet-fase, #fd-meet-registro, #fd-meet-notas, #fd-meet-guardar').forEach(control => {
      control.disabled = authRequired;
    });

    if (authRequired) {
      const fechaEl = meetForm.querySelector('#fd-meet-fecha');
      const registroEl = meetForm.querySelector('#fd-meet-registro');
      const notasEl = meetForm.querySelector('#fd-meet-notas');
      if (fechaEl) fechaEl.value = '';
      if (registroEl) registroEl.checked = false;
      if (notasEl) notasEl.value = '';
    }

    const titleEl = meetForm.querySelector('.fd-meet-form-title');
    if (titleEl) {
      if (authRequired) titleEl.textContent = 'Acceso restringido';
      titleEl.tabIndex = authRequired ? -1 : 0;
      titleEl.title = authRequired ? '' : 'Clic para editar';
    }
  }

  async function saveMeetingFormToAirtable(meetForm) {
    if (!meetForm) return;
    const guardarBtn = meetForm.querySelector('#fd-meet-guardar');
    if (guardarBtn?.dataset.loading === 'true') return;

    const setMeetSaveMessage = (message, type = 'info') => {
      const messageEl = meetForm.querySelector('#fd-meet-save-message');
      if (!messageEl) return;
      messageEl.textContent = message || '';
      messageEl.style.display = message ? 'block' : 'none';
      messageEl.className = `fd-meet-save-message fd-meet-save-message--${type}`;
    };

    let loadingInterval = null;
    const startLoadingState = () => {
      if (!guardarBtn) return;
      setMeetSaveMessage('Guardando cambios de la reunion...', 'info');
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

    if (meetForm.dataset.authRequired === 'true') {
      setMeetSaveMessage('Inicia sesion con Google para ver y guardar los datos de esta reunion.', 'warning');
      return;
    }

    const recordId = meetForm.dataset.airtableRecordId;
    if (!recordId) {
      console.warn('Extension FD: no hay id de record para guardar.');
      if (meetForm.dataset.authRequired === 'true') {
        setMeetSaveMessage('Inicia sesión con Google para ver y guardar los datos de esta reunión.', 'warning');
      } else {
        setMeetSaveMessage('No se encontró una reunión vinculada a este link de Google Meet. Verifica el campo "Link de meet" en Airtable.', 'warning');
      }
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
      setMeetSaveMessage('Cambios guardados correctamente en Airtable.', 'success');
      console.log('Extension FD: reunión guardada correctamente', result);
    } catch (error) {
      console.error('Extension FD: error de red al guardar reunión', error);
    } finally {
      const messageEl = meetForm.querySelector('#fd-meet-save-message');
      if (messageEl?.textContent === 'Guardando cambios de la reunion...') {
        setMeetSaveMessage('No se pudieron guardar los cambios. Revisa la conexion, el servidor local o la sesion de Google.', 'error');
      }
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

  async function bookMeeting({ telefono, nombre, email, date, time, duration, phase = '', assignedSellerRecordId = '', assignedSellerName = '' }) {
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
        duration: Number(duration),
        ...(phase ? { phase } : {}),
        ...(assignedSellerRecordId ? { assignedSellerRecordId } : {}),
        ...(assignedSellerName ? { assignedSellerName } : {})
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

  async function fetchAllWorkHours() {
    return fetchJson(`${API_BASE_URL}/work-hours`);
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

  function normalizeHexColor(value) {
    const color = String(value || '').trim();
    if (/^#[0-9a-fA-F]{6}$/.test(color)) return color.toUpperCase();
    if (/^#[0-9a-fA-F]{3}$/.test(color)) {
      return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toUpperCase();
    }
    return '';
  }

  function hexToRgba(hex, alpha) {
    const color = normalizeHexColor(hex);
    if (!color) return '';
    const value = parseInt(color.slice(1), 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function getUserColorStyle(color) {
    const safeColor = normalizeHexColor(color);
    if (!safeColor) return '';
    return [
      `--fd-user-color:${safeColor}`,
      `--fd-user-color-bg:${hexToRgba(safeColor, 0.12)}`,
      `--fd-user-color-border:${hexToRgba(safeColor, 0.34)}`
    ].join(';');
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

  function syncPanelContactEmail(panel, email) {
    if (!panel) return;
    const cleanEmail = String(email || '').trim();
    panel.dataset.currentEmail = cleanEmail;

    const emailEl = panel.querySelector('#fd-contact-email');
    if (emailEl) {
      emailEl.querySelector('.fd-contact-value').textContent = cleanEmail || 'N/A';
      emailEl.setAttribute('data-copy', cleanEmail);
    }

    const manualEmailInput = panel.querySelector('#booking-email');
    if (manualEmailInput && manualEmailInput.value !== cleanEmail) {
      manualEmailInput.value = cleanEmail;
    }
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

  function isPanelAuthenticated(panel) {
    return panel?.dataset.currentUserAuthenticated === 'true';
  }

  function clearProtectedPanelData(panel, message = 'Inicia sesion con Google para ver los datos del contacto.') {
    if (!panel) return;

    panel.dataset.currentPhone = '';
    panel.dataset.currentName = '';
    panel.dataset.currentEmail = '';
    panel.dataset.selectedBookingTime = '';
    panel.dataset.selectedBookingSellers = '[]';
    panel.dataset.selectedBookingSellerRecordId = '';
    panel.dataset.selectedBookingSellerName = '';

    const subtitle = panel.querySelector('.panel-subtitle');
    if (subtitle) subtitle.textContent = 'Acceso restringido';

    const quickSummaryEl = panel.querySelector('#fd-lead-quick-summary');
    if (quickSummaryEl) {
      quickSummaryEl.textContent = '';
      quickSummaryEl.hidden = true;
    }

    const phoneEl = panel.querySelector('#fd-contact-phone');
    if (phoneEl) {
      phoneEl.querySelector('.fd-contact-value').textContent = '-';
      phoneEl.setAttribute('data-copy', '');
    }

    const emailEl = panel.querySelector('#fd-contact-email');
    if (emailEl) {
      emailEl.querySelector('.fd-contact-value').textContent = '-';
      emailEl.setAttribute('data-copy', '');
    }
    const manualEmailInput = panel.querySelector('#booking-email');
    if (manualEmailInput) manualEmailInput.value = '';

    const countEl = panel.querySelector('#fd-stat-count');
    const dateEl = panel.querySelector('#fd-stat-date');
    const statusEl = panel.querySelector('#fd-stat-status');
    const noteEl = panel.querySelector('#fd-stat-note');
    if (countEl) countEl.textContent = '-';
    if (dateEl) dateEl.textContent = '-';
    if (statusEl) statusEl.innerHTML = '<span class="fd-badge fd-badge--gray">Bloqueado</span>';
    if (noteEl) {
      noteEl.textContent = '-';
      noteEl.classList.add('is-empty');
    }

    const panelMeetingsContainer = panel.querySelector('.panel-section-summary > div');
    if (panelMeetingsContainer) {
      panelMeetingsContainer.innerHTML = `<div class="fd-empty-state">${escapeHtml(message)}</div>`;
    }

    setAvailabilityMessage(panel, message, true);
    renderBookingAssignmentSelector(panel, []);
    setBookingMessage(panel, '', false);
    setBookingButtonState(panel, false);
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

    if (nextTab === 'availability' && panel.dataset.refreshingUser !== 'true') {
      refreshCurrentUser(panel);
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
        openGoogleLogin(panel);
      });
      return;
    }

    const usuario = currentUser.usuario;
    const displayName = usuario?.nombre || currentUser.email;
    const role = usuario?.rol || currentUser.auth?.rol || 'Sin rol';
    const initials = getInitials(displayName);
    const userColorStyle = getUserColorStyle(usuario?.color);

    if (isManagerRole(role)) {
      container.innerHTML = `
        <div class="fd-user-status">
          <div class="fd-user-identity">
            <div class="fd-user-avatar fd-user-avatar--gerente fd-user-color-avatar" ${userColorStyle ? `style="${userColorStyle}"` : ''}>${escapeHtml(initials)}</div>
            <div class="fd-user-info">
              <div class="fd-user-name">${escapeHtml(displayName)}</div>
              <div class="fd-user-email">${escapeHtml(currentUser.email)}</div>
            </div>
          </div>
          <div class="fd-badges">
            <span class="fd-badge fd-user-color-badge" ${userColorStyle ? `style="${userColorStyle}"` : ''}>Gerente</span>
          </div>
          <button type="button" id="fd-login-google-btn">Cambiar cuenta Google</button>
        </div>
      `;
    } else {
      const recibe = usuario?.puede_recibir_reuniones;
      container.innerHTML = `
        <div class="fd-user-status">
          <div class="fd-user-identity">
            <div class="fd-user-avatar fd-user-avatar--vendedora fd-user-color-avatar" ${userColorStyle ? `style="${userColorStyle}"` : ''}>${escapeHtml(initials)}</div>
            <div class="fd-user-info">
              <div class="fd-user-name">${escapeHtml(displayName)}</div>
              <div class="fd-user-email">${escapeHtml(currentUser.email)}</div>
            </div>
          </div>
          <div class="fd-badges">
            <span class="fd-badge fd-user-color-badge" ${userColorStyle ? `style="${userColorStyle}"` : ''}>Vendedora</span>
            <span class="fd-badge ${recibe ? 'fd-badge--green' : 'fd-badge--gray'}">${recibe ? 'Recibe reuniones' : 'No recibe'}</span>
          </div>
          <button type="button" id="fd-login-google-btn">Cambiar cuenta Google</button>
        </div>
      `;
    }

    container.querySelector('#fd-login-google-btn')?.addEventListener('click', () => {
      openGoogleLogin(panel);
    });
    renderRoleActions(panel, currentUser);
  }

  function getGoogleAuthWindowFeatures() {
    const width = 520;
    const height = Math.min(720, Math.max(560, window.screen?.availHeight ? window.screen.availHeight - 80 : 680));
    const left = Math.max(0, Math.round(((window.screen?.availWidth || window.innerWidth) - width) / 2));
    const top = 24;

    return [
      'popup=yes',
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
      'resizable=yes',
      'scrollbars=yes'
    ].join(',');
  }

  function setLoginButtonState(panel, isLoading) {
    const button = panel?.querySelector('#fd-login-google-btn');
    if (!button) return;
    button.disabled = isLoading;
    button.textContent = isLoading ? 'Esperando Google...' : 'Conectar con Google';
  }

  function openGoogleLogin(panel) {
    setLoginButtonState(panel, true);
    const loginWindow = window.open(`${AUTH_BASE_URL}/auth/google?source=extension`, 'fdGoogleAuth', getGoogleAuthWindowFeatures());

    if (!loginWindow) {
      setLoginButtonState(panel, false);
      const emailEl = panel?.querySelector('#fd-current-user .fd-user-email');
      if (emailEl) emailEl.textContent = 'Permiti las ventanas emergentes para iniciar sesion.';
      return;
    }

    loginWindow.focus?.();

    const poll = window.setInterval(() => {
      if (!loginWindow.closed) return;
      window.clearInterval(poll);
      setLoginButtonState(panel, false);
      refreshCurrentUser(panel);
    }, 1200);
  }

  function bindGoogleAuthMessages(panel) {
    if (!panel || panel.dataset.authMessageBound === 'true') return;
    panel.dataset.authMessageBound = 'true';

    window.addEventListener('message', async (event) => {
      if (event.origin !== AUTH_BASE_URL) return;
      const data = event.data || {};
      if (data.source !== 'extension-fd-auth') return;

      if (data.status === 'success' && data.email) {
        setStoredAuthEmail(data.email);
        await refreshCurrentUser(panel);
      } else {
        setLoginButtonState(panel, false);
      }
    });
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
    return [{ start: '08:00', end: '20:00' }];
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
        <input type="time" class="fd-work-hour-start" value="${escapeHtml(range.start || '08:00')}" aria-label="Inicio rango ${index + 1}" />
        <input type="time" class="fd-work-hour-end" value="${escapeHtml(range.end || '20:00')}" aria-label="Fin rango ${index + 1}" />
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
    const canUseCustomWorkHours = normalizedRole === 'vendedora' || normalizedRole === 'gerente';
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
        renderWorkHourRows(container, day, [...ranges, { start: '08:00', end: '20:00' }]);
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

      const enabledDays = WORK_HOUR_DAYS.filter(([day]) => weekly[day].enabled);
      if (!enabledDays.length) {
        setWorkHoursMessage(panel, 'Activa al menos un dia para guardar el horario.', true);
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
        const saved = await saveWorkHours(usuario.recordId, { enabled: true, weekly });
        renderWeeklyWorkHours(container, saved.weekly || getDefaultWeeklyWorkHours());
        const successMessage = 'Horario guardado correctamente.';
        setWorkHoursMessage(panel, successMessage);
        window.alert(successMessage);
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

  function getSellerAuthHelpText(reason) {
    if (reason === 'inactive_auth_user') return 'La cuenta existe en AuthUsuarios, pero esta desactivada.';
    if (reason === 'missing_refresh_token') return 'Debe volver a iniciar sesion con Google para renovar permisos.';
    if (reason === 'missing_seller_email') return 'Carga un correo en Usuarios para poder cruzarlo con AuthUsuarios.';
    if (reason === 'missing_tokens') return 'La cuenta no tiene tokens completos de Google Calendar.';
    return 'El usuario debe iniciar sesion con Google desde la extension.';
  }

  function formatWorkHoursSummary(workHours) {
    if (!workHours) return 'Sin horario personalizado cargado.';

    const activeDays = WORK_HOUR_DAYS
      .map(([day, label]) => {
        const config = workHours.weekly?.[day];
        if (!config?.enabled || !Array.isArray(config.ranges) || !config.ranges.length) return '';
        const ranges = config.ranges.map((range) => `${range.start}-${range.end}`).join(', ');
        return `${label}: ${ranges}`;
      })
      .filter(Boolean);

    return activeDays.length ? activeDays.join(' | ') : 'Sin dias activos.';
  }

  async function loadSellersIntoView(view) {
    const panel = view?.closest('#custom-side-panel');
    if (!isManagerRole(getPanelRole(panel))) return;

    const listEl = view.querySelector('#fd-equipo-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="fd-empty-state">Cargando vendedoras...</div>';

    try {
      let workHoursLoadError = false;
      const [sellers, workHoursBySeller] = await Promise.all([
        fetchJson(`${API_BASE_URL}/sellers`),
        fetchAllWorkHours().catch((error) => {
          console.error('Extension FD: error al cargar horarios laborales de equipo', error);
          workHoursLoadError = true;
          return {};
        })
      ]);
      if (!sellers.length) {
        listEl.innerHTML = '<div class="fd-empty-state">Sin vendedoras registradas.</div>';
        return;
      }

      const readyCount = sellers.filter((seller) => seller.auth?.ready).length;
      const pendingCount = sellers.length - readyCount;
      const readinessHTML = `
        <div class="fd-team-readiness ${pendingCount ? 'fd-team-readiness--warning' : 'fd-team-readiness--ready'}">
          <div class="fd-team-readiness-title">Estado de autorizacion Google</div>
          <div class="fd-team-readiness-text">${readyCount}/${sellers.length} usuarios listos para Calendar${pendingCount ? `. Faltan ${pendingCount}.` : '.'}</div>
        </div>
        ${workHoursLoadError ? `
        <div class="fd-team-readiness fd-team-readiness--warning">
          <div class="fd-team-readiness-title">Horarios personalizados</div>
          <div class="fd-team-readiness-text">No se pudieron cargar los horarios. Revisa que la tabla de Airtable exista.</div>
        </div>
        ` : ''}
      `;

      listEl.innerHTML = readinessHTML + sellers.map(seller => {
        const activa = seller.activa;
        const recibe = seller.puede_recibir_reuniones;
        const auth = seller.auth || {};
        const authReady = auth.ready === true;
        const rid = escapeHtml(seller.recordId || '');
        const sellerColorStyle = getUserColorStyle(seller.color);
        const workHoursSummary = formatWorkHoursSummary(workHoursBySeller?.[seller.recordId]);
        return `
          <div class="fd-seller-card" data-seller-id="${rid}" ${sellerColorStyle ? `style="${sellerColorStyle}"` : ''}>
            <div class="fd-seller-top">
              <span class="fd-seller-name fd-user-color-text">${escapeHtml(seller.nombre || seller.correo)}</span>
              <div class="fd-badges">
                <span class="fd-badge ${activa ? 'fd-badge--green' : 'fd-badge--gray'}">${activa ? 'Activa' : 'Inactiva'}</span>
                <span class="fd-badge ${recibe ? 'fd-badge--blue' : 'fd-badge--gray'}">${recibe ? 'Recibe reuniones' : 'Reuniones pausadas'}</span>
                <span class="fd-badge ${authReady ? 'fd-badge--green' : 'fd-badge--amber'}">${escapeHtml(auth.label || 'Falta autorizar Google')}</span>
              </div>
            </div>
            <div class="fd-seller-email">${escapeHtml(seller.correo || '')}${seller.telefono ? ` · ${escapeHtml(seller.telefono)}` : ''}</div>
            <div class="fd-seller-work-hours"><strong>Horario:</strong> ${escapeHtml(workHoursSummary)}</div>
            ${authReady ? '' : `<div class="fd-seller-auth-warning">${escapeHtml(getSellerAuthHelpText(auth.reason))}</div>`}
            <div class="fd-seller-actions">
              <button type="button" class="fd-seller-btn fd-seller-edit" data-id="${rid}">Editar</button>
              <button type="button" class="fd-seller-btn fd-seller-toggle" data-id="${rid}" data-action="toggle-active">${activa ? 'Desactivar usuaria' : 'Activar usuaria'}</button>
              <button type="button" class="fd-seller-btn fd-seller-toggle" data-id="${rid}" data-action="toggle-receives">${recibe ? 'Pausar reuniones' : 'Recibir reuniones'}</button>
            </div>
            <form class="fd-seller-edit-form" data-id="${rid}" hidden>
              <input name="id" type="text" placeholder="ID" value="${escapeHtml(seller.id || '')}" />
              <input name="nombre" type="text" placeholder="Nombre" value="${escapeHtml(seller.nombre || '')}" />
              <input name="correo" type="email" placeholder="Correo" value="${escapeHtml(seller.correo || '')}" />
              <input name="telefono" type="text" placeholder="Telefono" value="${escapeHtml(seller.telefono || '')}" />
              <select name="rol">
                <option value="Vendedora" ${seller.rol === 'Vendedora' ? 'selected' : ''}>Vendedora</option>
                <option value="Gerente" ${seller.rol === 'Gerente' ? 'selected' : ''}>Gerente</option>
              </select>
              <label><input name="activa" type="checkbox" ${activa ? 'checked' : ''} /> Activa</label>
              <label><input name="puede_recibir_reuniones" type="checkbox" ${recibe ? 'checked' : ''} /> Puede recibir reuniones</label>
              <div class="fd-seller-edit-actions">
                <button type="submit" class="fd-seller-btn">Guardar</button>
                <button type="button" class="fd-seller-btn fd-seller-cancel">Cancelar</button>
                <button type="button" class="fd-seller-btn fd-seller-delete" data-id="${rid}">Eliminar/desactivar</button>
              </div>
              <div class="fd-seller-edit-msg fd-msg" style="display:none;"></div>
            </form>
          </div>
        `;
      }).join('');

      listEl.querySelectorAll('.fd-seller-edit').forEach(btn => {
        btn.addEventListener('click', () => {
          const card = btn.closest('.fd-seller-card');
          const form = card?.querySelector('.fd-seller-edit-form');
          if (form) form.hidden = !form.hidden;
        });
      });

      listEl.querySelectorAll('.fd-seller-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
          const form = btn.closest('.fd-seller-edit-form');
          if (form) form.hidden = true;
        });
      });

      listEl.querySelectorAll('.fd-seller-edit-form').forEach(form => {
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          const id = form.dataset.id;
          const msgEl = form.querySelector('.fd-seller-edit-msg');
          const submitBtn = form.querySelector('button[type="submit"]');
          const data = new FormData(form);
          const body = {
            id: String(data.get('id') || '').trim(),
            nombre: String(data.get('nombre') || '').trim(),
            correo: String(data.get('correo') || '').trim(),
            telefono: String(data.get('telefono') || '').trim(),
            rol: String(data.get('rol') || 'Vendedora').trim(),
            activa: data.has('activa'),
            puede_recibir_reuniones: data.has('puede_recibir_reuniones')
          };

          if (!body.id || !body.nombre || !body.correo) {
            setAddSellerMessage(msgEl, 'ID, nombre y correo son obligatorios.', true);
            return;
          }

          submitBtn.disabled = true;
          submitBtn.textContent = 'Guardando...';
          setAddSellerMessage(msgEl, '', false);

          try {
            await fetchJson(`${API_BASE_URL}/sellers/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
            });
            await loadSellersIntoView(view);
          } catch (err) {
            console.error('Extension FD: error al editar vendedora', err);
            setAddSellerMessage(msgEl, 'No se pudo guardar la vendedora.', true);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar';
          }
        });
      });

      listEl.querySelectorAll('.fd-seller-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          if (!id) return;

          const sellerName = btn.closest('.fd-seller-card')?.querySelector('.fd-seller-name')?.textContent?.trim() || 'esta vendedora';
          const confirmed = window.confirm(`¿Desactivar a ${sellerName}? No podrá recibir reuniones hasta que la vuelvas a activar.`);
          if (!confirmed) return;

          btn.disabled = true;
          btn.textContent = 'Desactivando...';

          try {
            await fetchJson(`${API_BASE_URL}/sellers/${id}`, { method: 'DELETE' });
            await loadSellersIntoView(view);
          } catch (err) {
            console.error('Extension FD: error al desactivar vendedora', err);
            btn.disabled = false;
            btn.textContent = 'Eliminar/desactivar';
          }
        });
      });

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

            if (action === 'toggle-active' && seller.activa) {
              const sellerName = seller.nombre || seller.correo || 'esta vendedora';
              const confirmed = window.confirm(`¿Desactivar a ${sellerName}? No podrá recibir reuniones hasta que la vuelvas a activar.`);
              if (!confirmed) {
                btn.disabled = false;
                btn.textContent = 'Desactivar usuaria';
                return;
              }
            }

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
          <label><input id="fd-new-seller-recibe" type="checkbox" checked /> Puede recibir reuniones</label>
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
      const recibeInput = view.querySelector('#fd-new-seller-recibe');
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
          body: JSON.stringify({
            id,
            nombre,
            correo,
            telefono,
            rol: 'Vendedora',
            puede_recibir_reuniones: recibeInput?.checked === true
          })
        });

        if (idInput) idInput.value = '';
        if (nombreInput) nombreInput.value = '';
        if (correoInput) correoInput.value = '';
        if (telefonoInput) telefonoInput.value = '';
        if (recibeInput) recibeInput.checked = true;
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
    if (panel?.dataset.refreshingUser === 'true') {
      return { authenticated: isPanelAuthenticated(panel) };
    }
    if (panel) panel.dataset.refreshingUser = 'true';

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
      panel.dataset.currentUserRecordId = currentUser?.usuario?.recordId || '';
      panel.dataset.currentUserAuthenticated = currentUser?.authenticated ? 'true' : 'false';
      renderCurrentUser(panel, currentUser);
      configureRoleTabs(panel, panel.dataset.currentUserRole);

      if (!currentUser?.authenticated) {
        clearProtectedPanelData(panel);
      }

      const gerenteSection = panel?.querySelector('#fd-gerente-section');
      if (gerenteSection) {
        gerenteSection.innerHTML = '';
      }

      return currentUser;
    } catch (error) {
      console.error('Extension FD: error al obtener usuario actual', error);
      panel.dataset.currentUserRole = '';
      panel.dataset.currentUserEmail = '';
      panel.dataset.currentUserRecordId = '';
      panel.dataset.currentUserAuthenticated = 'false';
      configureRoleTabs(panel, '');
      clearProtectedPanelData(panel, 'No se pudo verificar la sesion. Revisa que el servidor este activo.');
      if (container) {
        container.innerHTML = `
          <div class="fd-user-status fd-user-status--warning">
            <div class="fd-user-identity">
              <div class="fd-user-avatar fd-user-avatar--warning">!</div>
              <div class="fd-user-info">
                <div class="fd-user-name">No se pudo cargar la sesion</div>
                <div class="fd-user-email">Revisa que el servidor este activo.</div>
              </div>
            </div>
          </div>
        `;
      }
      return { authenticated: false };
    } finally {
      if (panel) panel.dataset.refreshingUser = 'false';
    }
  }

  function clearSelectedBookingSlot(panel) {
    if (!panel) return;

    panel.dataset.selectedBookingTime = '';
    panel.dataset.selectedBookingSellers = '[]';
    panel.dataset.selectedBookingSellerRecordId = '';
    panel.dataset.selectedBookingSellerName = '';
    panel.querySelectorAll('.availability-slot-item').forEach(slotItem => {
      slotItem.dataset.selected = 'false';
      slotItem.classList.remove('fd-slot-item--selected');
    });
    resetBookingActionsLocation(panel);
    renderBookingAssignmentSelector(panel, []);
    setBookingButtonState(panel, false);
  }

  function getSlotAvailableSellers(slot = {}) {
    if (Array.isArray(slot.available_sellers) && slot.available_sellers.length > 0) {
      return slot.available_sellers;
    }

    return (slot.available_users || []).map((name) => ({
      recordId: '',
      nombre: name,
      correo: '',
      color: ''
    }));
  }

  function readSlotSellers(slotItem) {
    try {
      return JSON.parse(slotItem?.dataset.availableSellers || '[]');
    } catch (_error) {
      return [];
    }
  }

  function sortSellersByWeeklyLoad(sellers = []) {
    return [...sellers].sort((a, b) => {
      const aLoad = a.load || {};
      const bLoad = b.load || {};
      const weekDiff = Number(aLoad.weekCount || 0) - Number(bLoad.weekCount || 0);
      if (weekDiff !== 0) return weekDiff;
      const todayDiff = Number(aLoad.todayCount || 0) - Number(bLoad.todayCount || 0);
      if (todayDiff !== 0) return todayDiff;
      const aName = (a.nombre || a.correo || '').toString();
      const bName = (b.nombre || b.correo || '').toString();
      return aName.localeCompare(bName);
    });
  }

  function getSellerDisplayName(seller = {}) {
    return seller.nombre || seller.correo || 'Sin nombre';
  }

  function getSellerInitials(seller = {}) {
    const name = getSellerDisplayName(seller).trim();
    const parts = name.split(/\s+/).filter(Boolean);
    const initials = parts.length > 1
      ? `${parts[0][0] || ''}${parts[1][0] || ''}`
      : name.slice(0, 2);
    return initials.toUpperCase() || '?';
  }

  function getSellerAssignmentLabel(seller = {}) {
    const load = seller.load || {};
    const loadParts = [
      `${Number(load.todayCount || 0)} hoy`,
      `${Number(load.weekCount || 0)} esta semana`
    ].filter(Boolean);
    return `${getSellerDisplayName(seller)} (${loadParts.join(', ')})`;
  }

  function findSellerByIdentity(sellers = [], recordId = '', name = '') {
    return sellers.find((seller) => {
      const sellerRecordId = seller.recordId || '';
      const sellerName = getSellerDisplayName(seller);
      return (recordId && sellerRecordId === recordId) || (!recordId && name && sellerName === name);
    }) || null;
  }

  function filterAssignableSellersForCurrentUser(panel, sellers = []) {
    if (isManagerRole(getPanelRole(panel))) return sellers;

    const currentRecordId = panel?.dataset.currentUserRecordId || '';
    const currentEmail = String(panel?.dataset.currentUserEmail || '').trim().toLowerCase();

    return sellers.filter((seller) => {
      return (currentRecordId && seller.recordId === currentRecordId) ||
        (currentEmail && String(seller.correo || '').trim().toLowerCase() === currentEmail);
    });
  }

  function renderSellerBubbles(sellers = []) {
    return sortSellersByWeeklyLoad(sellers).map((seller) => {
      const recordId = escapeHtml(seller.recordId || '');
      const name = getSellerDisplayName(seller);
      const safeName = escapeHtml(name);
      const safeColor = normalizeHexColor(seller.color);
      const color = safeColor ? ` style="--seller-color:${safeColor}"` : '';
      const recommended = seller.recommended ? ' fd-seller-bubble--recommended' : '';
      return `
        <button type="button" class="fd-seller-bubble${recommended}" data-seller-record-id="${recordId}" data-seller-name="${safeName}" title="${escapeHtml(getSellerAssignmentLabel(seller))}" aria-label="Asignar a ${safeName}"${color}>
          ${escapeHtml(getSellerInitials(seller))}
        </button>
      `;
    }).join('');
  }

  function renderBookingAssignmentSelector(panel, sellers = [], selectedSeller = null) {
    const container = panel?.querySelector('#booking-assignment');
    if (!container) return;

    panel.dataset.selectedBookingSellerRecordId = '';
    panel.dataset.selectedBookingSellerName = '';

    if (!isManagerRole(getPanelRole(panel)) || !sellers.length) {
      container.innerHTML = '';
      container.hidden = true;
      return;
    }

    const orderedSellersForReadOnly = sortSellersByWeeklyLoad(sellers);
    const recommendedSellerForReadOnly = orderedSellersForReadOnly.find((seller) => seller.recommended) || orderedSellersForReadOnly[0];
    const visibleSellerForReadOnly = selectedSeller || recommendedSellerForReadOnly;
    const readOnlyAssignmentLabel = selectedSeller
      ? getSellerAssignmentLabel(visibleSellerForReadOnly)
      : `Automático - recomienda ${getSellerDisplayName(visibleSellerForReadOnly)}`;

    if (selectedSeller) {
      panel.dataset.selectedBookingSellerRecordId = selectedSeller.recordId || '';
      panel.dataset.selectedBookingSellerName = getSellerDisplayName(selectedSeller);
    }

    container.hidden = false;
    container.innerHTML = `
      <div class="fd-booking-assignment-label">Asignar a</div>
      <div class="fd-booking-assignment-readonly" aria-live="polite">${escapeHtml(readOnlyAssignmentLabel)}</div>
    `;
  }

  function resetBookingActionsLocation(panel) {
    const anchor = panel?.querySelector('#booking-actions-anchor');
    const shell = panel?.querySelector('#booking-actions-shell');
    if (anchor && shell && shell.parentElement !== anchor) {
      anchor.appendChild(shell);
    }
  }

  function moveBookingActionsAfterSlot(panel, slotItem) {
    const shell = panel?.querySelector('#booking-actions-shell');
    if (!shell || !slotItem) return;
    slotItem.insertAdjacentElement('afterend', shell);
  }

  function renderAvailabilityResults(panel, slots = []) {
    const results = panel?.querySelector('#availability-results');
    if (!results) return;

    resetBookingActionsLocation(panel);

    if (!slots.length) {
      panel.dataset.selectedBookingTime = '';
      panel.dataset.selectedBookingSellers = '[]';
      results.innerHTML = '';
      setAvailabilityMessage(panel, 'No hay disponibilidad para este dia');
      renderBookingAssignmentSelector(panel, []);
      setBookingButtonState(panel, false);
      return;
    }

    panel.dataset.selectedBookingTime = '';
    panel.dataset.selectedBookingSellers = '[]';
    setBookingMessage(panel, '');
    renderBookingAssignmentSelector(panel, []);
    setBookingButtonState(panel, false);

    const visibleSlots = slots
      .map((slot) => ({
        ...slot,
        available_sellers: filterAssignableSellersForCurrentUser(panel, getSlotAvailableSellers(slot))
      }))
      .filter((slot) => slot.available_sellers.length > 0);

    if (!visibleSlots.length) {
      panel.dataset.selectedBookingTime = '';
      panel.dataset.selectedBookingSellers = '[]';
      results.innerHTML = '';
      setAvailabilityMessage(panel, 'No tenes disponibilidad para este dia');
      renderBookingAssignmentSelector(panel, []);
      setBookingButtonState(panel, false);
      return;
    }

    results.innerHTML = visibleSlots.map(slot => {
      const availableSellers = sortSellersByWeeklyLoad(slot.available_sellers);
      return `
      <div class="fd-slot-item availability-slot-item" role="button" tabindex="0" data-time="${escapeHtml(slot.time)}" data-available-sellers="${escapeHtml(JSON.stringify(availableSellers))}" data-selected="false">
        <div class="fd-slot-main">
          <span class="fd-slot-time">${escapeHtml(slot.time)}</span>
          <span class="fd-slot-users">${availableSellers.length} disponible${availableSellers.length === 1 ? '' : 's'}</span>
        </div>
        <div class="fd-slot-sellers" aria-label="Vendedoras disponibles">
          ${renderSellerBubbles(availableSellers)}
        </div>
      </div>
    `;
    }).join('');
  }

  function bindAvailabilityInteractions(panel) {
    if (!panel || panel.dataset.availabilityBound === 'true') return;
    panel.dataset.availabilityBound = 'true';

    const dateInput = panel.querySelector('#availability-date');
    const durationSelect = panel.querySelector('#availability-duration');
    const emailInput = panel.querySelector('#booking-email');
    const actionButton = panel.querySelector('#availability-check-btn');
    const bookButton = panel.querySelector('#booking-create-btn');
    const results = panel.querySelector('#availability-results');

    if (dateInput && !dateInput.value) {
      dateInput.value = getTodayDateValue();
      dateInput.min = getTodayDateValue();
    }

    actionButton?.addEventListener('click', async () => {
      if (!isPanelAuthenticated(panel)) {
        clearProtectedPanelData(panel);
        activatePanelTab(panel, 'availability');
        return;
      }

      const date = dateInput?.value;
      const duration = durationSelect?.value || '30';
      panel.dataset.selectedBookingTime = '';
      panel.dataset.selectedBookingSellers = '[]';
      panel.dataset.selectedBookingSellerRecordId = '';
      panel.dataset.selectedBookingSellerName = '';
      setBookingMessage(panel, '');
      resetBookingActionsLocation(panel);
      renderBookingAssignmentSelector(panel, []);
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
      const sellerBubble = event.target.closest('.fd-seller-bubble');
      const wasSelected = item.dataset.selected === 'true';

      results.querySelectorAll('.availability-slot-item').forEach(s => {
        s.dataset.selected = 'false';
        s.classList.remove('fd-slot-item--selected');
        s.querySelectorAll('.fd-seller-bubble').forEach((bubble) => {
          bubble.classList.remove('fd-seller-bubble--selected');
        });
      });

      if (wasSelected && !sellerBubble) {
        panel.dataset.selectedBookingTime = '';
        panel.dataset.selectedBookingSellers = '[]';
        panel.dataset.selectedBookingSellerRecordId = '';
        panel.dataset.selectedBookingSellerName = '';
        resetBookingActionsLocation(panel);
        renderBookingAssignmentSelector(panel, []);
        setBookingMessage(panel, '');
        setBookingButtonState(panel, false);
        return;
      }

      item.dataset.selected = 'true';
      item.classList.add('fd-slot-item--selected');
      panel.dataset.selectedBookingTime = item.dataset.time || '';
      const availableSellers = readSlotSellers(item);
      panel.dataset.selectedBookingSellers = JSON.stringify(availableSellers);
      const selectedSeller = sellerBubble
        ? findSellerByIdentity(availableSellers, sellerBubble.dataset.sellerRecordId || '', sellerBubble.dataset.sellerName || '')
        : null;
      if (sellerBubble && selectedSeller) {
        sellerBubble.classList.add('fd-seller-bubble--selected');
      }
      renderBookingAssignmentSelector(panel, availableSellers, selectedSeller);
      moveBookingActionsAfterSlot(panel, item);
      setBookingMessage(panel, '');
      setBookingButtonState(panel, true);
    });

    results?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const target = event.target.closest('.availability-slot-item, .fd-seller-bubble');
      if (!target) return;
      event.preventDefault();
      target.click();
    });

    dateInput?.addEventListener('change', () => {
      panel.dataset.selectedBookingTime = '';
      panel.dataset.selectedBookingSellers = '[]';
      resetBookingActionsLocation(panel);
      renderBookingAssignmentSelector(panel, []);
      setBookingMessage(panel, '');
      setBookingButtonState(panel, false);
    });

    durationSelect?.addEventListener('change', () => {
      panel.dataset.selectedBookingTime = '';
      panel.dataset.selectedBookingSellers = '[]';
      resetBookingActionsLocation(panel);
      renderBookingAssignmentSelector(panel, []);
      setBookingMessage(panel, '');
      setBookingButtonState(panel, false);
    });

    emailInput?.addEventListener('input', () => {
      syncPanelContactEmail(panel, emailInput.value);
      setBookingMessage(panel, '');
    });

    bookButton?.addEventListener('click', async () => {
      if (!isPanelAuthenticated(panel)) {
        clearProtectedPanelData(panel);
        activatePanelTab(panel, 'availability');
        return;
      }

      if (panel.dataset.bookingInProgress === 'true') return;

      const telefono = panel.dataset.currentPhone || '';
      const nombre = panel.dataset.currentName || '';
      const email = String(emailInput?.value || panel.dataset.currentEmail || '').trim();
      syncPanelContactEmail(panel, email);
      const date = dateInput?.value || '';
      const duration = durationSelect?.value || '30';
      const time = panel.dataset.selectedBookingTime || '';
      const phase = getRespondPagePhase();
      const assignedSellerRecordId = panel.dataset.selectedBookingSellerRecordId || '';
      const assignedSellerName = panel.dataset.selectedBookingSellerName || '';

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
        const booking = await bookMeeting({ telefono, nombre, email, date, time, duration, phase, assignedSellerRecordId, assignedSellerName });
        const fields = await fetchContactData(telefono);
        const meetings = await fetchMeetingsData(telefono);
        updatePanelWithData(fields || {
          Nombre: nombre,
          Telefono: telefono,
          Correo: email,
          'Fase del Momento': phase || 'FASE 1'
        }, meetings);

        const meetLink = booking?.meetLink || '';
        setBookingMessage(
          panel,
          meetLink ? 'Reunion agendada correctamente.' : 'Reunion agendada correctamente, pero no se recibio link de Meet.',
          false,
          meetLink
        );
        clearSelectedBookingSlot(panel);
        setAvailabilityMessage(panel, 'Reunión agendada. Volvé a consultar disponibilidad para reservar otro horario.');
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

  function sortMeetingsByDateDesc(meetings = []) {
    return [...meetings].sort((a, b) => {
      const aTime = new Date(a?.fields?.['Fecha'] || 0).getTime();
      const bTime = new Date(b?.fields?.['Fecha'] || 0).getTime();
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    });
  }

  function updatePanelWithData(fields, meetings = []) {
    const panel = document.getElementById('custom-side-panel');
    if (panel && !isPanelAuthenticated(panel)) {
      clearProtectedPanelData(panel);
      return;
    }

    if (panel && fields) {
      panel.dataset.currentPhone = fields['Telefono'] || '';
      panel.dataset.currentName = fields['Nombre'] || '';
      syncPanelContactEmail(panel, fields['Correo'] || '');

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
    const sortedMeetings = sortMeetingsByDateDesc(meetings);
    const meetingsHTML = isManagerRole(role) ? getGerenteMeetCardsHTML(sortedMeetings) : getMeetCardsHTML(sortedMeetings);
    const panelMeetingsContainer = panel?.querySelector('.panel-section-summary > div');
    if (panelMeetingsContainer) {
      const count = sortedMeetings.length;
      const headerHTML = `<div class="fd-meets-header"><span class="fd-meets-title">Reuniones</span><span class="fd-meets-count">${count}</span></div>`;
      panelMeetingsContainer.innerHTML = headerHTML + meetingsHTML;
    }

    // Stats from meetings array
    if (panel) {
      const last = sortedMeetings[0];
      const status = last?.fields['ESTADO'] || '';
      const note = getDisplayMeetingNote(last?.fields['Notas']);

      const countEl = panel.querySelector('#fd-stat-count');
      const dateEl = panel.querySelector('#fd-stat-date');
      const statusEl = panel.querySelector('#fd-stat-status');
      const noteEl = panel.querySelector('#fd-stat-note');
      const quickSummaryEl = panel.querySelector('#fd-lead-quick-summary');

      if (countEl) countEl.textContent = `${sortedMeetings.length} reunion${sortedMeetings.length === 1 ? '' : 'es'}`;
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
      syncPanelContactEmail(panel, v);
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
            <input id="booking-email" type="email" placeholder="Correo del cliente" autocomplete="email" />
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
          <div id="booking-actions-anchor">
            <div id="booking-actions-shell" class="fd-booking-actions-shell">
              <div id="booking-assignment" class="fd-booking-assignment" hidden></div>
              <button id="booking-create-btn" type="button" disabled>Agendar reunion</button>
              <div id="booking-message" style="display:none;"></div>
            </div>
          </div>
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
              <div class="fd-user-identity">
                <div class="fd-user-avatar fd-user-avatar--gray">...</div>
                <div class="fd-user-info">
                  <div class="fd-user-name">Cargando usuario...</div>
                  <div class="fd-user-email">Consultando sesion actual</div>
                </div>
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
    bindGoogleAuthMessages(panelOrForm);

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
      if (meetForm.dataset.authRequired === 'true') return;
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

  function bindMeetResizeHandle(meetForm, handle, mode) {
    if (!handle || handle.dataset.bound === 'true') return;
    handle.dataset.bound = 'true';

    handle.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startY = event.clientY;
      const startRect = meetForm.getBoundingClientRect();
      const startWidth = startRect.width;
      const startHeight = startRect.height;

      document.body.style.cursor = mode === 'width' ? 'ew-resize' : (mode === 'height' ? 'ns-resize' : 'nesw-resize');
      document.body.style.userSelect = 'none';

      const onMove = (moveEvent) => {
        const maxWidth = Math.max(320, window.innerWidth - 24);
        const maxHeight = Math.max(360, window.innerHeight - 72);
        const nextWidth = mode === 'height'
          ? startWidth
          : Math.min(maxWidth, Math.max(320, startWidth - (moveEvent.clientX - startX)));
        const nextHeight = mode === 'width'
          ? startHeight
          : Math.min(maxHeight, Math.max(360, startHeight + (moveEvent.clientY - startY)));

        meetForm.style.setProperty('width', `${nextWidth}px`, 'important');
        meetForm.style.setProperty('height', `${nextHeight}px`, 'important');
        meetForm.style.bottom = 'auto';
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function bindMeetPanelResize(meetForm) {
    bindMeetResizeHandle(meetForm, meetForm?.querySelector('#fd-meet-resize-left'), 'width');
    bindMeetResizeHandle(meetForm, meetForm?.querySelector('#fd-meet-resize-bottom'), 'height');
    bindMeetResizeHandle(meetForm, meetForm?.querySelector('#fd-meet-resize-handle'), 'both');
  }

  function injectMeetForm() {
    let meetForm = document.getElementById('custom-meet-form');
    if (meetForm) return meetForm;

    const container = document.body;

    const vendedoras = ['FLORENCIA', 'SILVINA', 'ITATI', 'SARITA', 'ORNELLA', 'LIZ', 'INES', 'Milbia'];
    const vendedoraOptions = vendedoras.map(v => `<option value="${v}">${v}</option>`).join('');
    const estadoOptions = ['Realizada', 'Cancelada', 'Pendiente']
      .map(v => `<option value="${v}">${v}</option>`).join('');

    meetForm = document.createElement('div');
    meetForm.id = 'custom-meet-form';
    panelOrForm = meetForm;
    meetForm.className = 'fJsklc Didmac ZmuLbd nulMpf Y7BRKe';
    meetForm.style.position = 'fixed';
    meetForm.style.right = '0px';
    meetForm.style.top = '50px';
    meetForm.style.bottom = 'auto';
    meetForm.style.zIndex = '2147483646';
    meetForm.style.setProperty('width', '380px', 'important');
    meetForm.style.setProperty('height', 'calc(100vh - 130px)', 'important');
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
                  <label class="qdOxv-fmcmS-wGMbrd" for="fd-meet-registro">¿Logramos el Registro?:</label>
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
                  <div id="fd-meet-save-message" class="fd-meet-save-message" role="status" aria-live="polite" style="display:none;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
      <div id="fd-meet-resize-left" aria-hidden="true"></div>
      <div id="fd-meet-resize-bottom" aria-hidden="true"></div>
      <div id="fd-meet-resize-handle" title="Redimensionar panel"></div>
    `;

    container.appendChild(meetForm);

    bindMeetEditableTitle(meetForm);
    bindMeetPanelResize(meetForm);

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
          const respondName = getRespondPageName();
          const respondEmail = getRespondPageEmail();
          const respondContactFields = {
            Nombre: respondName || (phone ? `Cliente ${phone}` : ''),
            Telefono: phone || '',
            Correo: respondEmail || ''
          };
          panelOrForm.dataset.currentPhone = phone || '';
          panelOrForm.dataset.currentName = respondContactFields.Nombre;
          const phoneEl = panelOrForm.querySelector('#fd-contact-phone');
          if (phoneEl) {
            phoneEl.querySelector('.fd-contact-value').textContent = phone || '-';
            phoneEl.setAttribute('data-copy', phone || '');
          }
          syncPanelContactEmail(panelOrForm, respondEmail);
          if (!phone) {
            console.warn('Extension FD: no se encontró un número tras "para:" en un div con clases dls-whitespace-nowrap dls-truncate');
            refreshCurrentUser(panelOrForm);
          } else {
            (async () => {
              const currentUser = await refreshCurrentUser(panelOrForm);
              if (!currentUser?.authenticated) {
                return;
              }
              const fields = await fetchContactData(phone);
              const meetings = await fetchMeetingsData(phone);
              updatePanelWithData({
                ...respondContactFields,
                ...(fields || {}),
                Telefono: fields?.Telefono || respondContactFields.Telefono,
                Nombre: fields?.Nombre || respondContactFields.Nombre,
                Correo: fields?.Correo || respondContactFields.Correo
              }, meetings);
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
            setMeetFormAuthRequired(meetForm, false);
            const meetLink = getCurrentMeetLinkForAirtable();
            fetchMeetingRecordByMeetLink(meetLink).then(record => {
              setMeetFormAuthRequired(meetForm, Boolean(record?.authRequired));
              if (record?.id) meetForm.dataset.airtableRecordId = record.id;
              if (record?.fields) applyMeetingFieldsToMeetForm(meetForm, record.fields);
              const messageEl = meetForm.querySelector('#fd-meet-save-message');
              if (record?.authRequired && messageEl) {
                messageEl.textContent = 'Inicia sesión con Google para ver y guardar los datos de esta reunión.';
                messageEl.className = 'fd-meet-save-message fd-meet-save-message--warning';
                messageEl.style.display = 'block';
              } else if (!record?.id && messageEl) {
                messageEl.textContent = 'No se encontró una reunión vinculada a este link de Google Meet.';
                messageEl.className = 'fd-meet-save-message fd-meet-save-message--warning';
                messageEl.style.display = 'block';
              } else if (messageEl) {
                messageEl.textContent = '';
                messageEl.style.display = 'none';
              }
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
