const { pool } = require('./db');

(async () => {
  try {
    const [result] = await pool.query('SELECT 1');
    console.log("DB connection successful:", result);
  } catch (error) {
    console.error("DB connection error:", error);
  } finally {
    process.exit();
  }
})();
