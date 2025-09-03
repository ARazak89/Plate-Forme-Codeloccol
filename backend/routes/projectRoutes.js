import { Router } from "express";
import {
  createProject,
  listMyProjects,
  approveProject,
  rejectProject,
  submitPeerEvaluation,
  getGithubRepoTitle,
  assignProjectToStudent,
  getProjectDetails,
  submitProjectSolution,
  submitFinalStaffEvaluation,
  getProjectsAwaitingStaffReview,
  updateProject,
  deleteProject,
  listAllProjects,
  debugListAllProjectsWithAssignments,
} from "../controllers/projectController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";
const r = Router();

// Routes pour le staff (création de templates, assignation)
r.post("/", requireAuth, requireRole(["staff", "admin"]), createProject); // Créer un projet template
r.post(
  "/assign",
  requireAuth,
  requireRole(["staff", "admin"]),
  assignProjectToStudent,
); // Assigner un projet à un étudiant

// Routes pour les apprenants
r.get("/my-projects", requireAuth, listMyProjects); // Liste des projets assignés à l'apprenant

// Toutes les routes spécifiques DOIVENT ABSOLUMENT ÊTRE AVANT /:id
r.get(
  "/awaiting-staff-review",
  requireAuth,
  requireRole(["staff", "admin"]),
  getProjectsAwaitingStaffReview,
); // Projets en attente de révision staff
r.get("/github-repo-title", requireAuth, getGithubRepoTitle); // Obtenir le titre du dépôt GitHub

// Nouvelle route pour lister tous les projets (pour staff/admin)
r.get("/all", requireAuth, requireRole(["staff", "admin"]), listAllProjects);

// Nouvelle route de débogage pour lister tous les projets avec leurs assignations
r.get("/debug-all-with-assignments", requireAuth, requireRole(["staff", "admin"]), debugListAllProjectsWithAssignments);

r.get("/:id", requireAuth, getProjectDetails); // Détails d'un projet spécifique (pour l'apprenant)
r.post("/:id/submit", requireAuth, submitProjectSolution); // Soumettre la solution d'un projet

// Routes pour la validation/évaluation (Staff/Admin/Apprenant)
r.post(
  "/:id/approve",
  requireAuth,
  requireRole(["staff", "admin"]),
  approveProject,
);
r.post(
  "/:id/reject",
  requireAuth,
  requireRole(["staff", "admin"]),
  rejectProject,
);

// Nouvelle route pour l'évaluation finale par le personnel
r.post(
  "/:id/final-evaluate",
  requireAuth,
  requireRole(["staff", "admin"]),
  submitFinalStaffEvaluation,
);

// Routes pour la gestion des projets (Staff/Admin)
// Ces routes étaient commentées car la gestion était axée sur l'apprenant. Les réactiver pour le staff/admin.
r.put("/:id", requireAuth, requireRole(["staff", "admin"]), updateProject);
r.delete("/:id", requireAuth, requireRole(["staff", "admin"]), deleteProject);

export default r;
