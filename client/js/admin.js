/**
 * Admin Module - Quản lý câu hỏi, ngày chơi, tính điểm
 */

let adminState = {
  days: [],
  questions: [],
  players: [],
  selectedDayId: null,
  stats: null,
  confirmCallback: null,
  activeTab: 'overview'
};

/**
 * Chuyển tab Admin
 */
function switchAdminTab(tabName) {
  adminState.activeTab = tabName;
  
  // Nút nav
  document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab-btn-${tabName}`).classList.add('active');
  
  // Nội dung tab
  document.querySelectorAll('.admin-tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`admin-tab-${tabName}`).classList.add('active');

  // Nếu chuyển qua tab days mà đang xem chi tiết câu hỏi, thì reset về trang chủ days
  if (tabName === 'days') {
    backToAdminDays();
  }
}

/**
 * Tải trang admin
 */
async function loadAdminPage() {
  try {
    const [statsData, daysData, playersData] = await Promise.all([
      apiCall('/admin/stats'),
      apiCall('/game/days'),
      apiCall('/admin/players')
    ]);

    adminState.stats = statsData;
    adminState.days = daysData.days || [];
    adminState.players = playersData.players || [];

    renderAdminStats(statsData);
    renderAdminDays(adminState.days);
    renderAdminPlayers(adminState.players);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

let adminChartInstance = null;

/**
 * Render thống kê admin
 */
function renderAdminStats(stats) {
  document.getElementById('admin-stat-players').textContent = stats.players || 0;
  document.getElementById('admin-stat-questions').textContent = stats.total_questions || 0;
  document.getElementById('admin-stat-answers').textContent = stats.total_answers || 0;
  document.getElementById('admin-stat-active').textContent = stats.active_days || 0;

  // Cập nhật tiến trình 20 ngày
  const completedDays = adminState.days.filter(d => d.status === 'COMPLETED').length;
  document.getElementById('admin-days-completed-text').textContent = completedDays;
  document.getElementById('admin-progress-fill').style.width = `${(completedDays / 20) * 100}%`;

  // Render chart
  const chartData = stats.chart_data || [];
  const labels = chartData.map(d => `Ngày ${d.day_number}`);
  const data = chartData.map(d => d.player_count);

  const ctx = document.getElementById('admin-chart-canvas').getContext('2d');
  
  if (adminChartInstance) {
    adminChartInstance.destroy(); // Hủy chart cũ nếu có
  }

  adminChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Số lượng người chơi',
        data: data,
        backgroundColor: 'rgba(0, 210, 211, 0.6)',
        borderColor: '#00D2D3',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { 
          beginAtZero: true, 
          ticks: { stepSize: 1, color: '#A0AEC0' },
          grid: { color: 'rgba(255,255,255,0.05)' } 
        },
        x: { 
          ticks: { color: '#A0AEC0' },
          grid: { display: false }
        }
      }
    }
  });
}

/**
 * Render danh sách người chơi
 */
function renderAdminPlayers(players) {
  const container = document.getElementById('admin-players-list');
  if (!players || players.length === 0) {
    container.innerHTML = '<div class="text-center text-muted py-4">Chưa có dữ liệu người chơi</div>';
    return;
  }

  container.innerHTML = players.map(p => `
    <div class="player-row">
      <div style="flex: 1; display: flex; align-items: center; gap: 10px;">
        <div class="user-avatar" style="width: 32px; height: 32px; font-size: 14px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);">
          ${(p.display_name || p.username || '?').charAt(0).toUpperCase()}
        </div>
        <div>
          <div style="font-weight: 600; font-size: var(--font-size-sm);">${p.display_name || p.username}</div>
          <div class="text-muted" style="font-size: var(--font-size-xs);">${p.email}</div>
        </div>
      </div>
      <div style="width: 70px; text-align: center; font-size: var(--font-size-sm); color: var(--secondary);">
        ${p.days_played || 0}
      </div>
      <div style="width: 70px; text-align: right; font-weight: 600; color: var(--primary-light);">
        ${p.total_points || 0} đ
      </div>
    </div>
  `).join('');
}

/**
 * Render danh sách ngày cho admin
 */
function renderAdminDays(days) {
  const container = document.getElementById('admin-days-list');
  if (!days || days.length === 0) {
    container.innerHTML = '<div class="text-center text-muted py-4">Chưa có ngày chơi nào</div>';
    return;
  }

  container.innerHTML = days.map(day => {
    const statusBadge = getStatusBadge(day.status);
    const dateStr = day.game_date ? new Date(day.game_date).toLocaleDateString('vi-VN') : '';
    return `
      <div class="admin-day-row" onclick="selectAdminDay(${day.id}, ${day.day_number})">
        <div style="display: flex; align-items: center; gap: var(--space-3);">
          <div class="day-number-badge">${day.day_number}</div>
          <div>
            <div style="font-weight: 600; font-size: var(--font-size-sm);">${day.title}</div>
            <div class="text-muted" style="font-size: var(--font-size-xs);">${dateStr} · ${day.question_count || 0} câu hỏi</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          ${statusBadge}
          <span class="material-symbols-outlined" style="font-size: 18px; color: var(--outline);">chevron_right</span>
        </div>
      </div>
    `;
  }).join('');
}

function getStatusBadge(status) {
  const map = {
    'UPCOMING': { label: 'Sắp tới', cls: 'badge-upcoming' },
    'ACTIVE': { label: 'Đang mở', cls: 'badge-active' },
    'CLOSED': { label: 'Đã đóng', cls: 'badge-closed' },
    'COMPLETED': { label: 'Hoàn tất', cls: 'badge-completed' }
  };
  const info = map[status] || { label: status, cls: '' };
  return `<span class="status-badge ${info.cls}">${info.label}</span>`;
}

/**
 * Chọn ngày để quản lý câu hỏi
 */
async function selectAdminDay(dayId, dayNumber) {
  adminState.selectedDayId = dayId;
  document.getElementById('admin-days-panel').classList.add('hidden');
  document.getElementById('admin-questions-panel').classList.remove('hidden');
  document.getElementById('admin-q-day-title').textContent = `Ngày ${dayNumber}`;

  try {
    const data = await apiCall(`/game/days/${dayId}/questions`);
    adminState.questions = data.questions || [];
    renderAdminQuestions(adminState.questions);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

/**
 * Quay lại danh sách ngày
 */
function backToAdminDays() {
  document.getElementById('admin-days-panel').classList.remove('hidden');
  document.getElementById('admin-questions-panel').classList.add('hidden');
  adminState.selectedDayId = null;
  loadAdminPage(); // Refresh data
}

/**
 * Render danh sách câu hỏi cho ngày đã chọn
 */
function renderAdminQuestions(questions) {
  const container = document.getElementById('admin-questions-list');
  if (!questions || questions.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: var(--space-6);">
        <span class="material-symbols-outlined">quiz</span>
        <h3>Chưa có câu hỏi</h3>
        <p>Thêm câu hỏi mới cho ngày này</p>
      </div>
    `;
    return;
  }

  container.innerHTML = questions.map((q, idx) => `
    <div class="admin-question-card animate-slideUp" style="animation-delay: ${idx * 80}ms">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-3);">
        <span class="hero-label">Câu ${idx + 1}</span>
        <button class="btn-icon" onclick="deleteQuestion(${q.id})" title="Xóa">
          <span class="material-symbols-outlined" style="font-size: 18px; color: var(--danger);">delete</span>
        </button>
      </div>
      <p style="font-weight: 600; margin-bottom: var(--space-3);">${q.question_text}</p>
      <div class="admin-options-grid">
        ${q.options.map(opt => `
          <div class="admin-option ${opt.key === q.correct_option ? 'correct' : ''}">
            <span class="answer-key" style="width: 24px; height: 24px; font-size: 11px;">${opt.key}</span>
            <span style="font-size: var(--font-size-sm);">${opt.text}</span>
          </div>
        `).join('')}
      </div>
      ${q.explanation ? `<p class="text-muted mt-2" style="font-size: var(--font-size-xs);"><em>💡 ${q.explanation}</em></p>` : ''}
    </div>
  `).join('');
}

