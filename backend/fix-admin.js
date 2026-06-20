const bcrypt = require('bcrypt');
const pool = require('./db');

async function fixAdminPassword() {
  const hash = await bcrypt.hash('admin123', 10);
  await pool.query(
    `UPDATE users SET password = $1 WHERE email = 'admin@shivfurniture.com'`,
    [hash]
  );
  console.log('✅ Admin password updated to: admin123');
  console.log('Hash:', hash);
  await pool.end();
}

fixAdminPassword().catch(console.error);
