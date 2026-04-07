/**
 * Game Routes - Logic game chính: lấy câu hỏi, submit trả lời
 */
const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * Hàm tính điểm tự động cho toàn bộ ngày chơi
 * Cập nhật điểm liên tục không cần admin bấm
 */
async function calculateDayScores(dayId) {
  try {
    const [questions] = await pool.execute('SELECT * FROM questions WHERE game_day_id = ?', [dayId]);
    if (questions.length === 0) return;

    for (const q of questions) {
      const [correctCount] = await pool.execute('SELECT COUNT(*) as cnt FROM answers WHERE question_id = ? AND is_correct = 1', [q.id]);
      q.actual_correct = correctCount[0].cnt;
    }

    const [allAnswers] = await pool.execute(`
      SELECT a.*, q.game_day_id, q.order_index
      FROM answers a JOIN questions q ON a.question_id = q.id
      WHERE q.game_day_id = ? ORDER BY a.user_id, q.order_index
    `, [dayId]);

    const userAnswersMap = {};
    allAnswers.forEach(a => {
      if (!userAnswersMap[a.user_id]) userAnswersMap[a.user_id] = [];
      userAnswersMap[a.user_id].push(a);
    });

    const speedRankings = {};
    for (const q of questions) {
      const answersForQ = allAnswers.filter(a => a.question_id === q.id && a.is_correct);
      answersForQ.sort((a, b) => a.time_taken_ms - b.time_taken_ms);
      speedRankings[q.id] = answersForQ.map((a, idx) => ({ user_id: a.user_id, rank: idx, total: answersForQ.length }));
    }

    await pool.execute('DELETE FROM daily_scores WHERE game_day_id = ?', [dayId]);

    const userIds = Object.keys(userAnswersMap);
    for (const uId of userIds) {
      const userAnswers = userAnswersMap[uId];
      let answerScore = 0, predictionScore = 0, speedScore = 0, correctCount = 0;

      userAnswers.forEach(a => {
        if (a.is_correct) { answerScore += 10; correctCount++; }
        
        const question = questions.find(q => q.id === a.question_id);
        if (question) {
          const diff = Math.abs(a.predicted_correct_count - question.actual_correct);
          predictionScore += Math.max(0, 5 - diff);
        }

        if (a.is_correct) {
          const ranking = speedRankings[a.question_id];
          const userRank = ranking?.find(r => r.user_id === parseInt(uId));
          if (userRank && userRank.total > 0) {
            const group = Math.floor(userRank.rank / (userRank.total / 3));
            speedScore += Math.max(0, 3 - group);
          }
        }
      });

      const totalScore = answerScore + predictionScore + speedScore;
      await pool.execute(`
        INSERT INTO daily_scores (user_id, game_day_id, correct_count, total_questions, answer_score, prediction_score, speed_score, total_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [uId, dayId, correctCount, questions.length, answerScore, predictionScore, speedScore, totalScore]);
    }
  } catch (err) {
    console.error('Auto calculateDayScores error:', err);
  }
}

/**
 * GET /api/game/days - Danh sách tất cả ngày chơi
 */
router.get('/days', authMiddleware, async (req, res) => {
  try {
    const [days] = await pool.execute(`
      SELECT gd.*, 
        (SELECT COUNT(*) FROM questions WHERE game_day_id = gd.id) as question_count,
        (SELECT COUNT(*) FROM daily_scores WHERE game_day_id = gd.id AND user_id = ?) as has_played
      FROM game_days gd
      ORDER BY gd.day_number ASC
    `, [req.user.id]);

    res.json({ days });
  } catch (error) {
    console.error('Get days error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/game/today - Lấy ngày chơi hiện tại
 */
router.get('/today', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    
    // Tìm ngày đang ACTIVE hoặc ngày sắp tới gần nhất
    const [activeDay] = await pool.execute(`
      SELECT gd.*,
        (SELECT COUNT(*) FROM questions WHERE game_day_id = gd.id) as question_count
      FROM game_days gd
      WHERE gd.status = 'ACTIVE' 
         OR (gd.status = 'UPCOMING' AND gd.open_at > NOW())
      ORDER BY gd.day_number ASC
      LIMIT 1
    `);

    if (activeDay.length === 0) {
      // Lấy ngày đã hoàn thành gần nhất
      const [lastDay] = await pool.execute(`
        SELECT gd.*,
          (SELECT COUNT(*) FROM questions WHERE game_day_id = gd.id) as question_count
        FROM game_days gd
        WHERE gd.status IN ('CLOSED', 'COMPLETED')
        ORDER BY gd.day_number DESC
        LIMIT 1
      `);
      return res.json({ today: lastDay[0] || null, status: 'no_active_day' });
    }

    // Kiểm tra user đã trả lời chưa
    const day = activeDay[0];
    const [userAnswers] = await pool.execute(`
      SELECT a.*, q.order_index
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      WHERE a.user_id = ? AND q.game_day_id = ?
      ORDER BY q.order_index
    `, [req.user.id, day.id]);

    res.json({
      today: day,
      answered_count: userAnswers.length,
      has_completed: userAnswers.length >= day.question_count,
      status: day.status === 'ACTIVE' ? 'playing' : 'upcoming'
    });
  } catch (error) {
    console.error('Get today error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/game/days/:dayId/questions - Lấy câu hỏi cho ngày cụ thể
 */
router.get('/days/:dayId/questions', authMiddleware, async (req, res) => {
  try {
    const dayId = req.params.dayId;

    // Kiểm tra ngày đang active
    const [day] = await pool.execute(
      'SELECT * FROM game_days WHERE id = ?',
      [dayId]
    );

    if (day.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy ngày chơi' });
    }

    if (day[0].status !== 'ACTIVE' && day[0].status !== 'CLOSED' && day[0].status !== 'COMPLETED') {
      return res.status(403).json({ error: 'Ngày chơi này chưa mở' });
    }

    // Lấy câu hỏi (ẩn đáp án đúng nếu chưa trả lời)
    const [questions] = await pool.execute(`
      SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.order_index,
        (SELECT selected_option FROM answers WHERE user_id = ? AND question_id = q.id) as user_answer,
        (SELECT is_correct FROM answers WHERE user_id = ? AND question_id = q.id) as user_is_correct,
        (SELECT predicted_correct_count FROM answers WHERE user_id = ? AND question_id = q.id) as user_prediction
      FROM questions q
      WHERE q.game_day_id = ?
      ORDER BY q.order_index ASC
    `, [req.user.id, req.user.id, req.user.id, dayId]);

    // Nếu ngày đã CLOSED/COMPLETED, hiển thị đáp án đúng + giải thích
    const showAnswers = day[0].status === 'CLOSED' || day[0].status === 'COMPLETED';

    const formattedQuestions = questions.map(q => {
      const result = {
        id: q.id,
        question_text: q.question_text,
        options: [
          { key: 'A', text: q.option_a },
          { key: 'B', text: q.option_b },
          { key: 'C', text: q.option_c },
          { key: 'D', text: q.option_d }
        ],
        order_index: q.order_index,
        user_answer: q.user_answer,
        user_is_correct: q.user_is_correct,
        user_prediction: q.user_prediction
      };

      if (showAnswers) {
        // Lấy thêm đáp án đúng và giải thích
        return result;
      }
      return result;
    });

    // Nếu đã closed, thêm correct_option
    if (showAnswers) {
      const [fullQuestions] = await pool.execute(
        'SELECT id, correct_option, explanation FROM questions WHERE game_day_id = ?',
        [dayId]
      );
      fullQuestions.forEach(fq => {
        const q = formattedQuestions.find(q => q.id === fq.id);
        if (q) {
          q.correct_option = fq.correct_option;
          q.explanation = fq.explanation;
        }
      });
    }

    res.json({ day: day[0], questions: formattedQuestions });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/game/submit - Submit câu trả lời + dự đoán
 */
router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const { question_id, selected_option, predicted_correct_count, time_taken_ms } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!question_id || !selected_option || predicted_correct_count === undefined) {
      return res.status(400).json({ error: 'Thiếu thông tin trả lời' });
    }

    if (!['A', 'B', 'C', 'D'].includes(selected_option)) {
      return res.status(400).json({ error: 'Đáp án không hợp lệ' });
    }

    // Kiểm tra câu hỏi có tồn tại và ngày đang active
    const [question] = await pool.execute(`
      SELECT q.*, gd.status as day_status
      FROM questions q
      JOIN game_days gd ON q.game_day_id = gd.id
      WHERE q.id = ?
    `, [question_id]);

    if (question.length === 0) {
      return res.status(404).json({ error: 'Câu hỏi không tồn tại' });
    }

    if (question[0].day_status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Ngày chơi không còn mở' });
    }

    // Kiểm tra đã trả lời chưa
    const [existing] = await pool.execute(
      'SELECT id FROM answers WHERE user_id = ? AND question_id = ?',
      [userId, question_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Bạn đã trả lời câu hỏi này rồi' });
    }

    // Kiểm tra đáp án
    const isCorrect = selected_option === question[0].correct_option;

    // Lưu câu trả lời
    await pool.execute(`
      INSERT INTO answers (user_id, question_id, selected_option, is_correct, predicted_correct_count, submitted_at, time_taken_ms)
      VALUES (?, ?, ?, ?, ?, NOW(), ?)
    `, [userId, question_id, selected_option, isCorrect ? 1 : 0, predicted_correct_count, time_taken_ms || 0]);

    // Gọi trigger tính điểm lại cho tất cả user trong ngày đó dưới nền (không làm chậm request)
    calculateDayScores(question[0].game_day_id).catch(e => console.error("Auto calculation failed: ", e));

    res.json({
      message: 'Đã ghi nhận câu trả lời!',
      is_correct: isCorrect,
      correct_option: question[0].correct_option,
      explanation: question[0].explanation
    });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/game/days/:dayId/result - Kết quả ngày
 */
router.get('/days/:dayId/result', authMiddleware, async (req, res) => {
  try {
    const dayId = req.params.dayId;
    const userId = req.user.id;

    // Lấy điểm ngày
    const [scores] = await pool.execute(
      'SELECT * FROM daily_scores WHERE user_id = ? AND game_day_id = ?',
      [userId, dayId]
    );

    // Lấy chi tiết từng câu
    const [answers] = await pool.execute(`
      SELECT a.*, q.question_text, q.correct_option, q.explanation, q.order_index,
        q.option_a, q.option_b, q.option_c, q.option_d,
        (SELECT COUNT(*) FROM answers a2 WHERE a2.question_id = q.id AND a2.is_correct = 1) as total_correct
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      WHERE a.user_id = ? AND q.game_day_id = ?
      ORDER BY q.order_index
    `, [userId, dayId]);

    res.json({
      score: scores[0] || null,
      answers: answers
    });
  } catch (error) {
    console.error('Get result error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PUT /api/game/predict/:questionId - Cập nhật dự đoán
 */
router.put('/predict/:questionId', authMiddleware, async (req, res) => {
  try {
    const { predicted_correct_count } = req.body;
    const userId = req.user.id;
    const questionId = req.params.questionId;

    await pool.execute(
      'UPDATE answers SET predicted_correct_count = ? WHERE user_id = ? AND question_id = ?',
      [predicted_correct_count || 0, userId, questionId]
    );

    res.json({ message: 'Cập nhật dự đoán thành công' });
  } catch (error) {
    console.error('Update prediction error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
