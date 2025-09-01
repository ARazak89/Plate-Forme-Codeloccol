import { Router } from "express";
import {
  createResource,
  listResources,
  getResourceById,
  updateResource,
  deleteResource,
} from "../controllers/resourceController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";

const r = Router();

// Routes accessibles au staff/admin pour la gestion des ressources
r.post("/", requireAuth, requireRole(["staff", "admin"]), createResource);
r.get("/", requireAuth, listResources);
r.get("/:id", requireAuth, getResourceById);
r.put("/:id", requireAuth, requireRole(["staff", "admin"]), updateResource);
r.delete("/:id", requireAuth, requireRole(["admin"]), deleteResource);

export default r;
