import express from 'express';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import {
  createTeam,
  getTeamsByHackathon,
  getTeamById,
  addMemberToTeam,
  removeMemberFromTeam,
  deleteTeam,
} from '../controllers/teamController.js';

const router = express.Router();

// Routes protégées par requireAuth et requireRole('staff', 'admin')
router.post('/', requireAuth, requireRole('staff', 'admin'), createTeam);
router.get('/hackathon/:hackathonId', requireAuth, requireRole('staff', 'admin'), getTeamsByHackathon);
router.get('/:id', requireAuth, requireRole('staff', 'admin'), getTeamById);
router.put('/:id/add-member', requireAuth, requireRole('staff', 'admin'), addMemberToTeam);
router.put('/:id/remove-member', requireAuth, requireRole('staff', 'admin'), removeMemberFromTeam);
router.delete('/:id', requireAuth, requireRole('staff', 'admin'), deleteTeam);

export default router;
