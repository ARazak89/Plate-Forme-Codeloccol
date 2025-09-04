import { Router } from "express";
import {
  createProject,
  getProjects,
  getStudentProjects,
  assignProjectToStudent,
  submitProjectSolution,
  finalReviewProject, // Renommé de approveProject
  getProjectsAwaitingStaffReview,
  getAllProjects, // Ajout du contrôleur pour récupérer tous les projets
} from "../controllers/projectController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";
const router = Router();

// Routes pour le staff (création de templates, assignation)
router.post("/", requireAuth, requireRole(["staff", "admin"]), createProject); // Créer un projet template
router.post(
  "/assign",
  requireAuth,
  requireRole(["staff", "admin"]),
  assignProjectToStudent,
); // Assigner un projet à un étudiant

// Routes pour les apprenants
router.get("/my-projects", requireAuth, getStudentProjects); // Liste des projets assignés à l'apprenant

// Routes de soumission de projet par un apprenant
router.post("/:id/submit-solution", requireAuth, requireRole(["apprenant"]), submitProjectSolution); // Soumettre la solution d'un projet

// Routes pour le staff/admin (lecture des projets templates)
router.get("/", requireAuth, requireRole(["staff", "admin"]), getProjects); // Pour lister les projets templates

// Route pour l'évaluation finale d'un projet (Staff/Admin)
router.post("/:id/final-review", requireAuth, requireRole(["staff", "admin"]), finalReviewProject); // Renommé et mis à jour

// Route pour les projets en attente de révision par le staff (Staff/Admin)
router.get("/awaiting-staff-review", requireAuth, requireRole(["staff", "admin"]), getProjectsAwaitingStaffReview);

// Route pour récupérer tous les projets (Staff/Admin)
router.get("/all", requireAuth, requireRole(["staff", "admin"]), getAllProjects);

export default router;
