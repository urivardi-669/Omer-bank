const path = require('path');
const fs = require('fs');
const db = require('../database/db');

async function seedFromExcel() {
  const count = await db.transactionCount();
  if (count > 0) {
    console.log('✓ מסד הנתונים כבר מכיל נתונים, דילוג על ייבוא Excel');
    return;
  }

  const xlsxPath = path.join(__dirname, '..', 'הבנק של עומר.xlsx');
  if (!fs.existsSync(xlsxPath)) {
    console.log('! קובץ Excel לא נמצא, מתחיל עם מסד נתונים ריק');
    return;
  }

  try {
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(xlsxPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: 0 });

    if (rows.length === 0) {
      console.log('! קובץ Excel ריק');
      return;
    }

    let count = 0;
    for (const row of rows) {
      const keys = Object.keys(row);
      let name = row['שם התנועה'] || row[keys[0]] || 'תנועה';
      let credit = parseFloat(row['זכות'] || row[keys[1]] || 0) || 0;
      let debit  = parseFloat(row['חובה'] || row[keys[2]] || 0) || 0;

      if (typeof name !== 'string' || name === 'שם התנועה') continue;
      name = String(name).trim();
      if (!name) continue;

      const balance_row = credit - debit;
      const type   = credit > 0 ? 'credit' : 'debit';
      const amount = credit > 0 ? credit : debit;

      await db.insertTransaction({ name, type, amount, credit, debit, balance_row, approved: true });
      count++;
    }

    console.log(`✓ ייבוא Excel הושלם: ${count} תנועות יובאו`);
  } catch (err) {
    console.error('שגיאה בייבוא Excel:', err.message);
  }
}

module.exports = { seedFromExcel };
