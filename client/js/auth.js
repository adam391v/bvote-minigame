/**
 * Auth Module - Đăng nhập, Đăng ký, Đăng xuất
 */

function showLogin() {
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('register-form').classList.add('hidden');
}

function showRegister() {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('register-form').classList.remove('hidden');
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-login');
  btn.disabled = true;
  btn.textContent = 'Đang đăng nhập...';

  try {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    localStorage.setItem('bvote_token', data.token);
    localStorage.setItem('bvote_user', JSON.stringify(data.user));

    showToast('Đăng nhập thành công!', 'success');
    initApp();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Đăng nhập';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-register');
  btn.disabled = true;
  btn.textContent = 'Đang đăng ký...';

  try {
    const display_name = document.getElementById('reg-displayname').value;
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    const data = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ display_name, username, email, password })
    });

    localStorage.setItem('bvote_token', data.token);
    localStorage.setItem('bvote_user', JSON.stringify(data.user));

    showToast('Đăng ký thành công! Chào mừng bạn!', 'success');
    initApp();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Đăng ký';
  }
}

function logout() {
  localStorage.removeItem('bvote_token');
  localStorage.removeItem('bvote_user');
  showPage('page-auth');
  document.getElementById('bottom-nav').classList.add('hidden');
  showToast('Đã đăng xuất', 'info');
}

function getCurrentUser() {
  const userStr = localStorage.getItem('bvote_user');
  return userStr ? JSON.parse(userStr) : null;
}

function isLoggedIn() {
  return !!localStorage.getItem('bvote_token');
}
