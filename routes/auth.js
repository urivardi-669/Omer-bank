const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');

// POST /api/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'אימייל וסיסמה נדרשים' });
  }

  try {
    const admin = await db.getAdmin(email);
    if (!admin) {
      return res.status(401).json({ error: 'פרטי כניסה שגויים' });
    }

    const valid = bcrypt.compareSync(password, admin.password);
    if (!valid) {
      return res.status(401).json({ error: 'פרטי כניסה שגויים' });
    }

    req.session.isAdmin = true;
    req.session.email = admin.email;

    res.json({ success: true, email: admin.email });
  } catch (err) {
    console.error('שגיאה בכניסה:', err.message);
    res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// POST /api/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// GET /api/me
router.get('/me', (req, res) => {
  res.json({
    isAdmin: !!(req.session && req.session.isAdmin),
    email: (req.session && req.session.email) || null,
  });
});

module.exports = router;
