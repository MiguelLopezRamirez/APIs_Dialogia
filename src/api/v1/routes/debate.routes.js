import express from 'express';
import debateController from '../controllers/debate.controller';

const router = express.Router();

// CRUD de debates
router.post('/', debateController.createDebate);
router.get('/', debateController.getAllDebates);
router.get('/popular', debateController.getPopularDebates);
router.get('/search', debateController.searchDebates);
router.get('/category/:categoryId', debateController.getDebatesByCategory);
router.get('/:id', debateController.getDebateById);
router.patch('/:id', debateController.updateDebate);
router.delete('/:id', debateController.deleteDebate);

// Acciones específicas
router.post('/:id/comments', debateController.addComment);
router.post('/:id/vote-in-favor', debateController.voteInFavor);
router.post('/:id/vote-against', debateController.voteAgainst);

export default router;