const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Guide = require('../models/Guide');
const Touriste = require('../models/Touriste');
const transporter = require("../config/email");


exports.postInscription = async (req, res) => {

  const nom_complet = req.body.nom_complet || "Utilisateurs"; 
  const email = req.body.email;
  const mot_de_passe = req.body.mot_de_passe;
  const role = req.body.role || "TOURISTE";

  const code = Math.floor(100000 + Math.random() * 900000);

  try {

    const existing = await User.findByEmail(email);

    if (existing) {
      return res.json({
        success: false,
        message: "Email existe déjà"
      });
    }

    const hash = await bcrypt.hash(mot_de_passe, 10);

    const userId = await User.create({
      nom_complet,
      email,
      mot_de_passe: hash,
      role,
      verification_code: code
    });

    if (role === "GUIDE") {
      await Guide.create(userId);
    } else {
      await Touriste.create(userId);
    }

    await transporter.sendMail({
      from: `"Découvrez Tunisie" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Code de vérification Découvrez Tunisie",

      html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code de vérification – Découvrez Tunisie</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:#0d1f1a;font-family:'Jost',sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d1f1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header ornement -->
          <tr>
            <td align="center" style="padding-bottom:8px;">
              <div style="color:#c9a84c;font-size:28px;letter-spacing:12px;font-family:'Cormorant Garamond',serif;">✦ ✦ ✦</div>
            </td>
          </tr>

          <!-- Logo / titre -->
          <tr>
            <td align="center" style="padding-bottom:4px;">
              <h1 style="margin:0;font-family:'Cormorant Garamond',serif;font-size:42px;font-weight:700;color:#f5ede0;letter-spacing:3px;">Découvrez</h1>
              <h2 style="margin:0;font-family:'Jost',sans-serif;font-size:14px;font-weight:300;color:#c9a84c;letter-spacing:10px;text-transform:uppercase;">Tunisie</h2>
            </td>
          </tr>

          <!-- Séparateur doré -->
          <tr>
            <td align="center" style="padding:20px 0 32px;">
              <div style="width:80px;height:1px;background:linear-gradient(90deg,transparent,#c9a84c,transparent);display:inline-block;"></div>
            </td>
          </tr>

          <!-- Carte principale -->
          <tr>
            <td>
              <div style="background:linear-gradient(160deg,#1a2e26 0%,#142219 100%);border:1px solid #2e4a3a;border-radius:16px;overflow:hidden;">

                <!-- Bandeau image paysage -->
                <div style="background:linear-gradient(135deg,#1e3d2f 0%,#2d5a3d 40%,#c9a84c 100%);height:8px;"></div>

                <!-- Corps du mail -->
                <div style="padding:48px 48px 40px;">

                  <!-- Icône guide -->
                  <div style="text-align:center;margin-bottom:32px;">
                    <div style="display:inline-block;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.35);border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;">🧭</div>
                  </div>

                  <!-- Titre principal -->
                  <h2 style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;color:#f5ede0;text-align:center;margin:0 0 8px;">Bienvenue parmi nos Guides</h2>
                  <p style="font-family:'Jost',sans-serif;font-size:13px;color:#c9a84c;text-align:center;letter-spacing:4px;text-transform:uppercase;margin:0 0 32px;">Votre aventure commence ici</p>

                  <!-- Message de bienvenue -->
                  <p style="font-family:'Jost',sans-serif;font-size:15px;line-height:1.8;color:#a8c0b0;margin:0 0 16px;">
                    Cher(e) <strong style="color:#f5ede0;">${nom_complet}</strong>,
                  </p>
                  <p style="font-family:'Jost',sans-serif;font-size:15px;line-height:1.8;color:#a8c0b0;margin:0 0 32px;">
                    Nous sommes honorés de vous accueillir au sein de la famille <strong style="color:#f5ede0;">Découvrez Tunisie</strong>. En tant que guide, vous incarnerez l'âme de notre pays — ses médinas ancestrales, ses déserts dorés, ses côtes turquoise — pour des voyageurs en quête d'authenticité.
                  </p>

                  <!-- Séparateur -->
                  <div style="border-top:1px solid #2e4a3a;margin:0 0 32px;"></div>

                  <!-- Bloc code -->
                  <p style="font-family:'Jost',sans-serif;font-size:12px;color:#c9a84c;letter-spacing:4px;text-transform:uppercase;text-align:center;margin:0 0 20px;">Votre code de vérification</p>

                  <div style="background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.3);border-radius:12px;padding:28px 20px;text-align:center;margin:0 0 32px;position:relative;">
                    <div style="font-family:'Cormorant Garamond',serif;font-size:56px;font-weight:700;color:#c9a84c;letter-spacing:16px;line-height:1;">${code}</div>
                    <p style="font-family:'Jost',sans-serif;font-size:12px;color:#6a8a76;margin:12px 0 0;letter-spacing:1px;">Ce code expire dans <strong style="color:#a8c0b0;">15 minutes</strong></p>
                  </div>

                  <!-- Instructions -->
                  <p style="font-family:'Jost',sans-serif;font-size:14px;line-height:1.7;color:#6a8a76;text-align:center;margin:0 0 32px;">
                    Entrez ce code dans l'application pour activer votre compte et débuter votre parcours de guide officiel.
                  </p>

                  <!-- Séparateur -->
                  <div style="border-top:1px solid #2e4a3a;margin:0 0 32px;"></div>

                  <!-- Message de remerciement -->
                  <p style="font-family:'Jost',sans-serif;font-size:14px;line-height:1.8;color:#a8c0b0;margin:0 0 8px;">
                    Merci de faire confiance à <strong style="color:#f5ede0;">Découvrez Tunisie</strong>. Votre expertise et votre passion contribueront à faire rayonner les merveilles de notre pays à travers le monde. Nous sommes impatients de construire avec vous des expériences inoubliables.
                  </p>

                  <p style="font-family:'Cormorant Garamond',serif;font-size:18px;color:#c9a84c;font-style:italic;text-align:right;margin:24px 0 0;">
                    L'équipe Découvrez Tunisie
                  </p>

                </div>

                <!-- Footer bandeau bas -->
                <div style="background:rgba(0,0,0,0.25);padding:24px 48px;border-top:1px solid #2e4a3a;">
                  <p style="font-family:'Jost',sans-serif;font-size:11px;color:#3d5c4a;text-align:center;margin:0;line-height:1.6;">
                    Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.<br>
                    © 2025 Découvrez Tunisie — Tous droits réservés
                  </p>
                </div>

              </div>
            </td>
          </tr>

          <!-- Ornement bas -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <div style="color:#2e4a3a;font-size:22px;letter-spacing:10px;">✦ ✦ ✦</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`
    });

    console.log("Email envoyé à ", email);

    res.json({
      success: true,
      message: "Inscription réussie. Code envoyé par email"
    });

  } catch (error) {

    console.log("Erreur inscription:", error);

    res.json({
      success: false,
      message: "Erreur serveur"
    });

  }
};
exports.getLogin = (req, res) => {
  res.render('login');
};

