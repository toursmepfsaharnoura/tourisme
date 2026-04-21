const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "tourisme_tn",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0

});

// Test de connexion réel
const testConnection = async () => {
  try {
    const connection = await db.getConnection();
    await connection.ping(); // Test réel de la connexion
    await connection.query('SELECT 1'); // Test de requête
    connection.release();
    console.log("✅ Connecté à tourisme_tn - Test de connexion réussi");
    return true;
  } catch (error) {
    console.error("❌ Erreur de connexion à MySQL:", error.message);
    console.error("Code erreur:", error.code);
    return false;
  }
};

// Exporter la base de données et la fonction de test
module.exports = db;
module.exports.testConnection = testConnection;