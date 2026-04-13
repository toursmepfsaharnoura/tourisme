const db = require('./backend/config/db');

async function checkDatabaseSchema() {
  try {
    console.log('Checking plans_touristiques table schema...');
    
    const [columns] = await db.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'tourisme_tn' 
      AND TABLE_NAME = 'plans_touristiques'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Current columns in plans_touristiques:');
    columns.forEach(col => {
      console.log(`- ${col.COLUMN_NAME} (${col.DATA_TYPE}, ${col.IS_NULLABLE})`);
    });
    
    // Check for required new columns
    const requiredColumns = ['max_participants', 'id_gouvernorat', 'id_delegation', 'image'];
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('\nMissing columns:', missingColumns);
      console.log('You need to run the SQL migration: update_plans_touristiques_table.sql');
    } else {
      console.log('\nAll required columns exist!');
    }
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    process.exit(0);
  }
}

checkDatabaseSchema();
