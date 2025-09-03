import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import crypto from "crypto";
import { sendMail } from "../utils/emailService.js";
import Project from "../models/Project.js"; // Importer le modèle Project

export async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: "Email already used" });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hash,
      role: role || "apprenant",
    });

    // Si l'utilisateur est un apprenant, lui assigner automatiquement le projet d'ordre 1
    if (user.role === "apprenant") {
      const firstProjectTemplate = await Project.findOne({
        order: 1,
        status: "template",
      });

      if (firstProjectTemplate) {
        // Ajouter l'apprenant au tableau d'assignations du projet maître
        firstProjectTemplate.assignments.push({
          student: user._id,
          status: "assigned",
          repoUrl: "", // Initialisé vide
          evaluations: [],
          peerEvaluators: [],
          staffValidator: null,
        });
        await firstProjectTemplate.save();

        // Ajouter une référence au projet maître dans les projets de l'utilisateur
        user.projects.push(firstProjectTemplate._id);
        await user.save();
      }
    }

    res.json({ id: user._id, email: user.email });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    console.log(`Tentative de connexion pour l'email: ${email}`);
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`Utilisateur non trouvé pour l'email: ${email}`);
      return res.status(400).json({ error: "Invalid credentials" });
    }
    console.log(`Utilisateur trouvé: ${user.email}, rôle: ${user.role}`);
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      console.log(`Comparaison de mot de passe échouée pour l'email: ${email}`);
      return res.status(400).json({ error: "Invalid credentials" });
    }
    if (user.status === "blocked") {
      console.log(`Compte bloqué pour l'email: ${email}`);
      return res.status(403).json({ error: "Account is blocked" });
    }
    user.lastLogin = new Date();
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    console.log(`Connexion réussie pour l'email: ${email}`);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        daysRemaining: user.daysRemaining,
        level: user.level,
      },
    });
  } catch (e) {
    console.error(
      `Erreur lors de la connexion pour l'email: ${req.body.email || "N/A"}: ${e.message}`,
    );
    res.status(500).json({ error: e.message });
  }
}

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ message: "Aucun utilisateur avec cet email trouvé." });
    }

    // Générer un jeton de réinitialisation
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 heure
    await user.save();

    // Envoyer l'email de réinitialisation
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    const emailText = `Vous avez demandé une réinitialisation de mot de passe. Veuillez cliquer sur ce lien : ${resetUrl}`;
    await sendMail(user.email, "Réinitialisation de mot de passe", emailText);

    res.status(200).json({ message: "Email de réinitialisation envoyé." });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Jeton de réinitialisation invalide ou expiré." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Mot de passe mis à jour avec succès." });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
