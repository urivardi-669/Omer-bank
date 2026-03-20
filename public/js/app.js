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
    const inlineRow = document.getElementById('edit-inline-row');
    if (inlineRow) inlineRow.remove();

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
        tr.addEventListener('click', () => selectRow(tr, tx.id, tx.name, tx.type, tx.amount));
      }

      tbody.appendChild(tr);
    }
  } catch (err) {
    console.error('שגיאה בטעינת תנועות:', err);
  }
}

function selectRow(tr, id, currentName, currentType, currentAmount) {
  // Remove previous inline row
  const existing = document.getElementById('edit-inline-row');
  if (existing) existing.remove();
  document.querySelectorAll('#tx-body tr.selected').forEach(r => r.classList.remove('selected'));

  if (selectedTxId === id) {
    selectedTxId = null;
    return;
  }

  selectedTxId = id;
  tr.classList.add('selected');

  const editRow = document.createElement('tr');
  editRow.id = 'edit-inline-row';
  editRow.innerHTML = `
    <td colspan="4" class="edit-inline-cell">
      <div class="edit-inline-fields">
        <div class="edit-field-group">
          <label class="edit-label">שם התנועה</label>
          <input id="edit-name" class="edit-input edit-name-input" type="text" value="${escapeHtml(currentName)}"/>
        </div>
        <div class="edit-field-group">
          <label class="edit-label">סוג</label>
          <select id="edit-type" class="edit-input edit-type-input">
            <option value="credit" ${currentType === 'credit' ? 'selected' : ''}>זכות ✅</option>
            <option value="debit"  ${currentType === 'debit'  ? 'selected' : ''}>חובה ❌</option>
          </select>
        </div>
        <div class="edit-field-group">
          <label class="edit-label">סכום (₪)</label>
          <input id="edit-amount" class="edit-input edit-amount-input" type="number" min="0.01" step="0.01" value="${currentAmount}"/>
        </div>
      </div>
      <div class="edit-inline-btns">
        <button id="edit-save-btn"   class="btn-edit-save">שמור</button>
        <button id="edit-delete-btn" class="btn-delete-confirm">מחק</button>
        <button id="edit-cancel-btn" class="btn-edit-cancel">ביטול</button>
      </div>
    </td>
  `;
  tr.after(editRow);

  document.getElementById('edit-save-btn').addEventListener('click', async () => {
    const btn = document.getElementById('edit-save-btn');
    const name   = document.getElementById('edit-name').value.trim();
    const type   = document.getElementById('edit-type').value;
    const amount = parseFloat(document.getElementById('edit-amount').value);
    if (!name || isNaN(amount) || amount <= 0) return;
    btn.disabled = true;
    btn.textContent = 'שומר...';
    try {
      const res = await fetch(`/api/transactions/${selectedTxId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, amount }),
      });
      if (res.ok) { selectedTxId = null; loadTransactions(); }
    } catch (err) {
      console.error('שגיאה בשמירה:', err);
    } finally {
      btn.disabled = false;
      btn.textContent = 'שמור';
    }
  });

  document.getElementById('edit-delete-btn').addEventListener('click', async () => {
    const btn = document.getElementById('edit-delete-btn');
    btn.disabled = true;
    btn.textContent = 'מוחק...';
    try {
      const res = await fetch(`/api/transactions/${selectedTxId}`, { method: 'DELETE' });
      if (res.ok) { selectedTxId = null; loadTransactions(); }
    } catch (err) {
      console.error('שגיאה במחיקה:', err);
    } finally {
      btn.disabled = false;
      btn.textContent = 'מחק';
    }
  });

  document.getElementById('edit-cancel-btn').addEventListener('click', () => {
    selectedTxId = null;
    editRow.remove();
    document.querySelectorAll('#tx-body tr.selected').forEach(r => r.classList.remove('selected'));
  });
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
