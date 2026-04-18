-- Ajouter la colonne bio à la table guides
ALTER TABLE guides ADD COLUMN `bio` TEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `cv`;

-- Ajouter les colonnes manquantes pour la gestion des documents et abonnements
ALTER TABLE guides ADD COLUMN `diplome` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `cv`;
ALTER TABLE guides ADD COLUMN `cv_approved` tinyint(1) DEFAULT 0 AFTER `diplome`;
ALTER TABLE guides ADD COLUMN `diplome_approved` tinyint(1) DEFAULT 0 AFTER `cv_approved`;
ALTER TABLE guides ADD COLUMN `date_soumission` datetime DEFAULT NULL AFTER `diplome_approved`;
ALTER TABLE guides ADD COLUMN `abonnement_actif` tinyint(1) DEFAULT 0 AFTER `date_soumission`;
ALTER TABLE guides ADD COLUMN `abonnement_fin` date DEFAULT NULL AFTER `abonnement_actif`;

-- Mettre à jour la colonne statut pour inclure 'ATTENTE'
ALTER TABLE guides MODIFY COLUMN `statut` enum('ACTIF','BLOQUE','ATTENTE') COLLATE utf8mb4_unicode_ci DEFAULT 'ATTENTE';
