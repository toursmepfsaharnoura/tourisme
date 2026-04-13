const db = require('./backend/config/db');
(async () => {
  try {
    const [rows] = await db.query('SELECT * FROM plan_lieux WHERE id_plan = ?', [26]);
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
