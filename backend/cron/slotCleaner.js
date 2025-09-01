import cron from "node-cron";
import AvailabilitySlot from "../models/AvailabilitySlot.js";

const startSlotCleaner = () => {
  // Planifier la tâche pour s'exécuter toutes les minutes
  cron.schedule("* * * * *", async () => {
    const now = new Date();
    // Définir une fenêtre de 30 minutes avant l'heure de début du slot
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

    try {
      // Trouver les slots non réservés dont l'heure de début est dans les 30 prochaines minutes
      const slotsToDelete = await AvailabilitySlot.find({
        isBooked: false,
        startTime: { $lte: thirtyMinutesFromNow },
      });

      if (slotsToDelete.length > 0) {
        console.log(
          `[CRON] Suppression de ${slotsToDelete.length} slots non réservés :`,
        );
        for (const slot of slotsToDelete) {
          console.log(
            `- Slot ID: ${slot._id}, Heure de début: ${slot.startTime}`,
          );
          await AvailabilitySlot.findByIdAndDelete(slot._id);
        }
        console.log('[CRON] Suppression terminée.');
      }
    } catch (error) {
      console.error(
        "[CRON ERROR] Erreur lors de la suppression des slots de disponibilité:",
        error,
      );
    }
  });
  console.log("[CRON] Tâche de nettoyage des slots de disponibilité démarrée.");
};

export default startSlotCleaner;
