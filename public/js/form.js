// form.js — Add transaction form logic

document.getElementById('tx-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('tx-name').value.trim();
  const type = document.getElementById('tx-type').value;
  const amount = document.getElementById('tx-amount').value;
  const msgEl = document.getElementById('tx-message');

  msgEl.className = 'tx-message hidden';
  msgEl.textContent = '';

  if (!name || !amount) return;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'שולח...';

  try {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, amount: parseFloat(amount) }),
    });

    const data = await res.json();

    if (!res.ok) {
      msgEl.className = 'tx-message error';
      msgEl.textContent = data.error || 'אירעה שגיאה, נסה שנית';
    } else if (data.pending) {
      msgEl.className = 'tx-message pending';
      msgEl.textContent = '⏳ הבקשה נשלחה! ממתין לאישור ההורים...';
      clearForm();
    } else {
      msgEl.className = 'tx-message success';
      msgEl.textContent = '✅ התנועה נוספה בהצלחה!';
      clearForm();
      // Reload transactions table
      if (typeof loadTransactions === 'function') loadTransactions();
    }
  } catch (err) {
    msgEl.className = 'tx-message error';
    msgEl.textContent = 'שגיאת תקשורת, נסה שנית';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'שלח';
  }
});

function clearForm() {
  document.getElementById('tx-name').value = '';
  document.getElementById('tx-amount').value = '';
  document.getElementById('tx-type').value = 'credit';
}
