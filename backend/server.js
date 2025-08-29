import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import cron from 'node-cron';
import session from 'express-session'; // Import express-session
import passport from 'passport'; // Import passport

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import hackathonRoutes from './routes/hackathonRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js'; // Importez les routes des paramètres
import notificationRoutes from './routes/notificationRoutes.js'; // Importez les routes des notifications
import searchRoutes from './routes/searchRoutes.js'; // Importez les routes de recherche
import curriculumRoutes from './routes/curriculumRoutes.js'; // Importez les routes des parcours de formation
import resourceRoutes from './routes/resourceRoutes.js'; // Importez les routes des ressources pédagogiques
import evaluationRoutes from './routes/evaluationRoutes.js'; // Importez les routes des évaluations
import availabilityRoutes from './routes/availabilityRoutes.js'; // Importez les routes de disponibilité

import { autoBlockInactiveUsers, attachLastSeen } from './utils/activityService.js';
import { expireUnbookedSlots } from './controllers/availabilityController.js'; // Importez la nouvelle fonction
import passportConfig from './config/passport.js'; // Importer la configuration de Passport

// Initialiser Passport avec les stratégies
passportConfig(passport);

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Servir les fichiers statiques (y compris les images de profil téléchargées)
app.use(express.static('public'));

// Configuration de la session
app.use(session({
  secret: process.env.JWT_SECRET, // Utiliser le même secret que pour JWT ou un nouveau
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Initialisation de Passport
app.use(passport.initialize());
app.use(passport.session());

// record last seen on each request (for authenticated users)
app.use(attachLastSeen);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/hackathons', hackathonRoutes);
app.use('/api/settings', settingsRoutes); // Nouvelle route pour les paramètres globaux
app.use('/api/notifications', notificationRoutes); // Nouvelle route pour les notifications
app.use('/api/search', searchRoutes); // Nouvelle route pour la recherche avancée
app.use('/api/curriculums', curriculumRoutes); // Nouvelle route pour les parcours de formation
app.use('/api/resources', resourceRoutes); // Nouvelle route pour les ressources pédagogiques
app.use('/api/evaluations', evaluationRoutes); // Nouvelle route pour les évaluations
app.use('/api/availability', availabilityRoutes); // Nouvelle route pour les slots de disponibilité

const PORT = process.env.PORT || 4000;
mongoose.connect(process.env.MONGODB_URI, { })
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// cron: run every day at 00:15 to block inactive > 4 days
cron.schedule('15 0 * * *', async () => {
  await autoBlockInactiveUsers();
});

// Nouveau cron: Exécuter toutes les minutes pour expirer les slots non réservés
cron.schedule('* * * * *', async () => {
  await expireUnbookedSlots();
});
