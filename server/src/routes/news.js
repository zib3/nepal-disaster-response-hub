import express from 'express';
import {
    getNews,
    getBreakingNews,
    createNews,
    getNewsById,
    updateNews,
    verifyNews,
    deleteNews,
    searchNews
} from '../controllers/newsController.js';
import auth from '../middleware/auth.js';
import roleAuth from '../middleware/roleAuth.js';

const router = express.Router();

// Public routes
router.get('/', getNews);
router.get('/breaking', getBreakingNews);
router.get('/search', searchNews);
router.get('/:id', getNewsById);

// Protected routes
router.post('/', auth, roleAuth(['admin', 'coordinator']), createNews);
router.put('/:id', auth, updateNews);
router.put('/:id/verify', auth, roleAuth(['admin', 'coordinator']), verifyNews);
router.delete('/:id', auth, deleteNews);

export default router;
