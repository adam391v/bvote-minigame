/**
 * Cấu hình kết nối MySQL Database
 * Hỗ trợ Railway (MYSQL_URL / biến MYSQL*) và local (.env)
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

// Ưu tiên 1: Connection URI  (Railway cung cấp MYSQL_URL hoặc DATABASE_URL)
const connectionUri = process.env.MYSQL_URL || process.env.DATABASE_URL;

if (connectionUri) {
  console.log('📦 Kết nối MySQL qua Connection URI');
  pool = mysql.createPool(connectionUri);
} else {
  // Ưu tiên 2: Biến riêng lẻ (Railway tự inject MYSQLHOST, MYSQLUSER, ...)
  const config = {
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT) || 3306,
    user: process.env.DB_USER || process.env.MYSQLUSER || 'appuser',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '123456',
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'bvotegame',
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    charset: 'utf8mb4'
  };
  console.log(`📦 Kết nối MySQL qua host: ${config.host}:${config.port} / db: ${config.database}`);
  pool = mysql.createPool(config);
}

/**
 * Kiểm tra kết nối database
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Kết nối MySQL thành công!');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Lỗi kết nối MySQL:', error.message);
    return false;
  }
}

module.exports = { pool, testConnection };
