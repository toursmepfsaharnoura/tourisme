-- Ajout de la colonne id_plan à la table avis si elle n'existe pas
ALTER TABLE avis ADD COLUMN id_plan INT(11) DEFAULT NULL;
