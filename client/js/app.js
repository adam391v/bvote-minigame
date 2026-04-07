/**
 * App Module - Khởi tạo ứng dụng, navigation, load data
 */

/**
 * Khởi tạo app khi trang load
 */
document.addEventListener('DOMContentLoaded', () => {
  if (isLoggedIn()) {
    initApp();
  } else {
    showPage('page-auth');
  }
});

/**
 * Khởi tạo app sau khi đăng nhập
 */
async function initApp() {
  const user = getCurrentUser();
  if (!user) {
    showPage('page-auth');
    return;
  }

  // Hiện bottom nav
  document.getElementById('bottom-nav').classList.remove('hidden');

  // Hiện admin tab nếu user là ADMIN
  if (user.role === 'ADMIN') {
    document.getElementById('nav-admin').classList.remove('hidden');
  } else {
    document.getElementById('nav-admin').classList.add('hidden');
  }

  // Cập nhật header
  document.getElementById('home-username').textContent = user.display_name || user.username;
  document.getElementById('home-avatar').textContent = (user.display_name || user.username)[0].toUpperCase();

  // Cập nhật profile
  document.getElementById('profile-avatar').textContent = (user.display_name || user.username)[0].toUpperCase();
  document.getElementById('profile-name').textContent = user.display_name || user.username;
  document.getElementById('profile-email').textContent = user.email;

  // Load trang chủ
  navigateTo('home');
  await loadHomePage();
}

/**
 * Navigation
 */
