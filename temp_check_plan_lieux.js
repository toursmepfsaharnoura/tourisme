const db = require('./backend/config/db');
(async () => {
  try {
    const planId = 27;
    const [rows] = await db.query('SELECT * FROM plan_lieux WHERE id_plan = ?', [planId]);
    console.log('rows for plan', planId, JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
