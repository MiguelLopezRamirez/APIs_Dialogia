import { Router } from 'express';
import config from '../../../config/config'

import userRoutes from './auth.routes'

const routerAPI = (app) => {
    const router = Router();
    const api = config.API_URL;

    app.use(api, router);

    router.use('/auth', userRoutes)

    return router;
};

module.exports = routerAPI;
