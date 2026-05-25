import { Router } from 'express';
import {
  registerMonitor,
  heartbeatMonitor,
  pauseMonitor,
  getMonitors,
} from '../controllers/monitorController.js';
import { validateRegisterMonitor } from '../middleware/validator.js';
import { validateApiKey } from '../middleware/auth.js';

const router = Router();

// Secure all monitor routes with API Key authentication
router.use(validateApiKey);

router.post('/monitors', validateRegisterMonitor, registerMonitor);
router.post('/monitors/:id/heartbeat', heartbeatMonitor);
router.post('/monitors/:id/pause', pauseMonitor);
router.get('/monitors', getMonitors);

export default router;