/**
 * Middleware xác thực JWT - Kiểm tra user đã đăng nhập
 */
const { verifyToken } = require('../utils/jwt');
const { pool } = require('../config/database');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    // Lấy thông tin user từ DB
    const [users] = await pool.execute(
      'SELECT id, username, email, display_name, avatar_url, role FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn' });
    }
    return res.status(401).json({ error: 'Token không hợp lệ' });
  }
}

/**
 * Middleware kiểm tra quyền Admin
 */
function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Bạn không có quyền truy cập' });
  }
  next();
}

module.exports = { authMiddleware, adminMiddleware };
