const express = require('express');
const router = express.Router();
const db = require('../database/db');

const successPage = (txName) => `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>תנועה אושרה</title>
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700&display=swap" rel="stylesheet"/>
  <style>
    body { font-family: 'Heebo', Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f0f7f0; }
    .card { background: white; border-radius: 12px; padding: 40px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 400px; }
    .icon { font-size: 64px; margin-bottom: 16px; }
    h1 { color: #28a745; margin: 0 0 12px; }
    p { color: #555; font-size: 16px; }
    a { display: inline-block; margin-top: 20px; padding: 10px 24px; background: #2c5f8a; color: white; text-decoration: none; border-radius: 6px; font-size: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>התנועה אושרה בהצלחה!</h1>
    <p>התנועה <strong>"${txName}"</strong> אושרה ונוספה לחשבון של עומר.</p>
    <a href="/">חזרה לאתר</a>
  </div>
</body>
</html>
`;

const errorPage = (message) => `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>שגיאה</title>
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700&display=swap" rel="stylesheet"/>
  <style>
    body { font-family: 'Heebo', Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fff5f5; }
    .card { background: white; border-radius: 12px; padding: 40px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 400px; }
    .icon { font-size: 64px; margin-bottom: 16px; }
    h1 { color: #dc3545; margin: 0 0 12px; }
    p { color: #555; font-size: 16px; }
    a { display: inline-block; margin-top: 20px; padding: 10px 24px; background: #2c5f8a; color: white; text-decoration: none; border-radius: 6px; font-size: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">❌</div>
    <h1>שגיאה</h1>
    <p>${message}</p>
    <a href="/">חזרה לאתר</a>
  </div>
</body>
</html>
`;

// GET /api/approve/:token
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const record = await db.getToken(token);

    if (!record) {
      return res.send(errorPage('הקישור אינו תקף או שפג תוקפו.'));
    }

    await db.markTokenUsed(record.id);
    await db.approveTransaction(record.transaction_id);

    res.send(successPage(record.tx_name));
  } catch (err) {
    console.error('שגיאה באישור תנועה:', err.message);
    res.send(errorPage('אירעה שגיאה. אנא נסה שוב.'));
  }
});

module.exports = router;
