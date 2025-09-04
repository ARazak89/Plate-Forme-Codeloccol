import Project from '../models/Project.js';
import AvailabilitySlot from '../models/AvailabilitySlot.js';
import User from '../models/User.js';
import Evaluation from '../models/Evaluation.js';
// import Notification from '../models/Notification.js'; // Décommenter si vous avez un modèle Notification
// import Badge from '../models/Badge.js'; // Décommenter si vous avez un modèle Badge

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
          _id: project._id,
          title: project.title,
          description: project.description,
          status: project.status,
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
    const { projectId, studentId } = req.body;

    const projectTemplate = await Project.findById(projectId);
    if (!projectTemplate || projectTemplate.status !== 'template') {
      return res.status(404).json({ error: 'Projet maître non trouvé ou n\'est pas un template.' });
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== 'apprenant') {
      return res.status(404).json({ error: 'Apprenant non trouvé ou n\'est pas un apprenant.' });
    }

    const existingAssignment = projectTemplate.assignments.some(assign => assign.student.equals(studentId));
    if (existingAssignment) {
      return res.status(400).json({ error: 'L\'apprenant est déjà assigné à ce projet.' });
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

    res.status(201).json({ message: 'Project assigned successfully.' });
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
