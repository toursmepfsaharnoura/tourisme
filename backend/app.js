require('dotenv').config();
const express = require('express');
const http = require('http');
const { engine } = require('express-handlebars');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
// Connexion DB (sera utilisée par les modèles)
require('./config/db');
const { ensureDatabaseSchema } = require('./setup_database');
const { initSocket } = require('./config/socket');

// Import des routeurs
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const guideRoutes = require('./routes/guide');
const adminRoutes = require('./routes/admin');
const touristeRoutes = require('./routes/touriste');
const methodOverride = require('method-override');
const reservationRoutes = require('./routes/reservation'); 
const planRoutes = require('./routes/plan');
const avisRoutes = require('./routes/avis');
const abonnementRoutes = require('./routes/abonnement');
const messageRoutes = require('./routes/messages');
const delegationRoutes = require('./routes/delegation');
const gouvernoratRoutes = require('./routes/gouvernorat');
const planLieuRoutes = require('./routes/planLieu');
const paiementRoutes = require('./routes/paiement');
const homeRoutes = require('./routes/home');
const notificationRoutes = require('./routes/notifications');
const aiRoutes = require('./routes/ai');
const plansPublicRoutes = require('./routes/plans-public'); 

const app = express();
const server = http.createServer(app);

// Helpers Handlebars
const helpers = require('./utils/helpers');

// Configuration du moteur de vue
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, '../frontend/views/layouts'),
  partialsDir: path.join(__dirname, '../frontend/views/partials'),
  helpers: helpers
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, '../frontend/views'));
app.use(methodOverride('_method'));
// Middlewares standards
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '../frontend/public/uploads')));
app.use(cors());

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'ton_secret_super_secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Middleware pour injecter l'utilisateur dans les vues et req
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Fix req.user undefined issue
  if (req.session.user) {
    req.user = req.session.user;
  }
  
  next();
});

initSocket(server);

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/', homeRoutes);

app.use('/guide', guideRoutes);
app.use('/admin', adminRoutes);
app.use('/touriste', touristeRoutes);
app.use('/', planRoutes); // Mount planRoutes without prefix to handle /guide/create-plan directly

app.use('/avis', avisRoutes);
app.use('/abonnement', abonnementRoutes);

app.use('/messages', messageRoutes);
app.use('/delegations', delegationRoutes);
app.use('/gouvernorats', gouvernoratRoutes);
app.use('/plan-lieux', planLieuRoutes);
app.use('/paiements', paiementRoutes);
app.use('/reservations', reservationRoutes);
app.use('/notifications', notificationRoutes);
app.use('/ai', aiRoutes);
app.use('/plans', plansPublicRoutes);

// Import db for messages-data route
const db = require('./config/db');
app.get('/guide/messages-data', require('./middlewares/auth').verifUser, async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json([]);
    
    const [rows] = await db.query(
      'SELECT * FROM messages WHERE id_destinataire = ? ORDER BY date_creation DESC',
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

// Gestion 404
app.use((req, res) => {
  res.status(404).render('404', { url: req.originalUrl });
});

app.use((err, req, res, next) => {
  console.error(' ERREUR COMPLETE:', err.stack); // hethi taffich kol chy
  console.error(' ERREUR COMPLETE:', err.stack); // hethi taffich kol chy
  console.error('🔥 ERREUR COMPLETE:', err.stack); // hethi taffich kol chy
  res.status(500).send('Erreur: ' + err.message); // tbadl render b send bech tchouf l'erreur brute
});
// Gestion des erreurs 500
app.use((err, req, res, next) => {
  console.error('ERREUR:', err);
  res.status(500).render('500', { error: err.message });
});

const PORT = process.env.PORT || 3002;
// Démarrer le serveur avec test de connexion
const startServer = async () => {
  try {
    // Vérifier le schéma de la base de données
    await ensureDatabaseSchema();

    // Importer et tester la connexion DB
    const db = require('./config/db');
    const isConnected = await db.testConnection();
    
    if (!isConnected) {
      console.error(' Impossible de démarrer le serveur sans connexion à la base de données');
      process.exit(1);
    }
    
    // Démarrer le serveur
    server.listen(PORT, () => {
      console.log(`? Serveur démarré sur http://localhost:${PORT} avec Socket.IO`);
    });
    
  } catch (error) {
    console.error(' Erreur critique au démarrage:', error);
    process.exit(1);
  }
};

startServer();