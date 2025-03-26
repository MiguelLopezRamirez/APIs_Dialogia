import { Router } from 'express';
import config from '../../../config/config'


import categoryRoutes from './category.routes';

const routerAPI = (app) => {
    const router = Router();
    const api = config.API_URL;

    app.use(api, router);


    router.use('/category', categoryRoutes);

    return router;
};

module.exports = routerAPI;
