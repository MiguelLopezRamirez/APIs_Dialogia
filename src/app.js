import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
//MALR: imports Swagger
import swaggerSpec from './config/swagger.config'; // Import the Swagger config
import swaggerUI from 'swagger-ui-express';
//MALR: imports Routes
import routerAPI from './api/v1/routes/index'
//MALR: imports Middlewares
//MALR: Config para variables de entorno
import config from './config/config';
//MALR: Declaramos la variable app igualandola a express 
const app = express();
//MALR: Establece la conexion a la BD 
// import { mongoose } from './config/database.config';
//MALR: Settings
app.set('port', config.PORT);
//MALR: Middlewares generales
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//MALR: Routes
const api = config.API_URL;
app.get(`${api}`, (req,res)=>{
    res.send(
        `<h1>RESTful running in root</h1> <p> : <b>${api}/api-docs</b> for more information.</p>`
    );
})

// Swagger Docs
// Serve Swagger Docs
app.use(`${config.API_URL}/api-docs`, swaggerUI.serve, swaggerUI.setup(swaggerSpec));
// Middleware para el manejo de errores
routerAPI(app);
// Export App
export default app;