import Project from '../models/Project.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js'; // Importez le modèle Notification
import AvailabilitySlot from '../models/AvailabilitySlot.js'; // Importez le modèle AvailabilitySlot
import {
  validateGithubUrl,
  getRepoNameFromUrl,
} from '../utils/githubService.js'; // Importez getRepoNameFromUrl
import { sendMail } from '../utils/emailService.js'; // Importez la fonction sendMail
import Evaluation from '../models/Evaluation.js'; // Importez le modèle Evaluation
import Badge from '../models/Badge.js'; // Importez le modèle Badge

const DAY_BONUS = { short: 1, medium: 2, long: 3 };

export async function createProject(req, res) {
  try {
    // Staff creates a project template. student and repoUrl are not required at this stage.
    const {
      title,
      description,
      demoVideoUrl,
      specifications,
      size = 'short',
      order,
      exerciseStatements, // Ajout du champ exerciseStatements
      resourceLinks, // Ajout du champ resourceLinks
      objectives, // Ajout du champ objectives
    } = req.body;

    // Basic validation for template creation
    if (!title || !description || !order) {
      return res.status(400).json({
        error:
          'Title, description, and order are required for project templates.',
      });
    }

    // Projects created by staff are initially templates, assigned to no specific student
    // and have a status of 'assigned'.
    const project = await Project.create({ 
      title, 
      description, 
      demoVideoUrl, 
      specifications, 
      size, 
      status: 'template', // Le statut doit être 'template' pour les modèles de projet
      order, // Inclure l'ordre
      exerciseStatements, // Inclure les énoncés d'exercice
      resourceLinks, // Inclure les liens de ressources
      objectives, // Inclure les objectifs
      // student: null, // No student assigned initially
      // repoUrl: null, // No repo URL initially
    });

    res
      .status(201)
      .json({ message: 'Project template created successfully.', project });
  } catch (e) {
    console.error("Error in createProject (staff template creation):", e);
    res.status(500).json({ error: e.message });
  }
}

export async function listMyProjects(req, res) {
  const studentId = req.user._id;

  // 1. Trouver les projets où l'utilisateur est l'étudiant assigné
  const myAssignedProjects = await Project.find({
    "assignments.student": studentId,
    "assignments.status": { $in: ['assigned', 'pending', 'approved', 'rejected'] },
  })
    .populate({
      path: 'assignments.student',
      select: 'name',
    })
    .populate('templateProject', 'title order');

  // 2. Trouver les projets où l'utilisateur est un évaluateur désigné via les évaluations en attente
  const evaluationsToComplete = await Evaluation.find({
    evaluator: studentId,
    status: 'pending',
  })
    .populate({
      path: 'project',
      select: 'title order objectives description specifications resourceLinks exerciseStatements demoVideoUrl',
    })
    .populate({
      path: 'student',
      select: 'name',
    })
    .populate({
      path: 'assignment',
      select: 'status submissionDate repoUrl',
    });

  // Traiter les projets assignés pour l'utilisateur
  const formattedMyProjects = myAssignedProjects.flatMap(project => {
    return project.assignments
      .filter(assign => assign.student.equals(studentId))
      .map(assign => ({
        ...project.toObject(), // Copie du projet maître
        ...assign.toObject(),  // Fusionner les détails de l'assignation
        _id: assign._id,       // L'ID de l'assignation devient l'ID principal
        projectId: project._id, // L'ID du projet maître
        type: 'my_project',
      }));
  });

  // Traiter les évaluations à compléter par l'utilisateur comme des "Corrections à Venir"
  const formattedProjectsToEvaluate = evaluationsToComplete.map(evaluation => ({
    _id: evaluation._id, // L'ID de l'évaluation devient l'ID principal
    projectId: evaluation.project._id, // ID du projet maître
    assignmentId: evaluation.assignment._id, // ID de l'assignation
    title: evaluation.project.title, // Titre du projet
    description: evaluation.project.description,
    status: evaluation.status, // Statut de l'évaluation
    type: 'to_evaluate',
    studentToEvaluate: evaluation.student, // L'apprenant dont le projet doit être évalué
    repoUrl: evaluation.assignment.repoUrl, // URL du dépôt de l'assignation à évaluer
    submissionDate: evaluation.assignment.submissionDate, // Date de soumission de l'assignation à évaluer
    objectives: evaluation.project.objectives,
    specifications: evaluation.project.specifications,
    exerciseStatements: evaluation.project.exerciseStatements,
    resourceLinks: evaluation.project.resourceLinks,
    demoVideoUrl: evaluation.project.demoVideoUrl,
    order: evaluation.project.order,
  })).sort((a, b) => (a.order || 0) - (b.order || 0)); // Trier par ordre du projet maître

  // Combiner les deux listes, en gardant à l'esprit que ces listes seront utilisées séparément dans le frontend (dashboard)
  res.json([...formattedMyProjects, ...formattedProjectsToEvaluate]);
}

