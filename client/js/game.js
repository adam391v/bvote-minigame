/**
 * Game Module - Logic chơi game, trả lời câu hỏi, dự đoán
 */

// Game state
let gameState = {
  currentDay: null,
  questions: [],
  currentQuestionIndex: 0,
  selectedOption: null,
  timer: null,
  timeLeft: 30,
  questionStartTime: null,
  predictionValue: 2500,
  lastAnswerResult: null
};

/**
 * Bắt đầu chơi
 */
async function startPlaying() {
  try {
    const data = await apiCall('/game/today');
    
    if (!data.today) {
      showToast('Không có ngày chơi nào đang diễn ra', 'info');
      return;
    }

    if (data.today.status !== 'ACTIVE') {
      showToast('Ngày chơi này chưa mở hoặc đã kết thúc', 'info');
      return;
    }

    if (data.has_completed) {
      showToast('Bạn đã hoàn thành thử thách hôm nay rồi! 🎉', 'info');
      loadDayResult(data.today.id);
      return;
    }

    // Lấy câu hỏi
    const qData = await apiCall(`/game/days/${data.today.id}/questions`);
    gameState.currentDay = data.today;
    gameState.questions = qData.questions;
    
    // Tìm câu hỏi chưa trả lời
    const unansweredIndex = gameState.questions.findIndex(q => !q.user_answer);
    gameState.currentQuestionIndex = unansweredIndex >= 0 ? unansweredIndex : 0;

    navigateTo('play');
    renderQuestion();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

/**
 * Hiển thị câu hỏi hiện tại
 */
function renderQuestion() {
  const q = gameState.questions[gameState.currentQuestionIndex];
  if (!q) return;

  const idx = gameState.currentQuestionIndex;
  const total = gameState.questions.length;
  const dayNum = gameState.currentDay?.day_number || 1;

  // Cập nhật header
  document.getElementById('play-day-title').textContent = `Ngày ${dayNum} - Câu ${idx + 1}/${total}`;
  document.getElementById('play-progress').style.width = `${((idx) / total) * 100}%`;
  document.getElementById('question-label').textContent = `CÂU HỎI ${idx + 1}`;
  document.getElementById('question-text').textContent = q.question_text;

  // Nếu đã trả lời câu này, skip sang prediction hoặc tiếp
  if (q.user_answer) {
    gameState.currentQuestionIndex++;
    if (gameState.currentQuestionIndex >= total) {
      finishGame();
      return;
    }
    renderQuestion();
    return;
  }

  // Reset state
  gameState.selectedOption = null;
  gameState.lastAnswerResult = null;
  document.getElementById('question-container').classList.remove('hidden');
  document.getElementById('prediction-container').classList.add('hidden');
  document.getElementById('btn-confirm-answer').disabled = true;

  // Render đáp án với animation
  const optionsHtml = q.options.map((opt, i) => `
    <div class="answer-option animate-slideUp" style="animation-delay: ${i * 80}ms" id="opt-${opt.key}" onclick="selectOption('${opt.key}')">
      <div class="answer-key">${opt.key}</div>
      <div class="answer-text">${opt.text}</div>
    </div>
  `).join('');
  document.getElementById('answer-options').innerHTML = optionsHtml;

  // Bắt đầu timer
  startTimer();
}

/**
 * Chọn đáp án
 */
function selectOption(key) {
  if (gameState.timeLeft <= 0) return;

  gameState.selectedOption = key;

  // Cập nhật UI
  document.querySelectorAll('.answer-option').forEach(opt => {
    opt.classList.remove('selected');
  });
  document.getElementById(`opt-${key}`).classList.add('selected');
  document.getElementById('btn-confirm-answer').disabled = false;
}

/**
 * Xác nhận đáp án
 */
async function confirmAnswer() {
  if (!gameState.selectedOption) return;

  stopTimer();
  const q = gameState.questions[gameState.currentQuestionIndex];
  const timeTaken = Date.now() - gameState.questionStartTime;

  // Disable tất cả options
  document.querySelectorAll('.answer-option').forEach(opt => {
    opt.style.pointerEvents = 'none';
  });

  try {
    const data = await apiCall('/game/submit', {
      method: 'POST',
      body: JSON.stringify({
        question_id: q.id,
        selected_option: gameState.selectedOption,
        predicted_correct_count: 0,
        time_taken_ms: timeTaken
      })
    });

    // Lưu kết quả
    gameState.lastAnswerResult = data;
    q.user_answer = gameState.selectedOption;
    q.user_is_correct = data.is_correct;
    q.correct_option = data.correct_option;
    q.explanation = data.explanation;

    // Highlight đáp án đúng/sai
    if (data.correct_option) {
      document.getElementById(`opt-${data.correct_option}`).classList.add('correct');
    }
    if (!data.is_correct && gameState.selectedOption) {
      document.getElementById(`opt-${gameState.selectedOption}`).classList.add('wrong');
    }

    // Cập nhật progress
    document.getElementById('play-progress').style.width = 
      `${((gameState.currentQuestionIndex + 1) / gameState.questions.length) * 100}%`;

    // Sau 1.5s hiện prediction
    setTimeout(() => {
      showPredictionScreen(data);
    }, 1500);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

/**
 * Hiển thị màn hình dự đoán
 */
function showPredictionScreen(data) {
  document.getElementById('question-container').classList.add('hidden');
  document.getElementById('prediction-container').classList.remove('hidden');

  const resultIcon = document.getElementById('result-icon');
  const resultText = document.getElementById('result-text');

  if (data.is_correct) {
    resultIcon.textContent = '✅';
    resultText.textContent = 'Chính xác! 🎉';
    resultText.style.color = 'var(--success)';
  } else {
    resultIcon.textContent = '❌';
    resultText.textContent = 'Sai rồi!';
    resultText.style.color = 'var(--danger)';
  }

  document.getElementById('result-explanation').textContent = data.explanation || '';

  // Reset prediction
  gameState.predictionValue = 2500;
  document.getElementById('prediction-value').textContent = '2,500';
  document.getElementById('prediction-slider').value = 2500;
}

/**
 * Điều chỉnh dự đoán
 */
function adjustPrediction(delta) {
  gameState.predictionValue = Math.max(0, Math.min(5000, gameState.predictionValue + delta));
  document.getElementById('prediction-value').textContent = gameState.predictionValue.toLocaleString();
  document.getElementById('prediction-slider').value = gameState.predictionValue;
}

function updatePredictionFromSlider(value) {
  gameState.predictionValue = parseInt(value);
  document.getElementById('prediction-value').textContent = gameState.predictionValue.toLocaleString();
}

/**
 * Submit dự đoán và chuyển câu tiếp
 */
async function submitPrediction() {
  const q = gameState.questions[gameState.currentQuestionIndex];
  q.user_prediction = gameState.predictionValue;

  // Update prediction trên server
  try {
    await apiCall(`/game/predict/${q.id}`, {
      method: 'PUT',
      body: JSON.stringify({ predicted_correct_count: gameState.predictionValue })
    });
  } catch (e) {
    // Không lỗi critical, tiếp tục
    console.warn('Update prediction failed:', e);
  }

  // Chuyển câu tiếp theo
  gameState.currentQuestionIndex++;
  
  if (gameState.currentQuestionIndex >= gameState.questions.length) {
    finishGame();
    return;
  }

  // Render câu tiếp
  renderQuestion();
}

/**
 * Hoàn thành game
 */
function finishGame() {
  showToast('🎉 Hoàn thành thử thách hôm nay!', 'success');
  
  // Bắn confetti
  if (typeof launchConfetti === 'function') {
    launchConfetti(4000);
  }

  // Chuyển sang trang kết quả sau 1s
  setTimeout(() => {
    loadDayResult(gameState.currentDay.id);
  }, 1000);
}

/**
 * Tải kết quả ngày
 */
async function loadDayResult(dayId) {
  try {
    const data = await apiCall(`/game/days/${dayId}/result`);
    const dayNum = gameState.currentDay?.day_number || '';
    
    document.getElementById('result-day-title').textContent = `Kết quả Ngày ${dayNum}`;

    if (data.score) {
      const s = data.score;
      document.getElementById('result-rank-text').textContent = 
        s.rank_position ? `Bạn xếp hạng #${s.rank_position} hôm nay!` : 'Đang chờ kết quả...';
      document.getElementById('result-answer-score').textContent = `${s.answer_score || 0}/${s.total_questions * 10}`;
      document.getElementById('result-prediction-score').textContent = `${s.prediction_score || 0}/${s.total_questions * 5}`;
      document.getElementById('result-speed-score').textContent = `${s.speed_score || 0}/${s.total_questions * 3}`;
      document.getElementById('result-total-score').textContent = s.total_score || 0;
      document.getElementById('result-congrats').textContent = 
        s.rank_position <= 3 ? '🏆 Xuất sắc!' : 'Chúc mừng!';
    } else {
      document.getElementById('result-rank-text').textContent = 'Kết quả sẽ được công bố sau khi ngày kết thúc!';
      document.getElementById('result-answer-score').textContent = '-';
      document.getElementById('result-prediction-score').textContent = '-';
      document.getElementById('result-speed-score').textContent = '-';
      document.getElementById('result-total-score').textContent = '?';
      document.getElementById('result-congrats').textContent = 'Đã hoàn thành! 👏';
    }

    // Render chi tiết từng câu
    if (data.answers && data.answers.length > 0) {
      const detailHtml = data.answers.map(a => `
        <div class="glass-card-flat mb-2 animate-slideUp" style="padding: var(--space-4);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);">
            <span style="font-weight: 600; font-size: var(--font-size-sm);">Câu ${a.order_index}</span>
            <span style="font-size: 20px;">${a.is_correct ? '✅' : '❌'}</span>
          </div>
          <p style="font-size: var(--font-size-sm); margin-bottom: var(--space-2); line-height: 1.4;">${a.question_text}</p>
          <div style="display: flex; justify-content: space-between; font-size: var(--font-size-xs); color: var(--on-surface-variant);">
            <span>Trả lời: <strong style="color: ${a.is_correct ? 'var(--success)' : 'var(--danger)'}">${a.selected_option}</strong> (Đúng: <strong>${a.correct_option}</strong>)</span>
            <span>Dự đoán: ${(a.predicted_correct_count || 0).toLocaleString()}</span>
          </div>
        </div>
      `).join('');
      document.getElementById('result-answers-detail').innerHTML = detailHtml;
    } else {
      document.getElementById('result-answers-detail').innerHTML = `
        <div class="text-center text-muted py-4">
          <p>Chưa có dữ liệu chi tiết</p>
        </div>
      `;
    }

    navigateTo('result');
  } catch (error) {
    showToast('Chưa có kết quả cho ngày này', 'info');
    navigateTo('home');
  }
}

/**
 * Timer countdown 30 giây
 */
function startTimer() {
  stopTimer();
  gameState.timeLeft = 30;
  gameState.questionStartTime = Date.now();
  updateTimerDisplay();

  gameState.timer = setInterval(() => {
    gameState.timeLeft--;
    updateTimerDisplay();

    if (gameState.timeLeft <= 0) {
      stopTimer();
      // Hết giờ - auto submit nếu đã chọn
      if (gameState.selectedOption) {
        confirmAnswer();
      } else {
        showToast('⏰ Hết giờ!', 'error');
        showPredictionScreen({ is_correct: false, explanation: 'Hết thời gian trả lời.' });
        gameState.questions[gameState.currentQuestionIndex].user_answer = 'TIMEOUT';
      }
    }
  }, 1000);
}

function stopTimer() {
  if (gameState.timer) {
    clearInterval(gameState.timer);
    gameState.timer = null;
  }
}

function updateTimerDisplay() {
  const timerValue = document.getElementById('timer-value');
  const timerProgress = document.getElementById('timer-circle-progress');
  
  if (!timerValue || !timerProgress) return;

  timerValue.textContent = gameState.timeLeft;
  
  // Cập nhật SVG circle progress
  const circumference = 2 * Math.PI * 36;
  const offset = circumference * (1 - gameState.timeLeft / 30);
  timerProgress.style.strokeDashoffset = offset;

  // Đổi màu + animation khi sắp hết giờ
  if (gameState.timeLeft <= 10) {
    timerProgress.style.stroke = 'var(--danger)';
    timerValue.style.color = 'var(--danger)';
    if (gameState.timeLeft <= 5) {
      timerValue.classList.add('timer-warning');
    }
  } else {
    timerProgress.style.stroke = 'var(--secondary)';
    timerValue.style.color = 'var(--secondary)';
    timerValue.classList.remove('timer-warning');
  }
}
