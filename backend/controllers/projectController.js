import Project from '../models/Project.js';
import AvailabilitySlot from '../models/AvailabilitySlot.js';
import User from '../models/User.js';
import Evaluation from '../models/Evaluation.js';
// import Notification from '../models/Notification.js'; // Décommenter si vous avez un modèle Notification
// import Badge from '../models/Badge.js'; // Décommenter si vous avez un modèle Badge

const DAY_BONUS = { short: 1, medium: 2, long: 3 };

// Fonctions utilitaires
function validateGithubUrl(url) {
  return /^https:\/\/github\.com\/[^/]+\/[^/]+(\.git)?$/.test(url);
}

async function _validateAndBookSlots(selectedSlotIds, studentId, projectId, assignmentId) {
  if (!selectedSlotIds || selectedSlotIds.length === 0) {
    return { error: 'Aucun créneau sélectionné.' };
  }

  const now = new Date();

  const slots = await AvailabilitySlot.find({
    _id: { $in: selectedSlotIds },
    isBooked: false,
    startTime: { $gt: now },
    evaluator: { $ne: studentId } // L'étudiant ne peut pas s'évaluer lui-même
  }).populate('evaluator', 'name');

  if (slots.length !== selectedSlotIds.length) {
    return { error: 'Un ou plusieurs créneaux sélectionnés sont invalides ou déjà réservés.' };
  }

  const uniqueEvaluators = new Set(slots.map(slot => slot.evaluator._id.toString()));
  if (uniqueEvaluators.size < 2) {
    return { error: 'Au moins 2 évaluateurs différents sont nécessaires.' };
  }

  for (const slot of slots) {
    slot.isBooked = true;
    slot.bookedByStudent = studentId;
    slot.bookedForProject = projectId;
    await slot.save();
  }

  return { slots };
}

// Nouvelle fonction utilitaire pour assigner un projet en fonction du niveau de l'étudiant
async function _assignProjectByLevel(studentId, level) {
  try {
    const student = await User.findById(studentId);
    if (!student) {
      console.error(`Apprenant non trouvé pour l'ID: ${studentId}`);
      return { error: 'Apprenant non trouvé.' };
    }

    const projectTemplate = await Project.findOne({
      status: 'template',
      order: level,
    });

    if (!projectTemplate) {
      console.warn(`Aucun projet template trouvé pour l'ordre: ${level}`);
      return { error: `Aucun projet template trouvé pour le niveau ${level}.` };
    }

    const existingAssignment = projectTemplate.assignments.some(assign => assign.student.equals(studentId));
    if (existingAssignment) {
      console.log(`L'apprenant ${studentId} est déjà assigné au projet ${projectTemplate.title}.`);
      return { message: `L'apprenant est déjà assigné au projet ${projectTemplate.title}.` };
    }

    projectTemplate.assignments.push({
      student: studentId,
      status: 'assigned',
      repoUrl: '',
      evaluations: [],
      peerEvaluators: [],
      staffValidator: null,
    });
    await projectTemplate.save();

    if (!student.projects.includes(projectTemplate._id)) {
      student.projects.push(projectTemplate._id);
      await student.save();
    }

    // TODO: Notifier l'étudiant (si Notification modèle est décommenté)
    console.log(`Projet '${projectTemplate.title}' (ordre ${level}) assigné avec succès à l'apprenant ${student.name}.`);
    return { message: 'Projet assigné avec succès.', project: projectTemplate };
  } catch (e) {
    console.error(`Error assigning project by level to student ${studentId} for level ${level}:`, e);
    return { error: 'Erreur interne du serveur lors de l\'assignation du projet.' };
  }
}

// Fonctions de contrôleur de projet
export async function createProject(req, res) {
  try {
    const { title, description, specifications, objectives, exerciseStatements, resourceLinks, demoVideoUrl, size } = req.body;

    const newProject = await Project.create({
      title,
      description,
      specifications,
      objectives,
      exerciseStatements,
      resourceLinks,
      demoVideoUrl,
      size,
      status: 'template',
    });

    res.status(201).json({ message: 'Projet template créé avec succès.', project: newProject });
  } catch (e) {
    console.error('Error creating project template:', e);
    res.status(500).json({ error: e.message });
  }
}

