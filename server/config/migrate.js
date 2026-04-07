/**
 * Script tạo bảng database cho BVote Mini Game
 * Chạy: node server/config/migrate.js
 */
const { pool } = require('./database');

const TABLES = [
  // Bảng người dùng
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500) DEFAULT NULL,
    role ENUM('PLAYER', 'ADMIN') DEFAULT 'PLAYER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_username (username)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Bảng ngày chơi (20 ngày)
  `CREATE TABLE IF NOT EXISTS game_days (
    id INT AUTO_INCREMENT PRIMARY KEY,
    day_number INT NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    game_date DATE NOT NULL,
    status ENUM('UPCOMING', 'ACTIVE', 'CLOSED', 'COMPLETED') DEFAULT 'UPCOMING',
    open_at DATETIME NOT NULL,
    close_at DATETIME NOT NULL,
    total_correct_answers INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_day_number (day_number),
    INDEX idx_status (status),
    INDEX idx_game_date (game_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Bảng câu hỏi
  `CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_day_id INT NOT NULL,
    question_text TEXT NOT NULL,
    option_a VARCHAR(500) NOT NULL,
    option_b VARCHAR(500) NOT NULL,
    option_c VARCHAR(500) NOT NULL,
    option_d VARCHAR(500) NOT NULL,
    correct_option ENUM('A', 'B', 'C', 'D') NOT NULL,
    explanation TEXT,
    order_index INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_day_id) REFERENCES game_days(id) ON DELETE CASCADE,
    INDEX idx_game_day (game_day_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Bảng câu trả lời của người chơi
  `CREATE TABLE IF NOT EXISTS answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    question_id INT NOT NULL,
    selected_option ENUM('A', 'B', 'C', 'D') NOT NULL,
    is_correct TINYINT(1) DEFAULT 0,
    predicted_correct_count INT DEFAULT 0,
    submitted_at DATETIME NOT NULL,
    time_taken_ms INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_question (user_id, question_id),
    INDEX idx_user (user_id),
    INDEX idx_question (question_id),
    INDEX idx_submitted (submitted_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Bảng điểm ngày
  `CREATE TABLE IF NOT EXISTS daily_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    game_day_id INT NOT NULL,
    correct_count INT DEFAULT 0,
    total_questions INT DEFAULT 0,
    answer_score INT DEFAULT 0,
    prediction_score INT DEFAULT 0,
    speed_score INT DEFAULT 0,
    total_score INT DEFAULT 0,
    rank_position INT DEFAULT 0,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (game_day_id) REFERENCES game_days(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_day (user_id, game_day_id),
    INDEX idx_game_day (game_day_id),
    INDEX idx_total_score (total_score DESC)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Bảng giải thưởng
  `CREATE TABLE IF NOT EXISTS prizes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('DAILY', 'GRAND', 'SPECIAL') NOT NULL,
    game_day_id INT DEFAULT NULL,
    user_id INT DEFAULT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    rank_position INT DEFAULT 1,
    awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_day_id) REFERENCES game_days(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_type (type),
    INDEX idx_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];

async function migrate() {
  console.log('🔄 Bắt đầu tạo bảng database...\n');
  
  try {
    for (const sql of TABLES) {
      // Lấy tên bảng từ câu SQL
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
      await pool.execute(sql);
      console.log(`  ✅ Tạo bảng "${tableName}" thành công`);
    }
    console.log('\n🎉 Migration hoàn tất!');
  } catch (error) {
    console.error('\n❌ Lỗi migration:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Chạy trực tiếp
migrate().catch(() => process.exit(1));
