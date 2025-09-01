import { Router } from "express";
import {
  listNotifications,
  markAsRead,
  deleteNotification,
  getNotificationsCount,
} from "../controllers/notificationController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const r = Router();

r.get("/", requireAuth, listNotifications);
r.get("/mine", requireAuth, listNotifications); // Nouvelle route pour les notifications de l'utilisateur
r.get("/count", requireAuth, getNotificationsCount);
r.put("/:id/read", requireAuth, markAsRead);
r.delete("/:id", requireAuth, deleteNotification);

export default r;