function navigateTo(page) {
  // Ẩn bottom nav khi chơi game
  const bottomNav = document.getElementById('bottom-nav');
  if (page === 'play' || page === 'auth') {
    bottomNav.classList.add('hidden');
  } else if (isLoggedIn()) {
    bottomNav.classList.remove('hidden');
  }

  // Dừng timer nếu rời play
  if (page !== 'play') {
    stopTimer();
  }

  showPage(`page-${page}`);

  // Cập nhật active nav
  document.querySelectorAll('.bottom-nav .nav-item').forEach(item => item.classList.remove('active'));
  const activeNav = document.getElementById(`nav-${page}`);
  if (activeNav) activeNav.classList.add('active');

  // Load data theo page
  switch (page) {
    case 'home':
      loadHomePage();
      break;
    case 'leaderboard':
      loadLeaderboard(currentLeaderboardTab);
      break;
    case 'profile':
      loadProfile();
      break;
    case 'admin':
      loadAdminPage();
      break;
    case 'result':
      // Nếu có day state, hiện kết quả
      if (gameState.currentDay) {
        loadDayResult(gameState.currentDay.id);
      }
      loadResultHistory();
      break;
  }

  // Scroll lên đầu
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Load trang chủ
 */
async function loadHomePage() {
  try {
    // Load ngày hôm nay
    const todayData = await apiCall('/game/today');
    renderTodayHero(todayData);

    // Load danh sách 20 ngày
    const daysData = await apiCall('/game/days');
    renderDayGrid(daysData.days);

    // Load stats
    loadUserStats(daysData.days);

    // Load top players
    loadTopPlayers(todayData);
  } catch (error) {
    console.error('Load home error:', error);
  }
}

/**
 * Render hero card ngày hôm nay
 */
function renderTodayHero(data) {
  const hero = document.getElementById('today-hero');
  const titleEl = document.getElementById('today-title');
  const descEl = document.getElementById('today-desc');
  const btnPlay = document.getElementById('btn-play-today');
  const questionsEl = document.getElementById('today-questions');
  const labelEl = hero.querySelector('.hero-label');

  if (!data.today) {
    titleEl.textContent = 'Chưa có thử thách';
    descEl.textContent = 'Hãy quay lại sau!';
    btnPlay.disabled = true;
    btnPlay.textContent = 'Chưa mở';
    labelEl.textContent = '⏳ ĐANG CHỜ';
    return;
  }

  const day = data.today;
  titleEl.textContent = day.title || `Ngày ${day.day_number}`;
  questionsEl.textContent = `${day.question_count || 3} câu hỏi`;

  if (day.status === 'ACTIVE') {
    if (data.has_completed) {
      descEl.textContent = '✅ Bạn đã hoàn thành thử thách hôm nay!';
      btnPlay.innerHTML = '<span class="material-symbols-outlined">visibility</span> Xem kết quả';
      btnPlay.onclick = () => loadDayResult(day.id);
      btnPlay.disabled = false;
      labelEl.textContent = '✅ ĐÃ HOÀN THÀNH';
    } else {
      descEl.textContent = `Sẵn sàng chưa? ${data.answered_count > 0 ? `Đã trả lời ${data.answered_count}/${day.question_count || 3} câu` : 'Hãy bắt đầu thử thách hôm nay!'}`;
      btnPlay.innerHTML = '<span class="material-symbols-outlined">play_arrow</span> Chơi ngay';
      btnPlay.onclick = startPlaying;
      btnPlay.disabled = false;
      labelEl.textContent = '🔥 ĐANG DIỄN RA';
    }
  } else if (day.status === 'UPCOMING') {
    const openAt = new Date(day.open_at);
    descEl.textContent = `Mở lúc: ${openAt.toLocaleString('vi-VN')}`;
    btnPlay.disabled = true;
    btnPlay.innerHTML = '<span class="material-symbols-outlined">schedule</span> Chưa mở';
    labelEl.textContent = '⏳ SẮP DIỄN RA';
  } else {
    descEl.textContent = 'Ngày chơi đã kết thúc';
    btnPlay.innerHTML = '<span class="material-symbols-outlined">visibility</span> Xem kết quả';
    btnPlay.onclick = () => loadDayResult(day.id);
    btnPlay.disabled = false;
    labelEl.textContent = '🏁 ĐÃ KẾT THÚC';
  }
}

/**
 * Render grid 20 ngày
 */
function renderDayGrid(days) {
  const grid = document.getElementById('day-grid');
  if (!days || days.length === 0) {
    grid.innerHTML = '<div class="text-center text-muted">Chưa có dữ liệu</div>';
    return;
  }

  grid.innerHTML = days.map((day, i) => {
    let className = 'day-cell';
    let content = day.day_number;
    let icon = '';

    if (day.has_played > 0 || day.status === 'COMPLETED') {
      className += ' completed';
      icon = '<span class="material-symbols-outlined filled" style="font-size: 14px;">check_circle</span>';
    } else if (day.status === 'ACTIVE') {
      className += ' active-day';
    } else {
      className += ' locked';
      icon = '<span class="material-symbols-outlined" style="font-size: 14px;">lock</span>';
    }

    return `
      <div class="${className}" onclick="handleDayClick(${day.id}, '${day.status}')" title="${day.title}" style="animation-delay: ${i * 30}ms">
        <span>${content}</span>
        ${icon}
      </div>
    `;
  }).join('');
}

/**
 * Click vào ngày trong grid
 */
function handleDayClick(dayId, status) {
  if (status === 'ACTIVE') {
    startPlaying();
  } else if (status === 'COMPLETED' || status === 'CLOSED') {
    loadDayResult(dayId);
  }
}

/**
 * Load thống kê user
 */
function loadUserStats(days) {
  if (!days) return;
  
  const played = days.filter(d => d.has_played > 0).length;
  document.getElementById('stat-days-played').textContent = played;

  // Tổng điểm và rank sẽ load từ leaderboard
  apiCall('/leaderboard/overall').then(data => {
    if (data.my_rank) {
      const totalPts = data.my_rank.total_points || 0;
      document.getElementById('stat-total-score').textContent = totalPts;
      document.getElementById('stat-rank').textContent = data.my_rank.position ? `#${data.my_rank.position}` : '-';
      
      // Cập nhật profile
      document.getElementById('profile-days').textContent = data.my_rank.days_played || 0;
      document.getElementById('profile-score').textContent = totalPts;
      document.getElementById('profile-correct').textContent = data.my_rank.total_correct || 0;
    }
  }).catch(() => {});
}

/**
 * Load top players cho trang chủ (Lấy top tổng thể 5 người)
 */
async function loadTopPlayers() {
  try {
    const data = await apiCall('/leaderboard/overall?limit=5');
    const rankings = data.rankings || [];

    const container = document.getElementById('home-top-players');
    if (rankings.length === 0) {
      container.innerHTML = `
        <div class="glass-card-flat text-center" style="padding: var(--space-6);">
          <span class="material-symbols-outlined" style="font-size: 40px; color: var(--outline); display: block; margin-bottom: var(--space-3);">group</span>
          <p class="text-muted">Chưa có người chơi nào</p>
        </div>
      `;
      return;
    }

    container.innerHTML = rankings.slice(0, 5).map((r, idx) => {
      const rankIcons = ['🥇', '🥈', '🥉', '<span style="font-size: 16px; font-weight: bold; color: var(--on-surface-variant)">4</span>', '<span style="font-size: 16px; font-weight: bold; color: var(--on-surface-variant)">5</span>'];
      const name = r.display_name || r.username;
      return `
        <div class="rank-row animate-slideUp" style="animation-delay: ${idx * 100}ms">
          <span style="font-size: 18px; width: 24px; text-align: center; display: inline-block;">${rankIcons[idx]}</span>
          <div class="rank-avatar">${name[0]}</div>
          <div class="rank-name">${name}</div>
          <div class="rank-score">${r.total_points || 0} đ</div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Load top players error:', error);
  }
}

/**
 * Load lịch sử kết quả cho result page + profile
 */
async function loadResultHistory() {
  try {
    const daysData = await apiCall('/game/days');
    const playedDays = (daysData.days || []).filter(d => d.has_played > 0);
    
    const containers = ['result-history', 'profile-history'].map(id => document.getElementById(id));
    
    if (playedDays.length === 0) {
      const emptyHtml = `
        <div class="glass-card-flat text-center" style="padding: var(--space-5);">
          <p class="text-muted">Chưa có lịch sử chơi</p>
        </div>
      `;
      containers.forEach(c => { if (c) c.innerHTML = emptyHtml; });
      return;
    }

    const historyHtml = playedDays.map((day, idx) => {
      const dateStr = day.game_date ? new Date(day.game_date).toLocaleDateString('vi-VN') : '';
      const statusIcon = day.status === 'COMPLETED' ? '✅' : '🕐';
      return `
        <div class="admin-day-row animate-slideUp" style="animation-delay: ${idx * 60}ms; cursor: pointer;" onclick="loadDayResult(${day.id})">
          <div style="display: flex; align-items: center; gap: var(--space-3);">
            <div class="day-number-badge">${day.day_number}</div>
            <div>
              <div style="font-weight: 600; font-size: var(--font-size-sm);">${day.title}</div>
              <div class="text-muted" style="font-size: var(--font-size-xs);">${dateStr}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: var(--space-2);">
            <span style="font-size: 16px;">${statusIcon}</span>
            <span class="material-symbols-outlined" style="font-size: 18px; color: var(--outline);">chevron_right</span>
          </div>
        </div>
      `;
    }).join('');

    containers.forEach(c => { if (c) c.innerHTML = historyHtml; });
  } catch (error) {
    console.error('Load result history error:', error);
  }
}

/**
 * Load profile
 */
async function loadProfile() {
  const user = getCurrentUser();
  if (!user) return;
  
  // Load lịch sử
  await loadResultHistory();
}

