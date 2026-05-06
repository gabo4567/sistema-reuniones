require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');

const authRouter = require('./routes/auth.routes');
const meetingsRouter = require('./routes/meetings.routes');
const { getActiveUsers, resetUsers } = require('./services/users.service');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'extension-fd-session-secret',
  resave: false,
  saveUninitialized: false
}));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/debug/reset-users', async (req, res) => {
  try {
    await resetUsers();
    req.session.googleUserEmail = null;
    const activeUsers = await getActiveUsers();
    console.log('Users reset. Usuarios actuales:', activeUsers.map((user) => user.email));
    res.send('users reset');
  } catch (error) {
    res.status(500).json({
      error: 'Failed to reset users',
      details: error.response?.data || error.message
    });
  }
});

app.use('/auth', authRouter);
app.use('/api', meetingsRouter);

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
