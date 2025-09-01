import AvailabilitySlot from "../models/AvailabilitySlot.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

// Fonction pour qu'un apprenant (évaluateur) crée des slots de disponibilité
export async function createAvailabilitySlot(req, res) {
  try {
    const { startTime, endTime } = req.body;
    const evaluatorId = req.user._id; // L'utilisateur connecté est l'évaluateur

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Validation des dates
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return res.status(400).json({ error: "Dates et heures invalides." });
    }

    // Nouvelle validation : La durée du slot ne doit pas dépasser 2 jours (48 heures)
    const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > twoDaysInMs) {
      return res
        .status(400)
        .json({ error: "La durée d'un slot ne peut pas dépasser 2 jours." });
    }

    // Vérifier les contraintes horaires (Lundi-Vendredi, 9h-17h)
    const dayOfWeek = start.getUTCDay(); // Dimanche = 0, Lundi = 1, ..., Samedi = 6
    const startHour = start.getUTCHours();
    const endHour = end.getUTCHours();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Week-end
      return res.status(400).json({
        error: "Les slots ne peuvent être créés que du lundi au vendredi.",
      });
    }
    if (
      startHour < 9 ||
      endHour > 17 ||
      (startHour === 17 && start.getUTCMinutes() > 0)
    ) {
      // 9h-17h
      return res
        .status(400)
        .json({ error: "Les slots doivent être entre 9h00 et 17h00." });
    }

    // Vérifier si un slot existe déjà ou chevauche cette période pour cet évaluateur
    const overlappingSlot = await AvailabilitySlot.findOne({
      evaluator: evaluatorId,
      $or: [
        { startTime: { $lt: end }, endTime: { $gt: start } }, // Chevauchement
        { startTime: start, endTime: end }, // Identique
      ],
    });

    if (overlappingSlot) {
      return res.status(400).json({
        error: "Un slot de disponibilité chevauche déjà cette période.",
      });
    }

    const newSlot = await AvailabilitySlot.create({
      evaluator: evaluatorId,
      startTime: start,
      endTime: end,
    });

    res.status(201).json({
      message: "Slot de disponibilité créé avec succès.",
      slot: newSlot,
    });
  } catch (e) {
    console.error('Error creating availability slot:', e);
    res.status(500).json({ error: e.message });
  }
}

// Fonction pour lister les slots de disponibilité disponibles
export async function getAvailableSlots(req, res) {
  try {
    // On peut ajouter des filtres ici (par date, par évaluateur, etc.)
    const { date, evaluatorId } = req.query;
    let query = { isBooked: false }; // Seulement les slots non réservés

    if (evaluatorId) {
      query.evaluator = evaluatorId;
    }

    if (date) {
      const d = new Date(date);
      const nextDay = new Date(date);
      nextDay.setDate(d.getDate() + 1);
      query.startTime = { $gte: d, $lt: nextDay };
    }

    console.log('Query for available slots:', query); // Ajout du console.log
    const slots = await AvailabilitySlot.find(query)
      .populate("evaluator", "name profilePicture") // Populer le nom de l'évaluateur
      .sort("startTime");

    res.status(200).json(slots);
  } catch (e) {
    console.error('Error fetching available slots:', e);
    res.status(500).json({ error: e.message });
  }
}

// Fonction pour qu'un apprenant réserve un slot
export async function bookSlot(req, res) {
  try {
    const { slotId, projectId } = req.body;
    const studentId = req.user._id; // L'apprenant qui réserve

    // Vérifier si le slot existe et est disponible
    const slot = await AvailabilitySlot.findById(slotId);
    if (!slot || slot.isBooked) {
      return res
        .status(400)
        .json({ error: "Slot de disponibilité non trouvé ou déjà réservé." });
    }

    // Vérifier que le slot n'est pas réservé par l'évaluateur lui-même
    if (slot.evaluator.equals(studentId)) {
      return res
        .status(400)
        .json({ error: "Vous ne pouvez pas réserver votre propre slot." });
    }

    // Vérifier que l'apprenant ne réserve pas deux slots pour le même projet avec un décalage insuffisant
    const existingBookingsForProject = await AvailabilitySlot.find({
      bookedByStudent: studentId,
      bookedForProject: projectId,
      isBooked: true,
    });

    for (const existingBooking of existingBookingsForProject) {
      const diffMs = Math.abs(
        new Date(slot.startTime).getTime() -
          new Date(existingBooking.startTime).getTime(),
      );
      const diffMinutes = Math.round(diffMs / 60000);
      if (diffMinutes < 45) {
        return res.status(400).json({
          error:
            'Vous devez choisir des slots avec un décalage d\'au moins 45 minutes pour le même projet.',
        });
      }
    }

    slot.isBooked = true;
    slot.bookedByStudent = studentId;
    slot.bookedForProject = projectId;
    await slot.save();

    // Notifier l'évaluateur que son slot a été réservé
    await Notification.create({
      user: slot.evaluator,
      type: "slot_booked",
      message: `Votre slot de disponibilité le ${new Date(slot.startTime).toLocaleString()} a été réservé pour un projet.`, // ${new Date(slot.startTime).toLocaleString()} pour un affichage lisible
    });

    res.status(200).json({ message: "Slot réservé avec succès.", slot });
  } catch (e) {
    console.error('Error booking slot:', e);
    res.status(500).json({ error: e.message });
  }
}

// Fonction pour un évaluateur pour voir ses réservations
export async function getPeerBookings(req, res) {
  try {
    const evaluatorId = req.user._id;

    const bookings = await AvailabilitySlot.find({
      evaluator: evaluatorId,
      isBooked: true,
    })
      .populate("bookedByStudent", "name")
      .populate("bookedForProject", "title")
      .sort("startTime");

    res.status(200).json(bookings);
  } catch (e) {
    console.error('Error fetching peer bookings:', e);
    res.status(500).json({ error: e.message });
  }
}

// Fonction pour qu'un apprenant voit les slots qu'il a créés
export async function getMyCreatedSlots(req, res) {
  try {
    const evaluatorId = req.user._id;

    const slots = await AvailabilitySlot.find({ evaluator: evaluatorId })
      .populate("bookedByStudent", "name")
      .populate("bookedForProject", "title")
      .sort("startTime");

    res.status(200).json(slots);
  } catch (e) {
    console.error('Error fetching my created slots:', e);
    res.status(500).json({ error: e.message });
  }
}

// Fonction pour expirer les slots non réservés 30 minutes avant leur début
export async function expireUnbookedSlots() {
  try {
    const now = new Date();
    // Calculer le point limite : 30 minutes avant maintenant
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

    const expiredSlots = await AvailabilitySlot.find({
      isBooked: false,
      startTime: { $lt: thirtyMinutesFromNow }, // Slots dont l'heure de début est dans moins de 30 minutes
    });

    if (expiredSlots.length > 0) {
      const deleted = await AvailabilitySlot.deleteMany({
        _id: { $in: expiredSlots.map((slot) => slot._id) },
      });
      console.log(
        `Expired ${deleted.deletedCount} unbooked availability slots.`,
      );

      // Optionnel: Envoyer une notification aux évaluateurs dont les slots ont expiré
      for (const slot of expiredSlots) {
        await Notification.create({
          user: slot.evaluator,
          type: "slot_expired",
          message: `Votre slot de disponibilité le ${new Date(slot.startTime).toLocaleString()} a expiré car il n'a pas été réservé.`,
        });
      }
    }
  } catch (e) {
    console.error('Error expiring unbooked slots:', e);
  }
}
