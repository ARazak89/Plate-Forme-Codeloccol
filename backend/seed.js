import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

import User from "./models/User.js";
import Project from "./models/Project.js";
import AvailabilitySlot from "./models/AvailabilitySlot.js";
import Evaluation from "./models/Evaluation.js";
import Notification from "./models/Notification.js";
import Hackathon from "./models/Hackathon.js";
import Team from "./models/Team.js";
import Badge from "./models/Badge.js";

dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI;

const seedDatabase = async () => {
  try {
    // Assurez-vous que MONGO_URI est bien défini dans votre fichier .env
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB Connected...");

    // Supprimer toutes les données existantes pour un nettoyage complet
    await User.deleteMany({});
    await Project.deleteMany({});
    await AvailabilitySlot.deleteMany({});
    await Evaluation.deleteMany({});
    await Notification.deleteMany({});
    await Hackathon.deleteMany({});
    await Team.deleteMany({});
    await Badge.deleteMany({});
    console.log("Toutes les collections existantes ont été supprimées.");

    // Créer un seul utilisateur administrateur
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("password123", salt); // Mot de passe par défaut pour l'admin

    const adminUser = new User({
      name: "Hassane Abdel-Razak",
      email: "hassane.abdelrazak@codeloccol.org",
      password: hashedPassword,
      role: "admin",
      status: "active",
        level: 1,
      daysRemaining: 9999, 
        totalProjectsCompleted: 0,
      lastLogin: new Date(),
      profilePicture: "/uploads/profile_pictures/default-admin.png", // Photo de profil par défaut
      badges: []
    });

    await adminUser.save();
    console.log("Utilisateur administrateur créé avec succès.");

    console.log("Base de données 'seedée' avec l'utilisateur administrateur.");
    process.exit();
  } catch (error) {
    console.error("Erreur lors du seeding de la base de données :", error);
    process.exit(1);
  }
};

seedDatabase();