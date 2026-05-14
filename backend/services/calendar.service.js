const { google } = require('googleapis');
const { saveUser } = require('./users.service');

const TIMEZONE = 'America/Argentina/Buenos_Aires';
const UTC_OFFSET = '-03:00';

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function buildLocalDateTime(date, time) {
  return `${date}T${time}:00${UTC_OFFSET}`;
}

async function getBusyTimes(user, timeMin, timeMax) {
  if (!user.access_token) {
    throw new Error(`Missing access_token for user ${user.email}`);
  }

  if (!user.refresh_token && user.expiry_date && Number(user.expiry_date) <= Date.now()) {
    throw new Error(`Missing refresh_token for expired access_token on user ${user.email}`);
  }

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: user.access_token,
    refresh_token: user.refresh_token || undefined,
    expiry_date: user.expiry_date || undefined
  });

  if (user.refresh_token && user.expiry_date && Number(user.expiry_date) <= Date.now()) {
    console.log(`Refreshing expired token for user: ${user.email}`);
    const refreshResponse = await oauth2Client.refreshAccessToken();
    const refreshedTokenData = refreshResponse.credentials || oauth2Client.credentials || {};

    await saveUser({
      email: user.email,
      access_token: refreshedTokenData.access_token || user.access_token,
      refresh_token: refreshedTokenData.refresh_token || user.refresh_token,
      expiry_date: refreshedTokenData.expiry_date || user.expiry_date,
      rol: user.rol || 'vendedora',
      activo: user.activo !== false
    });

    oauth2Client.setCredentials({
      access_token: refreshedTokenData.access_token || user.access_token,
      refresh_token: refreshedTokenData.refresh_token || user.refresh_token || undefined,
      expiry_date: refreshedTokenData.expiry_date || user.expiry_date || undefined
    });
  }

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      timeZone: TIMEZONE,
      items: [{ id: 'primary' }]
    }
  });

  const refreshedCredentials = oauth2Client.credentials || {};
  const refreshedAccessToken = refreshedCredentials.access_token || user.access_token;
  const refreshedRefreshToken = refreshedCredentials.refresh_token || user.refresh_token || '';
  const refreshedExpiryDate = refreshedCredentials.expiry_date || user.expiry_date || null;

  if (
    refreshedAccessToken !== user.access_token ||
    refreshedRefreshToken !== (user.refresh_token || '') ||
    refreshedExpiryDate !== (user.expiry_date || null)
  ) {
    await saveUser({
      email: user.email,
      access_token: refreshedAccessToken,
      refresh_token: refreshedRefreshToken,
      expiry_date: refreshedExpiryDate,
      rol: user.rol || 'vendedora',
      activo: user.activo !== false
    });
  }

  return response.data.calendars?.primary?.busy || [];
}

async function getCalendarClient(user) {
  if (!user.access_token) {
    throw new Error(`Missing access_token for user ${user.email}`);
  }

  if (!user.refresh_token && user.expiry_date && Number(user.expiry_date) <= Date.now()) {
    throw new Error(`Missing refresh_token for expired access_token on user ${user.email}`);
  }

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: user.access_token,
    refresh_token: user.refresh_token || undefined,
    expiry_date: user.expiry_date || undefined
  });

  if (user.refresh_token && user.expiry_date && Number(user.expiry_date) <= Date.now()) {
    console.log(`Refreshing expired token for user: ${user.email}`);
    const refreshResponse = await oauth2Client.refreshAccessToken();
    const refreshedTokenData = refreshResponse.credentials || oauth2Client.credentials || {};

    await saveUser({
      email: user.email,
      access_token: refreshedTokenData.access_token || user.access_token,
      refresh_token: refreshedTokenData.refresh_token || user.refresh_token,
      expiry_date: refreshedTokenData.expiry_date || user.expiry_date,
      rol: user.rol || 'vendedora',
      activo: user.activo !== false
    });

    oauth2Client.setCredentials({
      access_token: refreshedTokenData.access_token || user.access_token,
      refresh_token: refreshedTokenData.refresh_token || user.refresh_token || undefined,
      expiry_date: refreshedTokenData.expiry_date || user.expiry_date || undefined
    });
  }

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

async function createMeetEvent(user, { summary, description, startDateTime, endDateTime, attendees = [] }) {
  const calendar = await getCalendarClient(user);
  const response = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    sendUpdates: attendees.length ? 'all' : 'none',
    requestBody: {
      summary,
      description,
      start: {
        dateTime: startDateTime,
        timeZone: TIMEZONE
      },
      end: {
        dateTime: endDateTime,
        timeZone: TIMEZONE
      },
      attendees,
      conferenceData: {
        createRequest: {
          requestId: `extension-fd-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    }
  });

  return response.data;
}

async function deleteCalendarEvent(user, calendarEventId) {
  const calendar = await getCalendarClient(user);
  await calendar.events.delete({
    calendarId: 'primary',
    eventId: calendarEventId,
    sendUpdates: 'all'
  });
}

function getWorkingHours(date) {
  const dayOfWeek = new Date(buildLocalDateTime(date, '00:00')).getUTCDay();

  if (dayOfWeek === 0) {
    return null;
  }

  if (dayOfWeek === 6) {
    return { start: '08:00', end: '12:00' };
  }

  return { start: '08:00', end: '20:00' };
}

function createSlotDate(date, time) {
  return new Date(buildLocalDateTime(date, time));
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function addMinutesToTime(time, minutesToAdd) {
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = (hours * 60) + minutes + minutesToAdd;
  const nextHours = Math.floor(totalMinutes / 60);
  const nextMinutes = totalMinutes % 60;
  return `${pad(nextHours)}:${pad(nextMinutes)}`;
}

function generateSlots(date, duration) {
  const workingHours = getWorkingHours(date);

  if (!workingHours) {
    return [];
  }

  const slots = [];
  const slotStep = 15;
  let current = workingHours.start;

  while (true) {
    const next = addMinutesToTime(current, duration);
    const slotStart = createSlotDate(date, current);
    const slotEnd = createSlotDate(date, next);
    const dayEnd = createSlotDate(date, workingHours.end);

    if (slotEnd > dayEnd) {
      break;
    }

    slots.push({
      time: current,
      start: slotStart,
      end: slotEnd
    });

    current = addMinutesToTime(current, slotStep);
  }

  return slots;
}

function overlaps(slotStart, slotEnd, busyStart, busyEnd) {
  return slotStart < busyEnd && slotEnd > busyStart;
}

function getAvailableSlots(date, duration, busyByUser) {
  const slots = generateSlots(date, duration);

  return slots
    .map((slot) => {
      const availableUsers = Object.entries(busyByUser)
        .filter(([, busyTimes]) => {
          return !busyTimes.some((busyRange) => {
            const busyStart = new Date(busyRange.start);
            const busyEnd = new Date(busyRange.end);
            return overlaps(slot.start, slot.end, busyStart, busyEnd);
          });
        })
        .map(([email]) => email);

      return {
        time: slot.time,
        available_users: availableUsers
      };
    })
    .filter((slot) => slot.available_users.length > 0);
}

module.exports = {
  TIMEZONE,
  buildLocalDateTime,
  addMinutesToTime,
  createMeetEvent,
  deleteCalendarEvent,
  getBusyTimes,
  getAvailableSlots
};
