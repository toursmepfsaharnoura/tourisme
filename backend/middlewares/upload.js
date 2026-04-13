const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Stockage pour les CV et diplômes
const docsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subfolder = '';
    if (file.fieldname === 'cv') subfolder = 'cv';
    else if (file.fieldname === 'diplome') subfolder = 'diplomes';
    const dir = path.join(__dirname, '../../frontend/public/uploads', subfolder);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});

exports.docs = multer({
  storage: docsStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('PDF uniquement'), false);
    }
  }
});

// Stockage pour les photos de profil
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../frontend/public/uploads/photos-profil');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    const uniqueName = `guide-${req.session.user.id}-${Date.now()}.${ext}`;
    cb(null, uniqueName);
  }
});

exports.photo = multer({
  storage: photoStorage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Le fichier doit être une image'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

const lieuStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../frontend/public/uploads/lieu');
// Stockage pour les images des plans touristiques
const planImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../frontend/public/uploads/plan-images');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    const uniqueName = `lieu-${Date.now()}.${ext}`;
    const uniqueName = `plan-${Date.now()}.${ext}`;
    cb(null, uniqueName);
  }
});

exports.lieu = multer({
  storage: lieuStorage,
  fileFilter: (req, file, cb) => {
exports.planImage = multer({
  storage: planImageStorage,
  fileFilter: (req, file, cb) => {
    // If no file, don't filter anything - let it pass
    if (!file) {
      return cb(null, true);
    }
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Le fichier doit être une image'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Alternative for optional file uploads
exports.planImageOptional = multer({
  storage: planImageStorage,
  fileFilter: (req, file, cb) => {
    // If no file, don't filter anything - let it pass
    // Allow empty file uploads
    if (!file) {
      return cb(null, false);
    }
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Le fichier doit être une image'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});