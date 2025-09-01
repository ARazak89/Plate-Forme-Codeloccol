import { Router } from "express";
import {
  me,
  unblock,
  updateUserNameAndEmail,
  updateUserPassword,
  updateUserProfilePicture,
  listUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  createUserByAdmin, // Importez la nouvelle fonction de contrôleur
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
r.post("/", requireAuth, requireRole(["staff", "admin"]), createUserByAdmin); // Nouvelle route pour créer un utilisateur
r.put(
  "/:id/info",
  requireAuth,
  requireRole(["staff", "admin"]),
  updateUserNameAndEmail,
); // Modifier nom et email (par staff/admin)
r.get("/", requireAuth, requireRole(["staff", "admin"]), listUsers);
r.get("/:id", requireAuth, requireRole(["staff", "admin"]), getUserById);
r.put("/:id/role", requireAuth, requireRole(["admin"]), updateUserRole);
r.delete("/:id", requireAuth, requireRole(["admin"]), deleteUser);
r.post("/:id/unblock", requireAuth, requireRole(["staff", "admin"]), unblock);

export default r;
