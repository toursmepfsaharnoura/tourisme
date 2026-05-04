const db = require('./backend/config/db');

async function checkMessages() {
  try {
    // Vérifier si la table messages existe
    const [tables] = await db.query('SHOW TABLES LIKE "messages"');
    console.log('Table messages existe:', tables.length > 0);
    
    if (tables.length > 0) {
      // Compter les messages
      const [countResult] = await db.query('SELECT COUNT(*) as count FROM messages');
      console.log('Nombre total de messages:', countResult[0].count);
      
      // Afficher quelques messages
      const [messages] = await db.query('SELECT * FROM messages ORDER BY date_creation DESC LIMIT 5');
      console.log('Derniers messages:', messages);
      
      // Vérifier les utilisateurs
      const [users] = await db.query('SELECT id, nom_complet, role FROM utilisateurs LIMIT 5');
      console.log('Utilisateurs disponibles:', users);
      
      // Vérifier les guides
      const [guides] = await db.query('SELECT u.id, u.nom_complet, g.statut FROM utilisateurs u LEFT JOIN guides g ON u.id = g.id_utilisateur WHERE u.role = "GUIDE" LIMIT 5');
      console.log('Guides disponibles:', guides);
    }
  } catch (err) {
    console.error('Erreur:', err);
  }
  process.exit();
}

checkMessages();