export async function getProjects(req, res) {
  try {
    const projects = await Project.find({ status: 'template' });
    res.status(200).json(projects);
  } catch (e) {
    console.error('Error fetching projects:', e);
    res.status(500).json({ error: e.message });
  }
}

export async function getStudentProjects(req, res) {
  try {
    const studentId = req.user._id;

    const projects = await Project.find({ "assignments.student": studentId }).populate({
      path: 'assignments.student',
      select: 'name'
    });

    const studentProjects = projects.map(project => {
      const studentAssignment = project.assignments.find(assignment => assignment.student._id.equals(studentId));
      if (studentAssignment) {
        return {
          _id: studentAssignment._id, // L'ID de l'assignation devient l'ID principal
          projectId: project._id, // Ajout de l'ID du projet maître
          title: project.title,
          description: project.description,
          status: project.status, // Statut du projet maître
          assignmentId: studentAssignment._id,
          assignmentStatus: studentAssignment.status,
          repoUrl: studentAssignment.repoUrl,
          submissionDate: studentAssignment.submissionDate,
          evaluations: studentAssignment.evaluations,
          peerEvaluators: studentAssignment.peerEvaluators,
          staffValidator: studentAssignment.staffValidator,
        };
      }
      return null;
    }).filter(p => p !== null);

    res.status(200).json(studentProjects);
  } catch (e) {
    console.error('Error fetching student projects:', e);
    res.status(500).json({ error: e.message });
  }
}

export async function assignProjectToStudent(req, res) {
  try {
    const { studentId } = req.body; // Seul studentId est nécessaire, le projectId est déterminé par le niveau

    const student = await User.findById(studentId);
    if (!student || student.role !== 'apprenant') {
      return res.status(404).json({ error: 'Apprenant non trouvé ou n\'est pas un apprenant.' });
    }

    // Tenter d'assigner le projet correspondant au niveau actuel de l'étudiant
    const assignmentResult = await _assignProjectByLevel(studentId, student.level);

    if (assignmentResult.error) {
      return res.status(400).json({ error: assignmentResult.error });
    }

    res.status(201).json({ message: assignmentResult.message, project: assignmentResult.project });
  } catch (e) {
    console.error('Error assigning project:', e);
    res.status(500).json({ error: e.message });
  }
}

export async function submitProjectSolution(req, res) {
  try {
    const { id: projectId } = req.params; // ID du projet maître
    const { assignmentId, repoUrl, selectedSlotIds } = req.body; // Attendre l'ID de l'assignation et les slots
    const studentId = req.user._id; // ID de l'apprenant connecté

    if (!assignmentId) {
      return res.status(400).json({ error: 'ID d\'assignation manquant.' });
    }

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

    if (assignment.status !== 'assigned') {
      return res.status(400).json({
        error:
          'Cette assignation n\'est pas en statut \'assigned\' et ne peut être soumise.',
      });
    }

    if (!repoUrl || !validateGithubUrl(repoUrl)) {
      return res.status(400).json({ error: 'URL GitHub invalide.' });
    }

    const slotsResult = await _validateAndBookSlots(
      selectedSlotIds,
      studentId,
      projectId,
      assignmentId,
    );

    if (slotsResult.error) {
      return res.status(400).json(slotsResult);
    }
    const slots = slotsResult.slots;

    assignment.repoUrl = repoUrl;
    assignment.submissionDate = new Date();
    assignment.status = 'submitted';

    for (const slot of slots) {
      const evaluation = await Evaluation.create({
        project: projectId,
        assignment: assignmentId,
        evaluator: slot.evaluator,
        student: studentId,
        status: 'pending',
        slot: slot._id, // Ajout de la référence au slot
      });
      assignment.evaluations.push(evaluation._id);
    }

    await project.save();

    res.status(200).json({ message: 'Solution soumise avec succès.', project });
  } catch (e) {
    console.error('Error submitting project solution:', e);
    res.status(500).json({ error: e.message });
  }
}

