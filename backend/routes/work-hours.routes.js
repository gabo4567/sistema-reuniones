const express = require('express');
const {
  getWorkHours,
  saveWorkHours,
  DAY_KEYS,
  isValidTime,
  toMinutes
} = require('../services/work-hours.service');

const router = express.Router();

function validateRanges(ranges = []) {
  if (!Array.isArray(ranges)) {
    return 'ranges must be an array';
  }

  if (ranges.length > 4) {
    return 'ranges can include up to 4 entries';
  }

  for (const range of ranges) {
    if (!isValidTime(range?.start) || !isValidTime(range?.end)) {
      return 'range start and end must be HH:mm';
    }

    if (toMinutes(range.start) >= toMinutes(range.end)) {
      return 'range end must be later than start';
    }
  }

  return '';
}

function validateWeekly(weekly = {}) {
  if (!weekly || typeof weekly !== 'object') {
    return 'weekly must be an object';
  }

  for (const day of DAY_KEYS) {
    if (!weekly[day]) continue;
    const validationError = validateRanges(weekly[day].ranges || []);
    if (validationError) return `${day}: ${validationError}`;
  }

  return '';
}

router.get('/work-hours/:sellerRecordId', async (req, res) => {
  try {
    return res.json(await getWorkHours(req.params.sellerRecordId));
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to load work hours',
      details: error.message
    });
  }
});

router.patch('/work-hours/:sellerRecordId', async (req, res) => {
  const validationError = req.body?.weekly
    ? validateWeekly(req.body.weekly)
    : validateRanges(req.body?.ranges || []);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    return res.json(await saveWorkHours(req.params.sellerRecordId, {
      enabled: req.body?.enabled === true,
      ranges: req.body?.ranges || [],
      weekly: req.body?.weekly || null
    }));
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to save work hours',
      details: error.message
    });
  }
});

module.exports = router;
