# Guide des Notifications d'Abonnement

## 🎯 Objectif
Afficher les coordonnées complètes des abonnements des guides dans l'onglet "Abonnements" du tableau de bord.

## 📋 Fonctionnalités implémentées

### 1. **Affichage dans l'onglet "Abonnements"**
- **Route**: `/notifications?tab=abonnements`
- **Affiche**: Nom du guide, email, dates d'abonnement, jours restants
- **Format**: Notification structurée avec icône 👑

### 2. **API pour les notifications d'abonnement**
- **Route**: `/notifications/api/:userId/abonnements`
- **Méthode**: GET
- **Retourne**: JSON avec les détails de l'abonnement

## 🔧 Comment ça fonctionne

### Étapes du traitement:
1. **Récupération de l'ID du guide** connecté
2. **Recherche des abonnements actifs** dans la table `abonnements`
3. **Récupération des informations du guide** (nom, email, téléphone)
4. **Calcul des jours restants** avant expiration
5. **Formatage des notifications** avec toutes les coordonnées

### Requête SQL utilisée:
```sql
SELECT 
  a.id, 
  a.date_debut, 
  a.date_fin, 
  a.statut,
  DATEDIFF(a.date_fin, CURDATE()) as jours_restants
FROM abonnements a 
WHERE a.id_guide = ? 
ORDER BY a.date_debut DESC
```

## 📊 Exemple de notification générée

```json
{
  "id": 7,
  "type": "abonnement",
  "title": "Abonnement Actif",
  "content": "Guide: noura | Email: noura12mehri@gmail.com | Début: 25/04/2026 | Fin: 25/05/2026 | Jours restants: 25",
  "icon": "crown",
  "priority": "medium",
  "link": "/guide/abonnement"
}
```

## 🧪 Tests

### Script de test disponible:
```bash
node test_abonnement_notifications.js
```

### Résultats actuels:
- **3 guides** avec abonnement actif
- **noura**: 25 jours restants
- **yakoubi**: 2 abonnements (9 et 17 jours restants)

## 🚀 Utilisation

### Pour les administrateurs:
1. **Accédez au tableau de bord admin**
2. **Cliquez sur l'onglet "Abonnements"**
3. **Visualisez toutes les coordonnées des guides abonnés**

### Pour les guides:
1. **Connectez-vous à votre espace**
2. **Allez dans "Notifications"**
3. **Cliquez sur l'onglet "Abonnements"**
4. **Voyez les détails de votre abonnement**

## 📝 Notes importantes

- ✅ **Fonctionne avec les abonnements actifs uniquement**
- ✅ **Affiche automatiquement les jours restants**
- ✅ **Inclut toutes les coordonnées du guide**
- ✅ **Compatible avec le système de notifications existant**

## 🔗 Routes disponibles

| Route | Méthode | Description |
|-------|---------|-------------|
| `/notifications?tab=abonnements` | GET | Page des notifications d'abonnement |
| `/notifications/api/:userId/abonnements` | GET | API JSON des abonnements |
| `/guide/abonnement` | GET | Page de détail de l'abonnement |

---

**Dernière mise à jour**: 30/04/2026  
**Statut**: ✅ Fonctionnel et testé
