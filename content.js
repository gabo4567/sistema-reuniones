(function() {
  if (document.getElementById('custom-calendar-btn')) return;
  const API_BASE_URL = 'http://localhost:3000/api';

  function isAllowedUrl() {
    const url = window.location.href;
    const isMeet = window.location.hostname === 'meet.google.com';
    const isInbox = url.includes('https://app.respond.io/space/342593/inbox');
    return isMeet || isInbox;
  }

  function getMeetCardsHTML(meetings = []) {
    if (!meetings || meetings.length === 0) {
      return '<div class="dls-txt-caption dls-text-text-secondary dls-text-center dls-py-4">No hay reuniones registradas</div>';
    }

    return meetings.map(record => {
      const fields = record.fields;
      const date = fields['Fecha'] ? new Date(fields['Fecha']).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
      const status = fields['ESTADO'] || 'N/A';
      const type = fields['Tipo de Reunion'] || 'Meet';
      const seller = fields['Vendedora'] || 'N/A';
      const phase = fields['Fase del Momento'] || 'N/A';
      const meetLink = fields['Link de meet'] || '#';
      const registered = fields['Logramos Registro?'] === true ? '✅' : '❌';
      const notes = fields['Notas'] || 'Sin notas';

      return `
        <div class="meet-card" style="position: relative; width: 100%; margin-bottom: 12px;">
          <div class="dls-pb-[14px]">
            <div class="dls-border dls-rounded-rectangular-8 dls-border-border-default dls-p-12 dls-cursor-pointer hover:dls-bg-bg-gray meet-card-header">
              <div>
                <div class="dls-flex dls-pb-8 dls-items-center dls-justify-between">
                  <div class="dls-flex dls-align-middle">
                    <i data-component="FontIcon" class="icon icon-user-circle-add dls-size-icon-lg dls-text-icon-lg"></i>
                    <span class="dls-txt-h6 dls-text-text-primary dls-ps-8">${type}</span>
                  </div>
                  <span class="v-chip v-theme--dark v-chip--density-default v-chip--size-small v-chip--variant-tonal dls-relative dls-inline-flex dls-items-center dls-justify-center dls-h-[24px] dls-rounded-modal dls-bg-bg-gray dls-px-4">
                    <span class="dls-txt-caption dls-font-semibold dls-text-text-secondary">${date}</span>
                  </span>
                </div>
                <div class="dls-bg-border-default dls-w-full dls-h-[1px]"></div>
                <div class="dls-pt-8 dls-flex dls-items-center dls-justify-between">
                  <span class="dls-txt-caption dls-text-text-secondary">${seller}</span>
                  <span class="v-chip v-theme--dark v-chip--density-default v-chip--size-small v-chip--variant-tonal dls-relative dls-inline-flex dls-items-center dls-justify-center dls-h-[24px] dls-rounded-modal dls-bg-bg-gray dls-px-4">
                    <span class="dls-txt-caption dls-font-semibold dls-text-text-secondary">${status}</span>
                  </span>
                </div>
              </div>
              <!-- Info Extra Desplegable -->
              <div class="meet-card-extra-info" style="display: none; margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(202, 204, 211, 0.3);">
                <div class="dls-flex dls-flex-col dls-gap-2">
                  <div class="dls-flex dls-justify-between dls-items-center">
                    <span class="dls-txt-caption dls-text-text-secondary">Fase del Momento:</span>
                    <span class="dls-txt-caption-bold dls-text-text-primary">${phase}</span>
                  </div>
                  <div class="dls-flex dls-justify-between dls-items-center">
                    <span class="dls-txt-caption dls-text-text-secondary">Logramos Registro?:</span>
                    <span class="dls-txt-caption-bold dls-text-text-primary">${registered}</span>
                  </div>
                  <div class="dls-flex dls-flex-col dls-mt-1">
                    <span class="dls-txt-caption dls-text-text-secondary">Notas:</span>
                    <span class="dls-txt-caption dls-text-text-primary">${notes}</span>
                  </div>
                  <div class="dls-flex dls-items-center dls-mt-2 dls-w-full">
                    <a data-v-6b05a376="" href="${meetLink}" class="dls-min-w-0 dls-w-full dls-relative dls-txt-button dls-whitespace-nowrap dls-select-none dls-items-center dls-justify-between dls-transition-colors [&amp;:not([v-tooltip])[disabled=true]]:dls-pointer-events-none rtl:flex-row-reverse data-[disabled=true]:dls-border-border-default dls-normal-case dls-inline-flex dls-fill-blue-base dls-text-blue-base data-[disabled=false]:active:dls-text-blue-lighten-1 dls-p-0 dls-pl-0 dls-pr-0 !dls-h-fit [&amp;_svg]:dls-h-icon-xs [&amp;_svg]:dls-w-icon-xs [&amp;_svg]:dls-text-icon-xs [&amp;_i]:dls-text-icon-xs [&amp;_i]:dls-w-icon-xs [&amp;_i]:dls-h-icon-xs hover:[&amp;_:not(i)]:data-[disabled=false]:dls-underline" disabled="false" type="button" data-disabled="false" data-iconstart="false" data-iconend="true" data-variant="link" data-color="neutral" data-size="neutral" data-type="router-link" data-loading="[object Object]" data-pendo="messages-contact-fields-manage" target="_blank"><span class="dls-truncate dls-flex-1">${meetLink}</span><i data-component="FontIcon" class="icon icon-redirect dls-size-icon-lg dls-text-icon-lg dls-ms-4"></i></a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function addMeetCardListeners(container) {
    container.addEventListener('click', (e) => {
      const header = e.target.closest('.meet-card-header');
      if (header) {
        // Prevent toggle if clicking the link button or any link inside
        if (e.target.closest('a') || e.target.tagName === 'A') return;

        const extraInfo = header.querySelector('.meet-card-extra-info');
        if (extraInfo) {
          const isHidden = extraInfo.style.display === 'none';
          extraInfo.style.display = isHidden ? 'block' : 'none';
          
          // Optional: Add a class for styling purposes when open
          header.classList.toggle('is-open', isHidden);
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
    const response = await fetch(url, options);
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
    if (notas && notasValue != null) notas.value = String(notasValue);
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

  function getAvailabilityItemStyle(isSelected = false) {
    return [
      'width: 100%',
      'display: flex',
      'align-items: center',
      'justify-content: space-between',
      'gap: 10px',
      'padding: 10px 12px',
      'border-radius: 8px',
      `border: 1px solid ${isSelected ? '#0B57D0' : 'rgba(202, 204, 211, 0.2)'}`,
      `background: ${isSelected ? 'rgba(11, 87, 208, 0.14)' : 'rgba(255, 255, 255, 0.03)'}`,
      'color: #CACCD3',
      'cursor: pointer',
      'transition: background-color 0.2s, border-color 0.2s',
      'text-align: left'
    ].join('; ');
  }

  function setAvailabilityMessage(panel, message, isError = false) {
    const results = panel?.querySelector('#availability-results');
    if (!results) return;

    results.innerHTML = `
      <div style="padding: 14px 10px; border-radius: 8px; background: rgba(255, 255, 255, 0.03); color: ${isError ? '#f28b82' : '#CACCD3'}; text-align: center; font-size: 13px;">
        ${message}
      </div>
    `;
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
    messageEl.innerHTML = safeLink
      ? `${safeMessage}<a href="${safeLink}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; width: 100%; box-sizing: border-box; justify-content: center; margin-top: 10px; padding: 9px 10px; border-radius: 8px; border: 1px solid #0B57D0; background: #0B57D0; color: #FFFFFF; text-decoration: none; font-weight: 700;">Abrir Meet</a>`
      : safeMessage;
    messageEl.style.display = message ? 'block' : 'none';
    messageEl.style.color = isError ? '#f28b82' : '#CACCD3';
    messageEl.style.borderColor = isError ? 'rgba(242, 139, 130, 0.35)' : 'rgba(202, 204, 211, 0.2)';
  }

  function setBookingButtonState(panel, enabled) {
    const bookButton = panel?.querySelector('#booking-create-btn');
    if (!bookButton) return;

    bookButton.disabled = !enabled;
    bookButton.style.opacity = enabled ? '1' : '0.5';
    bookButton.style.cursor = enabled ? 'pointer' : 'not-allowed';
    bookButton.style.borderColor = enabled ? '#0B57D0' : 'rgba(202, 204, 211, 0.25)';
    bookButton.style.background = enabled ? '#0B57D0' : 'rgba(255, 255, 255, 0.06)';
  }

  function clearSelectedBookingSlot(panel) {
    if (!panel) return;

    panel.dataset.selectedBookingTime = '';
    panel.querySelectorAll('.availability-slot-item').forEach(slotItem => {
      slotItem.dataset.selected = 'false';
      slotItem.style.cssText = getAvailabilityItemStyle(false);
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
      <button
        type="button"
        class="availability-slot-item"
        data-time="${slot.time}"
        style="${getAvailabilityItemStyle(false)}"
      >
        <span style="font-size: 14px; font-weight: 600; color: #FFFFFF;">${slot.time}</span>
        <span style="font-size: 12px; color: #CACCD3;">Disponible (${slot.available_users.length} vendedora${slot.available_users.length === 1 ? '' : 's'})</span>
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

    results?.addEventListener('mouseover', (event) => {
      const item = event.target.closest('.availability-slot-item');
      if (!item || item.dataset.selected === 'true') return;
      item.style.background = 'rgba(11, 87, 208, 0.08)';
      item.style.borderColor = 'rgba(11, 87, 208, 0.5)';
    });

    results?.addEventListener('mouseout', (event) => {
      const item = event.target.closest('.availability-slot-item');
      if (!item || item.dataset.selected === 'true') return;
      item.style.background = 'rgba(255, 255, 255, 0.03)';
      item.style.borderColor = 'rgba(202, 204, 211, 0.2)';
    });

    results?.addEventListener('click', (event) => {
      const item = event.target.closest('.availability-slot-item');
      if (!item) return;

      results.querySelectorAll('.availability-slot-item').forEach(slotItem => {
        slotItem.dataset.selected = 'false';
        slotItem.style.cssText = getAvailabilityItemStyle(false);
      });

      item.dataset.selected = 'true';
      item.style.cssText = getAvailabilityItemStyle(true);
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
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', '');
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

    const meetingsHTML = getMeetCardsHTML(meetings);
    const panelMeetingsContainer = panel?.querySelector('.panel-section-summary > div');
    if (panelMeetingsContainer) panelMeetingsContainer.innerHTML = meetingsHTML;

    if (!panel || !fields) return;

    const copyableItems = panel.querySelectorAll('.copyable-item');
    if (copyableItems.length >= 2) {
      // Phone
      const phoneSpan = copyableItems[0].querySelector('span');
      if (phoneSpan) phoneSpan.textContent = fields['Telefono'] || 'N/A';
      copyableItems[0].setAttribute('data-copy', fields['Telefono'] || '');

      // Email
      const emailSpan = copyableItems[1].querySelector('span');
      if (emailSpan) emailSpan.textContent = fields['Correo'] || 'N/A';
      copyableItems[1].setAttribute('data-copy', fields['Correo'] || '');
    }

    const summaryRows = panel.querySelectorAll('.summary-row-inline, .summary-row');
    summaryRows.forEach(row => {
      const label = row.querySelector('span')?.textContent;
      const valueSpan = row.querySelector('.dls-truncate, .nota-valor');
      
      if (label && valueSpan) {
        if (label.includes('Cant Reuniones')) {
          valueSpan.textContent = fields['Cantidad de Reuniones'] || '0';
        } else if (label.includes('Ultima Reunion')) {
          const date = Array.isArray(fields['Ultima Reunion']) ? fields['Ultima Reunion'][0] : fields['Ultima Reunion'];
          valueSpan.textContent = formatAirtableDate(date);
        } else if (label.includes('Estado Reunion')) {
          const status = Array.isArray(fields['Estado Ult Reunion']) ? fields['Estado Ult Reunion'][0] : fields['Estado Ult Reunion'];
          valueSpan.textContent = status || 'N/A';
        } else if (label.includes('Nota Reunion')) {
          const note = Array.isArray(fields['Nota Ultima Reunion']) ? fields['Nota Ultima Reunion'][0] : fields['Nota Ultima Reunion'];
          valueSpan.textContent = note ? `"${note}"` : '"Sin notas"';
        }
      }
    });
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
    btn.style.backgroundColor = '#0B57D0';
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
        <div class="panel-subtitle dls-txt-h4">Contacto sin Reuniones</div>
        <div class="copyable-item" data-copy="465498765346">
          <span style="font-weight:100;" class="dls-txt-h5">465498765346</span>
          <i data-component="FontIcon" class="icon icon-copy dls-size-icon-sm dls-text-icon-sm"></i>
        </div>
        <div class="copyable-item" data-copy="sincorreo">
          <span style="font-weight:100;" class="dls-txt-h5">sincorreo</span>
          <i data-component="FontIcon" class="icon icon-copy dls-size-icon-sm dls-text-icon-sm"></i>
        </div>
        <div class="summary-row-inline" style="margin-top: 15px;"><span>Cant Reuniones:</span> <span class="dls-whitespace-nowrap dls-truncate">1</span></div>
        <div class="summary-row-inline"><span>Ultima Reunion:</span> <span class="dls-whitespace-nowrap dls-truncate">2026-02-04 16:30</span></div>
        <div class="summary-row-inline"><span>Estado Reunion:</span> <span class="dls-whitespace-nowrap dls-truncate">Cancelado</span></div>
        <div class="summary-row">
          <span>Nota Reunion:</span>
          <div class="nota-valor">"Sin notas"</div>
        </div>
        <div class="separator"></div>
        <div class="availability-section" style="display: flex; flex-direction: column; gap: 10px;">
          <div class="dls-txt-h5" style="color: #FFFFFF;">Disponibilidad</div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <input id="availability-date" type="date" style="width: 100%; box-sizing: border-box; background: #2b2b2e; color: #CACCD3; border: 1px solid rgba(202, 204, 211, 0.25); border-radius: 8px; padding: 10px 12px;" />
            <select id="availability-duration" style="width: 100%; box-sizing: border-box; background: #2b2b2e; color: #CACCD3; border: 1px solid rgba(202, 204, 211, 0.25); border-radius: 8px; padding: 10px 12px;">
              <option value="15">15 min</option>
              <option value="30" selected>30 min</option>
              <option value="60">60 min</option>
            </select>
            <button id="availability-check-btn" type="button" style="width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 8px; border: 1px solid #0B57D0; background: #0B57D0; color: #FFFFFF; font-weight: 600; cursor: pointer;">
              Ver disponibilidad
            </button>
          </div>
          <div id="availability-results" style="display: flex; flex-direction: column; gap: 8px;">
            <div style="padding: 14px 10px; border-radius: 8px; background: rgba(255, 255, 255, 0.03); color: #CACCD3; text-align: center; font-size: 13px;">
              Selecciona una fecha y duracion para consultar horarios
            </div>
          </div>
          <button id="booking-create-btn" type="button" disabled style="width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(202, 204, 211, 0.25); background: rgba(255, 255, 255, 0.06); color: #FFFFFF; font-weight: 600; cursor: not-allowed; opacity: 0.5;">
            Agendar reunion
          </button>
          <div id="booking-message" style="display: none; padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(202, 204, 211, 0.2); background: rgba(255, 255, 255, 0.03); color: #CACCD3; font-size: 13px; line-height: 1.4; word-break: break-word;"></div>
        </div>
        <div class="separator"></div>
      </div>
      <div class="panel-section-summary">
          <div style="overflow-anchor: none; flex: 0 0 auto; position: relative; width: 100%;">
            ${getMeetCardsHTML()}
          </div>
        </div>
    `;
    document.body.appendChild(panelOrForm);

    // Add listeners for the meet cards
    const sectionSummary = panelOrForm.querySelector('.panel-section-summary');
    if (sectionSummary) {
      addMeetCardListeners(sectionSummary);
    }
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
          const span = item.querySelector('span');
          const originalColor = span.style.color;
          span.style.color = '#fff';
          setTimeout(() => span.style.color = originalColor, 500);
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
          } else {
            fetchContactData(phone).then(async fields => {
              const meetings = await fetchMeetingsData(phone);
              if (fields) {
                updatePanelWithData(fields, meetings);
              }
            });
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
