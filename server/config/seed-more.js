/**
 * Seed thêm câu hỏi cho ngày 4–10 (mỗi ngày 3 câu)
 * Chạy: node server/config/seed-more.js
 */
const { pool } = require('./database');

const moreQuestions = [
  // Ngày 4 - Lịch sử
  { day: 4, questions: [
    { text: 'Ai là vị vua đầu tiên của nhà Lý?', a: 'Lý Thái Tổ', b: 'Lý Thái Tông', c: 'Lý Nhân Tông', d: 'Lý Thánh Tông', correct: 'A', explain: 'Lý Thái Tổ (Lý Công Uẩn) lên ngôi năm 1009.' },
    { text: 'Trận Bạch Đằng năm 938 do ai chỉ huy?', a: 'Trần Hưng Đạo', b: 'Ngô Quyền', c: 'Lê Lợi', d: 'Quang Trung', correct: 'B', explain: 'Ngô Quyền đánh tan quân Nam Hán trên sông Bạch Đằng.' },
    { text: 'Năm nào Việt Nam giành độc lập từ Pháp?', a: '1944', b: '1945', c: '1946', d: '1954', correct: 'B', explain: 'Cách mạng tháng Tám 1945.' }
  ]},
  // Ngày 5 - Khoa học
  { day: 5, questions: [
    { text: 'Nguyên tố hóa học nào có ký hiệu "Fe"?', a: 'Vàng', b: 'Bạc', c: 'Sắt', d: 'Đồng', correct: 'C', explain: 'Fe là ký hiệu của Sắt (Ferrum).' },
    { text: 'Hành tinh nào gần Mặt Trời nhất?', a: 'Kim Tinh', b: 'Thủy Tinh', c: 'Trái Đất', d: 'Hỏa Tinh', correct: 'B', explain: 'Thủy Tinh (Mercury) nằm gần Mặt Trời nhất.' },
    { text: 'Tốc độ ánh sáng xấp xỉ bao nhiêu km/s?', a: '150,000', b: '200,000', c: '300,000', d: '400,000', correct: 'C', explain: 'Ánh sáng di chuyển khoảng 300,000 km/s.' }
  ]},
  // Ngày 6 - Văn hóa & Nghệ thuật
  { day: 6, questions: [
    { text: 'Ai là tác giả "Truyện Kiều"?', a: 'Nguyễn Du', b: 'Hồ Xuân Hương', c: 'Nguyễn Trãi', d: 'Xuân Diệu', correct: 'A', explain: 'Nguyễn Du viết Truyện Kiều (Đoạn trường tân thanh).' },
    { text: 'Nhã nhạc cung đình Huế được UNESCO công nhận năm?', a: '2001', b: '2003', c: '2005', d: '2007', correct: 'B', explain: 'Được công nhận là Di sản văn hóa phi vật thể năm 2003.' },
    { text: 'Áo dài Việt Nam có nguồn gốc từ thời kỳ nào?', a: 'Nhà Trần', b: 'Nhà Lê', c: 'Nhà Nguyễn', d: 'Chúa Nguyễn', correct: 'D', explain: 'Áo dài bắt nguồn từ thời chúa Nguyễn Phúc Khoát (thế kỷ 18).' }
  ]},
  // Ngày 7 - Công nghệ
  { day: 7, questions: [
    { text: 'AI là viết tắt của?', a: 'Auto Intelligence', b: 'Artificial Intelligence', c: 'Automated Information', d: 'Applied Intelligence', correct: 'B', explain: 'AI = Artificial Intelligence (Trí tuệ nhân tạo).' },
    { text: 'WWW là viết tắt của?', a: 'World Wide Web', b: 'World Web Width', c: 'Wide World Web', d: 'Web Wide World', correct: 'A', explain: 'World Wide Web - mạng toàn cầu.' },
    { text: 'Ngôn ngữ lập trình nào phổ biến nhất thế giới?', a: 'Java', b: 'Python', c: 'JavaScript', d: 'C++', correct: 'C', explain: 'JavaScript phổ biến nhất theo Stack Overflow Survey.' }
  ]},
  // Ngày 8 - Thể thao
  { day: 8, questions: [
    { text: 'World Cup bóng đá tổ chức mấy năm một lần?', a: '2 năm', b: '3 năm', c: '4 năm', d: '5 năm', correct: 'C', explain: 'FIFA World Cup tổ chức 4 năm/lần.' },
    { text: 'Ai là vận động viên bơi lội giành nhiều HCV Olympic nhất?', a: 'Ian Thorpe', b: 'Michael Phelps', c: 'Ryan Lochte', d: 'Mark Spitz', correct: 'B', explain: 'Michael Phelps giành 23 HCV Olympic.' },
    { text: 'Môn thể thao nào có thuật ngữ "ace"?', a: 'Bóng đá', b: 'Bóng rổ', c: 'Tennis', d: 'Bơi lội', correct: 'C', explain: '"Ace" là giao bóng trực tiếp ghi điểm trong Tennis.' }
  ]},
  // Ngày 9 - Ẩm thực
  { day: 9, questions: [
    { text: 'Phở Việt Nam có nguồn gốc từ vùng nào?', a: 'Miền Trung', b: 'Miền Nam', c: 'Miền Bắc', d: 'Tây Nguyên', correct: 'C', explain: 'Phở có nguồn gốc từ Nam Định - Hà Nội.' },
    { text: 'Nước mắm Việt Nam nổi tiếng nhất đến từ đâu?', a: 'Phú Quốc', b: 'Nha Trang', c: 'Phan Thiết', d: 'Cà Mau', correct: 'A', explain: 'Nước mắm Phú Quốc được bảo hộ chỉ dẫn địa lý châu Âu.' },
    { text: 'Bánh mì Việt Nam lọt top ngon nhất thế giới theo?', a: 'CNN', b: 'BBC', c: 'TripAdvisor', d: 'Tất cả', correct: 'D', explain: 'Bánh mì Việt Nam được nhiều trang ẩm thực quốc tế vinh danh.' }
  ]},
  // Ngày 10 - Toán & Logic
  { day: 10, questions: [
    { text: '2^10 bằng bao nhiêu?', a: '512', b: '1024', c: '2048', d: '256', correct: 'B', explain: '2 mũ 10 = 1024.' },
    { text: 'Số Pi (π) xấp xỉ bằng?', a: '3.12', b: '3.14', c: '3.16', d: '3.18', correct: 'B', explain: 'Pi ≈ 3.14159265...' },
    { text: 'Tam giác có 3 cạnh bằng nhau gọi là gì?', a: 'Tam giác cân', b: 'Tam giác vuông', c: 'Tam giác đều', d: 'Tam giác thường', correct: 'C', explain: 'Tam giác đều có 3 cạnh và 3 góc bằng nhau.' }
  ]}
];

