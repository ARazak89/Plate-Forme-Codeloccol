import Curriculum from '../models/Curriculum.js';
import User from '../models/User.js';

export async function createCurriculum(req, res) {
  try {
    const curriculum = await Curriculum.create(req.body);
    res.status(201).json(curriculum);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function listCurriculums(req, res) {
  try {
    const curriculums = await Curriculum.find().populate('students').populate('modules.projects');
    res.status(200).json(curriculums);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function getCurriculumById(req, res) {
  try {
    const { id } = req.params;
    const curriculum = await Curriculum.findById(id).populate('students').populate('modules.projects');
    if (!curriculum) return res.status(404).json({ error: 'Parcours de formation non trouvé.' });
    res.status(200).json(curriculum);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function updateCurriculum(req, res) {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const curriculum = await Curriculum.findByIdAndUpdate(
      id,
      updatedData,
      { new: true, runValidators: true }
    );

    if (!curriculum) {
      return res.status(404).json({ error: 'Parcours de formation non trouvé.' });
    }

    res.status(200).json({ message: 'Parcours de formation mis à jour avec succès.', curriculum });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function deleteCurriculum(req, res) {
  try {
    const { id } = req.params;
    const curriculum = await Curriculum.findByIdAndDelete(id);

    if (!curriculum) {
      return res.status(404).json({ error: 'Parcours de formation non trouvé.' });
    }

    // Optionnel: Gérer la désaffectation des étudiants ou la suppression des ressources/projets associés

    res.status(200).json({ message: 'Parcours de formation supprimé avec succès.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function assignStudentToCurriculum(req, res) {
  try {
    const { id, studentId } = req.params; // id du parcours, studentId de l'étudiant

    const curriculum = await Curriculum.findById(id);
    if (!curriculum) return res.status(404).json({ error: 'Parcours de formation non trouvé.' });

    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ error: 'Étudiant non trouvé.' });

    if (curriculum.students.includes(studentId)) {
      return res.status(400).json({ message: 'Cet étudiant est déjà assigné à ce parcours.' });
    }

    curriculum.students.push(studentId);
    await curriculum.save();

    res.status(200).json({ message: 'Étudiant assigné au parcours avec succès.', curriculum });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