export async function finalReviewProject(req, res) { // Renommé de approveProject
  try {
    const { id: projectId } = req.params; // ID du projet maître
    const { assignmentId, status } = req.body; // ID de l'assignation et le nouveau statut

    if (!assignmentId || !status) {
      return res.status(400).json({ error: 'ID d\'assignation ou statut manquant.' });
    }

    // Vérifier que l'utilisateur est un membre du personnel/admin
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Non autorisé à évaluer des projets.',
      });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Projet maître non trouvé.' });

    const assignment = project.assignments.id(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignation non trouvée dans ce projet.' });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Statut d\'évaluation invalide.' });
    }

    let message = '';
    let notificationMessage = '';

    if (status === 'approved') {
      if (assignment.status === 'approved') {
        return res.json({ message: 'Projet déjà approuvé.', project });
      }
      assignment.status = 'approved';
      // assignment.staffValidator = req.user._id; // Décommenter si vous voulez enregistrer le validateur staff
      message = 'Projet approuvé avec succès et projet suivant assigné.';
      notificationMessage = `Votre projet \'${project.title}\' a été approuvé par le personnel. Félicitations ! Un nouveau projet vous a été assigné.`;

      const student = await User.findById(assignment.student);
      if (student) {
        student.daysRemaining += DAY_BONUS[project.size] || 1; // Utiliser la taille du projet maître
        student.level = Math.max(student.level, 1) + 1; // Incrémenter le niveau de l'apprenant
        // student.totalProjectsCompleted = (student.totalProjectsCompleted || 0) + 1; // Décommenter si vous suivez ce compteur

        // TODO: Logique pour attribuer des badges (si Badge modèle est décommenté)

        // Assignation du prochain projet en fonction du nouveau niveau de l'étudiant
        await _assignProjectByLevel(student._id, student.level);

        await student.save();
      }
    } else if (status === 'rejected') {
      if (assignment.status === 'rejected') {
        return res.json({ message: 'Projet déjà rejeté.', project });
      }
      assignment.status = 'assigned'; // Rejeter le projet et le remettre à 'assigned' pour resoumission
      assignment.repoUrl = undefined; // Effacer l'URL du dépôt
      assignment.submissionDate = undefined; // Effacer la date de soumission
      // TODO: Optionnel: effacer les évaluations existantes liées à cette assignation pour forcer de nouvelles évaluations
      // Notification à l'apprenant
      message = 'Projet rejeté avec succès et remis en statut assigné pour resoumission.';
      notificationMessage = `Votre projet \'${project.title}\' a été rejeté par le personnel. Veuillez revoir votre projet et le soumettre à nouveau.`;
    }

    await project.save(); // Sauvegarder le projet maître pour persister les changements de l'assignation

    // Notifier l'étudiant du résultat de l'évaluation finale
    const student = await User.findById(assignment.student); // Récupérer l'étudiant pour la notification
    if (student) {
      await Notification.create({
        user: student._id,
        type: "project_status_update",
        message: notificationMessage,
      });
    }

    res.json({ message: message, project });
  } catch (e) {
    console.error('Error during final staff review:', e);
    res.status(500).json({ error: e.message });
  }
}

export async function getProjectsAwaitingStaffReview(req, res) {
  try {
    // Vérifier que l'utilisateur est un membre du personnel/admin
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Non autorisé à consulter cette ressource.',
      });
    }

    // Trouver les projets où au moins une assignation est en attente de révision du personnel
    const projects = await Project.find({
      "assignments.status": "awaiting_staff_review",
    })
    .populate({
      path: 'assignments.student',
      select: 'name email',
    });

    // Formater les résultats pour ne retourner que les assignations pertinentes
    const formattedProjects = projects.flatMap(project => {
      return project.assignments.filter(assignment => assignment.status === "awaiting_staff_review")
        .map(assignment => ({
          _id: project._id, // ID du projet maître
          projectId: project._id,
          title: project.title,
          description: project.description,
          assignmentId: assignment._id,
          assignmentStatus: assignment.status,
          repoUrl: assignment.repoUrl,
          submissionDate: assignment.submissionDate,
          student: assignment.student, // L'objet étudiant peuplé
        }));
    });

    res.status(200).json(formattedProjects);
  } catch (e) {
    console.error('Error fetching projects awaiting staff review:', e);
    res.status(500).json({ error: e.message });
  }
}