// Nouvelle fonction pour lister TOUS les projets (pour staff/admin)
export async function listAllProjects(req, res) {
  try {
    const projects = await Project.find({ status: 'template' }) // Lister uniquement les projets maîtres (templates)
      .populate({
        path: 'assignments.student',
        select: 'name email',
      })
      .populate({
        path: 'assignments.evaluations',
        populate: { path: 'evaluator', select: 'name' },
      })
      .sort({ createdAt: -1 });
    res.status(200).json(projects);
  } catch (e) {
    console.error("Error in listAllProjects:", e);
    res.status(500).json({ error: e.message });
  }
}

// Nouvelle fonction pour obtenir les détails d'un seul projet
export async function getProjectDetails(req, res) {
  try {
    const { id: projectId } = req.params; // ID du projet maître
    const { assignmentId } = req.query; // ID de l'assignation (optionnel pour les apprenants)

    const isStaffOrAdmin = req.user.role === 'staff' || req.user.role === 'admin';

    let project;
    if (assignmentId) {
      // Si une assignation spécifique est demandée (par un apprenant ou staff/admin)
      project = await Project.findOne(
        { _id: projectId, "assignments._id": assignmentId }
      )
      .populate({
        path: 'assignments.student',
        select: 'name email',
      })
      .populate({
        path: 'assignments.evaluations',
        populate: { path: 'evaluator', select: 'name' },
      });
    } else {
      // Si les détails du projet maître sont demandés (principalement par staff/admin)
      project = await Project.findById(projectId)
        .populate({
          path: 'assignments.student',
          select: 'name email',
        })
        .populate({
          path: 'assignments.evaluations',
          populate: { path: 'evaluator', select: 'name' },
        });
    }

    if (!project) {
      return res.status(404).json({ error: 'Projet non trouvé.' });
    }

    if (assignmentId) {
      const assignment = project.assignments.id(assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: 'Assignation non trouvée dans ce projet.' });
      }

      // Autorisation pour une assignation spécifique
      if (!isStaffOrAdmin && !assignment.student.equals(req.user._id)) {
        return res.status(403).json({ error: 'Non autorisé à consulter cette assignation.' });
      }
      // Retourner uniquement les détails de l'assignation si elle est spécifiée
      const projectDetails = project.toObject();
      projectDetails.assignments = [assignment.toObject()]; // Renvoyer l'assignation seule dans un tableau
      res.status(200).json(projectDetails);
    } else {
      // Autorisation pour le projet maître
      if (!isStaffOrAdmin) {
        // Pour les apprenants, ils ne peuvent voir un projet maître que s'ils y sont assignés.
        const hasAssignment = project.assignments.some(assign => assign.student.equals(req.user._id));
        if (!hasAssignment) {
          return res.status(403).json({ error: 'Non autorisé à consulter ce projet maître.' });
        }
      }
      // Si staff/admin ou apprenant assigné, renvoyer le projet maître complet
      res.status(200).json(project);
    }
  } catch (e) {
    console.error("Error in getProjectDetails:", e);
    res.status(500).json({ error: e.message });
  }
}

