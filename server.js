require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./database/db');
const { seedFromExcel } = require('./services/seed');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
const transactionsRouter = require('./routes/transactions');
const authRouter         = require('./routes/auth');
const approveRouter      = require('./routes/approve');

app.use('/api/transactions', transactionsRouter);
app.use('/api', authRouter);
app.use('/api/approve', approveRouter);

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

// Initialize DB then start server
db.init()
  .then(() => seedFromExcel())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🏦 הבנק של עומר פועל על http://localhost:${PORT}\n`);
    });
  })
  .catch((err) => {
    console.error('שגיאה באתחול השרת:', err.message);
    process.exit(1);
  });
