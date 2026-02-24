import express from 'express';
import {
    getResourceRequests,
    getUrgentRequests,
    createResourceRequest,
    getResourceRequestById,
    updateResourceRequest,
    assignTeam,
    updateFulfillment,
    verifyResourceRequest,
    deleteResourceRequest,
    getResourceStats
} from '../controllers/resourceController.js';
import auth from '../middleware/auth.js';
import roleAuth from '../middleware/roleAuth.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// General routes
router.get('/', getResourceRequests);
router.get('/urgent', getUrgentRequests);
router.get('/stats', getResourceStats);
router.post('/', createResourceRequest);
router.get('/:id', getResourceRequestById);
router.put('/:id', updateResourceRequest);
router.delete('/:id', deleteResourceRequest);

// Admin/Coordinator only routes
router.put('/:id/assign', roleAuth(['admin', 'coordinator']), assignTeam);
router.put('/:id/verify', roleAuth(['admin', 'coordinator']), verifyResourceRequest);

// Fulfillment route (accessible by admin, coordinator, or assigned team)
router.put('/:id/fulfill', updateFulfillment);

export default router;
