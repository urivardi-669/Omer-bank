const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { sendApprovalRequest } = require('../services/email');

// GET /api/transactions
router.get('/', async (req, res) => {
  try {
    const { q, filter } = req.query;
    const transactions = await db.getTransactions(q, filter);
    const balance = await db.getBalance();
    res.json({ balance, transactions });
  } catch (err) {
    console.error('שגיאה בקבלת תנועות:', err.message);
    res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// POST /api/transactions
router.post('/', async (req, res) => {
  const { name, type, amount } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'שם התנועה חסר' });
  }
  if (!['credit', 'debit'].includes(type)) {
    return res.status(400).json({ error: 'סוג תנועה לא תקין' });
  }
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'סכום לא תקין' });
  }

  const credit = type === 'credit' ? parsedAmount : 0;
  const debit  = type === 'debit'  ? parsedAmount : 0;
  const balance_row = credit - debit;
  const isAdmin = req.session && req.session.isAdmin;

  try {
    const txId = await db.insertTransaction({
      name: name.trim(),
      type,
      amount: parsedAmount,
      credit,
      debit,
      balance_row,
      approved: isAdmin,
    });

    if (isAdmin) {
      return res.json({ success: true, pending: false });
    }

    // Generate approval token
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    await db.insertToken(token, txId, expiresAt);

    try {
      await sendApprovalRequest(token, { name: name.trim(), type, amount: parsedAmount });
    } catch (emailErr) {
      console.error('שגיאה בשליחת מייל:', emailErr.message);
    }

    res.json({ success: true, pending: true });
  } catch (err) {
    console.error('שגיאה בהוספת תנועה:', err.message);
    res.status(500).json({ error: 'שגיאת שרת' });
  }
});

module.exports = router;
