const Notification = require('../models/Notification');

exports.getAdminNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll();

    const type = req.query.type || 'ALL';

    let filtered = notifications;

    if (type !== 'ALL') {
      filtered = notifications.filter(n => n.type === type);
    }

    res.render('admin/notifications', {
      notifications: filtered,
      type
    });

  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
};

// Envoyer une notification à un guide spécifique
exports.sendToGuide = async (req, res) => {
  try {
    const io = req.app.get('io');
    const { guideId, message, type, planId, paymentId } = req.body;

    const notification = {
      id: Date.now(),
      message,
      type, // reply | plan | payment
      planId,
      paymentId,
      date: new Date(),
      read: false
    };

    // Envoyer uniquement au guide spécifique
    io.to('guide_' + guideId).emit('guide_notification', notification);

    // Optionnel: sauvegarder dans la base de données
    await Notification.create({
      id_utilisateur: guideId,
      type: type.toUpperCase(),
      contenu: JSON.stringify({
        message,
        planId,
        paymentId,
        fromAdmin: true
      })
    });

    res.json({ 
      success: true, 
      notification 
    });

  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification au guide:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'envoi de la notification' 
    });
  }
};

// Envoyer une notification à tous les guides
exports.sendToAllGuides = async (req, res) => {
  try {
    const io = req.app.get('io');
    const { message, type } = req.body;

    const notification = {
      id: Date.now(),
      message,
      type,
      date: new Date(),
      read: false
    };

    // Envoyer à tous les guides
    io.emit('guide_notification', notification);

    res.json({ 
      success: true, 
      notification 
    });

  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification à tous les guides:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'envoi de la notification' 
    });
  }
};

// Page des notifications pour les guides
exports.getGuideNotifications = async (req, res) => {
  try {
    const guideId = req.session.user?.id;
    
    if (!guideId) {
      return res.redirect('/auth/login');
    }

    const notifications = await Notification.findByUser(guideId, 50);
    
    res.render('guide/notifications', {
      guide: req.session.user,
      notifications
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des notifications du guide:', error);
    res.status(500).send("Erreur serveur");
  }
};