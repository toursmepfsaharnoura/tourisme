const db = require('./backend/config/db');
const Plan = require('./backend/models/Plan');
(async () => {
  try {
    await db.testConnection();
    console.log('DB OK');
    const plan = await Plan.getFullDetails(26);
    console.log('PLAN', JSON.stringify(plan, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
