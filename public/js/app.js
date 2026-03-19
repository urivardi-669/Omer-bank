// app.js — Main controller: loads transactions, updates balance, handles filters

const ILS = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 2 });

let currentFilter = 'all';
let searchDebounce = null;
let selectedTxId = null;

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
    selectedTxId = null;
    updateDeleteBanner(null);

    if (!data.transactions || data.transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state">אין תנועות להצגה</td></tr>';
      return;
    }

    // Check if admin (cached on window by admin.js)
    const adminMode = window.isAdminLoggedIn || false;

    for (const tx of data.transactions) {
      const tr = document.createElement('tr');
      tr.dataset.id = tx.id;
      const balance = tx.balance_row;
      tr.innerHTML = `
        <td class="td-name">${escapeHtml(tx.name)}</td>
        <td class="td-credit">${tx.credit > 0 ? formatAmount(tx.credit) : ''}</td>
        <td class="td-debit">${tx.debit > 0 ? formatAmount(tx.debit) : ''}</td>
        <td class="td-balance ${balance >= 0 ? 'positive' : 'negative'}">${ILS.format(balance)}</td>
      `;

      if (adminMode) {
        tr.classList.add('selectable');
        tr.addEventListener('click', () => selectRow(tr, tx.id, tx.name));
      }

      tbody.appendChild(tr);
    }
  } catch (err) {
    console.error('שגיאה בטעינת תנועות:', err);
  }
}

function selectRow(tr, id, name) {
  // Deselect previous
  document.querySelectorAll('#tx-body tr.selected').forEach(r => r.classList.remove('selected'));

  if (selectedTxId === id) {
    // Clicking same row deselects
    selectedTxId = null;
    updateDeleteBanner(null);
  } else {
    selectedTxId = id;
    tr.classList.add('selected');
    updateDeleteBanner(name);
  }
}

function updateDeleteBanner(txName) {
  let banner = document.getElementById('delete-banner');
  if (!txName) {
    if (banner) banner.classList.add('hidden');
    return;
  }
  if (!banner) return;
  document.getElementById('delete-banner-name').textContent = txName;
  banner.classList.remove('hidden');
}

// Delete confirmation
document.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('delete-banner');
  if (!banner) return;

  document.getElementById('delete-confirm-btn').addEventListener('click', async () => {
    if (!selectedTxId) return;
    const btn = document.getElementById('delete-confirm-btn');
    btn.disabled = true;
    btn.textContent = 'מוחק...';

    try {
      const res = await fetch(`/api/transactions/${selectedTxId}`, { method: 'DELETE' });
      if (res.ok) {
        selectedTxId = null;
        banner.classList.add('hidden');
        loadTransactions();
      }
    } catch (err) {
      console.error('שגיאה במחיקה:', err);
    } finally {
      btn.disabled = false;
      btn.textContent = 'מחק';
    }
  });

  document.getElementById('delete-cancel-btn').addEventListener('click', () => {
    selectedTxId = null;
    banner.classList.add('hidden');
    document.querySelectorAll('#tx-body tr.selected').forEach(r => r.classList.remove('selected'));
  });
});

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
