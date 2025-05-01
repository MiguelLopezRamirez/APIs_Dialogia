import { Router } from 'express';
import config from '../../../config/config';
import categoryRoutes from './category.routes';
import debateRoutes from './debate.routes';
import userRoutes from './user.routes';
const routerAPI = (app) => {
    const router = Router();
    const api = config.API_URL;

    app.use(api, router);


    router.use('/category', categoryRoutes);
    router.use('/user', userRoutes);
    router.use('/debates', debateRoutes);
    return router;
};

module.exports = routerAPI;
