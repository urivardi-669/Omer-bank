const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false }
    : false,
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      credit REAL NOT NULL DEFAULT 0,
      debit REAL NOT NULL DEFAULT 0,
      balance_row REAL NOT NULL DEFAULT 0,
      approved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      approved_at TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tokens (
      id SERIAL PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      transaction_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `);

  // Seed admins if none exist
  const { rowCount } = await pool.query('SELECT 1 FROM admins LIMIT 1');
  if (rowCount === 0) {
    const hash = bcrypt.hashSync('omer3392', 10);
    await pool.query(
      'INSERT INTO admins (email, password) VALUES ($1, $2), ($3, $4) ON CONFLICT DO NOTHING',
      ['uri.vardi@gmail.com', hash, 'irit.neumann@gmail.com', hash]
    );
    console.log('✓ אדמינים נוספו למסד הנתונים');
  }

  console.log('✓ מסד הנתונים מוכן');
}

async function getTransactions(q, filter) {
  let sql = 'SELECT * FROM transactions WHERE approved = 1';
  const params = [];

  if (q && q.trim()) {
    params.push(`%${q.trim().toLowerCase()}%`);
    sql += ` AND LOWER(name) LIKE $${params.length}`;
  }
  if (filter === 'credit') sql += ' AND credit > 0';
  if (filter === 'debit')  sql += ' AND debit > 0';
  sql += ' ORDER BY id ASC';

  const { rows } = await pool.query(sql, params);
  return rows;
}

async function getBalance() {
  const { rows } = await pool.query(
    'SELECT COALESCE(SUM(balance_row), 0) AS total FROM transactions WHERE approved = 1'
  );
  return parseFloat(rows[0].total);
}

async function insertTransaction(txData) {
  const now = new Date().toISOString();
  const { rows } = await pool.query(
    `INSERT INTO transactions (name, type, amount, credit, debit, balance_row, approved, created_at, approved_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [
      txData.name, txData.type, txData.amount,
      txData.credit, txData.debit, txData.balance_row,
      txData.approved ? 1 : 0,
      now,
      txData.approved ? now : null,
    ]
  );
  return rows[0].id;
}

async function approveTransaction(id) {
  await pool.query(
    'UPDATE transactions SET approved = 1, approved_at = $1 WHERE id = $2',
    [new Date().toISOString(), id]
  );
}

async function transactionCount() {
  const { rows } = await pool.query('SELECT COUNT(*) AS cnt FROM transactions');
  return parseInt(rows[0].cnt, 10);
}

async function insertToken(token, transactionId, expiresAt) {
  await pool.query(
    'INSERT INTO tokens (token, transaction_id, expires_at, used) VALUES ($1, $2, $3, 0)',
    [token, transactionId, expiresAt]
  );
}

async function getToken(token) {
  const now = new Date().toISOString();
  const { rows } = await pool.query(
    `SELECT t.*, tx.name AS tx_name
     FROM tokens t
     LEFT JOIN transactions tx ON tx.id = t.transaction_id
     WHERE t.token = $1 AND t.used = 0 AND t.expires_at > $2`,
    [token, now]
  );
  return rows[0] || null;
}

async function markTokenUsed(id) {
  await pool.query('UPDATE tokens SET used = 1 WHERE id = $1', [id]);
}

async function getAdmin(email) {
  const { rows } = await pool.query(
    'SELECT * FROM admins WHERE email = $1',
    [email.toLowerCase().trim()]
  );
  return rows[0] || null;
}

module.exports = {
  init,
  getTransactions,
  getBalance,
  insertTransaction,
  approveTransaction,
  transactionCount,
  insertToken,
  getToken,
  markTokenUsed,
  getAdmin,
};
