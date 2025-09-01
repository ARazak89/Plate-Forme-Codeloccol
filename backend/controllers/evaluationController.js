import Evaluation from "../models/Evaluation.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import AvailabilitySlot from "../models/AvailabilitySlot.js";
import Notification from "../models/Notification.js";

// Pour l'apprenant qui a soumis le projet: voir les évaluations en attente pour son projet
export async function getEvaluationsForMySubmittedProjects(req, res) {
  try {
    const studentId = req.user._id;

    const evaluations = await Evaluation.find({ student: studentId })
      .populate("project", "title status") // Ajoutez 'status' ici
      .populate("evaluator", "name")
      .populate("slot", "startTime endTime")
      .sort("-createdAt");

    res.status(200).json(evaluations);
  } catch (e) {
    console.error('Error fetching evaluations for submitted projects:', e);
    res.status(500).json({ error: e.message });
  }
}

// Pour l'apprenant (évaluateur): voir les projets qu'il doit évaluer
export async function getPendingEvaluationsAsEvaluator(req, res) {
  try {
    const evaluatorId = req.user._id;

    const evaluations = await Evaluation.find({
      evaluator: evaluatorId,
      status: "pending",
    })
      .populate("project", "title description repoUrl student") // Ajouter 'student' ici pour populater l'étudiant du projet
      .populate("student", "name")
      .populate({
        path: "slot",
        select: "startTime endTime bookedByStudent bookedForProject",
        populate: [
          { path: "bookedByStudent", select: "name" },
          { path: "bookedForProject", select: "title" },
        ],
      })
      .sort("slot.startTime");

    res.status(200).json(evaluations);
  } catch (e) {
    console.error('Error fetching pending evaluations for evaluator:', e);
    res.status(500).json({ error: e.message });
  }
}

// Nouvelle fonction pour le staff/admin : voir toutes les évaluations en attente
export async function getAllPendingEvaluationsForStaff(req, res) {
  try {
    // Seuls le staff et les administrateurs peuvent voir cette liste
    if (req.user.role !== "staff" && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Non autorisé à consulter cette ressource." });
    }

    const projects = await Project.find({
      status: { $in: ["pending", "awaiting_staff_review"] },
    });
    const projectIds = projects.map((project) => project._id);

    const evaluations = await Evaluation.find({
      project: { $in: projectIds },
    })
      .populate({
        path: "project",
        select: "title description repoUrl student",
        populate: { path: "student", select: "name email" },
      })
      .populate("evaluator", "name email")
      .populate("slot", "startTime endTime")
      .select("project student evaluator slot status submissionDate") // Explicitly select relevant fields
      .sort("slot.startTime");

    res.status(200).json(evaluations);
  } catch (e) {
    console.error('Error fetching all pending evaluations for staff:', e);
    res.status(500).json({ error: e.message });
  }
}

// Pour l'apprenant (évaluateur): soumettre une évaluation
export async function submitEvaluation(req, res) {
  try {
    const { evaluationId } = req.params;
    const { feedback, status } = req.body; // feedback est un objet, status est 'accepted' ou 'rejected'
    const evaluatorId = req.user._id;

    const evaluation = await Evaluation.findById(evaluationId);

    if (!evaluation) {
      return res.status(404).json({ error: "Évaluation non trouvée." });
    }

    if (!evaluation.evaluator.equals(evaluatorId)) {
      return res
        .status(403)
        .json({ error: "Non autorisé à soumettre cette évaluation." });
    }

    if (evaluation.status !== "pending") {
      return res.status(400).json({
        error: "Cette évaluation a déjà été soumise ou n'est plus en attente.",
      });
    }

    // Valider le statut
    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Statut d'évaluation invalide." });
    }

    // Valider que tous les champs de feedback sont renseignés si le statut est 'accepted'
    if (status === "accepted") {
      const feedbackKeys = [
        "assiduite",
        "comprehension",
        "specifications",
        "maitrise_concepts",
        "capacite_expliquer",
      ];
      const allFeedbackProvided = feedbackKeys.every(
        (key) => feedback[key] && feedback[key].trim() !== "",
      );
      if (!allFeedbackProvided) {
        return res.status(400).json({
          error:
            "Tous les champs de feedback sont obligatoires pour accepter le projet.",
        });
      }
    }

    // Mettre à jour l'évaluation
    evaluation.feedback = feedback;
    evaluation.status = status;
    evaluation.submissionDate = new Date();
    await evaluation.save();

    // Récupérer toutes les évaluations pour ce projet
    const projectEvaluations = await Evaluation.find({
      project: evaluation.project,
    });

    // Vérifier si toutes les évaluations sont complétées (non en statut 'pending')
    const allPeerEvaluationsCompleted = projectEvaluations.every(
      (evalItem) => evalItem.status !== "pending",
    );

    const project = await Project.findById(evaluation.project);
    if (!project) {
      return res
        .status(404)
        .json({ error: "Projet non trouvé lors de la mise à jour du statut." });
    }

    if (allPeerEvaluationsCompleted) {
      // Si au moins une évaluation est 'rejected', le projet est 'rejected'
      const anyRejected = projectEvaluations.some(
        (evalItem) => evalItem.status === "rejected",
      );

      if (anyRejected) {
        project.status = "rejected";
        // Notifier l'étudiant que son projet a été rejeté par un évaluateur pair
        await Notification.create({
          user: project.student,
          type: "project_status_update",
          message: `Le statut de votre projet \'${project.title}\' est maintenant : Rejeté par un évaluateur pair. Veuillez revoir votre projet.`,
        });
      } else {
        // Si toutes les évaluations sont acceptées, le projet passe à l'état d'attente de l'évaluation du personnel
        project.status = "awaiting_staff_review";
        // Notifier TOUS les membres du personnel qu'un projet est prêt pour l'évaluation finale
        const staffUsers = await User.find({
          role: { $in: ["staff", "admin"] },
        });
        for (const staff of staffUsers) {
          await Notification.create({
            user: staff._id,
            type: "project_awaiting_staff_review",
            message: `Le projet \'${project.title}\' est en attente de votre évaluation finale.`,
          });
        }
        // Notifier l'apprenant que son projet est en attente d'évaluation par le personnel
        await Notification.create({
          user: project.student,
          type: "project_status_update",
          message: `Votre projet \'${project.title}\' a été validé par les pairs et est maintenant en attente de l'évaluation finale par le personnel.`,
        });
      }
    } else {
      // Si toutes les évaluations ne sont pas encore complètes, le statut du projet reste 'pending'
      project.status = "pending";
    }

    await project.save();

    res
      .status(200)
      .json({ message: "Évaluation soumise avec succès.", evaluation });
  } catch (e) {
    console.error('Error submitting evaluation:', e);
    res.status(500).json({ error: e.message });
  }
}
