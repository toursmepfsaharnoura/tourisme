const db = require('./config/db');

const ensureColumn = async (table, column, definition) => {
  const [results] = await db.query('SHOW COLUMNS FROM ?? LIKE ?', [table, column]);
  if (results.length === 0) {
    console.log(`Ajout de la colonne ${column} dans ${table}...`);
    await db.query(`ALTER TABLE ?? ADD COLUMN ${column} ${definition}`, [table]);
    console.log(`✅ Colonne ${column} ajoutée avec succès dans ${table}`);
  } else {
    console.log(`✅ Colonne ${column} existe déjà dans ${table}`);
  }
};

const ensureDatabaseSchema = async () => {
  console.log('Vérification des colonnes de la base de données...');

  await ensureColumn('utilisateurs', 'verification_code', 'VARCHAR(6) NULL');
  await ensureColumn('utilisateurs', 'verified', 'TINYINT(1) DEFAULT 0');
  await ensureColumn('plans_touristiques', 'capacite_max', 'INT NULL');
  await ensureColumn('plan_lieux', 'nom', 'VARCHAR(255) NULL');
  await ensureColumn('plan_lieux', 'description', 'TEXT NULL');
  await ensureColumn('plan_lieux', 'date_visite', 'DATE NULL');

  console.log('🎉 Configuration de la base de données terminée!');
};

if (require.main === module) {
  ensureDatabaseSchema()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Erreur configuration base de données:', err);
      process.exit(1);
    });
}

module.exports = { ensureDatabaseSchema };
