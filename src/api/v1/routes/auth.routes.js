import express from 'express';
import { register, login, forgotPassword } from '../controllers/auth.controller';

const router = express.Router();

// Ruta para registrar un nuevo usuario
router.post('/register', register);

// Ruta para iniciar sesión
router.post('/login', login);

// Ruta para recuperar contraseña
router.post('/forgot-password', forgotPassword);

export default router;