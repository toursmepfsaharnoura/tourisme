-- Script pour ajouter les colonnes de vérification par email
-- À exécuter sur votre base de données MySQL

-- Ajouter la colonne pour le code de vérification (6 chiffres)
ALTER TABLE utilisateurs 
ADD COLUMN verification_code VARCHAR(6) NULL;

-- Ajouter la colonne pour le statut de vérification
ALTER TABLE utilisateurs 
ADD COLUMN verified TINYINT(1) DEFAULT 0;

-- Mettre tous les utilisateurs existants comme vérifiés (pour ne pas bloquer les comptes existants)
UPDATE utilisateurs SET verified = 1 WHERE verification_code IS NULL;

-- Index pour optimiser les recherches d'email non vérifiés
CREATE INDEX idx_email_verified ON utilisateurs(email, verified);
