const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { verifUser } = require('../middlewares/auth');

// Middleware pour vérifier que l'utilisateur est connecté
router.use(verifUser);

// Routes principales de messagerie
router.get('/', messageController.getConversations);                    // Liste des conversations
router.post('/', messageController.sendMessage);                       // Envoyer un message (sans fichier)
router.post('/send', messageController.uploadMessageFile, messageController.sendMessage); // Envoyer un message (avec fichier)
router.get('/search', messageController.searchMessages);              // Rechercher des messages
router.get('/unread-count', messageController.getUnreadCount);        // Nombre de messages non lus
router.get('/unread/count', messageController.getUnreadCount);        // Nombre de messages non lus (alternative)

// Routes spécifiques à une conversation
router.get('/:userId', messageController.getConversation);             // Conversation spécifique
router.get('/:userId/new', messageController.getNewMessages);         // Messages nouveaux (real-time)
router.get('/:userId/stats', messageController.getConversationStats); // Statistiques de conversation

// Routes de gestion de messages
router.delete('/:id', messageController.deleteMessage);               // Supprimer un message
router.put('/:id/read', messageController.markAsRead);               // Marquer comme lu

module.exports = router;