exports.postLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.render('login', { error: 'Veuillez remplir tous les champs' });
  }

  try {
    const user = await User.findByEmail(email);
    if (!user) {
      return res.render('login', { error: 'Email ou mot de passe incorrect' });
    }

    const match = bcrypt.compareSync(password, user.mot_de_passe);
    if (!match) {
      return res.render('login', { error: 'Mot de passe incorrect' });
    }

    req.session.user = {
      id: user.id,
      nom_complet: user.nom_complet,
      email: user.email,
      role: user.role,
      photo_profil: user.photo_profil
    };

    if (user.role === 'TOURISTE') res.redirect('/touriste/plans');
    else if (user.role === 'GUIDE') res.redirect('/guide/dashboard');
    else res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
};

exports.getRegister = (req, res) => {
  res.render('inscription');
};

// exports.postInscription = async (req, res) => {
//   const nom_complet = req.body.nomcomplet || 'Utilisateur';
//   const email = req.body.email;
//   const mot_de_passe = req.body.motdepasse;
//   const role = req.body.role || 'TOURISTE';
//   const code = Math.floor(100000 + Math.random() * 900000);

//   try {
//     const existing = await User.findByEmail(email);
//     if (existing) {
//       return res.json({ success: false, message: 'Email existe déjà' });
//     }

//     const hash = await bcrypt.hash(mot_de_passe, 10);
//     const userId = await User.create({
//       nom_complet,
//       email,
//       mot_de_passe: hash,
//       role,
//       verification_code: code
//     });

//     if (role === 'GUIDE') {
//       await Guide.create(userId);
//     } else if (role === 'TOURISTE') {
//       await Touriste.create(userId);
//     }

//     // Envoyer l'email
//     await transporter.sendMail({
//       from: '"Découvrez Tunisie" <' + (process.env.GMAIL_USER || 'VOTRE.EMAIL@gmail.com') + '>',
//       to: email,
//       subject: 'Votre code de vérification Découvrez Tunisie',
//       html: `...` // votre template
//     });

//     console.log(`✅ Email envoyé à ${email} avec code ${code}`);
//     res.json({ success: true, message: 'Code envoyé par email ! Vérifiez votre boîte (et spam)' });
//   } catch (error) {
//     console.log('❌ ERREUR EMAIL:', error.message);
//     res.json({ success: false, message: 'Erreur envoi email: ' + error.message });
//   }
// };

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.log('Erreur logout:', err);
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
};

exports.getVerification = (req, res) => {
  const email = req.query.email || '';
  res.render('verification', { email });
};

exports.postVerification = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.json({
      success: false,
      message: "Email et code requis"
    });
  }

  try {
    const isValid = await User.verifyCode(email, code);

    if (isValid) {
      // Get user details and create session
      const user = await User.findByEmail(email);
      req.session.user = {
        id: user.id,
        nom_complet: user.nom_complet,
        email: user.email,
        role: user.role,
        photo_profil: user.photo_profil
      };

      res.json({
        success: true,
        message: "Compte vérifié avec succès",
        redirect: user.role === 'GUIDE' ? '/guide/dashboard' : '/'
      });
    } else {
      res.json({
        success: false,
        message: "Code invalide"
      });
    }
  } catch (error) {
    console.error("Erreur vérification:", error);
    res.json({
      success: false,
      message: "Erreur serveur"
    });
  }
};
