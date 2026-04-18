require('dotenv').config();
const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Connexion DB (sera utilisÃ©e par les modÃ¨les)
require('./config/db');

// Import des routeurs
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const guideRoutes = require('./routes/guide');
const adminRoutes = require('./routes/admin');
const touristeRoutes = require('./routes/touriste');
const planRoutes = require('./routes/plan');
const reservationRoutes = require('./routes/reservation');
const avisRoutes = require('./routes/avis');
const abonnementRoutes = require('./routes/abonnement');
const messageRoutes = require('./routes/message');
const notificationRoutes = require('./routes/notification');
const delegationRoutes = require('./routes/delegation');
const gouvernoratRoutes = require('./routes/gouvernorat');
const paiementRoutes = require('./routes/paiement');
const accueilRoutes = require('./routes/accueil');

const app = express();

// Helpers Handlebars
const helpers = require('./utils/helpers');

// Configuration du moteur de vue
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, '../frontend/views/layouts'),
  partialsDir: [
    path.join(__dirname, '../frontend/views/partials'),
    path.join(__dirname, '../frontend/views/auth'),
    path.join(__dirname, '../frontend/views/admin'),
    path.join(__dirname, '../frontend/views/guide'),
    path.join(__dirname, '../frontend/views/touriste'),
    path.join(__dirname, '../frontend/views/plans'),
    path.join(__dirname, '../frontend/views/messages')
  ],
  helpers: helpers
}));
app.set('view engine', 'hbs');
app.set('views', [
  path.join(__dirname, '../frontend/views'),
  path.join(__dirname, '../frontend/views/auth'),
  path.join(__dirname, '../frontend/views/errors'),
  path.join(__dirname, '../frontend/views/public'),
  path.join(__dirname, '../frontend/views/admin'),
  path.join(__dirname, '../frontend/views/guide'),
  path.join(__dirname, '../frontend/views/touriste'),
  path.join(__dirname, '../frontend/views/plans'),
  path.join(__dirname, '../frontend/views/messages')
]);

// Middlewares standards
app.use(express.urlencoded({ extended: true })); // Changed to true for better compatibility
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

// Middleware pour injecter l'utilisateur dans les vues
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isDevelopment = process.env.NODE_ENV !== 'production';
  next();
});

// Debug middleware for all incoming requests
app.use((req, res, next) => {
  console.log('=== DEBUG: Incoming Request ===');
  console.log('URL:', req.url);
  console.log('Headers:', req.headers);
  console.log('Content-Type:', req.get('Content-Type'));
  console.log('Body keys:', Object.keys(req.body));
  console.log('Body:', req.body);
  console.log('Files:', req.files || req.file);
  console.log('=====================================');
  next();
});

// Routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/', accueilRoutes);
app.use('/guide', guideRoutes);
app.use('/admin', adminRoutes);
app.use('/touriste', touristeRoutes);
app.use('/', planRoutes); // Mount planRoutes without prefix to handle /guide/create-plan directly
app.use('/reservations', reservationRoutes);
app.use('/avis', avisRoutes);
app.use('/abonnement', abonnementRoutes);
app.use('/messages', messageRoutes);
app.use('/notifications', notificationRoutes);
app.use('/delegations', delegationRoutes);
app.use('/gouvernorats', gouvernoratRoutes);
app.use('/paiements', paiementRoutes);

// Gestion 404
app.use((req, res) => {
  res.status(404).render('errors/404', { url: req.originalUrl });
});

// Gestion des erreurs 500
app.use((err, req, res, next) => {
  console.error('ERREUR:', err);
  res.status(500).render('errors/500', { error: err.message });
});

const PORT = process.env.PORT || 3002;

// DÃ©marrer le serveur avec test de connexion et Socket.IO
const startServer = async () => {
  try {
    // Importer et tester la connexion DB
    const db = require('./config/db');
    const isConnected = await db.testConnection();
    
    if (!isConnected) {
      console.error('Impossible de dÃ©marrer le serveur sans connexion Ã  la base de donnÃ©es');
      process.exit(1);
    }
    
    // CrÃ©er le serveur HTTP pour Socket.IO
    const server = http.createServer(app);
    
    // Configuration Socket.IO
    const io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    // Gestion des connexions Socket.IO
    io.on('connection', (socket) => {
      console.log('Nouvelle connexion Socket.IO:', socket.id);
      
      // Quand un guide se connecte
      socket.on('joinGuide', (guideId) => {
        socket.join('guide_' + guideId);
        console.log('Guide ' + guideId + ' rejoint la room guide_' + guideId);
      });
      
      // Quand un admin se connecte
      socket.on('joinAdmin', () => {
        socket.join('adminRoom');
        console.log('Admin rejoint la room adminRoom');
      });
      
      // Quand un utilisateur se dÃ©connecte
      socket.on('disconnect', () => {
        console.log('Utilisateur dÃ©connectÃ©:', socket.id);
      });
    });
    
    // Rendre io disponible pour les autres modules
    app.set('io', io);
    
    // DÃ©marrer le serveur
    server.listen(PORT, () => {
      console.log(`Serveur dÃ©marrÃ© sur http://localhost:${PORT}`);
      console.log('Socket.IO activÃ© pour les notifications temps rÃ©el');
      console.log('Routes disponibles:');
      console.log('   - GET  /');
      console.log('   - GET  /delegation/:id');
      console.log('   - GET  /guides');
      console.log('   - GET  /gouvernorats/:id/delegations');
      console.log('   - POST /inscription');
      console.log('   - POST /login');
    });
    
  } catch (error) {
    console.error('Erreur critique au dÃ©marrage:', error);
    process.exit(1);
  }
};

startServer();

// Serveur API sÃ©parÃ© pour les notifications
const apiApp = express();
apiApp.use(cors());
apiApp.use(express.json());

// Routes API pour les notifications
apiApp.use('/api/notifications', notificationRoutes);

// DÃ©marrer le serveur API sur le port 3000
apiApp.listen(3000, () => {
  console.log('Backend API running on http://localhost:3000');
  console.log('API Notifications disponibles sur /api/notifications');
});

