import express from 'express';
import {
    getEmergencyContacts,
    getContactsByCategory,
    getContactsByLocation,
    createEmergencyContact,
    getEmergencyContactById,
    updateEmergencyContact,
    verifyEmergencyContact,
    deleteEmergencyContact,
    getEmergencyHotlines,
    searchEmergencyContacts
} from '../controllers/emergencyController.js';
import auth from '../middleware/auth.js';
import roleAuth from '../middleware/roleAuth.js';

const router = express.Router();

// Public routes
router.get('/', getEmergencyContacts);
router.get('/hotlines', getEmergencyHotlines);
router.get('/search', searchEmergencyContacts);
router.get('/location', getContactsByLocation);
router.get('/category/:category', getContactsByCategory);
router.get('/:id', getEmergencyContactById);

// Protected routes
router.post('/', auth, roleAuth(['admin', 'coordinator']), createEmergencyContact);
router.put('/:id', auth, updateEmergencyContact);
router.put('/:id/verify', auth, roleAuth(['admin', 'coordinator']), verifyEmergencyContact);
router.delete('/:id', auth, deleteEmergencyContact);

export default router;
