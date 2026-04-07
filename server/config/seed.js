/**
 * Script tạo dữ liệu mẫu cho BVote Mini Game
 * Chạy: node server/config/seed.js
 */
const bcrypt = require('bcryptjs');
const { pool } = require('./database');

async function seed() {
  console.log('🌱 Bắt đầu seed dữ liệu mẫu...\n');

  try {
    // Tạo admin account
    const adminHash = await bcrypt.hash('admin123', 10);
    const playerHash = await bcrypt.hash('player123', 10);

    await pool.execute(`
      INSERT IGNORE INTO users (username, email, password_hash, display_name, role)
      VALUES 
        ('admin', 'admin@bvote.vn', ?, 'Admin BVote', 'ADMIN'),
        ('player1', 'player1@test.vn', ?, 'Nguyễn Văn A', 'PLAYER'),
        ('player2', 'player2@test.vn', ?, 'Trần Thị B', 'PLAYER'),
        ('player3', 'player3@test.vn', ?, 'Lê Văn C', 'PLAYER')
    `, [adminHash, playerHash, playerHash, playerHash]);
    console.log('  ✅ Tạo users mẫu (admin + 3 players)');

    // Tạo 20 ngày chơi
    const startDate = new Date('2026-04-10');
    const dayValues = [];
    const dayParams = [];
    
    for (let i = 1; i <= 20; i++) {
      const gameDate = new Date(startDate);
      gameDate.setDate(startDate.getDate() + (i - 1));
      const dateStr = gameDate.toISOString().split('T')[0];
      
      dayValues.push('(?, ?, ?, ?, ?, ?)');
      dayParams.push(
        i,
        `Ngày ${i} - Thử thách tri thức`,
        `Thử thách ngày ${i} với 3 câu hỏi hấp dẫn`,
        dateStr,
        `${dateStr} 08:00:00`,
        `${dateStr} 23:59:59`
      );
    }

    await pool.execute(
      `INSERT IGNORE INTO game_days (day_number, title, description, game_date, open_at, close_at) VALUES ${dayValues.join(', ')}`,
      dayParams
    );
    console.log('  ✅ Tạo 20 ngày chơi (10/04 - 29/04/2026)');

    // Tạo câu hỏi mẫu cho ngày 1-3
    const sampleQuestions = [
      // Ngày 1
      { day: 1, q: 'Thủ đô của Việt Nam là thành phố nào?', a: 'Hồ Chí Minh', b: 'Hà Nội', c: 'Đà Nẵng', d: 'Huế', correct: 'B', explain: 'Hà Nội là thủ đô của Việt Nam từ năm 1010.', order: 1 },
      { day: 1, q: 'Sông nào dài nhất Việt Nam?', a: 'Sông Hồng', b: 'Sông Đà', c: 'Sông Mê Kông', d: 'Sông Đồng Nai', correct: 'C', explain: 'Sông Mê Kông (Cửu Long) dài khoảng 4.350 km.', order: 2 },
      { day: 1, q: 'Việt Nam có bao nhiêu tỉnh thành?', a: '61', b: '63', c: '64', d: '65', correct: 'B', explain: 'Việt Nam có 63 tỉnh thành phố trực thuộc trung ương.', order: 3 },
      // Ngày 2
      { day: 2, q: 'Nguyên tố hóa học nào có ký hiệu "Au"?', a: 'Bạc', b: 'Nhôm', c: 'Vàng', d: 'Đồng', correct: 'C', explain: 'Au (Aurum) là ký hiệu hóa học của Vàng.', order: 1 },
      { day: 2, q: 'Hành tinh nào gần Mặt Trời nhất?', a: 'Sao Kim', b: 'Sao Thủy', c: 'Trái Đất', d: 'Sao Hỏa', correct: 'B', explain: 'Sao Thủy (Mercury) là hành tinh gần Mặt Trời nhất.', order: 2 },
      { day: 2, q: 'Công thức hóa học của nước là gì?', a: 'CO2', b: 'NaCl', c: 'H2O', d: 'O2', correct: 'C', explain: 'H2O gồm 2 nguyên tử Hydro và 1 nguyên tử Oxy.', order: 3 },
      // Ngày 3
      { day: 3, q: 'Ai là tác giả "Truyện Kiều"?', a: 'Nguyễn Du', b: 'Nguyễn Trãi', c: 'Hồ Xuân Hương', d: 'Xuân Diệu', correct: 'A', explain: 'Nguyễn Du (1766-1820) là tác giả Truyện Kiều.', order: 1 },
      { day: 3, q: 'World Cup 2022 được tổ chức tại quốc gia nào?', a: 'Nga', b: 'Brazil', c: 'Qatar', d: 'Nhật Bản', correct: 'C', explain: 'FIFA World Cup 2022 tổ chức tại Qatar.', order: 2 },
      { day: 3, q: 'Loại vitamin nào có nhiều trong cam, chanh?', a: 'Vitamin A', b: 'Vitamin B', c: 'Vitamin C', d: 'Vitamin D', correct: 'C', explain: 'Cam, chanh chứa nhiều Vitamin C giúp tăng sức đề kháng.', order: 3 },
    ];

    for (const q of sampleQuestions) {
      const [dayRow] = await pool.execute('SELECT id FROM game_days WHERE day_number = ?', [q.day]);
      if (dayRow.length > 0) {
        await pool.execute(
          `INSERT IGNORE INTO questions (game_day_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, order_index)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [dayRow[0].id, q.q, q.a, q.b, q.c, q.d, q.correct, q.explain, q.order]
        );
      }
    }
    console.log('  ✅ Tạo 9 câu hỏi mẫu (ngày 1-3)');

    console.log('\n🎉 Seed dữ liệu hoàn tất!');
    console.log('\n📋 Tài khoản mẫu:');
    console.log('  Admin: admin@bvote.vn / admin123');
    console.log('  Player: player1@test.vn / player123');
  } catch (error) {
    console.error('\n❌ Lỗi seed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
