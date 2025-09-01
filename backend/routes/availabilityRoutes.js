import { Router } from "express";
import {
  createAvailabilitySlot,
  getAvailableSlots,
  bookSlot,
  getPeerBookings,
  getMyCreatedSlots,
} from "../controllers/availabilityController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";

const r = Router();

// Routes pour la gestion des slots de disponibilité
r.post("/", requireAuth, requireRole(["apprenant"]), createAvailabilitySlot); // Un apprenant crée ses slots
r.get("/", requireAuth, getAvailableSlots); // Lister les slots disponibles (pour tout utilisateur authentifié)
r.post("/book", requireAuth, requireRole(["apprenant"]), bookSlot); // Un apprenant réserve un slot
r.get("/my-bookings", requireAuth, requireRole(["apprenant"]), getPeerBookings); // Un évaluateur voit ses réservations
r.get("/mine", requireAuth, requireRole(["apprenant"]), getMyCreatedSlots); // Un apprenant voit les slots qu'il a créé

export default r;