/**
 * Hiện form thêm câu hỏi
 */
function showAddQuestionForm() {
  document.getElementById('add-question-modal').classList.remove('hidden');
  document.getElementById('q-text').value = '';
  document.getElementById('q-opt-a').value = '';
  document.getElementById('q-opt-b').value = '';
  document.getElementById('q-opt-c').value = '';
  document.getElementById('q-opt-d').value = '';
  document.getElementById('q-correct').value = 'A';
  document.getElementById('q-explain').value = '';
}

function hideAddQuestionForm() {
  document.getElementById('add-question-modal').classList.add('hidden');
}

/**
 * Custom confirm dialog (thay native confirm)
 */
function showConfirmDialog(message, callback) {
  adminState.confirmCallback = callback;
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('confirm-dialog').classList.remove('hidden');
}

function hideConfirmDialog() {
  document.getElementById('confirm-dialog').classList.add('hidden');
  // Không gán null ở đây để giữ cho confirmAction dùng
}

function confirmAction() {
  const callback = adminState.confirmCallback;
  adminState.confirmCallback = null;
  hideConfirmDialog();
  if (callback) {
    callback();
  }
}

/**
 * Lưu câu hỏi mới
 */
async function saveQuestion() {
  const data = {
    game_day_id: adminState.selectedDayId,
    question_text: document.getElementById('q-text').value,
    option_a: document.getElementById('q-opt-a').value,
    option_b: document.getElementById('q-opt-b').value,
    option_c: document.getElementById('q-opt-c').value,
    option_d: document.getElementById('q-opt-d').value,
    correct_option: document.getElementById('q-correct').value,
    explanation: document.getElementById('q-explain').value,
    order_index: (adminState.questions?.length || 0) + 1
  };

  if (!data.question_text || !data.option_a || !data.option_b || !data.option_c || !data.option_d) {
    showToast('Vui lòng điền đủ thông tin', 'error');
    return;
  }

  try {
    await apiCall('/admin/questions', { method: 'POST', body: JSON.stringify(data) });
    showToast('Thêm câu hỏi thành công! ✅', 'success');
    hideAddQuestionForm();
    selectAdminDay(adminState.selectedDayId, document.getElementById('admin-q-day-title').textContent.replace('Ngày ', ''));
  } catch (error) {
    showToast(error.message, 'error');
  }
}

