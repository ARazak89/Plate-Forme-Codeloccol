import { Router } from 'express';
import { createCurriculum, listCurriculums, getCurriculumById, updateCurriculum, deleteCurriculum, assignStudentToCurriculum } from '../controllers/curriculumController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const r = Router();

// Routes accessibles au staff/admin pour la gestion des parcours
r.post('/', requireAuth, requireRole(['staff','admin']), createCurriculum);
r.get('/', requireAuth, requireRole(['staff','admin']), listCurriculums);
r.get('/:id', requireAuth, requireRole(['staff','admin']), getCurriculumById);
r.put('/:id', requireAuth, requireRole(['staff','admin']), updateCurriculum);
r.delete('/:id', requireAuth, requireRole(['admin']), deleteCurriculum);

// Route pour assigner un étudiant à un parcours
r.post('/:id/assign/:studentId', requireAuth, requireRole(['staff','admin']), assignStudentToCurriculum);

export default r;
