import swaggerJSDoc from 'swagger-jsdoc';
import swaggerDocs from '../api/v1/docs/swaggerDocs';

const swaggerSpec = swaggerJSDoc({
  definition: swaggerDocs,
  apis: [] // No need for individual route files
});

export default swaggerSpec;