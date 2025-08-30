# Plateforme Codeloccol (MVP)

Bienvenue sur la plateforme Codeloccol ! Cette application est une preuve de concept (MVP) conçue pour gérer des projets d'apprentissage, des évaluations et des hackathons.

**Stack Technique:**
- **Backend:** Node.js avec Express et MongoDB (via Mongoose) pour l'API REST.
- **Frontend:** Next.js et React pour une interface utilisateur dynamique et performante.

## Démarrage Rapide

Pour faire fonctionner la plateforme en local, suivez ces étapes :

### 1) Backend (API)
Accédez au répertoire `backend` et configurez votre environnement :
```bash
cd backend
cp .env.example .env
# Modifiez le fichier .env avec vos propres valeurs (par exemple, les clés MongoDB, JWT secret, etc.)
npm install
npm run dev # Démarre le serveur API en mode développement
```

### 2) Frontend (Application Web)
Accédez au répertoire `frontend` et installez les dépendances nécessaires :
```bash
cd ../frontend
npm install
npm install bootstrap bootstrap-icons # Installe Bootstrap et les icônes Bootstrap
npm run dev # Démarre l'application frontend en mode développement
```

Le frontend s'attend à ce que l'API soit disponible à l'adresse `http://localhost:4000/api` par défaut. Cette URL peut être configurée via la variable d'environnement `NEXT_PUBLIC_API_URL` dans un fichier `.env.local` du frontend.

## Fonctionnalités Incluses

La plateforme Codeloccol propose les fonctionnalités suivantes :

- **Authentification JWT :** Système de connexion et d'inscription avec gestion des rôles (apprenant, staff, admin).
- **Soumission et Évaluation de Projets :**
  - Les projets sont soumis via une URL GitHub.
  - Chaque projet est évalué par deux pairs (apprenants) et nécessite une validation finale par un membre du personnel (staff).
  - La validation par le personnel est nécessaire pour débloquer le projet suivant pour l'apprenant.
- **Suivi du Temps :**
  - Les jours restants pour les projets sont suivis **côté serveur**.
  - Les jours restants sont prolongés (+1, +2, +3 jours) lors de la validation d'un projet.
- **Gestion des Comptes :**
  - Désactivation automatique des comptes après 4 jours d'inactivité (tâche cron côté serveur).
  - Réactivation manuelle des comptes uniquement par le personnel.
- **Espace Hackathon :** Permet de créer, lister, rejoindre et soumettre des projets pour des hackathons (via URL GitHub).
- **Notifications :** Système de notifications intégré à l'application et notifications par e-mail (implémentation de base).
- **Design Épuré et Réactif :** Utilisation de Bootstrap 5 et de CSS personnalisé pour une expérience utilisateur moderne et agréable sur tous les appareils.

## Contribuer

Nous accueillons les contributions ! Si vous souhaitez améliorer la plateforme, n'hésitez pas à soumettre des requêtes de tirage (pull requests) ou à signaler des problèmes (issues).

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.
