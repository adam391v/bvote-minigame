// Kích hoạt ngày 1 để test
const { pool } = require('./database');
(async () => {
  await pool.execute("UPDATE game_days SET status='ACTIVE' WHERE day_number=1");
  console.log('✅ Ngày 1 đã được kích hoạt (ACTIVE)');
  await pool.end();
})();
