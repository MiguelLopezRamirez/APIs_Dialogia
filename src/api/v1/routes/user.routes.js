import express from 'express';
import userController from '../controllers/user.controller';

const router = express.Router();

// Obtener usuario por uid
router.get('/:uid', userController.getUserByUid);

// Agregar intereses (puede ser primera vez o adicionales)
router.post('/:uid/interests', userController.addUserInterests);

// Actualizar todos los intereses (reemplaza el array completo)
router.put('/:uid/interests', userController.updateUserInterests);

// Eliminar intereses específicos
router.delete('/:uid/interests', userController.removeUserInterests);

export default router;