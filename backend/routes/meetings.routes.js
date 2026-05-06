const express = require('express');
const {
  getContactByPhone,
  getMeetingsByPhone,
  getMeetingByMeetLink,
  updateMeeting
} = require('../services/airtable.service');
const { getActiveUsers } = require('../services/users.service');
const {
  TIMEZONE,
  buildLocalDateTime,
  getBusyTimes,
  getAvailableSlots
} = require('../services/calendar.service');

const router = express.Router();

router.get('/contact/:phone', async (req, res) => {
  try {
    const contact = await getContactByPhone(req.params.phone);
    res.json(contact?.fields || null);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch contact',
      details: error.response?.data || error.message
    });
  }
});

router.get('/meetings/by-link', async (req, res) => {
  try {
    const { meetUrl } = req.query;

    if (!meetUrl) {
      return res.status(400).json({ error: 'meetUrl is required' });
    }

    const meeting = await getMeetingByMeetLink(meetUrl);
    return res.json(meeting);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch meeting by link',
      details: error.response?.data || error.message
    });
  }
});

router.get('/meetings/:phone', async (req, res) => {
  try {
    const meetings = await getMeetingsByPhone(req.params.phone);
    res.json(meetings);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch meetings',
      details: error.response?.data || error.message
    });
  }
});

router.patch('/meetings/:id', async (req, res) => {
  try {
    const updatedMeeting = await updateMeeting(req.params.id, req.body);
    res.json(updatedMeeting);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update meeting',
      details: error.response?.data || error.message
    });
  }
});

router.get('/availability', async (req, res) => {
  const { date, duration } = req.query;
  const parsedDuration = Number(duration);

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be provided in YYYY-MM-DD format' });
  }

  if (![15, 30, 60].includes(parsedDuration)) {
    return res.status(400).json({ error: 'duration must be one of: 15, 30, 60' });
  }

  try {
    const loggedUsers = await getActiveUsers();
    console.log('Usuarios cargados desde Airtable:', loggedUsers.map((user) => user.email));
    if (loggedUsers.length === 0) {
      return res.json({ error: 'No users logged in' });
    }

    const timeMin = buildLocalDateTime(date, '00:00');
    const timeMax = buildLocalDateTime(date, '23:59');
    const busyByUser = {};

    for (const user of loggedUsers) {
      try {
        console.log('Procesando usuario:', user.email);
        const busyTimes = await getBusyTimes(user, timeMin, timeMax);
        busyByUser[user.email] = busyTimes;
      } catch (userError) {
        console.error(`Error procesando usuario ${user.email}:`, userError.response?.data || userError.message);
      }
    }

    if (Object.keys(busyByUser).length === 0) {
      return res.json([]);
    }

    const slots = getAvailableSlots(date, parsedDuration, busyByUser);

    return res.json(slots);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to compute availability',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;