// Nouvelle fonction pour un apprenant pour soumettre sa solution à un projet
export async function submitProjectSolution(req, res) {
  try {
    const { id: projectId } = req.params; // ID du projet maître
    const { assignmentId, repoUrl, selectedSlotIds } = req.body; // Attendre l'ID de l'assignation
    const studentId = req.user._id;

    if (!assignmentId) {
      return res.status(400).json({ error: 'ID d\'assignation manquant.' });
    }

    // Trouver le projet maître et l'assignation spécifique
    const project = await Project.findOne({
      _id: projectId,
      "assignments._id": assignmentId,
      "assignments.student": studentId,
    });

    if (!project) {
      return res
        .status(404)
        .json({ error: 'Projet ou assignation non trouvé(e) pour cet étudiant.' });
    }

    const assignment = project.assignments.id(assignmentId);

    // S'assurer que l'assignation n'a pas déjà été soumise/approuvée/rejetée, et qu'elle est en statut 'assigned'
    if (assignment.status !== 'assigned') {
      return res.status(400).json({
        error:
          'Cette assignation n\'est pas en statut \'assigned\' et ne peut être soumise.',
      });
    }

    // Valider l'URL GitHub
    if (!repoUrl || !validateGithubUrl(repoUrl)) {
      return res.status(400).json({ error: 'URL GitHub invalide.' });
    }

    // *** Logique de validation et de réservation des slots ***
    const slotsResult = await _validateAndBookSlots(
      selectedSlotIds,
      studentId,
      projectId, // Passer l'ID du projet maître
      assignmentId, // Passer l'ID de l'assignation
      repoUrl,
    );
    if (slotsResult.error) {
      return res.status(400).json(slotsResult);
    }
    const slots = slotsResult.slots;
    // *** Fin de la logique des slots ***

    // Mettre à jour l'assignation spécifique avec l'URL du dépôt et la date de soumission
    assignment.repoUrl = repoUrl;
    assignment.submissionDate = new Date();
    assignment.status = 'pending'; // Le statut de l'assignation devient 'pending' après soumission
    assignment.peerEvaluators = slots.map(slot => slot.evaluator._id); // Ajouter les évaluateurs désignés
    await project.save(); // Sauvegarder le projet maître pour persister les changements dans l'assignation

    // Notifier le staff et les évaluateurs choisis et créer les évaluations
    const submittingStudent = await User.findById(studentId); // Récupérer le nom de l'apprenant
    await _createEvaluationsAndNotifications(
      projectId, // Passer l'ID du projet maître
      assignmentId, // Passer l'ID de l'assignation
      studentId,
      project.title,
      repoUrl,
      slots,
      submittingStudent,
    );

    res.status(200).json({
      message: 'Projet soumis avec succès et slots réservés !',
      project,
    });
  } catch (e) {
    console.error("Error in submitProjectSolution:", e);
    res.status(500).json({ error: e.message });
  }
}

// Nouvelle fonction pour obtenir le titre d'un dépôt GitHub
export async function getGithubRepoTitle(req, res) {
  try {
    const { repoUrl } = req.query;

    if (!repoUrl) {
      return res.status(400).json({ error: 'URL de dépôt GitHub manquante.' });
    }

    if (!validateGithubUrl(repoUrl)) {
      return res.status(400).json({ error: 'URL GitHub invalide.' });
    }

    const repoName = getRepoNameFromUrl(repoUrl);

    if (!repoName) {
      return res
        .status(400)
        .json({ error: 'Impossible d\'extraire le nom du dépôt de l\'URL.' });
    }

    // Dans un cas réel, vous pourriez vouloir appeler l'API GitHub ici
    // pour obtenir le titre exact et d'autres métadonnées.
    // Pour l'instant, nous utilisons simplement le nom du dépôt comme titre.
    res.status(200).json({
      title: repoName
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
    });
  } catch (e) {
    console.error("Error in getGithubRepoTitle:", e);
    res.status(500).json({ error: e.message });
  }
}

export async function approveProject(req, res) {
  try {
    const { id: projectId } = req.params; // ID du projet maître
    const { assignmentId } = req.body; // ID de l'assignation à approuver

    if (!assignmentId) {
      return res.status(400).json({ error: 'ID d\'assignation manquant.' });
    }

    // Vérifier que l'utilisateur est un membre du personnel/admin
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Non autorisé à approuver des projets.',
      });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Projet maître non trouvé.' });

    const assignment = project.assignments.id(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignation non trouvée dans ce projet.' });
    }

    if (assignment.status === 'approved') return res.json(project); // Déjà approuvé

    assignment.status = 'approved';
    assignment.staffValidator = req.user._id;
    await project.save(); // Sauvegarder le projet maître pour mettre à jour l'assignation

    // extend student days + increment level
    const student = await User.findById(assignment.student);
    if (student) {
      student.daysRemaining += DAY_BONUS[project.size] || 1; // Utiliser la taille du projet maître
      student.level = Math.max(student.level, 1) + 1;
      
      // Incrémenter le nombre total de projets complétés
      student.totalProjectsCompleted = (student.totalProjectsCompleted || 0) + 1;

      // Logique pour attribuer des badges (Exemples)
      await _handleBadgeAttribution(student); // Appeler la fonction d'aide

      // Logique pour assigner le projet suivant
      // 1. Trouver le projet template actuel utilisé par le projet qui vient d'être approuvé
      // Le currentProjectTemplate est le projet maître lui-même
      await _assignNextProjectToStudent(student, project);

      await student.save();
    }
    
    // Notifier l'étudiant du résultat de l'évaluation finale
    await Notification.create({
      user: assignment.student._id,
      type: 'project_status_update',
      message: `Votre projet \'${project.title}\' a été approuvé ! Félicitations !`,
    });

    res.json(project);
  } catch (e) {
    console.error("Error in approveProject:", e);
    res.status(500).json({ error: e.message });
  }
}

