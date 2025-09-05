import { Router } from "express";
import {
  me,
  updateUserPassword,
  updateUserProfilePicture,
  listUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
} from "../controllers/userController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js"; // Importer le middleware d'upload

const r = Router();

r.get("/me", requireAuth, me);
// Routes pour la modification du profil par l'utilisateur
r.put("/me/password", requireAuth, updateUserPassword); // Modifier le mot de passe
r.put(
  "/me/profile-picture",
  requireAuth,
  upload.single("profilePicture"),
  updateUserProfilePicture,
); // Modifier la photo de profil avec upload de fichier

// Routes accessibles uniquement au staff/admin
r.post("/", requireAuth, requireRole(["staff", "admin"]), createUser); // Créer un utilisateur
r.put(
  "/:id", // Nouvelle route pour la mise à jour complète
  requireAuth,
  requireRole(["staff", "admin"]),
  updateUser, // Utiliser la fonction updateUser unifiée
);
r.get("/", requireAuth, requireRole(["staff", "admin"]), listUsers);
r.get("/:id", requireAuth, requireRole(["staff", "admin"]), getUserById);
r.delete("/:id", requireAuth, requireRole(["admin"]), deleteUser);
r.put(
  "/:id/status",
  requireAuth,
  requireRole(["staff", "admin"]),
  toggleUserStatus,
);

export default r;
