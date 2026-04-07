/**
 * Leaderboard Routes - Bảng xếp hạng ngày + tổng thể
 */
const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/leaderboard/daily/:dayId - Bảng xếp hạng ngày
 */
router.get('/daily/:dayId', authMiddleware, async (req, res) => {
  try {
    const dayId = req.params.dayId;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const [rankings] = await pool.execute(`
      SELECT ds.*, u.display_name, u.avatar_url, u.username
      FROM daily_scores ds
      JOIN users u ON ds.user_id = u.id
      WHERE ds.game_day_id = ?
      ORDER BY ds.total_score DESC, ds.calculated_at ASC
      LIMIT ${limit}
    `, [dayId]);

    // Lấy xếp hạng của user hiện tại
    const [myRank] = await pool.execute(`
      SELECT ds.*, u.display_name,
        (SELECT COUNT(*) + 1 FROM daily_scores ds2 
         WHERE ds2.game_day_id = ? AND ds2.total_score > ds.total_score) as rank_position
      FROM daily_scores ds
      JOIN users u ON ds.user_id = u.id
      WHERE ds.user_id = ? AND ds.game_day_id = ?
    `, [dayId, req.user.id, dayId]);

    res.json({
      rankings,
      my_rank: myRank[0] || null
    });
  } catch (error) {
    console.error('Daily leaderboard error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/leaderboard/overall - Bảng xếp hạng tổng thể
 */
router.get('/overall', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const [rankings] = await pool.execute(`
      SELECT u.id, u.display_name, u.avatar_url, u.username,
        SUM(ds.total_score) as total_points,
        SUM(ds.correct_count) as total_correct,
        COUNT(ds.id) as days_played
      FROM users u
      JOIN daily_scores ds ON u.id = ds.user_id
      GROUP BY u.id
      ORDER BY total_points DESC
      LIMIT ${limit}
    `);

    // Xếp hạng của user hiện tại
    const [myRank] = await pool.execute(`
      SELECT 
        SUM(ds.total_score) as total_points,
        SUM(ds.correct_count) as total_correct,
        COUNT(ds.id) as days_played
      FROM daily_scores ds
      WHERE ds.user_id = ?
    `, [req.user.id]);

    // Tính vị trí xếp hạng
    let myPosition = null;
    if (myRank[0] && myRank[0].total_points) {
      const [posResult] = await pool.execute(`
        SELECT COUNT(*) + 1 as position
        FROM (
          SELECT user_id, SUM(total_score) as total_points
          FROM daily_scores
          GROUP BY user_id
          HAVING total_points > ?
        ) as better_players
      `, [myRank[0].total_points]);
      myPosition = posResult[0].position;
    }

    res.json({
      rankings,
      my_rank: myRank[0] ? { ...myRank[0], position: myPosition } : null
    });
  } catch (error) {
    console.error('Overall leaderboard error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/leaderboard/history - Lịch sử điểm qua các ngày
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [history] = await pool.execute(`
      SELECT ds.*, gd.day_number, gd.title as day_title, gd.game_date
      FROM daily_scores ds
      JOIN game_days gd ON ds.game_day_id = gd.id
      WHERE ds.user_id = ?
      ORDER BY gd.day_number ASC
    `, [userId]);

    res.json({ history });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;

