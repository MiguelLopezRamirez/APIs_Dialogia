const swaggerDocs = {
  openapi: '3.0.0',
  info: {
    title: 'Debate App API',
    description: 'API endpoints for managing users',
    version: '1.0.0'
  },
  servers: [
    {
      url: 'http://localhost:3020/api/v1/'
    }
  ],
  tags: [
    {
      name: 'Users',
      description: 'API endpoints for managing users'
    }
  ],
  paths: {
    '/users': {
      get: {
        summary: 'Get all users',
        tags: ['Users'],
        responses: {
          200: {
            description: 'List of all users'
          },
          404: {
            description: 'No users found'
          },
          500: {
            description: 'Internal Server Error'
          }
        }
      }
    },
    '/users/{id}': {
      get: {
        summary: 'Get a single user by username',
        tags: ['Users'],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'The username of the user'
          }
        ],
        responses: {
          200: {
            description: 'User details'
          },
          404: {
            description: 'User not found'
          },
          500: {
            description: 'Internal Server Error'
          }
        }
      }
    },
    '/users/register': {
      post: {
        summary: 'Register a new user',
        tags: ['Users'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'User registered successfully'
          },
          400: {
            description: 'User already exists'
          },
          500: {
            description: 'Server error'
          }
        }
      }
    },
    '/users/login': {
      post: {
        summary: 'User login',
        tags: ['Users'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Login successful, returns a JWT token'
          },
          401: {
            description: 'Invalid credentials'
          },
          404: {
            description: 'User not found'
          },
          500: {
            description: 'Server error'
          }
        }
      }
    }
  }
};

export default swaggerDocs;
