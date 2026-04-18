-- Script simple pour créer la table touristic_plans
-- Exécutez ce script dans votre base de données MySQL

USE tourisme_tn;

DROP TABLE IF EXISTS touristic_plans;

CREATE TABLE touristic_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guide_id INT NOT NULL,
  title VARCHAR(255),
  description TEXT,
  price FLOAT,
  governorate_id INT,
  delegation_id INT,
  image VARCHAR(255),
  max_participants INT,
  start_date DATE,
  end_date DATE,
  status ENUM('ACTIVE','INACTIVE','CANCELLED') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insérer un plan de test pour vérifier
INSERT INTO touristic_plans 
(guide_id, title, description, price, status)
VALUES 
(1, 'Plan Test Debug', 'Description du plan de test', 99.99, 'ACTIVE');

SELECT * FROM touristic_plans;