// Fonction d'aide pour attribuer des badges
async function _handleBadgeAttribution(student) {
    if (student.totalProjectsCompleted === 1) {
    const firstProjectBadge = await Badge.findOne({
      name: 'Premier Projet Validé',
    });
      if (firstProjectBadge && !student.badges.includes(firstProjectBadge._id)) {
        student.badges.push(firstProjectBadge._id);
      await Notification.create({
        user: student._id,
        type: 'badge_earned',
        message: `Félicitations ! Vous avez gagné le badge \'${firstProjectBadge.name}\'.`,
      });
      }
    }

    if (student.totalProjectsCompleted === 5) {
    const fiveProjectsBadge = await Badge.findOne({
      name: 'Cinq Projets Complétés',
    });
      if (fiveProjectsBadge && !student.badges.includes(fiveProjectsBadge._id)) {
        student.badges.push(fiveProjectsBadge._id);
      await Notification.create({
        user: student._id,
        type: 'badge_earned',
        message: `Excellent travail ! Vous avez gagné le badge \'${fiveProjectsBadge.name}\'.`,
      });
    }
  }
  await student.save(); // Sauvegarder l'étudiant après attribution des badges
}

// Fonction d'aide pour créer les évaluations et envoyer les notifications
async function _createEvaluationsAndNotifications(
  projectId,
  assignmentId,
  studentId,
  projectTitle,
  repoUrl,
  slots,
  submittingStudent,
) {
  const evaluatorNames = slots.map((slot) => slot.evaluator.name).join(' et ');

  for (const slot of slots) {
    await Evaluation.create({
      project: projectId,
      assignment: assignmentId, // Ajouter l'ID de l'assignation ici
      student: studentId,
      evaluator: slot.evaluator._id,
      slot: slot._id,
      status: 'pending',
      feedback: {},
    });

    console.log(
      `Created evaluation for evaluator ${slot.evaluator._id} and project ${projectId}`,
    );

    await Notification.create({
      user: slot.evaluator._id,
      type: 'evaluation_slot_booked',
      message: `Votre slot le ${new Date(slot.startTime).toLocaleString()} a été choisi par ${submittingStudent.name} pour évaluer le projet \'${projectTitle}\'. Dépôt: ${repoUrl}`,
    });
  }

  const staffUsers = await User.find({ role: { $in: ['staff', 'admin'] } });
  for (const staff of staffUsers) {
    await Notification.create({
      user: staff._id,
      type: 'project_submission',
      message: `Le projet \'${projectTitle}\' a été soumis par ${submittingStudent.name}. Les évaluateurs choisis sont ${evaluatorNames}. Dépôt: ${repoUrl}`,
    });
  }
}

// Fonction d'aide pour valider et réserver les slots
async function _validateAndBookSlots(
  selectedSlotIds,
  studentId,
  projectId,
  assignmentId,
  repoUrl,
) {
  // Supprimer 'res' des paramètres
  if (
    !selectedSlotIds ||
    !Array.isArray(selectedSlotIds) ||
    selectedSlotIds.length !== 2
  ) {
    return {
      error: 'Vous devez sélectionner exactement deux slots de disponibilité.',
    };
  }

  const slots = await AvailabilitySlot.find({
    _id: { $in: selectedSlotIds },
  }).populate('evaluator', 'name');

  if (slots.length !== 2) {
    return { error: 'Certains slots sélectionnés sont introuvables.' };
  }

  for (const slot of slots) {
    if (slot.isBooked) {
      return {
        error: `Le slot ${new Date(slot.startTime).toLocaleString()} est déjà réservé.`,
      };
    }
    if (slot.evaluator._id.equals(studentId)) {
      return {
        error: 'Vous ne pouvez pas choisir votre propre slot de disponibilité.',
      };
    }
  }

  if (slots[0].evaluator._id.equals(slots[1].evaluator._id)) {
    return {
      error: 'Vous devez choisir des slots de deux évaluateurs différents.',
    };
  }

  const diffMs = Math.abs(
    new Date(slots[0].startTime).getTime() -
      new Date(slots[1].startTime).getTime(),
  );
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 45) {
    return {
      error:
        'Les slots choisis doivent avoir un décalage d\'au moins 45 minutes.',
    };
  }

  for (const slot of slots) {
    slot.isBooked = true;
    slot.bookedByStudent = studentId;
    slot.bookedForProject = projectId;
    slot.bookedForAssignment = assignmentId; // Ajouter l'ID de l'assignation
    await slot.save();
  }
  return { slots }; // Retourner les slots dans un objet
}

