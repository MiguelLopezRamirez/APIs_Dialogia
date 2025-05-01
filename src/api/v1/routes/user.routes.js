import express from 'express';
import userController from '../controllers/user.controller';

const router = express.Router();

// Obtener ranking
router.get('/ranking', userController.getRanking);

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

export default router;