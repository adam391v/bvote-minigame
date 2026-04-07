/**
 * Cấu hình kết nối MySQL Database
 * Sử dụng mysql2 với connection pool để tối ưu hiệu suất
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

let dbConfig = {
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

// Nếu Railway truyền một Connection String dạng URL (ưu tiên)
const connectionUri = process.env.MYSQL_URL || process.env.DATABASE_URL;
if (connectionUri) {
  dbConfig = {
    uri: connectionUri,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    charset: 'utf8mb4'
  };
}

const pool = mysql.createPool(dbConfig);

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
