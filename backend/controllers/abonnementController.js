const Abonnement = require('../models/Abonnement');

const Guide = require('../models/Guide');

const User = require('../models/User');



/**

 * Get subscription details for a guide

 */

exports.getSubscription = async (req, res) => {

  const guideId = req.session.user.id;



  try {

    const guide = await Guide.findByUserId(guideId);

    const abonnement = await Abonnement.findByGuide(guideId);



    res.render('guide/abonnement', {

      user: req.session.user,

      guide,

      abonnement,

      isSubscribed: guide.abonnement_actif === 1,

      layout: 'minimal'

    });

  } catch (err) {

    console.error('Error getting subscription:', err);

    res.status(500).send('Server error');

  }

};



/**

 * Activate subscription for a guide

 */

exports.activateSubscription = async (req, res) => {

  const guideId = req.session.user.id;

  const { type_abonnement, duree } = req.body;



  try {

    // Update guide subscription status

    await Guide.update(guideId, {

      abonnement_actif: 1

    });



    // Create subscription record

    const abonnementId = await Abonnement.create({

      id_guide: guideId,

      type_abonnement,

      duree,

      date_debut: new Date(),

      statut: 'ACTIF'

    });



    res.json({ success: true, abonnementId });

  } catch (err) {

    console.error('Error activating subscription:', err);

    res.status(500).json({ error: 'Server error' });

  }

};



/**

 * Get payment page

 */

exports.getPayment = async (req, res) => {

  const guideId = req.session.user.id;



  try {

    const guide = await Guide.findByUserId(guideId);



    res.render('guide/paiement', {

      user: req.session.user,

      guide,

      layout: 'minimal'

    });

  } catch (err) {

    console.error('Error getting payment page:', err);

    res.status(500).send('Server error');

  }

};



/**

 * Process payment

 */

exports.processPayment = async (req, res) => {

  const guideId = req.session.user.id;



  try {

    // ✅ تاريخ البداية

    const dateDebut = new Date();



    // ✅ تاريخ النهاية (30 يوم)

    const dateFin = new Date();

dateFin.setDate(dateFin.getDate() + 30);



// Formater la date en YYYY-MM-DD

const year = dateFin.getFullYear();

const month = String(dateFin.getMonth() + 1).padStart(2, '0');

const day = String(dateFin.getDate()).padStart(2, '0');

const dateFinStr = `${year}-${month}-${day}`;



console.log("📅 Date de fin d'abonnement formatée :", dateFinStr);



await Guide.update(guideId, {

  abonnement_actif: 1,

  abonnement_fin: dateFinStr

});



// Vérification immédiate

const updatedGuide = await Guide.findByUserId(guideId);

console.log("✅ Après update, abonnement_fin =", updatedGuide.abonnement_fin);



    // ✅ إنشاء abonnement

    await Abonnement.create({

      id_guide: guideId,

      date_debut: dateDebut,

      date_fin: dateFin,

      statut: 'ACTIF'

    });



    console.log("✅ abonnement activé");



    res.redirect('/guide/dashboard');



  } catch (err) {

    console.error('❌ ERROR PAYMENT:', err);

    res.send("Erreur paiement");

  }

};



/**

 * Cancel subscription

 */

exports.cancelSubscription = async (req, res) => {

  const guideId = req.session.user.id;



  try {

    // Update guide subscription status

    await Guide.update(guideId, {

      abonnement_actif: 0

    });



    // Update subscription record

    await Abonnement.updateByGuide(guideId, {

      statut: 'ANNULE',

      date_fin: new Date()

    });



    res.json({ success: true });

  } catch (err) {

    console.error('Error canceling subscription:', err);

    res.status(500).json({ error: 'Server error' });

  }

};



/**

 * Get subscription history

 */

exports.getSubscriptionHistory = async (req, res) => {

  const guideId = req.session.user.id;



  try {

    const abonnements = await Abonnement.findByGuide(guideId);



    res.render('guide/abonnement-history', {

      user: req.session.user,

      abonnements,

      layout: 'minimal'

    });

  } catch (err) {

    console.error('Error getting subscription history:', err);

    res.status(500).send('Server error');

  }

};

