const db = require('./backend/config/db');

async function setupFavorites() {
  try {
    console.log('Creating favoris table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS favoris (
        id int NOT NULL AUTO_INCREMENT,
        id_touriste int NOT NULL,
        id_plan int NOT NULL,
        date_ajout timestamp DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY unique_favorite (id_touriste, id_plan),
        KEY id_touriste (id_touriste),
        KEY id_plan (id_plan)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await db.query(createTableSQL);
    console.log('✅ Table favoris créée avec succès!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur lors de la création de la table:', err);
    process.exit(1);
  }
}

setupFavorites();
