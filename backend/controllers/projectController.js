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
  const projects = await Project.find({
    student: req.user._id,
    status: { $in: ['assigned', 'pending', 'approved'] },
  })
    .sort({ createdAt: -1 })
    .populate('student', 'name') // Populer le nom de l'étudiant si besoin pour l'affichage
    .populate('templateProject', 'title order'); // Populer le projet template pour la déduplication
  res.json(projects);
}

// Nouvelle fonction pour lister TOUS les projets (pour staff/admin)
export async function listAllProjects(req, res) {
  try {
    const projects = await Project.find({})
      .populate('student', 'name email') // Populer les informations de l'étudiant assigné
      .populate('templateProject', 'title order') // Populer le projet template
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
    const { id } = req.params;
    const project = await Project.findById(id).populate('student', 'name');

    if (!project) {
      return res.status(404).json({ error: 'Projet non trouvé.' });
    }

    // S'assurer que l'apprenant ne peut voir que ses propres projets assignés ou terminés
    if (project.student && project.student.equals(req.user._id)) {
      res.status(200).json(project);
    } else {
      res.status(403).json({ error: 'Non autorisé à consulter ce projet.' });
    }
  } catch (e) {
    console.error("Error in getProjectDetails:", e);
    res.status(500).json({ error: e.message });
  }
}