// Fonction d'aide pour assigner le prochain projet à un étudiant
async function _assignNextProjectToStudent(student, currentProjectTemplate) {
  if (currentProjectTemplate && currentProjectTemplate.order) {
    const nextProjectTemplate = await Project.findOne({
      status: 'template',
      order: currentProjectTemplate.order + 1,
    });

    if (nextProjectTemplate) {
      // Vérifier si l'étudiant est déjà assigné à ce projet template
      const existingAssignment = nextProjectTemplate.assignments.some(assign => assign.student.equals(student._id));
      if (existingAssignment) {
        console.log(`L\'étudiant ${student.name} est déjà assigné au projet ${nextProjectTemplate.title}.`);
        return; // Ne pas réassigner le même projet
      }

      // Ajouter une nouvelle assignation au tableau d'assignations du projet maître suivant
      nextProjectTemplate.assignments.push({
        student: student._id,
        status: 'assigned',
        repoUrl: "",
        evaluations: [],
        peerEvaluators: [],
        staffValidator: null,
      });
      await nextProjectTemplate.save();

      // Ajouter une référence au projet maître dans les projets de l'étudiant si elle n'est pas déjà présente
      if (!student.projects.includes(nextProjectTemplate._id)) {
        student.projects.push(nextProjectTemplate._id);
      }
      // La sauvegarde de l'étudiant sera gérée par la fonction appelante (approveProject ou submitFinalStaffEvaluation)

      await Notification.create({
        user: student._id,
        type: 'project_assigned',
        message: `Un nouveau projet, \'${nextProjectTemplate.title}\', vous a été assigné après l'approbation de votre précédent projet.`, 
      });
      console.log(
        `Assigned next project \'${nextProjectTemplate.title}\' to ${student.name} by adding to assignments array.`,
      );
    } else {
      console.log(
        `No next project template found to assign to ${student.name}.`,
      );
    }
  }
}

export async function rejectProject(req, res) {
  try {
    const { id: projectId } = req.params; // ID du projet maître
    const { assignmentId } = req.body; // ID de l'assignation à rejeter

    if (!assignmentId) {
      return res.status(400).json({ error: 'ID d\'assignation manquant.' });
    }

    // Vérifier que l'utilisateur est un membre du personnel/admin
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Non autorisé à rejeter des projets.',
      });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Projet maître non trouvé.' });

    const assignment = project.assignments.id(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignation non trouvée dans ce projet.' });
    }

    if (assignment.status === 'rejected') return res.json(project); // Déjà rejeté

    assignment.status = 'rejected';
    assignment.repoUrl = undefined; // Effacer l'URL du dépôt
    assignment.submissionDate = undefined; // Effacer la date de soumission
    assignment.staffValidator = req.user._id; // Enregistrer qui a rejeté
    await project.save(); // Sauvegarder le projet maître pour mettre à jour l'assignation

    // Notifier l'étudiant du rejet
    await Notification.create({
      user: assignment.student._id,
      type: 'project_status_update',
      message: `Votre projet \'${project.title}\' a été rejeté par le personnel. Il vous a été réassigné pour que vous puissiez le retravailler et le soumettre à nouveau.`,
    });

    res.json(project);
  } catch (e) {
    console.error("Error in rejectProject:", e);
    res.status(500).json({ error: e.message });
  }
}

