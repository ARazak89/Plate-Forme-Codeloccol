import { Router } from 'express';
import { searchProjects, searchHackathons, searchUsers } from '../controllers/searchController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const r = Router();

r.get('/projects', requireAuth, searchProjects);
r.get('/hackathons', requireAuth, searchHackathons);
r.get('/users', requireAuth, searchUsers);

export default r;
