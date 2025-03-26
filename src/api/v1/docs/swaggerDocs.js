const swaggerDocs = {
  openapi: '3.0.0',
  info: {
    title: 'Debate App API',
    description: 'API endpoints for managing categories',
    version: '1.0.0'
  },
  servers: [
    {
      url: 'http://localhost:3020/api/v1/'
    }
  ],
  tags: [
    {
      name: 'Categories',
      description: 'API endpoints for managing categories'
    }
  ],
  paths: {
    '/category': {
      get: {
        summary: 'Get all categories',
        tags: ['Categories'],
        responses: {
          200: {
            description: 'List of all categories',
            content: {
              'application/json': {
                example: [
                  { "id": "1", "name": "TECHNOLOGY", "description": "Topics related to tech." },
                  { "id": "2", "name": "SCIENCE", "description": "Scientific discussions." }
                ]
              }
            }
          },
          500: {
            description: 'Internal Server Error'
          }
        }
      },
      post: {
        summary: 'Create a new category',
        tags: ['Categories'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' }
                },
                required: ['id', 'name', 'description']
              },
              example: {
                "id": "3",
                "name": "POLITICS",
                "description": "Discussions on politics."
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Category created successfully'
          },
          400: {
            description: 'Invalid input data'
          },
          409: {
            description: 'Category already exists'
          },
          500: {
            description: 'Server error'
          }
        }
      }
    },
    '/category/{id}': {
      get: {
        summary: 'Get a category by ID',
        tags: ['Categories'],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
            description: 'Category ID'
          }
        ],
        responses: {
          200: {
            description: 'Category details'
          },
          404: {
            description: 'Category not found'
          },
          500: {
            description: 'Server error'
          }
        }
      },
      put: {
        summary: 'Update a category',
        tags: ['Categories'],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
            description: 'Category ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' }
                },
                required: ['name']
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Category updated successfully'
          },
          404: {
            description: 'Category not found'
          },
          500: {
            description: 'Server error'
          }
        }
      },
      delete: {
        summary: 'Delete a category',
        tags: ['Categories'],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
            description: 'Category ID'
          }
        ],
        responses: {
          200: {
            description: 'Category deleted successfully'
          },
          404: {
            description: 'Category not found'
          },
          500: {
            description: 'Server error'
          }
        }
      }
    },
    '/category/search': {
      get: {
        summary: 'Search categories by name',
        tags: ['Categories'],
        parameters: [
          {
            in: 'query',
            name: 'name',
            required: true,
            schema: { type: 'string' },
            description: 'Search query'
          }
        ],
        responses: {
          200: {
            description: 'Search results'
          },
          400: {
            description: 'Invalid search query'
          },
          500: {
            description: 'Server error'
          }
        }
      }
    },
    '/category/array': {
      post: {
        summary: 'Insert multiple categories at once',
        tags: ['Categories'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    idCategory: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' }
                  },
                  required: ['idCategory', 'name', 'description']
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Categories inserted successfully'
          },
          400: {
            description: 'Invalid input data'
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
