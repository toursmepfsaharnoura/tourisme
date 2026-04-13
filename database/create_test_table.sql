-- Création de la table touristic_plans avec les bonnes colonnes
USE tourisme_tn;

DROP TABLE IF EXISTS touristic_plans;

CREATE TABLE touristic_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guide_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  governorate_id INT,
  delegation_id INT,
  image VARCHAR(255),
  max_participants INT DEFAULT 20,
  start_date DATE,
  end_date DATE,
  status ENUM('ACTIVE','INACTIVE','CANCELLED') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insertion de données de test
INSERT INTO touristic_plans (guide_id, title, description, price, status) VALUES
(1, 'Plan Test Debug', 'Description du plan de test pour vérifier que tout fonctionne', 99.99, 'ACTIVE'),
(1, 'Circuit Tunis', 'Découverte de la ville de Tunis', 150.00, 'ACTIVE'),
(2, 'Sahara Adventure', 'Aventure dans le désert', 250.00, 'ACTIVE');

SELECT * FROM touristic_plans;