/**
 * Xóa câu hỏi
 */
function deleteQuestion(qId) {
  showConfirmDialog('Xóa câu hỏi này?', async () => {
    try {
      await apiCall(`/admin/questions/${qId}`, { method: 'DELETE' });
      showToast('Đã xóa câu hỏi', 'info');
      selectAdminDay(adminState.selectedDayId, document.getElementById('admin-q-day-title').textContent.replace('Ngày ', ''));
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}

/**
 * Cập nhật trạng thái ngày
 */
async function updateDayStatus(dayId, newStatus) {
  const statusVi = { 'ACTIVE': 'Mở', 'CLOSED': 'Đóng', 'UPCOMING': 'Sắp tới' };
  showConfirmDialog(`Chuyển trạng thái ngày sang "${statusVi[newStatus] || newStatus}"?`, async () => {
    try {
      await apiCall(`/admin/days/${dayId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      showToast(`Đã cập nhật trạng thái: ${statusVi[newStatus] || newStatus}`, 'success');
      loadAdminPage();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}

/**
 * Tính điểm cho ngày
 */
function calculateDayScores(dayId) {
  showConfirmDialog('Tính điểm cho ngày này? Trạng thái sẽ chuyển sang "Hoàn tất".', async () => {
    try {
      const result = await apiCall(`/admin/days/${dayId}/calculate`, { method: 'POST' });
      showToast(`✅ ${result.message}`, 'success');

      // Bắn confetti mừng
      if (typeof launchConfetti === 'function') {
        launchConfetti(2000);
      }

      loadAdminPage();
      backToAdminDays();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}
