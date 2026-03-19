// app.js — Main controller: loads transactions, updates balance, handles filters

const ILS = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 2 });

let currentFilter = 'all';
let searchDebounce = null;

function formatAmount(val) {
  if (!val || val === 0) return '';
  return ILS.format(val);
}

async function loadTransactions() {
  const q = document.getElementById('search').value.trim();
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (currentFilter !== 'all') params.set('filter', currentFilter);

  try {
    const res = await fetch('/api/transactions?' + params.toString());
    const data = await res.json();

    // Update balance
    const balanceEl = document.getElementById('balance');
    balanceEl.textContent = ILS.format(data.balance);
    balanceEl.classList.toggle('negative', data.balance < 0);

    // Update table
    const tbody = document.getElementById('tx-body');
    tbody.innerHTML = '';

    if (!data.transactions || data.transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state">אין תנועות להצגה</td></tr>';
      return;
    }

    for (const tx of data.transactions) {
      const tr = document.createElement('tr');
      const balance = tx.balance_row;
      tr.innerHTML = `
        <td class="td-name">${escapeHtml(tx.name)}</td>
        <td class="td-credit">${tx.credit > 0 ? formatAmount(tx.credit) : ''}</td>
        <td class="td-debit">${tx.debit > 0 ? formatAmount(tx.debit) : ''}</td>
        <td class="td-balance ${balance >= 0 ? 'positive' : 'negative'}">${ILS.format(balance)}</td>
      `;
      tbody.appendChild(tr);
    }
  } catch (err) {
    console.error('שגיאה בטעינת תנועות:', err);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// Filter buttons
document.getElementById('filter-all').addEventListener('click', () => {
  currentFilter = 'all';
  updateFilterButtons();
  loadTransactions();
});

document.getElementById('filter-credit').addEventListener('click', () => {
  currentFilter = 'credit';
  updateFilterButtons();
  loadTransactions();
});

document.getElementById('filter-debit').addEventListener('click', () => {
  currentFilter = 'debit';
  updateFilterButtons();
  loadTransactions();
});

function updateFilterButtons() {
  document.getElementById('filter-all').classList.toggle('active', currentFilter === 'all');
  document.getElementById('filter-credit').classList.toggle('active', currentFilter === 'credit');
  document.getElementById('filter-debit').classList.toggle('active', currentFilter === 'debit');
}

// Search with debounce
document.getElementById('search').addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(loadTransactions, 300);
});

// Initial load
loadTransactions();
