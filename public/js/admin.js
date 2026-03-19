// admin.js — Admin login modal and session state

const adminBtn = document.getElementById('admin-btn');
const adminModal = document.getElementById('admin-modal');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const closeModal = document.getElementById('close-modal');

let isAdminLoggedIn = false;
let adminEmail = null;

// Check session on page load
async function checkSession() {
  try {
    const res = await fetch('/api/me');
    const data = await res.json();
    if (data.isAdmin) {
      setAdminUI(true, data.email);
    }
  } catch (err) {
    // Not logged in
  }
}

function setAdminUI(loggedIn, email) {
  isAdminLoggedIn = loggedIn;
  adminEmail = email;

  if (loggedIn) {
    adminBtn.textContent = 'יציאה (' + (email ? email.split('@')[0] : 'מנהל') + ')';
    adminBtn.classList.add('logged-in');
  } else {
    adminBtn.textContent = 'כניסת מנהל';
    adminBtn.classList.remove('logged-in');
  }
}

// Open/close modal or logout
adminBtn.addEventListener('click', async () => {
  if (isAdminLoggedIn) {
    try {
      await fetch('/api/logout', { method: 'POST' });
      setAdminUI(false, null);
    } catch (err) {
      console.error('שגיאה ביציאה');
    }
  } else {
    adminModal.classList.remove('hidden');
    document.getElementById('login-email').focus();
  }
});

closeModal.addEventListener('click', () => {
  adminModal.classList.add('hidden');
  loginForm.reset();
  loginError.classList.add('hidden');
});

// Close modal on overlay click
adminModal.addEventListener('click', (e) => {
  if (e.target === adminModal) {
    adminModal.classList.add('hidden');
    loginForm.reset();
    loginError.classList.add('hidden');
  }
});

// Login form submit
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  loginError.classList.add('hidden');
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'מתחבר...';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      loginError.textContent = data.error || 'פרטי כניסה שגויים';
      loginError.classList.remove('hidden');
    } else {
      adminModal.classList.add('hidden');
      loginForm.reset();
      setAdminUI(true, data.email);
    }
  } catch (err) {
    loginError.textContent = 'שגיאת תקשורת, נסה שנית';
    loginError.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'כניסה';
  }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !adminModal.classList.contains('hidden')) {
    adminModal.classList.add('hidden');
    loginForm.reset();
    loginError.classList.add('hidden');
  }
});

checkSession();