export async function submitPeerEvaluation(req, res) {
  try {
    const { id } = req.params; // project ID
    const { score, comments } = req.body;
    const evaluatorId = req.user._id;

    // Vérifier si le projet existe
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ error: 'Projet non trouvé.' });

    // Vérifier si l'utilisateur est un évaluateur désigné pour ce projet
    const isPeerEvaluator = project.peerEvaluators.some((peer) =>
      peer.equals(evaluatorId),
    );
    const isStaffOrAdmin =
      req.user.role === 'staff' || req.user.role === 'admin';

    if (!isPeerEvaluator && !isStaffOrAdmin) {
      return res
        .status(403)
        .json({ error: 'Vous n\'êtes pas autorisé à évaluer ce projet.' });
    }

    // Vérifier si l'évaluateur a déjà soumis une évaluation pour ce projet
    const existingEvaluation = await Evaluation.findOne({
      project: id,
      evaluator: evaluatorId,
    });
    if (existingEvaluation) {
      return res.status(400).json({
        error: 'Vous avez déjà soumis une évaluation pour ce projet.',
      });
    }

    // Créer la nouvelle évaluation
    const evaluation = await Evaluation.create({
      project: id,
      evaluator: evaluatorId,
      score,
      comments,
    });

    res
      .status(201)
      .json({ message: 'Évaluation soumise avec succès.', evaluation });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function updateProject(req, res) {
  try {
    const { id: projectId } = req.params; // ID du projet maître
    const { assignmentId, title, description, demoVideoUrl, specifications, size, order, exerciseStatements, resourceLinks, objectives, repoUrl } = req.body; // Inclure assignmentId et repoUrl ici

    console.log(`[updateProject] Tentative de modification du projet avec ID: ${projectId}, Assignment ID: ${assignmentId} par l\'utilisateur: ${req.user._id} (${req.user.role})`);

    const project = await Project.findById(projectId);
    if (!project) {
      console.warn(`[updateProject] Projet maître non trouvé pour l\'ID: ${projectId}`);
      return res.status(404).json({ error: 'Projet maître non trouvé.' });
    }

    const isStaffOrAdmin = req.user.role === 'staff' || req.user.role === 'admin';

    if (assignmentId) {
      // Logique pour modifier une assignation spécifique
      const assignment = project.assignments.id(assignmentId);
      if (!assignment) {
        console.warn(`[updateProject] Assignation non trouvée pour l\'ID: ${assignmentId} dans le projet ${projectId}`);
        return res.status(404).json({ error: 'Assignation non trouvée.' });
      }

      // Un étudiant ne peut modifier que son repoUrl et si le statut est 'assigned' ou 'rejected'
      const isStudentOwner = assignment.student.equals(req.user._id);
      if (!isStaffOrAdmin && (!isStudentOwner || (assignment.status !== 'assigned' && assignment.status !== 'rejected'))) {
        console.warn(`[updateProject] Autorisation refusée pour l\'utilisateur ${req.user._id} sur l\'assignation ${assignmentId}. Student ID: ${assignment.student}, User Role: ${req.user.role}, Assignment Status: ${assignment.status}`);
        return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à modifier cette assignation.' });
      }

      if (repoUrl !== undefined) {
        if (!validateGithubUrl(repoUrl)) {
          return res.status(400).json({ error: 'URL GitHub invalide.' });
        }
        assignment.repoUrl = repoUrl; // Mettre à jour seulement repoUrl pour l'assignation
      }

      // Le staff/admin peut modifier le statut d'une assignation directement ici si nécessaire, ou d'autres champs d'assignation.
      // Pour l'instant, on se concentre sur repoUrl pour l'étudiant.

      await project.save(); // Sauvegarder le projet maître pour persister les changements dans l'assignation

      console.log(`[updateProject] Assignation ${assignmentId} mise à jour avec succès.`);
      return res.status(200).json({ message: 'Assignation mise à jour avec succès.', assignment });

    } else {
      // Logique pour modifier le projet maître (seulement par staff/admin)
      if (!isStaffOrAdmin) {
        console.warn(`[updateProject] Autorisation refusée pour l\'utilisateur ${req.user._id} sur le projet maître ${projectId}. User Role: ${req.user.role}`);
        return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à modifier ce projet maître.' });
      }

      // Mettre à jour les champs du projet maître
      project.title = title !== undefined ? title : project.title;
      project.description = description !== undefined ? description : project.description;
      project.demoVideoUrl = demoVideoUrl !== undefined ? demoVideoUrl : project.demoVideoUrl;
      project.specifications = specifications !== undefined ? specifications : project.specifications;
      project.size = size !== undefined ? size : project.size;
      project.order = order !== undefined ? order : project.order;
      project.exerciseStatements = exerciseStatements !== undefined ? exerciseStatements : project.exerciseStatements;
      project.resourceLinks = resourceLinks !== undefined ? resourceLinks : project.resourceLinks;
      project.objectives = objectives !== undefined ? objectives : project.objectives;

      await project.save();

      console.log(`[updateProject] Projet maître ${projectId} mis à jour avec succès.`);
      return res.status(200).json({ message: 'Projet maître mis à jour avec succès.', project });
    }

  } catch (e) {
    console.error("Error in updateProject:", e);
    res.status(500).json({ error: e.message });
  }
}

