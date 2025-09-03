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
      .populate("project") // Populate the entire project to access its assignments
      .populate("evaluator", "name")
      .populate("slot", "startTime endTime")
      .sort("-createdAt");

    const formattedEvaluations = evaluations.map(evalItem => {
      const project = evalItem.project;
      if (!project) return evalItem; // Handle case where project might be null (if deleted)

      const assignment = project.assignments.id(evalItem.assignment); // Find the specific assignment by its ID
      if (!assignment) return evalItem; // Handle case where assignment might be null

      // Construct a new object with the desired project and assignment details
      return {
        ...evalItem.toObject(),
        project: { // Only include necessary project master details
          _id: project._id,
          title: project.title,
          description: project.description,
          order: project.order,
          demoVideoUrl: project.demoVideoUrl,
          specifications: project.specifications,
          exerciseStatements: project.exerciseStatements,
          resourceLinks: project.resourceLinks,
          objectives: project.objectives,
          size: project.size,
        },
        assignment: { // Include specific assignment details
          _id: assignment._id,
          status: assignment.status,
          repoUrl: assignment.repoUrl,
          submissionDate: assignment.submissionDate,
          // Add other assignment fields as needed
        },
      };
    });

    res.status(200).json(formattedEvaluations);
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
      .populate("project") // Populate the entire project to access its assignments
      // .populate("student", "name") // Student will be populated via assignment
      .populate({
        path: "slot",
        select: "startTime endTime bookedByStudent bookedForProject bookedForAssignment", // Add bookedForAssignment
        populate: [
          { path: "bookedByStudent", select: "name" },
          { path: "bookedForProject", select: "title" },
        ],
      })
      .sort("slot.startTime");

    const formattedEvaluations = evaluations.map(evalItem => {
      const project = evalItem.project;
      if (!project) return evalItem; // Handle case where project might be null

      const assignment = project.assignments.id(evalItem.assignment); // Find the specific assignment by its ID
      if (!assignment) return evalItem; // Handle case where assignment might be null

      return {
        ...evalItem.toObject(),
        project: { // Only include necessary project master details
          _id: project._id,
          title: project.title,
          description: project.description,
          order: project.order,
          demoVideoUrl: project.demoVideoUrl,
          specifications: project.specifications,
          exerciseStatements: project.exerciseStatements,
          resourceLinks: project.resourceLinks,
          objectives: project.objectives,
          size: project.size,
        },
        assignment: { // Include specific assignment details
          _id: assignment._id,
          status: assignment.status,
          repoUrl: assignment.repoUrl,
          submissionDate: assignment.submissionDate,
          student: assignment.student, // Include student details from assignment
          // Add other assignment fields as needed
        },
        studentName: assignment.student ? assignment.student.name : 'N/A', // Pour compatibilité frontend
      };
    });

    res.status(200).json(formattedEvaluations);
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

    const evaluations = await Evaluation.find({
      // Nous cherchons des évaluations liées à des assignations avec les statuts pertinents
      // Le statut du projet maître lui-même est 'template'
      // Nous devons donc faire la correspondance via les assignations
    })
      .populate({
        path: "project",
        populate: {
          path: "assignments.student",
          select: "name email",
        },
      })
      .populate("evaluator", "name email")
      .populate("slot", "startTime endTime bookedByStudent bookedForProject bookedForAssignment") // Inclure bookedForAssignment
      .select("project assignment student evaluator slot status submissionDate") // Ajouter assignment
      .sort("slot.startTime");

    // Filtrer les évaluations pour ne retourner que celles liées à des assignations avec les statuts requis
    const filteredEvaluations = evaluations.filter(evalItem => {
      if (!evalItem.project) return false;
      const assignment = evalItem.project.assignments.id(evalItem.assignment);
      return assignment && (assignment.status === "pending" || assignment.status === "awaiting_staff_review");
    }).map(evalItem => {
        const project = evalItem.project;
        const assignment = project.assignments.id(evalItem.assignment);

        return {
          ...evalItem.toObject(),
          project: { // Détails du projet maître
            _id: project._id,
            title: project.title,
            description: project.description,
            order: project.order,
            // ... autres champs du projet maître
          },
          assignment: { // Détails de l'assignation spécifique
            _id: assignment._id,
            status: assignment.status,
            repoUrl: assignment.repoUrl,
            submissionDate: assignment.submissionDate,
            student: assignment.student, // L'apprenant est déjà peuplé via project.assignments.student
            // ... autres champs d'assignation
          },
          studentName: assignment.student ? assignment.student.name : 'N/A', // Pour compatibilité frontend
        };
    });

    res.status(200).json(filteredEvaluations);
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

    const evaluation = await Evaluation.findById(evaluationId).populate('project');

    if (!evaluation) {
      return res.status(404).json({ error: "Évaluation non trouvée." });
    }

    // Vérifier l'existence du projet maître et de l'assignation
    const project = evaluation.project;
    if (!project) {
      return res.status(404).json({ error: "Projet maître lié à l'évaluation non trouvé." });
    }
    const assignment = project.assignments.id(evaluation.assignment);
    if (!assignment) {
      return res.status(404).json({ error: "Assignation liée à l'évaluation non trouvée." });
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

    // Récupérer toutes les évaluations pour cette assignation spécifique
    const assignmentEvaluations = await Evaluation.find({
      assignment: assignment._id,
    });

    // Vérifier si toutes les évaluations sont complétées (non en statut 'pending')
    const allPeerEvaluationsCompleted = assignmentEvaluations.every(
      (evalItem) => evalItem.status !== "pending",
    );

    if (allPeerEvaluationsCompleted) {
      // Si au moins une évaluation est 'rejected', l'assignation est 'rejected'
      const anyRejected = assignmentEvaluations.some(
        (evalItem) => evalItem.status === "rejected",
      );

      if (anyRejected) {
        assignment.status = "rejected";
        // Notifier l'étudiant que son projet a été rejeté par un évaluateur pair
        await Notification.create({
          user: assignment.student,
          type: "project_status_update",
          message: `Le statut de votre projet \'${project.title}\' est maintenant : Rejeté par un évaluateur pair. Veuillez revoir votre projet.`,
        });
      } else {
        // Si toutes les évaluations sont acceptées, l'assignation passe à l'état d'attente de l'évaluation du personnel
        assignment.status = "awaiting_staff_review";
        // Notifier TOUS les membres du personnel qu'un projet est prêt pour l'évaluation finale
        const staffUsers = await User.find({
          role: { $in: ["staff", "admin"] },
        });
        for (const staff of staffUsers) {
          await Notification.create({
            user: staff._id,
            type: "project_awaiting_staff_review",
            message: `Le projet \'${project.title}\' soumis par ${assignment.student.name} est en attente de votre évaluation finale.`,
          });
        }
        // Notifier l'apprenant que son projet est en attente d'évaluation par le personnel
        await Notification.create({
          user: assignment.student,
          type: "project_status_update",
          message: `Votre projet \'${project.title}\' a été validé par les pairs et est maintenant en attente de l'évaluation finale par le personnel.`,
        });
      }
    } else {
      // Si toutes les évaluations ne sont pas encore complètes, le statut de l'assignation reste 'pending'
      assignment.status = "pending";
    }

    await project.save(); // Sauvegarder le projet maître pour persister les changements de l'assignation

    res
      .status(200)
      .json({ message: "Évaluation soumise avec succès.", evaluation });
  } catch (e) {
    console.error('Error submitting evaluation:', e);
    res.status(500).json({ error: e.message });
  }
}
