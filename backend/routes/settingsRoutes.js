import { Router } from 'express';
import { getSetting, updateSetting } from '../controllers/settingsController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const r = Router();

r.get('/:key', requireAuth, requireRole(['admin']), getSetting);
r.put('/:key', requireAuth, requireRole(['admin']), updateSetting);

export default r;
