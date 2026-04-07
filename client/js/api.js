/**
 * API Helper - Quản lý gọi API tới server
 */
const API_BASE = '/api';

/**
 * Gọi API với token authentication
 */
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('bvote_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      // Token hết hạn
      if (response.status === 401) {
        localStorage.removeItem('bvote_token');
        localStorage.removeItem('bvote_user');
        showPage('page-auth');
        document.getElementById('bottom-nav').classList.add('hidden');
        showToast('Phiên đăng nhập đã hết hạn', 'error');
      }
      throw new Error(data.error || data.errors?.[0]?.msg || 'Đã xảy ra lỗi');
    }

    return data;
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      showToast('Không thể kết nối server', 'error');
    }
    throw error;
  }
}

/**
 * Hiển thị toast thông báo
 */
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const icon = document.getElementById('toast-icon');
  const msg = document.getElementById('toast-message');

  toast.className = `toast ${type}`;
  msg.textContent = message;
  
  const icons = { success: 'check_circle', error: 'error', info: 'info' };
  icon.textContent = icons[type] || 'info';

  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

/**
 * Hiển thị/ẩn trang
 */
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');
}