export async function deleteProject(req, res) {
  try {
    const { id: projectId } = req.params; // ID du projet maître
    const { assignmentId } = req.body; // ID de l'assignation (optionnel)

    console.log(`[deleteProject] Tentative de suppression du projet avec ID: ${projectId}, Assignment ID: ${assignmentId || 'N/A'} par l\'utilisateur: ${req.user._id} (${req.user.role})`);

    const project = await Project.findById(projectId);
    if (!project) {
      console.warn(`[deleteProject] Projet maître non trouvé pour l\'ID: ${projectId}`);
      return res.status(404).json({ error: 'Projet non trouvé.' });
    }

    const isStaffOrAdmin = req.user.role === 'staff' || req.user.role === 'admin';

    if (assignmentId) {
      // Supprimer une assignation spécifique
      const assignment = project.assignments.id(assignmentId);
      if (!assignment) {
        console.warn(`[deleteProject] Assignation non trouvée pour l\'ID: ${assignmentId} dans le projet ${projectId}`);
        return res.status(404).json({ error: 'Assignation non trouvée.' });
      }

      // Seul le staff/admin peut supprimer une assignation
      if (!isStaffOrAdmin) {
        console.warn(`[deleteProject] Autorisation refusée pour l\'utilisateur ${req.user._id} sur l\'assignation ${assignmentId}. User Role: ${req.user.role}`);
        return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à supprimer cette assignation.' });
      }

      // Supprimer les évaluations associées à cette assignation
      await Evaluation.deleteMany({ assignment: assignmentId });

      assignment.remove(); // Supprimer le sous-document de l'assignation
      await project.save(); // Sauvegarder le projet maître

      console.log(`[deleteProject] Assignation ${assignmentId} supprimée avec succès du projet ${projectId}.`);
      return res.status(200).json({ message: 'Assignation supprimée avec succès.' });

    } else {
      // Supprimer un projet maître complet
      // Seul le staff/admin peut supprimer un projet maître
      if (!isStaffOrAdmin) {
        console.warn(`[deleteProject] Autorisation refusée pour l\'utilisateur ${req.user._id} sur le projet maître ${projectId}. User Role: ${req.user.role}`);
        return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à supprimer ce projet maître.' });
      }

      // Supprimer toutes les évaluations associées à toutes les assignations de ce projet maître
      const assignmentIds = project.assignments.map(assign => assign._id);
      await Evaluation.deleteMany({ assignment: { $in: assignmentIds } });

      await Project.findByIdAndDelete(projectId); // Supprimer le projet maître

      // Mettre à jour les références dans les documents utilisateur
      await User.updateMany(
        { projects: projectId },
        { $pull: { projects: projectId } }
      );

      console.log(`[deleteProject] Projet maître ${projectId} et toutes ses assignations/évaluations supprimés avec succès.`);
      return res.status(200).json({ message: 'Projet maître et toutes ses assignations supprimés avec succès.' });
    }

  } catch (e) {
    console.error("Error in deleteProject:", e);
    res.status(500).json({ error: e.message });
  }
}

export async function assignProjectToStudent(req, res) {
  try {
    const { projectId, studentId } = req.body;

    // Vérifier si le projet template existe
    const projectTemplate = await Project.findById(projectId);
    if (!projectTemplate || projectTemplate.status !== 'template') { // Vérifier status: 'template'
      return res
        .status(404)
        .json({ error: 'Projet maître non trouvé ou n\'est pas un template.' });
    }

    // Vérifier si l'étudiant existe
    const student = await User.findById(studentId);
    if (!student || student.role !== 'apprenant') {
      return res
        .status(404)
        .json({ error: 'Apprenant non trouvé ou n\'est pas un apprenant.' });
    }

    // Vérifier si l'apprenant est déjà assigné à ce projet maître
    const existingAssignment = projectTemplate.assignments.some(assign => assign.student.equals(studentId));
    if (existingAssignment) {
      return res.status(400).json({ error: 'L\'apprenant est déjà assigné à ce projet.' });
    }

    // Ajouter une nouvelle assignation au tableau d'assignations du projet maître
    projectTemplate.assignments.push({
      student: studentId,
      status: 'assigned',
      repoUrl: "", // Initialisé vide
      evaluations: [],
      peerEvaluators: [],
      staffValidator: null,
    });
    await projectTemplate.save();

    // Ajouter une référence au projet maître dans les projets de l'étudiant si elle n'est pas déjà présente
    if (!student.projects.includes(projectTemplate._id)) {
      student.projects.push(projectTemplate._id);
      await student.save();
    }

    // Notifier l'étudiant qu'un nouveau projet lui a été assigné
    await Notification.create({
      user: studentId,
      type: 'project_assigned',
      message: `Un nouveau projet, \'${projectTemplate.title}\', vous a été assigné.`, // Notez les backticks ` ` pour les template literals
    });

    res.status(201).json({
      message: 'Project assigned successfully.',
      project: projectTemplate,
    });
  } catch (e) {
    console.error("Error in assignProjectToStudent:", e);
    res.status(500).json({ error: e.message });
  }
}