async function seedMore() {
  console.log('🌱 Thêm câu hỏi cho ngày 4-10...\n');

  for (const dayData of moreQuestions) {
    // Lấy game_day_id
    const [days] = await pool.execute('SELECT id FROM game_days WHERE day_number = ?', [dayData.day]);
    if (days.length === 0) {
      console.log(`  ⚠️  Không tìm thấy ngày ${dayData.day}`);
      continue;
    }
    const dayId = days[0].id;

    // Kiểm tra đã có câu hỏi chưa
    const [existing] = await pool.execute('SELECT COUNT(*) as cnt FROM questions WHERE game_day_id = ?', [dayId]);
    if (existing[0].cnt > 0) {
      console.log(`  ⏭️  Ngày ${dayData.day} đã có ${existing[0].cnt} câu hỏi, bỏ qua`);
      continue;
    }

    for (let i = 0; i < dayData.questions.length; i++) {
      const q = dayData.questions[i];
      await pool.execute(
        `INSERT INTO questions (game_day_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, order_index)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [dayId, q.text, q.a, q.b, q.c, q.d, q.correct, q.explain, i + 1]
      );
    }
    console.log(`  ✅ Ngày ${dayData.day}: ${dayData.questions.length} câu hỏi`);
  }

  console.log('\n🎉 Seed thêm hoàn tất!');
  await pool.end();
}

seedMore().catch(e => { console.error(e); process.exit(1); });
