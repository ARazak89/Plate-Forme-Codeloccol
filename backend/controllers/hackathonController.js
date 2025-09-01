import Hackathon from '../models/Hackathon.js';
import Project from '../models/Project.js';
import Notification from '../models/Notification.js'; // Importez le modèle Notification
import User from '../models/User.js'; // Added missing import for User
import Evaluation from '../models/Evaluation.js'; // Importez le modèle Evaluation
import Badge from '../models/Badge.js'; // Importez le modèle Badge pour attribuer des badges

export async function createHackathon(req, res) {
  try {
    const h = await Hackathon.create(req.body);
    res.json(h);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function listHackathons(req, res) {
  const list = await Hackathon.find().sort({ startDate: -1 });
  res.json(list);
}

export async function joinHackathon(req, res) {
  const { id } = req.params;
  const h = await Hackathon.findById(id);
  if (!h) return res.status(404).json({ error: 'Not found' });
  if (!h.participants.includes(req.user._id)) h.participants.push(req.user._id);
  await h.save();
  res.json(h);
}

export async function submitHackathonProject(req, res) {
  const { id } = req.params; // hackathon id
  const { title, description, repoUrl, size = 'short' } = req.body;
  const p = await Project.create({
    title,
    description,
    repoUrl,
    student: req.user._id,
    size,
  });
  const h = await Hackathon.findById(id);
  if (!h) return res.status(404).json({ error: 'Not found' });
  h.projects.push(p._id);
  await h.save();

  // Envoyer une notification pour le staff concernant la soumission du projet de hackathon
  const staffUsers = await User.find({ role: { $in: ['staff', 'admin'] } });
  for (const staff of staffUsers) {
    await Notification.create({
      user: staff._id,
      type: 'hackathon_project_submission',
      message: `Un nouveau projet a été soumis pour le hackathon \'${h.title}\'.`,
    });
  }

  res.json({ hackathon: h, project: p });
}

export async function updateHackathon(req, res) {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const hackathon = await Hackathon.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!hackathon) {
      return res.status(404).json({ error: 'Hackathon non trouvé.' });
    }

    res.json(hackathon);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function deleteHackathon(req, res) {
  try {
    const { id } = req.params;

    const hackathon = await Hackathon.findByIdAndDelete(id);

    if (!hackathon) {
      return res.status(404).json({ error: 'Hackathon non trouvé.' });
    }

    // Supprimer les projets associés au hackathon
    await Project.deleteMany({ _id: { $in: hackathon.projects } });

    res.status(200).json({
      message: 'Hackathon et projets associés supprimés avec succès.',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function evaluateHackathonProjects(req, res) {
  try {
    const { id } = req.params; // hackathon ID
    const hackathon = await Hackathon.findById(id).populate('projects');

    if (!hackathon) {
      return res.status(404).json({ error: 'Hackathon non trouvé.' });
    }

    if (hackathon.status === 'evaluated') {
      return res
        .status(400)
        .json({ message: 'Ce hackathon a déjà été évalué.' });
    }

    // Vérifier si la date de fin est passée
    if (new Date() < hackathon.endDate) {
      return res
        .status(400)
        .json({ error: "Le hackathon n'est pas encore terminé." });
    }

    const projectScores = [];
    for (const project of hackathon.projects) {
      // Calculer le score moyen des évaluations pour chaque projet
      const evaluations = await Evaluation.find({ project: project._id });
      let totalScore = 0;
      if (evaluations.length > 0) {
        totalScore =
          evaluations.reduce((sum, evalItem) => sum + evalItem.score, 0) /
          evaluations.length;
      }
      projectScores.push({ project: project._id, score: totalScore });
    }

    // Trier les projets par score décroissant pour le classement
    hackathon.rankings = projectScores.sort((a, b) => b.score - a.score);
    hackathon.status = 'evaluated';
    await hackathon.save();

    // Intégrer le feedback des hackathons au profil de l'apprenant
    const TOP_RANKS_BONUS_DAYS = { 1: 5, 2: 3, 3: 1 }; // Jours bonus pour les 3 premiers rangs
    const TOP_RANKS_BADGE_NAME = {
      1: 'Vainqueur Hackathon',
      2: 'Finaliste Hackathon',
      3: 'Participant Distingué Hackathon',
    };

    for (let i = 0; i < hackathon.rankings.length; i++) {
      const rank = i + 1;
      const rankedProject = hackathon.rankings[i];
      const project = await Project.findById(rankedProject.project);

      if (project && project.student) {
        const student = await User.findById(project.student);
        if (student) {
          // Attribution de jours bonus
          if (TOP_RANKS_BONUS_DAYS[rank]) {
            student.daysRemaining += TOP_RANKS_BONUS_DAYS[rank];
            await Notification.create({
              user: student._id,
              type: 'hackathon_bonus',
              message: `Félicitations ! Vous avez gagné ${TOP_RANKS_BONUS_DAYS[rank]} jours supplémentaires pour votre performance au hackathon \'${hackathon.title}\'.`,
            });
          }

          // Incrémenter totalProjectsCompleted et attribuer un badge (si applicable)
          student.totalProjectsCompleted =
            (student.totalProjectsCompleted || 0) + 1; // Le projet du hackathon est aussi un projet complété

          if (TOP_RANKS_BADGE_NAME[rank]) {
            const badge = await Badge.findOne({
              name: TOP_RANKS_BADGE_NAME[rank],
            });
            if (badge && !student.badges.includes(badge._id)) {
              student.badges.push(badge._id);
              await Notification.create({
                user: student._id,
                type: 'badge_earned',
                message: `Félicitations ! Vous avez gagné le badge \'${badge.name}\' pour votre performance au hackathon \'${hackathon.title}\'.`,
              });
            }
          }
          await student.save();
        }
      }
    }

    // Envoyer des notifications aux participants concernant les classements
    const rankingNotificationMessage = `Les classements du hackathon \'${hackathon.title}\' sont disponibles !`;
    for (const participantId of hackathon.participants) {
      await Notification.create({
        user: participantId,
        type: 'hackathon_ranking',
        message: rankingNotificationMessage,
      });
    }

    res.status(200).json({
      message: 'Hackathon évalué et classé avec succès.',
      rankings: hackathon.rankings,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function getHackathonRankings(req, res) {
  try {
    const { id } = req.params;
    const hackathon = await Hackathon.findById(id).populate('rankings.project');

    if (!hackathon) {
      return res.status(404).json({ error: 'Hackathon non trouvé.' });
    }

    if (hackathon.status !== 'evaluated') {
      return res.status(400).json({
        message: 'Le classement n\'est pas encore disponible pour ce hackathon.',
      });
    }

    res.status(200).json({ rankings: hackathon.rankings });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
