import { Router } from "express";
import {
  createHackathon,
  listHackathons,
  joinHackathon,
  submitHackathonProject,
  updateHackathon,
  deleteHackathon,
  evaluateHackathonProjects,
  getHackathonRankings,
  listAvailableLearners,
  constituteTeams,
  submitTeamProject,
} from "../controllers/hackathonController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";
const r = Router();
r.get("/", requireAuth, listHackathons);
r.post("/", requireAuth, requireRole(["staff", "admin"]), createHackathon);
r.put("/:id", requireAuth, requireRole(["staff", "admin"]), updateHackathon); // Nouvelle route pour la mise à jour d'un hackathon
r.delete("/:id", requireAuth, requireRole(["staff", "admin"]), deleteHackathon); // Nouvelle route pour la suppression d'un hackathon
r.post("/:id/join", requireAuth, joinHackathon);
r.post("/:id/submit", requireAuth, submitHackathonProject);
r.post(
  "/:id/evaluate-rank",
  requireAuth,
  requireRole(["staff", "admin"]),
  evaluateHackathonProjects,
); // Nouvelle route pour évaluer et classer les projets de hackathon
r.get("/:id/rankings", requireAuth, getHackathonRankings); // Nouvelle route pour récupérer les classements de hackathon
r.get("/available-learners", requireAuth, requireRole(["staff", "admin"]), listAvailableLearners); // Nouvelle route pour récupérer les apprenants disponibles
r.post("/:id/constitute-teams", requireAuth, requireRole(["staff", "admin"]), constituteTeams); // Nouvelle route pour constituer les équipes d'un hackathon
r.post("/:hackathonId/teams/:teamId/submit-project", requireAuth, submitTeamProject); // Nouvelle route pour la soumission de projet par équipe
export default r;
