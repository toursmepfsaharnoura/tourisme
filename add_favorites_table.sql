-- Create favoris table
CREATE TABLE IF NOT EXISTS `favoris` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_touriste` int NOT NULL,
  `id_plan` int NOT NULL,
  `date_ajout` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_favorite` (`id_touriste`, `id_plan`),
  KEY `id_touriste` (`id_touriste`),
  KEY `id_plan` (`id_plan`),
  FOREIGN KEY (`id_touriste`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`id_plan`) REFERENCES `plans_touristiques` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
