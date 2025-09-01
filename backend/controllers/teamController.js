import Team from '../models/Team.js';
import User from '../models/User.js';
import Hackathon from '../models/Hackathon.js';

// Créer une nouvelle équipe
export async function createTeam(req, res) {
  const { name, members, hackathonId } = req.body;

  if (!name || !members || !hackathonId) {
    return res.status(400).json({ message: 'Nom, membres et ID du hackathon sont requis.' });
  }

  if (members.length < 3 || members.length > 5) {
    return res.status(400).json({ message: 'Une équipe doit avoir entre 3 et 5 membres.' });
  }

  try {
    // Vérifier l'existence du hackathon
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon non trouvé.' });
    }

    // Vérifier que tous les membres sont des apprenants et n'appartiennent pas déjà à une équipe pour ce hackathon
    const existingTeamMembers = await Team.find({ hackathon: hackathonId, members: { $in: members } });
    if (existingTeamMembers.length > 0) {
      return res.status(400).json({ message: 'Certains membres sont déjà dans une équipe pour ce hackathon.' });
    }

    const users = await User.find({ _id: { $in: members } });
    if (users.length !== members.length) {
      return res.status(404).json({ message: 'Un ou plusieurs utilisateurs membres sont introuvables.' });
    }
    const nonApprenantMembers = users.filter(user => user.role !== 'apprenant');
    if (nonApprenantMembers.length > 0) {
      return res.status(400).json({ message: 'Tous les membres de l\'équipe doivent être des apprenants.' });
    }

    const newTeam = await Team.create({ name, members, hackathon: hackathonId });

    // Mettre à jour le hackathon pour inclure la nouvelle équipe
    hackathon.teams.push(newTeam._id);
    await hackathon.save();

    res.status(201).json({ message: 'Équipe créée avec succès !', team: newTeam });
  } catch (error) {
    console.error('Erreur lors de la création de l\'équipe:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la création de l\'équipe.' });
  }
}

// Récupérer toutes les équipes pour un hackathon donné
export async function getTeamsByHackathon(req, res) {
  try {
    const { hackathonId } = req.params;
    const teams = await Team.find({ hackathon: hackathonId }).populate('members', 'name email');
    res.status(200).json(teams);
  } catch (error) {
    console.error('Erreur lors de la récupération des équipes:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des équipes.' });
  }
}

// Récupérer une équipe par son ID
export async function getTeamById(req, res) {
  try {
    const { id } = req.params;
    const team = await Team.findById(id).populate('members', 'name email');
    if (!team) {
      return res.status(404).json({ message: 'Équipe non trouvée.' });
    }
    res.status(200).json(team);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'équipe:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'équipe.' });
  }
}

// Ajouter un membre à une équipe
export async function addMemberToTeam(req, res) {
  const { id } = req.params;
  const { memberId } = req.body;

  if (!memberId) {
    return res.status(400).json({ message: 'L\'ID du membre est requis.' });
  }

  try {
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Équipe non trouvée.' });
    }

    if (team.members.length >= 5) {
      return res.status(400).json({ message: 'L\'équipe a déjà le nombre maximum de membres (5).' });
    }

    const user = await User.findById(memberId);
    if (!user || user.role !== 'apprenant') {
      return res.status(404).json({ message: 'Membre introuvable ou n\'est pas un apprenant.' });
    }

    if (team.members.includes(memberId)) {
      return res.status(400).json({ message: 'Ce membre est déjà dans l\'équipe.' });
    }

    // Vérifier si l'apprenant est déjà dans une équipe pour ce hackathon
    const existingTeamForHackathon = await Team.findOne({ hackathon: team.hackathon, members: memberId });
    if (existingTeamForHackathon) {
      return res.status(400).json({ message: 'Ce membre est déjà dans une autre équipe pour ce hackathon.' });
    }

    team.members.push(memberId);
    await team.save();
    res.status(200).json({ message: 'Membre ajouté avec succès !', team });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du membre à l\'équipe:', error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'ajout du membre.' });
  }
}

// Supprimer un membre d'une équipe
export async function removeMemberFromTeam(req, res) {
  const { id } = req.params;
  const { memberId } = req.body;

  if (!memberId) {
    return res.status(400).json({ message: 'L\'ID du membre est requis.' });
  }

  try {
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Équipe non trouvée.' });
    }

    if (team.members.length <= 3) {
      return res.status(400).json({ message: 'Une équipe doit avoir au moins 3 membres. Impossible de supprimer ce membre.' });
    }

    team.members = team.members.filter(member => member.toString() !== memberId);
    await team.save();
    res.status(200).json({ message: 'Membre supprimé avec succès !', team });
  } catch (error) {
    console.error('Erreur lors de la suppression du membre de l\'équipe:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression du membre.' });
  }
}

// Supprimer une équipe
export async function deleteTeam(req, res) {
  try {
    const { id } = req.params;
    const team = await Team.findByIdAndDelete(id);

    if (!team) {
      return res.status(404).json({ message: 'Équipe non trouvée.' });
    }

    // Retirer l'équipe du hackathon associé
    await Hackathon.findByIdAndUpdate(team.hackathon, { $pull: { teams: team._id } });

    res.status(200).json({ message: 'Équipe supprimée avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'équipe:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de l\'équipe.' });
  }
}
