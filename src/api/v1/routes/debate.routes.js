import express from 'express';
import debateController, { addComment, likesAndDislikes } from '../controllers/debate.controller';

const router = express.Router();

// CRUD de debates
router.post('/', debateController.createDebate);
router.get('/', debateController.getAllDebates);
router.get('/popular', debateController.getPopularDebates);
router.post('/recommend/', debateController.getRecommendDebates);
router.get('/search', debateController.searchDebates);
router.get('/category/:categoryId', debateController.getDebatesByCategory);
router.post('/:id', debateController.getDebateById);
router.patch('/:id', debateController.updateDebate);
router.delete('/:id', debateController.deleteDebate);

// Acciones específicas
router.post('/:id/comments', debateController.addComment);
router.patch('/:id/comments/:idComment/like',likesAndDislikes);
router.post('/:id/position', debateController.position);

// Acciones para producción
router.post('/debates', debateController.createDebates)

// Seguir o dejar de seguir debate
router.post('/:id/follow',   debateController.followDebate);
router.delete('/:id/follow', debateController.unfollowDebate);


// responder debate
router.post('/:id/comments/reply', debateController.addReplyComment);

/*
router.get('/moderation/pending', debateController.getPendingModeration);
router.patch('/:id/moderation', debateController.updateModerationStatus);
router.patch('/comments/:commentId/moderation', debateController.updateCommentModerationStatus);
*/
export default router;