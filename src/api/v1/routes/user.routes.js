import express from 'express';
import userController from '../controllers/user.controller';

const router = express.Router();

// Obtener usuario por username
router.get('/:username', userController.getUserByUsername);

// Agregar intereses (puede ser primera vez o adicionales)
router.post('/:username/interests', userController.addUserInterests);

// Actualizar todos los intereses (reemplaza el array completo)
router.put('/:username/interests', userController.updateUserInterests);

// Eliminar intereses específicos
router.delete('/:username/interests', userController.removeUserInterests);

export default router;