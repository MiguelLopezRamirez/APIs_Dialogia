import {Router} from 'express'
import * as authController from '../controllers/auth.controller'

const router = Router();

const at = require('../middleware/auth.middleware.js').verifyToken

router.get('/', at,authController.getUserList);

router.get('/:id', at, authController.getUserItem);

router.post('/register', authController.registerUser);

router.post('/login', authController.loginUser);


export default router;