import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const requireAuth = async (req, res, next) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: "User not found" });
    if (user.status === "blocked")
      return res.status(403).json({ error: "Account is blocked" });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const requireRole =
  (roles = []) =>
  (req, res, next) => {
    if (!roles.includes(req.user?.role))
      return res.status(403).json({ error: "Forbidden" });
    next();
  };
