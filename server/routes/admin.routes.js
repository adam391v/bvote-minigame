/**
 * Admin Routes - Quản lý câu hỏi, ngày chơi, tính điểm
 */
const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Tất cả admin routes yêu cầu auth + admin role
router.use(authMiddleware, adminMiddleware);

/**
 * GET /api/admin/stats - Thống kê tổng quan
 */
router.get('/stats', async (req, res) => {
  try {
    const [playerCount] = await pool.execute("SELECT COUNT(*) as count FROM users WHERE role = 'PLAYER'");
    const [dayCount] = await pool.execute('SELECT COUNT(*) as count FROM game_days');
    const [activeDays] = await pool.execute("SELECT COUNT(*) as count FROM game_days WHERE status = 'ACTIVE'");
    const [totalAnswers] = await pool.execute('SELECT COUNT(*) as count FROM answers');
    const [questionCount] = await pool.execute('SELECT COUNT(*) as count FROM questions');

    // Dữ liệu biểu đồ: lượt người chơi đã tham gia theo từng ngày
    const [chartData] = await pool.execute(`
      SELECT d.day_number, COUNT(DISTINCT a.user_id) as player_count
      FROM game_days d
      LEFT JOIN questions q ON d.id = q.game_day_id
      LEFT JOIN answers a ON q.id = a.question_id
      GROUP BY d.day_number
      ORDER BY d.day_number ASC
      LIMIT 20
    `);

    res.json({
      players: playerCount[0].count,
      total_days: dayCount[0].count,
      active_days: activeDays[0].count,
      total_answers: totalAnswers[0].count,
      total_questions: questionCount[0].count,
      chart_data: chartData
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/admin/days - Tạo ngày chơi mới
 */
router.post('/days', async (req, res) => {
  try {
    const { day_number, title, description, game_date, open_at, close_at } = req.body;

    const [result] = await pool.execute(
      'INSERT INTO game_days (day_number, title, description, game_date, open_at, close_at) VALUES (?, ?, ?, ?, ?, ?)',
      [day_number, title, description, game_date, open_at, close_at]
    );

    res.status(201).json({ message: 'Tạo ngày chơi thành công', id: result.insertId });
  } catch (error) {
    console.error('Create day error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PUT /api/admin/days/:dayId - Cập nhật trạng thái ngày
 */
router.put('/days/:dayId', async (req, res) => {
  try {
    const { status, title, description, open_at, close_at } = req.body;
    const dayId = req.params.dayId;

    const updates = [];
    const params = [];

    if (status) { updates.push('status = ?'); params.push(status); }
    if (title) { updates.push('title = ?'); params.push(title); }
    if (description) { updates.push('description = ?'); params.push(description); }
    if (open_at) { updates.push('open_at = ?'); params.push(open_at); }
    if (close_at) { updates.push('close_at = ?'); params.push(close_at); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Không có trường nào cần cập nhật' });
    }

    params.push(dayId);
    await pool.execute(`UPDATE game_days SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ message: 'Cập nhật thành công' });
  } catch (error) {
    console.error('Update day error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/admin/questions - Tạo câu hỏi
 */
router.post('/questions', async (req, res) => {
  try {
    const { game_day_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, order_index } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO questions (game_day_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, order_index)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [game_day_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation || '', order_index || 1]
    );

    res.status(201).json({ message: 'Tạo câu hỏi thành công', id: result.insertId });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PUT /api/admin/questions/:qId - Sửa câu hỏi
 */
router.put('/questions/:qId', async (req, res) => {
  try {
    const { question_text, option_a, option_b, option_c, option_d, correct_option, explanation } = req.body;
    const qId = req.params.qId;

    await pool.execute(
      `UPDATE questions SET question_text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_option = ?, explanation = ? WHERE id = ?`,
      [question_text, option_a, option_b, option_c, option_d, correct_option, explanation, qId]
    );

    res.json({ message: 'Cập nhật câu hỏi thành công' });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * DELETE /api/admin/questions/:qId - Xóa câu hỏi
 */
router.delete('/questions/:qId', async (req, res) => {
  try {
    await pool.execute('DELETE FROM questions WHERE id = ?', [req.params.qId]);
    res.json({ message: 'Đã xóa câu hỏi' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/admin/days/:dayId/calculate - Tính điểm cho ngày
 * Logic tính điểm:
 *   - Trả lời đúng: 10 điểm/câu
 *   - Dự đoán: max(0, 5 - abs(predicted - actual)) điểm/câu
 *   - Tốc độ: 0-3 điểm dựa trên thời gian (chia 3 nhóm)
 */
router.post('/days/:dayId/calculate', async (req, res) => {
  try {
    const dayId = req.params.dayId;

    // Lấy tất cả câu hỏi trong ngày
    const [questions] = await pool.execute(
      'SELECT * FROM questions WHERE game_day_id = ?',
      [dayId]
    );

    if (questions.length === 0) {
      return res.status(404).json({ error: 'Không có câu hỏi cho ngày này' });
    }

    // Tính số người trả lời đúng cho mỗi câu
    for (const q of questions) {
      const [correctCount] = await pool.execute(
        'SELECT COUNT(*) as cnt FROM answers WHERE question_id = ? AND is_correct = 1',
        [q.id]
      );
      q.actual_correct = correctCount[0].cnt;
    }

    // Lấy tất cả user đã trả lời
    const [allAnswers] = await pool.execute(`
      SELECT a.*, q.game_day_id, q.order_index
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      WHERE q.game_day_id = ?
      ORDER BY a.user_id, q.order_index
    `, [dayId]);

    // Nhóm theo user
    const userAnswersMap = {};
    allAnswers.forEach(a => {
      if (!userAnswersMap[a.user_id]) userAnswersMap[a.user_id] = [];
      userAnswersMap[a.user_id].push(a);
    });

    // Tính speed ranking cho mỗi câu
    const speedRankings = {};
    for (const q of questions) {
      const answersForQ = allAnswers.filter(a => a.question_id === q.id && a.is_correct);
      answersForQ.sort((a, b) => a.time_taken_ms - b.time_taken_ms);
      speedRankings[q.id] = answersForQ.map((a, idx) => ({
        user_id: a.user_id,
        rank: idx,
        total: answersForQ.length
      }));
    }

    // Xóa điểm cũ
    await pool.execute('DELETE FROM daily_scores WHERE game_day_id = ?', [dayId]);

    // Tính điểm cho mỗi user
    const userIds = Object.keys(userAnswersMap);
    for (const uId of userIds) {
      const userAnswers = userAnswersMap[uId];
      let answerScore = 0;
      let predictionScore = 0;
      let speedScore = 0;
      let correctCount = 0;

      userAnswers.forEach(a => {
        // Điểm trả lời đúng
        if (a.is_correct) {
          answerScore += 10;
          correctCount++;
        }

        // Điểm dự đoán
        const question = questions.find(q => q.id === a.question_id);
        if (question) {
          const diff = Math.abs(a.predicted_correct_count - question.actual_correct);
          predictionScore += Math.max(0, 5 - diff);
        }

        // Điểm tốc độ (chỉ cho câu đúng)
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

    // Cập nhật ranking
    const [scores] = await pool.execute(
      'SELECT id FROM daily_scores WHERE game_day_id = ? ORDER BY total_score DESC',
      [dayId]
    );
    for (let i = 0; i < scores.length; i++) {
      await pool.execute('UPDATE daily_scores SET rank_position = ? WHERE id = ?', [i + 1, scores[i].id]);
    }

    // Cập nhật trạng thái ngày
    await pool.execute("UPDATE game_days SET status = 'COMPLETED' WHERE id = ?", [dayId]);

    res.json({
      message: `Đã tính điểm cho ${userIds.length} người chơi`,
      total_players: userIds.length
    });
  } catch (error) {
    console.error('Calculate score error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/admin/players - Danh sách người chơi
 */
router.get('/players', async (req, res) => {
  try {
    const [players] = await pool.execute(`
      SELECT u.id, u.username, u.email, u.display_name, u.created_at,
        (SELECT SUM(total_score) FROM daily_scores WHERE user_id = u.id) as total_points,
        (SELECT COUNT(*) FROM daily_scores WHERE user_id = u.id) as days_played
      FROM users u
      WHERE u.role = 'PLAYER'
      ORDER BY total_points DESC
    `);

    res.json({ players });
  } catch (error) {
    console.error('Get players error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
