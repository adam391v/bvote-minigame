/**
 * Script setup database - Tạo database + user + chạy migration + seed
 */
const mysql = require('mysql2/promise');

const ROOT_PASSWORD = 'Anhvinh3901@';

async function setup() {
  console.log('🔧 Thiết lập database BVote...\n');

  try {
    // Bước 1: Kết nối root, tạo DB + user
    console.log('1️⃣  Kết nối MySQL root...');
    const rootConn = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: ROOT_PASSWORD
    });
    console.log('   ✅ Kết nối root thành công!');

    console.log('2️⃣  Tạo database bvotegame...');
    await rootConn.query('CREATE DATABASE IF NOT EXISTS bvotegame CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('   ✅ Database bvotegame đã sẵn sàng');

    console.log('3️⃣  Tạo user appuser...');
    await rootConn.query("CREATE USER IF NOT EXISTS 'appuser'@'localhost' IDENTIFIED BY '123456'");
    await rootConn.query("GRANT ALL PRIVILEGES ON bvotegame.* TO 'appuser'@'localhost'");
    await rootConn.query('FLUSH PRIVILEGES');
    console.log('   ✅ User appuser đã được tạo với quyền đầy đủ');

    await rootConn.end();
    console.log('\n🎉 Setup database hoàn tất!\n');
    console.log('Bây giờ hãy chạy:');
    console.log('  npm run migrate   (tạo bảng)');
    console.log('  npm run seed      (tạo dữ liệu mẫu)');
    console.log('  npm run dev       (khởi động server)\n');
  } catch (error) {
    console.error('\n❌ Lỗi:', error.message);
    console.error('\nKiểm tra:');
    console.error('  1. MySQL Server đang chạy?');
    console.error('  2. Mật khẩu root có đúng không?');
    process.exit(1);
  }
}

setup();
