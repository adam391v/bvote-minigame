/**
 * BVote Mini Game - Server Entry Point
 * Express server phục vụ API + Static files
 * Bổ sung: Helmet, Rate Limiting, CORS config, Error handling
 */
process.on('uncaughtException', (err) => console.error('🔥 LÕI QUAN TRỌNG CHƯA BẮT ĐƯỢC:', err));
process.on('unhandledRejection', (reason, promise) => console.error('🔥 PROMISE CHƯA BẮT ĐƯỢC:', reason));

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
require('dotenv').config();

const { testConnection } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth.routes');
const gameRoutes = require('./routes/game.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ===== Security Middleware =====

// Helmet - HTTP security headers
app.use(helmet({
  contentSecurityPolicy: false, // Tắt CSP để cho phép inline scripts
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting - Giới hạn requests
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 phút
  max: 100,                   // Tối đa 100 requests / phút
  message: { error: 'Quá nhiều yêu cầu, vui lòng thử lại sau 1 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit chặt hơn cho auth (chống brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 phút
  max: 20,                    // Tối đa 20 lần login/register mỗi 15 phút
  message: { error: 'Quá nhiều lần đăng nhập, vui lòng thử lại sau.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit cho game submit (chống spam)
const submitLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { error: 'Gửi trả lời quá nhanh, vui lòng chờ.' }
});

// ===== Core Middleware =====
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (chỉ trong development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      const start = Date.now();
      res.on('finish', () => {
        const ms = Date.now() - start;
        const status = res.statusCode;
        const color = status >= 400 ? '\x1b[31m' : '\x1b[32m';
        console.log(`  ${color}${req.method}\x1b[0m ${req.path} → ${status} (${ms}ms)`);
      });
    }
    next();
  });
}

// Phục vụ static files từ thư mục client
app.use(express.static(path.join(__dirname, '..', 'client'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true
}));

// ===== API Routes =====
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/game', apiLimiter, gameRoutes);
app.use('/api/leaderboard', apiLimiter, leaderboardRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'development'
  });
});

// SPA fallback - Trả về index.html cho tất cả routes không match API
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// ===== Error Handling =====

// 404 cho API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint không tồn tại' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 Server error:', err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Đã xảy ra lỗi, vui lòng thử lại'
      : err.message
  });
});

// ===== Graceful Shutdown =====
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received. Shutting down...');
  server.close(() => {
    console.log('✅ Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received. Shutting down...');
  server.close(() => {
    console.log('✅ Server closed.');
    process.exit(0);
  });
});

// ===== Khởi động server =====
async function start() {
  console.log('\n🎮 BVote Mini Game Server');
  console.log('========================\n');

  // 1. Mở cổng HTTP Sever ngay lập tức để qua bài Healthcheck của Railway
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server đang chạy tại: http://0.0.0.0:${PORT}`);
    console.log(`📁 Static files: ${path.join(__dirname, '..', 'client')}`);
    console.log(`📡 API: http://0.0.0.0:${PORT}/api`);
    console.log(`🔒 Security: Helmet + CORS + Rate Limit`);
    console.log(`🌍 Env: ${process.env.NODE_ENV || 'development'}\n`);
  });

  // 2. Chạy ngầm các cấu hình và migrate DB sau khi port đã mở thành công
  try {
    const dbOk = await testConnection();
    if (dbOk) {
      console.log('⏳ Đang kiểm tra và auto-migrate database...');
      const { migrate } = require('./config/migrate');
      await migrate();
      console.log('✅ Hoàn tất cấu hình Database!');
    } else {
      console.log('⚠️  Server đang chạy nhưng DB chưa kết nối!');
    }
  } catch (err) {
    console.error('⚠️  Lỗi trong quá trình khởi tạo DB ngầm:', err.message);
  }
}

start();

