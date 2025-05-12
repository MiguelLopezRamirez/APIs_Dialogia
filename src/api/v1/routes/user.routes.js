import express from 'express';
import userController from '../controllers/user.controller';

const router = express.Router();

// Obtener ranking
router.get('/ranking', userController.getRanking);

// Obtener ranking (sin limites)
router.get('/rankingall', userController.getRankingAll);

// Obtener usuario por uid
router.get('/:uid', userController.getUserByUid);

// Eliminar usuario por uid
router.delete('/:uid', userController.deleteUser);
// Obener actividad de usuario por uid
router.get('/:uid/activity', userController.activityUser);

// Agregar intereses (puede ser primera vez o adicionales)
router.post('/:uid/interests', userController.addUserInterests);

// Actualizar todos los intereses (reemplaza el array completo)
router.put('/:uid/interests', userController.updateUserInterests);

// Eliminar intereses específicos
router.delete('/:uid/interests', userController.removeUserInterests);

//Actualiza la Censura
router.put('/:uid/censure',userController.toggleUserCensorship);

// PUT /users/:uid/title
router.put('/:uid/title', userController.updateUserTitle);

// POST /users/:username/check-badges
router.post('/:uid/badges', userController.checkAndAwardBadgesEndpoint);
export default router;