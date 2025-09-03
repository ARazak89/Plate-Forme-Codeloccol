import User from '../models/User.js';
import Project from '../models/Project.js';
import Hackathon from '../models/Hackathon.js';
import Evaluation from '../models/Evaluation.js';
import Notification from '../models/Notification.js';
import bcrypt from 'bcryptjs'; // Importez bcryptjs pour le hachage des mots de passe

export async function me(req, res) {
  const u = req.user;

  // Récupérer les projets de l'utilisateur
  const projects = await Project.find({ student: u._id });

  // Récupérer les hackathons de l'utilisateur
  const hackathons = await Hackathon.find({ participants: u._id });

  // Récupérer les badges de l'utilisateur
  const userWithBadges = await User.findById(u._id).populate('badges');
  const badges = userWithBadges ? userWithBadges.badges : [];

  // Calculer la progression (nombre total de projets, nombre de projets complétés)
  const totalProjects = await Project.countDocuments(); // Ceci devrait être le total des projets DANS LE PARCOURS de l'apprenant
  const completedProjects = await Project.countDocuments({
    student: u._id,
    status: 'approved',
  });

  res.json({
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    daysRemaining: u.daysRemaining,
    level: u.level,
    lastLogin: u.lastLogin,
    projects,
    hackathons,
    badges,
    progress: {
      currentProject: completedProjects,
      totalProjects: totalProjects, // Ceci est un placeholder, à adapter selon le parcours de l'apprenant
    },
  });
}

export async function unblock(req, res) {
  try {
    const { id } = req.params;
    const u = await User.findByIdAndUpdate(
      id,
      { status: 'active' },
      { new: true },
    );
    res.json({ id: u._id, status: u.status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function updateUserNameAndEmail(req, res) {
  try {
    // Cette fonction est désormais réservée aux administrateurs pour modifier le nom et l'email d'un utilisateur.
    // L'utilisateur régulier ne peut pas modifier son propre nom ou email via cet endpoint.
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Non autorisé à modifier le nom ou l\'email de l\'utilisateur.',
      });
    }

    const { id } = req.params; // L'ID de l'utilisateur à modifier, passé dans l'URL pour le staff/admin
    const { name, email } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { name, email },
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    res.json({
      message: 'Profil mis à jour avec succès.',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function updateUserPassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Vérifier l'ancien mot de passe
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: 'Ancien mot de passe incorrect.' });
    }

    // Hacher le nouveau mot de passe
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: 'Mot de passe mis à jour avec succès.' });
  } catch (e) {
    console.error("Error updating password:", e);
    res.status(500).json({ error: e.message });
  }
}

export async function updateUserProfilePicture(req, res) {
  try {
    // L'URL de l'image est maintenant générée par Multer après le téléchargement
    if (!req.file) {
      return res
        .status(400)
        .json({ message: 'Aucun fichier image n\'a été téléchargé.' });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Construire l'URL publique de l'image
    // req.file.path contient le chemin complet du fichier sur le serveur
    // Nous devons le rendre relatif à la base URL du serveur pour le frontend
    const profilePictureUrl = `/uploads/profile_pictures/${req.file.filename}`;

    user.profilePicture = profilePictureUrl;
    await user.save();

    res.status(200).json({
      message: 'Photo de profil mise à jour avec succès.',
      profilePicture: user.profilePicture,
    });
  } catch (e) {
    console.error("Error updating profile picture:", e);
    res.status(500).json({ error: e.message });
  }
}

export async function listUsers(req, res) {
  try {
    const users = await User.find({ role: 'apprenant' })
      .select('-password -projects') // Exclure les mots de passe et le tableau de tous les projets
      .populate({
        path: 'projects', // 'projects' est un tableau d'ObjectIds de projets maîtres
        populate: {
          path: 'assignments', // Peupler le tableau d'assignations dans chaque projet maître
          match: { student: { $eq: '$parent._id' } }, // Pas directement utilisable pour le moment ici
          select: 'student status title order', // Sélectionner les champs pertinents de l'assignation
        }
      });

    // Nous devons filtrer et extraire l'assignation pertinente pour chaque utilisateur manuellement
    const usersWithAssignedProject = users.map((user) => {
      let assignedProject = null;
      if (user.projects && user.projects.length > 0) {
        // Pour chaque projet maître, trouver l'assignation de cet utilisateur
        for (const project of user.projects) {
          const assignment = project.assignments.find(
            (assign) => assign.student.equals(user._id)
          );
          if (assignment) {
            // Nous avons trouvé l'assignation de cet étudiant pour ce projet maître
            // Nous voulons le projet avec le statut 'assigned' ou 'pending' pour l'affichage principal
            if (assignment.status === 'assigned' || assignment.status === 'pending') {
              assignedProject = {
                title: project.title, // Titre du projet maître
                order: project.order, // Ordre du projet maître
                id: project._id, // ID du projet maître
                assignmentId: assignment._id, // ID de l'assignation
                status: assignment.status, // Statut de l'assignation
              };
              break; // Une fois un projet assigné/en attente trouvé, on s'arrête
            }
          }
        }
      }

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        level: user.level,
        daysRemaining: user.daysRemaining,
        assignedProject: assignedProject, // L'objet assignedProject que nous venons de construire
      };
    });

    res.status(200).json(usersWithAssignedProject);
  } catch (e) {
    console.error("Error in listUsers:", e);
    res.status(500).json({ error: e.message });
  }
}

export async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    if (!user)
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    res.status(200).json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['apprenant', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide.' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true },
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    res
      .status(200)
      .json({ message: 'Rôle utilisateur mis à jour avec succès.', user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    // Supprimer les projets, évaluations, notifications associés à l'utilisateur
    await Project.deleteMany({ student: id });
    await Evaluation.deleteMany({ evaluator: id });
    await Notification.deleteMany({ user: id });

    // Retirer l'utilisateur des listes de participants des hackathons
    await Hackathon.updateMany(
      { participants: id },
      { $pull: { participants: id } },
    );

    res.status(200).json({
      message: 'Utilisateur et données associées supprimés avec succès.',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function createUserByAdmin(req, res) {
  try {
    const { name, email, password, role } = req.body;

    // Validation simple
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
    }

    if (!['apprenant', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide.' });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Un utilisateur avec cet email existe déjà.' });
    }

    // Hacher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Créer le nouvel utilisateur
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      status: 'active', // Les utilisateurs créés par admin sont actifs par défaut
      level: role === 'apprenant' ? 1 : undefined, // Niveau 1 pour les apprenants par défaut
      daysRemaining: role === 'apprenant' ? 30 : undefined, // 30 jours pour les apprenants par défaut
    });

    await newUser.save();

    // Si l'utilisateur est un apprenant, lui assigner automatiquement le projet d'ordre 1
    if (newUser.role === "apprenant") {
      const firstProjectTemplate = await Project.findOne({
        order: 1,
        status: "template",
      });

      if (firstProjectTemplate) {
        // Ajouter l'apprenant au tableau d'assignations du projet maître
        firstProjectTemplate.assignments.push({
          student: newUser._id,
          status: "assigned",
          repoUrl: "", // Initialisé vide
          evaluations: [],
          peerEvaluators: [],
          staffValidator: null,
        });
        await firstProjectTemplate.save();

        // Ajouter une référence au projet maître dans les projets du nouvel utilisateur
        newUser.projects.push(firstProjectTemplate._id);
        await newUser.save();
      }
    }

    res.status(201).json({ message: 'Utilisateur créé avec succès.', user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role } });
  } catch (e) {
    console.error("Error creating user by admin:", e);
    res.status(500).json({ error: e.message });
  }
}
