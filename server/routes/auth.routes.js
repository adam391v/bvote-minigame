/**
 * Auth Routes - Đăng ký, Đăng nhập, Thông tin user
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { generateToken } = require('../utils/jwt');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username phải từ 3-50 ký tự'),
  body('email').isEmail().normalizeEmail().withMessage('Email không hợp lệ'),
  body('password').isLength({ min: 6 }).withMessage('Mật khẩu phải ít nhất 6 ký tự'),
  body('display_name').trim().isLength({ min: 2, max: 100 }).withMessage('Tên hiển thị phải từ 2-100 ký tự')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email không hợp lệ'),
  body('password').notEmpty().withMessage('Vui lòng nhập mật khẩu')
];

/**
 * POST /api/auth/register - Đăng ký tài khoản
 */
router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, display_name } = req.body;

    // Kiểm tra email/username đã tồn tại
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email hoặc username đã được sử dụng' });
    }

    // Hash password và tạo user
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
      [username, email, passwordHash, display_name]
    );

    const token = generateToken({ id: result.insertId, email, role: 'PLAYER' });

    res.status(201).json({
      message: 'Đăng ký thành công!',
      token,
      user: { id: result.insertId, username, email, display_name, role: 'PLAYER' }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Lỗi server, vui lòng thử lại' });
  }
});

/**
 * POST /api/auth/login - Đăng nhập
 */
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    if (users.length === 0) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Đăng nhập thành công!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Lỗi server, vui lòng thử lại' });
  }
});

/**
 * GET /api/auth/me - Lấy thông tin user hiện tại
 */
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

/**
 * PUT /api/auth/profile - Cập nhật profile
 */
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { display_name, avatar_url } = req.body;
    const userId = req.user.id;

    await pool.execute(
      'UPDATE users SET display_name = ?, avatar_url = ? WHERE id = ?',
      [display_name || req.user.display_name, avatar_url || req.user.avatar_url, userId]
    );

    res.json({ message: 'Cập nhật thành công!' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
