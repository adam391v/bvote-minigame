/**
 * Leaderboard Module - Bảng xếp hạng ngày + tổng thể
 */

let currentLeaderboardTab = 'daily';

/**
 * Load leaderboard
 */
async function loadLeaderboard(tab) {
  currentLeaderboardTab = tab || 'daily';
  
  if (currentLeaderboardTab === 'daily') {
    await loadDailyLeaderboard();
  } else {
    await loadOverallLeaderboard();
  }
}

/**
 * Switch tab
 */
function switchLeaderboardTab(tab) {
  currentLeaderboardTab = tab;
  document.getElementById('tab-daily').classList.toggle('active', tab === 'daily');
  document.getElementById('tab-overall').classList.toggle('active', tab === 'overall');
  loadLeaderboard(tab);
}

/**
 * Load bảng xếp hạng ngày
 */
async function loadDailyLeaderboard() {
  try {
    // Lấy ngày active
    const todayData = await apiCall('/game/today');
    if (!todayData.today) {
      renderEmptyLeaderboard('Chưa có ngày chơi nào đang diễn ra');
      return;
    }

    const data = await apiCall(`/leaderboard/daily/${todayData.today.id}?limit=20`);
    renderPodium(data.rankings?.slice(0, 3) || []);
    renderMyRank(data.my_rank);
    renderLeaderboardList(data.rankings?.slice(3) || [], 4);
  } catch (error) {
    console.error('Load daily leaderboard error:', error);
    renderEmptyLeaderboard('Chưa có dữ liệu xếp hạng');
  }
}

/**
 * Load bảng xếp hạng tổng thể
 */
async function loadOverallLeaderboard() {
  try {
    const data = await apiCall('/leaderboard/overall?limit=20');
    
    const rankings = (data.rankings || []).map((r, idx) => ({
      display_name: r.display_name || r.username,
      total_score: r.total_points || 0,
      correct_count: r.total_correct || 0,
      days_played: r.days_played || 0
    }));
    
    renderPodium(rankings.slice(0, 3));
    renderMyRank(data.my_rank ? {
      display_name: getCurrentUser()?.display_name,
      total_score: data.my_rank.total_points || 0,
      rank_position: data.my_rank.position
    } : null);
    renderLeaderboardList(rankings.slice(3), 4);
  } catch (error) {
    console.error('Load overall leaderboard error:', error);
    renderEmptyLeaderboard('Chưa có dữ liệu xếp hạng');
  }
}

/**
 * Render podium top 3
 */
function renderPodium(top3) {
  const podium = document.getElementById('podium');
  if (!top3 || top3.length === 0) {
    podium.innerHTML = `
      <div class="text-center text-muted" style="padding: var(--space-8);">
        <span class="material-symbols-outlined" style="font-size: 48px; display: block; margin-bottom: var(--space-3);">emoji_events</span>
        <p>Chưa có ai trên bảng xếp hạng</p>
      </div>
    `;
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const classes = ['first', 'second', 'third'];

  podium.innerHTML = top3.map((p, idx) => {
    const name = p.display_name || p.username || 'N/A';
    const score = p.total_score || p.total_points || 0;
    return `
      <div class="podium-item ${classes[idx]} animate-slideUp" style="animation-delay: ${idx * 150}ms">
        <div class="podium-medal">${medals[idx]}</div>
        <div class="podium-avatar">${name[0]}</div>
        <div class="podium-name">${name}</div>
        <div class="podium-score">${score} đ</div>
      </div>
    `;
  }).join('');
}

/**
 * Render xếp hạng của user hiện tại
 */
function renderMyRank(myRank) {
  const container = document.getElementById('my-rank-container');
  if (!myRank || (!myRank.rank_position && !myRank.position)) {
    container.innerHTML = `
      <div class="rank-row highlight" style="justify-content: center;">
        <span class="text-muted" style="font-size: var(--font-size-sm);">Bạn chưa có trên bảng xếp hạng</span>
      </div>
    `;
    return;
  }

  const user = getCurrentUser();
  const name = myRank.display_name || user?.display_name || 'Bạn';
  const pos = myRank.rank_position || myRank.position || '?';
  const score = myRank.total_score || myRank.total_points || 0;

  container.innerHTML = `
    <div class="rank-row highlight animate-slideUp">
      <div class="rank-number">#${pos}</div>
      <div class="rank-avatar">${name[0]}</div>
      <div class="rank-name">${name} <span class="text-muted" style="font-size: var(--font-size-xs);">(Bạn)</span></div>
      <div class="rank-score">${score} đ</div>
    </div>
  `;
}

/**
 * Render danh sách xếp hạng từ vị trí startRank
 */
function renderLeaderboardList(rankings, startRank) {
  const container = document.getElementById('leaderboard-list');
  if (!rankings || rankings.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = rankings.map((r, idx) => {
    const rank = startRank + idx;
    const name = r.display_name || r.username || 'N/A';
    const score = r.total_score || r.total_points || 0;
    return `
      <div class="rank-row animate-slideUp" style="animation-delay: ${idx * 50}ms">
        <div class="rank-number">${rank}</div>
        <div class="rank-avatar">${name[0]}</div>
        <div class="rank-name">${name}</div>
        <div class="rank-score">${score} đ</div>
      </div>
    `;
  }).join('');
}

/**
 * Render empty state
 */
function renderEmptyLeaderboard(message) {
  document.getElementById('podium').innerHTML = `
    <div class="text-center text-muted" style="padding: var(--space-8); width: 100%;">
      <span class="material-symbols-outlined" style="font-size: 48px; display: block; margin-bottom: var(--space-3);">emoji_events</span>
      <p>${message}</p>
    </div>
  `;
  document.getElementById('my-rank-container').innerHTML = '';
  document.getElementById('leaderboard-list').innerHTML = '';
}
