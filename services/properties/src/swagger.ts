import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Properties Service API',
    version: '1.0.0',
    description: 'Microservicio de administración de propiedades de alquiler',
  },
  servers: [{ url: '/', description: 'Servidor local' }],
  tags: [
    { name: 'Properties', description: 'Gestión de propiedades' },
    { name: 'Rooms', description: 'Gestión de habitaciones' },
    { name: 'Photos', description: 'Gestión de fotos' },
    { name: 'Health', description: 'Estado del servicio' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Verifica conexión a PostgreSQL y MongoDB. Retorna 200 si ambas están disponibles.',
        responses: {
          '200': {
            description: 'Servicio saludable',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                  },
                },
              },
            },
          },
          '503': {
            description: 'Servicio no disponible',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'error' },
                    reason: { type: 'string', example: 'database unavailable' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/properties': {
      get: {
        tags: ['Properties'],
        summary: 'Listar propiedades activas',
        description: 'Retorna todas las propiedades que no han sido eliminadas (soft delete).',
        responses: {
          '200': {
            description: 'Lista de propiedades',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/PropertyResponse' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Properties'],
        summary: 'Crear propiedad',
        description: 'Crea una nueva propiedad con sus atributos obligatorios y opcionales.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreatePropertyDto' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Propiedad creada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PropertyResponse' },
              },
            },
          },
          '422': {
            description: 'Error de validación',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' },
              },
            },
          },
        },
      },
    },
    '/properties/{id}': {
      get: {
        tags: ['Properties'],
        summary: 'Obtener propiedad por ID',
        description: 'Retorna la propiedad con sus atributos extendidos, starRating y conversión de moneda opcional.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID de la propiedad' },
          { name: 'currency', in: 'query', required: false, schema: { type: 'string', example: 'ARS' }, description: 'Código de moneda para conversión de precio' },
        ],
        responses: {
          '200': {
            description: 'Propiedad encontrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PropertyDetailResponse' },
              },
            },
          },
          '404': {
            description: 'Propiedad no encontrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NotFoundError' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Properties'],
        summary: 'Actualizar propiedad',
        description: 'Actualiza los campos proporcionados de una propiedad existente.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID de la propiedad' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdatePropertyDto' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Propiedad actualizada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PropertyResponse' },
              },
            },
          },
          '404': {
            description: 'Propiedad no encontrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NotFoundError' },
              },
            },
          },
          '422': {
            description: 'Error de validación',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Properties'],
        summary: 'Eliminar propiedad (soft delete)',
        description: 'Marca la propiedad como eliminada. No la borra físicamente de la base de datos.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID de la propiedad' },
        ],
        responses: {
          '204': { description: 'Propiedad eliminada exitosamente' },
          '404': {
            description: 'Propiedad no encontrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NotFoundError' },
              },
            },
          },
        },
      },
    },
    '/properties/{id}/extended-attributes': {
      get: {
        tags: ['Properties'],
        summary: 'Obtener atributos extendidos de una propiedad',
        description: 'Retorna los atributos extendidos almacenados en MongoDB para la propiedad indicada.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID de la propiedad' },
        ],
        responses: {
          '200': {
            description: 'Atributos extendidos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    extendedAttributes: {
                      type: 'object',
                      additionalProperties: true,
                      description: 'Atributos adicionales en formato libre (key-value)',
                      example: { pool: true, garden: true, parkingSpots: 2 },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Propiedad no encontrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NotFoundError' },
              },
            },
          },
        },
      },
    },
    '/properties/{id}/rooms': {
      get: {
        tags: ['Rooms'],
        summary: 'Listar habitaciones de una propiedad',
        description: 'Retorna todas las habitaciones activas asociadas a la propiedad.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID de la propiedad' },
        ],
        responses: {
          '200': {
            description: 'Lista de habitaciones',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/RoomResponse' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Rooms'],
        summary: 'Crear habitación en una propiedad',
        description: 'Agrega una nueva habitación a la propiedad indicada.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID de la propiedad' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateRoomDto' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Habitación creada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RoomResponse' },
              },
            },
          },
          '422': {
            description: 'Error de validación',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' },
              },
            },
          },
        },
      },
    },
    '/properties/{id}/rooms/{roomId}': {
      put: {
        tags: ['Rooms'],
        summary: 'Actualizar habitación',
        description: 'Actualiza parcialmente una habitación. Solo los campos enviados se modifican.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID de la propiedad' },
          { name: 'roomId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID de la habitación' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateRoomDto' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Habitación actualizada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RoomResponse' },
              },
            },
          },
          '404': {
            description: 'Habitación no encontrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NotFoundError' },
              },
            },
          },
        },
      },
    },
    '/properties/{id}/photos': {
      get: {
        tags: ['Photos'],
        summary: 'Listar fotos de una propiedad',
        description: 'Retorna todas las fotos asociadas a la propiedad, ordenadas por fecha de subida ascendente.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID de la propiedad' },
        ],
        responses: {
          '200': {
            description: 'Lista de fotos ordenadas por uploadedAt ascendente',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/PhotoResponse' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Photos'],
        summary: 'Subir foto',
        description: 'Sube una foto para la propiedad. Tamaño máximo configurado vía PHOTO_MAX_SIZE_BYTES.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID de la propiedad' },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['photo'],
                properties: {
                  photo: { type: 'string', format: 'binary', description: 'Archivo de imagen' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Foto subida exitosamente',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PhotoResponse' },
              },
            },
          },
          '413': {
            description: 'Archivo demasiado grande (excede PHOTO_MAX_SIZE_BYTES)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string', example: 'File too large' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/properties/{id}/photos/{photoId}': {
      delete: {
        tags: ['Photos'],
        summary: 'Eliminar foto',
        description: 'Elimina la referencia de la foto del document store.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID de la propiedad' },
          { name: 'photoId', in: 'path', required: true, schema: { type: 'string' }, description: 'ID de la foto' },
        ],
        responses: {
          '200': {
            description: 'Foto eliminada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Photo deleted' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Foto no encontrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NotFoundError' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      CreatePropertyDto: {
        type: 'object',
        required: ['name', 'type', 'address', 'pricePerDayUSD', 'rooms', 'maxGuests'],
        properties: {
          name: { type: 'string', maxLength: 255, example: 'Casa del Sol' },
          type: { type: 'string', enum: ['house', 'apartment'], example: 'house' },
          address: { type: 'string', example: 'Av. Rivadavia 1234, CABA' },
          pricePerDayUSD: { type: 'number', minimum: 0.01, example: 85.5 },
          currency: { type: 'string', default: 'USD', example: 'USD' },
          rooms: { type: 'integer', minimum: 1, example: 3 },
          maxGuests: { type: 'integer', minimum: 1, example: 6 },
          cancellationPenaltyPercent: { type: 'number', minimum: 0, maximum: 100, default: 0, example: 20 },
          services: { type: 'array', items: { type: 'string' }, example: ['wifi', 'pool', 'parking'] },
          extendedAttributes: { type: 'object', additionalProperties: true, example: { pool: true, garden: true } },
        },
      },
      UpdatePropertyDto: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 255 },
          type: { type: 'string', enum: ['house', 'apartment'] },
          address: { type: 'string' },
          pricePerDayUSD: { type: 'number', minimum: 0.01 },
          cancellationPenaltyPercent: { type: 'number', minimum: 0, maximum: 100 },
          services: { type: 'array', items: { type: 'string' } },
          extendedAttributes: { type: 'object', additionalProperties: true },
        },
      },
      PropertyResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['house', 'apartment'] },
          address: { type: 'string' },
          pricePerDayUSD: { type: 'number' },
          currency: { type: 'string' },
          rooms: { type: 'integer' },
          maxGuests: { type: 'integer' },
          cancellationPenaltyPercent: { type: 'number' },
          services: { type: 'array', items: { type: 'string' } },
          deleted: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      PropertyDetailResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['house', 'apartment'] },
          address: { type: 'string' },
          pricePerDayUSD: { type: 'number' },
          priceConverted: { type: 'number', nullable: true, description: 'Precio convertido a la moneda solicitada' },
          currency: { type: 'string' },
          currencyFallback: { type: 'boolean', description: 'true si la moneda solicitada no tiene tasa almacenada' },
          rooms: { type: 'integer' },
          maxGuests: { type: 'integer' },
          cancellationPenaltyPercent: { type: 'number' },
          services: { type: 'array', items: { type: 'string' } },
          extendedAttributes: { type: 'object', additionalProperties: true },
          starRating: { type: 'number', nullable: true, description: 'Promedio de calificaciones (null si sin reseñas)' },
          deleted: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateRoomDto: {
        type: 'object',
        required: ['name', 'type', 'beds', 'description'],
        properties: {
          name: { type: 'string', maxLength: 255, example: 'Habitación Principal' },
          type: { type: 'string', maxLength: 100, example: 'bedroom' },
          beds: { type: 'integer', minimum: 1, example: 2 },
          description: { type: 'string', example: 'Habitación con vista al jardín' },
        },
      },
      UpdateRoomDto: {
        type: 'object',
        description: 'Todos los campos son opcionales. Solo se actualizan los enviados.',
        properties: {
          name: { type: 'string', maxLength: 255 },
          type: { type: 'string', maxLength: 100 },
          beds: { type: 'integer', minimum: 1 },
          description: { type: 'string' },
          active: { type: 'boolean' },
        },
      },
      RoomResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          propertyId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          type: { type: 'string' },
          beds: { type: 'integer' },
          description: { type: 'string' },
          active: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      PhotoResponse: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          propertyId: { type: 'string', format: 'uuid' },
          url: { type: 'string', format: 'uri' },
          originalName: { type: 'string' },
          mimeType: { type: 'string', example: 'image/jpeg' },
          size: { type: 'integer', description: 'Tamaño en bytes' },
          uploadedAt: { type: 'string', format: 'date-time' },
        },
      },
      ValidationError: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Validation failed' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'name' },
                message: { type: 'string', example: 'Required' },
              },
            },
          },
        },
      },
      NotFoundError: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Not found' },
        },
      },
    },
  },
};

const swaggerRouter = Router();
swaggerRouter.use('/', swaggerUi.serve);
swaggerRouter.get('/', swaggerUi.setup(swaggerDocument));

export default swaggerRouter;
