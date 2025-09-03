import { Router } from "express";
import {
  getEvaluationsForMySubmittedProjects,
  getPendingEvaluationsAsEvaluator,
  submitEvaluation,
  getAllPendingEvaluationsForStaff, // Importez la nouvelle fonction
  debugListAllEvaluations, // Importez la nouvelle fonction de débogage
} from "../controllers/evaluationController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";

const r = Router();

r.get(
  "/mine",
  requireAuth,
  requireRole(["apprenant"]),
  getEvaluationsForMySubmittedProjects,
);
r.get(
  "/pending-as-evaluator",
  requireAuth,
  requireRole(["apprenant", "staff", "admin"]),
  getPendingEvaluationsAsEvaluator,
);
r.get(
  "/all-pending-for-staff",
  requireAuth,
  requireRole(["staff", "admin"]),
  getAllPendingEvaluationsForStaff,
);
r.get(
  "/debug-all", // Nouvelle route de débogage
  requireAuth,
  requireRole(["staff", "admin"]),
  debugListAllEvaluations,
); // Limiter l'accès au staff/admin pour le débogage
r.post(
  "/:evaluationId/submit",
  requireAuth,
  requireRole(["apprenant"]),
  submitEvaluation,
);

export default r;