// Nouvelle fonction pour un apprenant pour soumettre sa solution à un projet
export async function submitProjectSolution(req, res) {
  try {
    const { id } = req.params; // ID du projet (l'instance assignée à l'étudiant)
    const { repoUrl, selectedSlotIds } = req.body; // Maintenant, attend aussi les IDs des slots
    const studentId = req.user._id;

    // Vérifier si le projet existe et est assigné à cet étudiant
    const project = await Project.findOne({ _id: id, student: studentId });
    if (!project) {
      return res
        .status(404)
        .json({ error: 'Projet non trouvé ou non assigné à cet étudiant.' });
    }

    // S'assurer que le projet n'a pas déjà été soumis/approuvé/rejeté, et qu'il est en statut 'assigned'
    if (project.status !== 'assigned') {
      return res.status(400).json({
        error:
          'Ce projet n\'est pas en statut \'assigned\' et ne peut être soumis.',
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
      id,
      repoUrl,
    );
    if (slotsResult.error) {
      return res.status(400).json(slotsResult);
    }
    const slots = slotsResult.slots;
    // *** Fin de la logique des slots ***

    // Mettre à jour le projet avec l'URL du dépôt et la date de soumission
    project.repoUrl = repoUrl;
    project.submissionDate = new Date();
    project.status = 'pending'; // Le statut reste 'pending' après soumission
    await project.save();

    // Notifier le staff et les évaluateurs choisis et créer les évaluations
    const submittingStudent = await User.findById(studentId); // Récupérer le nom de l'apprenant
    await _createEvaluationsAndNotifications(
      id,
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
    const { id } = req.params;
    const p = await Project.findById(id);
    if (!p) return res.status(404).json({ error: 'Project not found' });
    if (p.status === 'approved') return res.json(p);
    p.status = 'approved';
    p.staffValidator = req.user._id;
    await p.save();
    // extend student days + increment level
    const student = await User.findById(p.student);
    student.daysRemaining += DAY_BONUS[p.size] || 1;
    student.level = Math.max(student.level, 1) + 1;
    
    // Incrémenter le nombre total de projets complétés
    student.totalProjectsCompleted = (student.totalProjectsCompleted || 0) + 1;

    // Logique pour attribuer des badges (Exemples)
    await _handleBadgeAttribution(student); // Appeler la fonction d'aide

    // Logique pour assigner le projet suivant
    // 1. Trouver le projet template actuel utilisé par le projet qui vient d'être approuvé
    const currentProjectTemplate = await Project.findById(p.templateProject);
    await _assignNextProjectToStudent(student, currentProjectTemplate);

    await student.save();
    res.json(p);
  } catch (e) {
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
      const assignedNextProject = await Project.create({
        title: nextProjectTemplate.title,
        description: nextProjectTemplate.description,
        specifications: nextProjectTemplate.specifications,
        demoVideoUrl: nextProjectTemplate.demoVideoUrl,
        exerciseStatements: nextProjectTemplate.exerciseStatements, // Inclure les énoncés d'exercice
        resourceLinks: nextProjectTemplate.resourceLinks, // Inclure les liens de ressources
        objectives: nextProjectTemplate.objectives, // Inclure les objectifs
        size: nextProjectTemplate.size,
        student: student._id,
        status: 'assigned',
        templateProject: nextProjectTemplate._id,
      });

      student.projects.push(assignedNextProject._id);
      // Ne pas sauvegarder l'étudiant ici, cela sera fait par la fonction appelante

      await Notification.create({
        user: student._id,
        type: 'project_assigned',
        message: `Un nouveau projet, \'${assignedNextProject.title}\', vous a été assigné après l'approbation de votre précédent projet.`, 
      });
      console.log(
        `Assigned next project \'${assignedNextProject.title}\' to ${student.name}.`,
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
    const { id } = req.params;
    const p = await Project.findByIdAndUpdate(
      id,
      { status: 'rejected' },
      { new: true },
    );
    res.json(p);
  } catch (e) {
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
    const { id } = req.params;
    const { title, description, repoUrl, size, peerEvaluators, exerciseStatements, resourceLinks, objectives } = req.body; // Ajout de objectives

    console.log(`[updateProject] Tentative de modification du projet avec ID: ${id} par l\'utilisateur: ${req.user._id} (${req.user.role})`);
    const project = await Project.findById(id);
    if (!project) {
      console.warn(`[updateProject] Projet non trouvé pour l\'ID: ${id}`);
      return res.status(404).json({ error: 'Projet non trouvé.' });
    }
    console.log(`[updateProject] Projet trouvé: ${project.title}, Student ID: ${project.student}, User Role: ${req.user.role}`);

    // Vérifier si l'utilisateur est un membre du personnel/admin OU le propriétaire du projet
    const isStaffOrAdmin = req.user.role === 'staff' || req.user.role === 'admin';
    const isOwner = project.student && project.student.equals(req.user._id);

    if (!isStaffOrAdmin && !isOwner) {
      console.warn(`[updateProject] Autorisation refusée pour l\'utilisateur ${req.user._id} sur le projet ${id}. Student ID: ${project.student}, User Role: ${req.user.role}. IsStaffOrAdmin: ${isStaffOrAdmin}, IsOwner: ${isOwner}`);
      return res
        .status(403)
        .json({ error: 'Vous n\'êtes pas autorisé à modifier ce projet.' });
    }

    if (repoUrl && !validateGithubUrl(repoUrl))
      return res.status(400).json({ error: 'URL GitHub invalide' });
    
    console.log(`[updateProject] Autorisation accordée. Mise à jour du projet ${project.title}`);
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { title, description, repoUrl, size, peerEvaluators, exerciseStatements, resourceLinks, objectives }, // Inclure objectives
      { new: true, runValidators: true },
    );

    res.json(updatedProject);
  } catch (e) {
    console.error("Error in updateProject:", e);
    res.status(500).json({ error: e.message });
  }
}

export async function deleteProject(req, res) {
  try {
    const { id } = req.params;

    console.log(`[deleteProject] Tentative de suppression du projet avec ID: ${id} par l\'utilisateur: ${req.user._id} (${req.user.role})`);
    const project = await Project.findById(id);
    if (!project) {
      console.warn(`[deleteProject] Projet non trouvé pour l\'ID: ${id}`);
      return res.status(404).json({ error: 'Projet non trouvé.' });
    }
    console.log(`[deleteProject] Projet trouvé: ${project.title}, Student ID: ${project.student}, User Role: ${req.user.role}`);

    // Vérifier si l'utilisateur est un membre du personnel/admin OU le propriétaire du projet
    const isStaffOrAdmin = req.user.role === 'staff' || req.user.role === 'admin';
    const isOwner = project.student && project.student.equals(req.user._id);

    if (!isStaffOrAdmin && !isOwner) {
      console.warn(`[deleteProject] Autorisation refusée pour l\'utilisateur ${req.user._id} sur le projet ${id}. Student ID: ${project.student}, User Role: ${req.user.role}. IsStaffOrAdmin: ${isStaffOrAdmin}, IsOwner: ${isOwner}`);
      return res
        .status(403)
        .json({ error: 'Vous n\'êtes pas autorisé à supprimer ce projet.' });
    }

    console.log(`[deleteProject] Autorisation accordée. Suppression du projet ${project.title}`);
    await Project.findByIdAndDelete(id);
    await Evaluation.deleteMany({ project: id }); // Supprimer toutes les évaluations associées

    res.status(200).json({ message: 'Projet supprimé avec succès.' });
  } catch (e) {
    console.error("Error in deleteProject:", e);
    res.status(500).json({ error: e.message });
  }
}

export async function assignProjectToStudent(req, res) {
  try {
    const { projectId, studentId } = req.body;

    // Vérifier si le projet template existe et qu'il a le statut 'assigned'
    const projectTemplate = await Project.findById(projectId);
    if (!projectTemplate || projectTemplate.status !== 'assigned') {
      return res
        .status(404)
        .json({ error: 'Project template not found or not assignable.' });
    }

    // Vérifier si l'étudiant existe
    const student = await User.findById(studentId);
    if (!student || student.role !== 'apprenant') {
      return res
        .status(404)
        .json({ error: 'Student not found or not an apprenant.' });
    }

    // Créer une copie du projet template pour l'étudiant
    const assignedProject = await Project.create({
      title: projectTemplate.title,
      description: projectTemplate.description,
      demoVideoUrl: projectTemplate.demoVideoUrl,
      specifications: projectTemplate.specifications,
      size: projectTemplate.size,
      student: studentId, // Assigner à l'étudiant
      status: 'assigned', // Statut initial pour l'apprenant (modifié de 'pending' à 'assigned')
      templateProject: projectTemplate._id, // Lier à l'ID du modèle de projet
      // repoUrl et submissionDate seront définis par l'apprenant
    });

    // Ajouter le projet au tableau des projets de l'étudiant
    student.projects.push(assignedProject._id);
    await student.save();

    // Notifier l'étudiant qu'un nouveau projet lui a été assigné
    await Notification.create({
      user: studentId,
      type: 'project_assigned',
      message: `Un nouveau projet, \'${assignedProject.title}\', vous a été assigné.`, // Notez les backticks ` ` pour les template literals
    });

    res.status(201).json({
      message: 'Project assigned successfully.',
      project: assignedProject,
    });
  } catch (e) {
    console.error("Error in assignProjectToStudent:", e);
    res.status(500).json({ error: e.message });
  }
}

// Nouvelle fonction pour l'évaluation finale par le personnel
export async function submitFinalStaffEvaluation(req, res) {
  try {
    const { id } = req.params; // ID du projet
    const { status } = req.body; // 'approved' ou 'rejected'
    const staffValidatorId = req.user._id;

    // Vérifier que l'utilisateur est un membre du personnel
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ error: 'Non autorisé à effectuer cette évaluation finale.' });
    }

    const project = await Project.findById(id).populate(
      'student',
      'name email',
    );

    if (!project) {
      return res.status(404).json({ error: 'Projet non trouvé.' });
    }

    // Le projet doit être en attente de l'évaluation du personnel
    if (project.status !== 'awaiting_staff_review') {
      return res.status(400).json({
        error:
          'Ce projet n\'est pas en attente d\'évaluation finale du personnel.',
      });
    }

    // Valider le statut
    if (!['approved', 'rejected'].includes(status)) {
      return res
        .status(400)
        .json({ error: 'Statut d\'évaluation finale invalide.' });
    }

    project.status = status;
    project.staffValidator = staffValidatorId;
    await project.save();

    // Logique si le projet est approuvé
    if (status === 'approved') {
      const student = await User.findById(project.student._id);
      if (student) {
        student.daysRemaining += DAY_BONUS[project.size] || 1;
        student.level = Math.max(student.level, 1) + 1;
        student.totalProjectsCompleted =
          (student.totalProjectsCompleted || 0) + 1;

        await _handleBadgeAttribution(student); // Appeler la fonction d'aide

        // Logique pour assigner le projet suivant
        const currentProjectTemplate = await Project.findById(
          project.templateProject,
        );
        await _assignNextProjectToStudent(student, currentProjectTemplate);

        await student.save();
      }
    } else if (status === 'rejected') {
      // Logique si le projet est rejeté
      const student = await User.findById(project.student._id);
      if (student) {
        project.status = 'assigned'; // Remettre le statut à 'assigned' pour que l'apprenant puisse resoumettre
        project.repoUrl = undefined; // Effacer l'URL du dépôt
        project.submissionDate = undefined; // Effacer la date de soumission
        await project.save();

        // Notifier l'apprenant du rejet et de la réassignation
        await Notification.create({
          user: student._id,
          type: 'project_rejected_reassigned',
          message: `Votre projet \'${project.title}\' a été rejeté par le personnel. Il vous a été réassigné pour que vous puissiez le retravailler et le soumettre à nouveau.`,
        });
        console.log(
          `Project \'${project.title}\' rejected and reassigned to ${student.name}.`,
        );
      }
    }

    // Notifier l'étudiant du résultat de l'évaluation finale
    await Notification.create({
      user: project.student._id,
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

    const projects = await Project.find({ status: 'awaiting_staff_review' })
      .populate('student', 'name email')
      .select('title description repoUrl student submissionDate') // Inclure repoUrl ici
      .sort({ submissionDate: 1 }); // Trier par date de soumission pour les plus anciens en premier

    res.status(200).json(projects);
  } catch (e) {
    console.error("Error in getProjectsAwaitingStaffReview:", e); // Log the full error object
    res.status(500).json({
      error:
        'Une erreur interne du serveur s\'est produite lors de la récupération des projets en attente de révision.',
      details: e.message,
    }); // Provide more detail
  }
}
