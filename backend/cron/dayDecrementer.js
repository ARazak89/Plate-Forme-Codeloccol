import cron from "node-cron";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const startDayDecrementer = () => {
  // Planifier la tâche pour s'exécuter tous les jours à minuit
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        const activeUsers = await User.find({ status: "active" });

        console.log(
          `[CRON] Décrémentation des jours restants pour ${activeUsers.length} utilisateurs actifs...`,
        );

        for (const user of activeUsers) {
          if (user.daysRemaining > 0) {
            user.daysRemaining -= 1;
            await user.save();
          } else if (user.daysRemaining === 0) {
            // Si les jours restants atteignent 0, bloquer l'utilisateur
            user.status = "blocked";
            await user.save();
            await Notification.create({
              user: user._id,
              type: "account_blocked",
              message:
                "Votre compte a été bloqué car vous n'avez plus de jours restants. Veuillez contacter le personnel.",
            });
            console.log(
              `[CRON] Utilisateur ${user.email} bloqué car daysRemaining est tombé à 0.`,
            );
          }
        }
        console.log("[CRON] Décrémentation des jours restants terminée.");
      } catch (error) {
        console.error(
          "[CRON ERROR] Erreur lors de la décrémentation des jours restants:",
          error,
        );
      }
    },
    {
      scheduled: true,
      timezone: "Europe/Paris", // Ajustez le fuseau horaire si nécessaire
    },
  );
  console.log("[CRON] Tâche de décrémentation des jours restants démarrée.");
};

export default startDayDecrementer;