// Nouvelle fonction pour l'évaluation finale par le personnel
export async function submitFinalStaffEvaluation(req, res) {
  try {
    const { id: projectId } = req.params; // ID du projet maître
    const { assignmentId, status } = req.body; // ID de l'assignation et statut final
    const staffValidatorId = req.user._id;

    if (!assignmentId) {
      return res.status(400).json({ error: 'ID d\'assignation manquant.' });
    }

    // Vérifier que l'utilisateur est un membre du personnel/admin
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ error: 'Non autorisé à effectuer cette évaluation finale.' });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Projet maître non trouvé.' });
    }

    const assignment = project.assignments.id(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignation non trouvée dans ce projet.' });
    }

    // L'assignation doit être en attente de l'évaluation du personnel
    if (assignment.status !== 'awaiting_staff_review') {
      return res.status(400).json({
        error:
          'Cette assignation n\'est pas en attente d\'évaluation finale du personnel.',
      });
    }

    // Valider le statut
    if (!['approved', 'rejected'].includes(status)) {
      return res
        .status(400)
        .json({ error: 'Statut d\'évaluation finale invalide.' });
    }

    assignment.status = status;
    assignment.staffValidator = staffValidatorId;
    await project.save(); // Sauvegarder le projet maître pour persister les changements de l'assignation

    // Logique si le projet est approuvé
    if (status === 'approved') {
      const student = await User.findById(assignment.student);
      if (student) {
        student.daysRemaining += DAY_BONUS[project.size] || 1;
        student.level = Math.max(student.level, 1) + 1;
        student.totalProjectsCompleted =
          (student.totalProjectsCompleted || 0) + 1;

        await _handleBadgeAttribution(student); // Appeler la fonction d'aide

        // Logique pour assigner le projet suivant
        await _assignNextProjectToStudent(student, project); // Passer le projet maître

        await student.save();
      }
    } else if (status === 'rejected') {
      // Logique si le projet est rejeté
      // Remettre le statut à 'assigned' pour que l'apprenant puisse retravailler
      assignment.status = 'assigned';
      assignment.repoUrl = undefined; // Effacer l'URL du dépôt
      assignment.submissionDate = undefined; // Effacer la date de soumission
      await project.save(); // Sauvegarder le projet maître

      const student = await User.findById(assignment.student);
      if (student) {
        // Notifier l'apprenant du rejet et de la réassignation
        await Notification.create({
          user: student._id,
          type: 'project_rejected_reassigned',
          message: `Votre projet \'${project.title}\' a été rejeté par le personnel. Il vous a été réassigné pour que vous puissiez le retravailler et le soumettre à nouveau.`,
        });
        console.log(
          `Assignation du projet \'${project.title}\' rejetée et réassignée à ${student.name}.`,
        );
      }
    }

    // Notifier l'étudiant du résultat de l'évaluation finale
    await Notification.create({
      user: assignment.student._id,
      type: 'project_status_update',
      message: `Le statut final de votre projet \'${project.title}\' est maintenant : ${status === 'approved' ? 'Approuvé' : 'Rejeté'}.`,
    });

    res.status(200).json({
      message: `Projet ${status === 'approved' ? 'approuvé' : 'rejeté'} par le personnel avec succès.`,
      project,
    });
  } catch (e) {
    console.error("Error in submitFinalStaffEvaluation:", e);
    res.status(500).json({ error: e.message });
  }
}

// Nouvelle fonction pour récupérer les projets en attente de révision par le personnel
export async function getProjectsAwaitingStaffReview(req, res) {
  try {
    // Seuls le staff et les administrateurs peuvent voir cette liste
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ error: 'Non autorisé à consulter cette ressource.' });
    }

    const projects = await Project.find({
      "assignments.status": 'awaiting_staff_review',
    })
      .populate({
        path: 'assignments.student',
        select: 'name email',
      })
      .populate({
        path: 'assignments.evaluations',
        populate: { path: 'evaluator', select: 'name' },
      })
      .sort({ "assignments.submissionDate": 1 }); // Trier par date de soumission de l'assignation

    // Filtrer les projets pour ne retourner que les assignations en attente de révision
    const awaitingReviewAssignments = [];
    projects.forEach(project => {
      project.assignments.forEach(assignment => {
        if (assignment.status === 'awaiting_staff_review') {
          awaitingReviewAssignments.push({
            projectId: project._id,
            projectTitle: project.title,
            assignmentId: assignment._id,
            student: assignment.student,
            repoUrl: assignment.repoUrl,
            submissionDate: assignment.submissionDate,
            evaluations: assignment.evaluations,
            // Inclure d'autres détails si nécessaire
          });
        }
      });
    });

    res.status(200).json(awaitingReviewAssignments);
  } catch (e) {
    console.error("Error in getProjectsAwaitingStaffReview:", e); // Log the full error object
    res.status(500).json({
      error:
        'Une erreur interne du serveur s\'est produite lors de la récupération des projets en attente de révision.',
      details: e.message,
    }); // Provide more detail
  }
}
