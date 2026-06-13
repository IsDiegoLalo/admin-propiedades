# Implementation Plan: admin-propiedades

## Overview

Plan de implementación incremental para el sistema de administración de propiedades de alquiler
compuesto por tres microservicios Node.js/Express/TypeScript (Properties, Reservations, Reviews),
una SPA React + TypeScript y orquestación Docker Compose. Cada tarea construye sobre la anterior
para garantizar integración continua sin código huérfano.

---

## Tasks

- [x] 1. Infraestructura base del repositorio y Docker Compose
  - Crear la estructura de carpetas raíz: `services/properties`, `services/reservations`,
    `services/reviews`, `frontend`
  - Crear `docker-compose.yml` con los seis servicios: tres microservicios + tres PostgreSQL +
    MongoDB + frontend
  - Crear `docker-compose.test.yml` con perfil `test` para correr suites de tests en contenedores
    aislados
  - Crear `.env.example` con todas las variables de entorno documentadas por servicio
  - Crear `.gitignore` excluyendo `.env`, `node_modules`, `dist`, `coverage`
  - Agregar pre-commit hook para detección de secrets (usando `detect-secrets` o `gitleaks`)
  - _Requirements: 14.1, 14.2, 14.3, 16.4_

- [x] 2. Properties Service — scaffold y configuración
  - [x] 2.1 Crear `package.json`, `tsconfig.json` y `jest.config.ts` del Properties Service
    - Instalar dependencias: `express`, `zod`, `knex`, `pg`, `mongoose`, `pino`,
      `isomorphic-dompurify`, `multer`, `swagger-ui-express`, `uuid`
    - Instalar devDependencies: `typescript`, `ts-jest`, `jest`, `supertest`, `@types/*`
    - Configurar `tsconfig.json` con `strict: true`
    - Configurar `jest.config.ts` con `ts-jest`, `coverageThreshold: { lines: 80 }`
    - _Requirements: 14.1, 16.1_

  - [x] 2.2 Implementar `src/config/env.ts` del Properties Service
    - Leer y validar todas las variables de entorno requeridas al inicio
    - Salir con código no-cero y loguear mensaje descriptivo si falta alguna variable
    - Exportar constantes tipadas: `PORT`, `POSTGRES_*`, `MONGO_URI`, `REVIEWS_SERVICE_URL`,
      `PHOTO_MAX_SIZE_BYTES`
    - _Requirements: 14.3_

  - [x] 2.3 Implementar conexiones a base de datos (`src/db/postgres.ts`, `src/db/mongo.ts`)
    - Crear cliente Knex para PostgreSQL con pool de conexiones
    - Crear cliente Mongoose para MongoDB
    - Exportar función `checkConnections()` usada por health check
    - _Requirements: 14.1, 15.1, 15.2_

  - [x] 2.4 Crear migraciones SQL de Properties Service
    - Crear tablas `properties`, `property_currency_rates`, `rooms` con todos los constraints
      definidos en el diseño
    - _Requirements: 1.2, 2.1, 4.1, 10.1_

- [x] 3. Properties Service — modelos, validadores y middleware
  - [x] 3.1 Implementar modelos TypeScript y esquemas Zod
    - Crear `src/models/property.ts` con tipos e interfaces alineados al esquema SQL
    - Crear `src/models/room.ts`
    - Crear `src/models/propertyDoc.ts` con la interfaz Mongoose `PropertyDocument`
    - Crear `src/validators/propertyValidator.ts` con `createPropertySchema` y
      `updatePropertySchema` usando Zod + `sanitizeString`
    - Crear `src/validators/roomValidator.ts`
    - _Requirements: 1.2, 1.3, 1.8, 2.1, 8.1_

  - [x] 3.2 Escribir property test para validación de propiedades (Property 2)
    - **Property 2: Rechazo universal de propiedades inválidas**
    - **Validates: Requirements 1.3, 8.1, 8.2**
    - Usar `fast-check` para generar requests con campos obligatorios faltantes o inválidos
    - Verificar que `createPropertySchema.safeParse()` rechaza y devuelve errores por campo

  - [x] 3.3 Implementar `src/middleware/requestLogger.ts` y `src/middleware/errorHandler.ts`
    - Logger Pino con campos `method`, `path`, `statusCode`, `durationMs`; sin datos sensibles
    - Error handler global para `ZodError` (422), `NotFoundError` (404), `ConflictError` (409),
      `PaymentError` (402) y errores genéricos (500)
    - _Requirements: 15.3, 15.4_

  - [x] 3.4 Escribir property test para logs estructurados (Property 21)
    - **Property 21: Logs estructurados por request**
    - **Validates: Requirements 15.3, 15.4**
    - Verificar con `fast-check` que para cualquier combinación method/path/status el log emitido
      es JSON válido con los cuatro campos requeridos

- [x] 4. Properties Service — lógica de negocio principal
  - [x] 4.1 Implementar `src/services/propertyService.ts`
    - Funciones: `createProperty`, `getPropertyById`, `listProperties`, `updateProperty`,
      `softDeleteProperty`
    - Incluir conversión de moneda (con fallback a USD) y consulta a `extendedAttributes`
    - Invocar `reviewsClient.getRating(propertyId)` para obtener `starRating` en `getPropertyById`
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.7, 4.1, 4.2, 4.3, 4.4, 5.3, 5.4, 12.1, 12.2_

  - [x] 4.2 Escribir property test para round-trip de propiedad (Property 1)
    - **Property 1: Round-trip de creación de propiedad**
    - **Validates: Requirements 1.2, 1.7**
    - Generar con `fast-check` conjuntos válidos de campos obligatorios, crear y recuperar;
      verificar igualdad campo a campo

  - [x] 4.3 Escribir property test para soft delete (Property 3)
    - **Property 3: Soft delete — invisibilidad en listados**
    - **Validates: Requirements 1.5**
    - Verificar que tras `softDeleteProperty` la propiedad no aparece en `listProperties` pero
      `getPropertyById` (admin) retorna `deleted: true`

  - [x] 4.4 Escribir property test para conversión de moneda (Property 8)
    - **Property 8: Conversión de moneda**
    - **Validates: Requirements 4.3**
    - Generar con `fast-check` pares `(pricePerDayUSD, rate)` y verificar
      `priceConverted = pricePerDayUSD × rate` con precisión de 2 decimales

  - [x] 4.5 Escribir property test para fallback de moneda (Property 9)
    - **Property 9: Fallback de moneda desconocida**
    - **Validates: Requirements 4.4**
    - Verificar que cualquier código de moneda sin tasa almacenada devuelve precio en USD con
      `currencyFallback: true`

  - [x] 4.6 Implementar `src/services/roomService.ts`
    - Funciones: `createRoom`, `listRooms`, `updateRoom` (patch parcial)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 4.7 Escribir property test para actualización parcial de habitación (Property 6)
    - **Property 6: Preservación parcial en updates de habitación**
    - **Validates: Requirements 2.4**
    - Generar subconjuntos arbitrarios de campos y verificar que los no-enviados no mutan

  - [x] 4.8 Implementar `src/services/photoService.ts` y `src/services/reviewsClient.ts`
    - `photoService`: guardar referencia en MongoDB, eliminar referencia, listar ordenado por
      `uploadedAt` ascendente (validar tamaño ≤ `PHOTO_MAX_SIZE_BYTES`)
    - `reviewsClient`: cliente HTTP hacia `REVIEWS_SERVICE_URL` para `GET /reviews/ratings/:id`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.3_

  - [x] 4.9 Escribir property test para orden de fotos (Property 7)
    - **Property 7: Invariante de orden en fotos**
    - **Validates: Requirements 3.4**
    - Insertar fotos con timestamps arbitrarios y verificar que `listPhotos` siempre devuelve
      orden `uploadedAt` estrictamente ascendente

  - [x] 4.10 Escribir property test para round-trip de atributos extendidos (Property 4)
    - **Property 4: Round-trip de atributos extendidos y servicios**
    - **Validates: Requirements 1.6, 1.7, 11.1, 11.2, 11.3, 12.1, 12.2**
    - Generar con `fast-check` objetos arbitrarios de `extendedAttributes` y arrays de `services`,
      persistir y recuperar; verificar igualdad sin pérdida

  - [x] 4.11 Escribir property test para sanitización de inputs (Property 5)
    - **Property 5: Sanitización de inputs de texto**
    - **Validates: Requirements 1.8, 6.5**
    - Generar strings con payloads XSS y secuencias de inyección; verificar que el valor
      almacenado es la versión sanitizada

- [x] 5. Properties Service — routes, controllers, swagger y health check
  - [x] 5.1 Implementar controllers y routes
    - `src/controllers/propertyController.ts`, `roomController.ts`, `photoController.ts`
    - `src/routes/properties.ts`, `rooms.ts`, `photos.ts`
    - Wiring en `src/index.ts`: montar routers, middleware de logging, error handler, health check
    - _Requirements: 1.1, 2.1, 3.1, 13.1, 13.2_

  - [x] 5.2 Implementar `GET /health` del Properties Service
    - Verificar conexión PostgreSQL (`SELECT 1`) y MongoDB (`ping`)
    - Retornar 200 `{"status":"ok"}` o 503 `{"status":"error"}` según disponibilidad
    - _Requirements: 15.1, 15.2_

  - [x] 5.3 Configurar Swagger/OpenAPI del Properties Service
    - Documentar todos los endpoints con request/response schemas usando `swagger-ui-express`
    - _Requirements: 17.4_

  - [x] 5.4 Escribir tests de integración del Properties Service
    - Usar Supertest + testcontainers para PostgreSQL y MongoDB en memoria
    - Cubrir: CRUD completo de propiedades, rooms, fotos, health check, errores 404/422/413
    - _Requirements: 16.1_

- [x] 6. Checkpoint — Properties Service
  - Asegurarse de que todos los tests pasan (`npm test -- --coverage`) y la cobertura ≥ 80%.
    Preguntar al usuario si hay dudas antes de continuar.

- [x] 7. Reviews Service — scaffold, modelos y lógica de negocio
  - [x] 7.1 Crear `package.json`, `tsconfig.json` y `jest.config.ts` del Reviews Service
    - Instalar dependencias: `express`, `zod`, `knex`, `pg`, `pino`, `isomorphic-dompurify`,
      `swagger-ui-express`
    - Configurar `strict: true` y cobertura ≥ 80%
    - _Requirements: 14.1, 16.3_

  - [x] 7.2 Implementar `src/config/env.ts`, `src/db/postgres.ts` del Reviews Service
    - Validar variables `POSTGRES_*` y `PORT`; salir con código no-cero si falta alguna
    - _Requirements: 14.3_

  - [x] 7.3 Crear migración SQL del Reviews Service
    - Crear tablas `reviews` y `property_ratings` con constraints e índices del diseño
    - _Requirements: 5.1, 6.1_

  - [x] 7.4 Implementar `src/validators/reviewValidator.ts`
    - Schema Zod: `propertyId` UUID, `guestName` no vacío, `score` entero 1-5,
      `comment` no vacío/no solo whitespace, sanitizar `comment` con DOMPurify
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [x] 7.5 Escribir property test para validación de score (Property 12)
    - **Property 12: Validación de score de reseña**
    - **Validates: Requirements 6.2**
    - Generar con `fast-check` scores enteros y decimales; verificar rechazo fuera de [1,5] y
      aceptación dentro del rango

  - [x] 7.6 Implementar `src/services/reviewService.ts`
    - Funciones: `createReview` (persiste + recalcula `starRating`), `listReviews` (desc por
      `createdAt`), `getRating`
    - Cálculo de `starRating`: media aritmética redondeada a 1 decimal; `null` si sin reseñas
    - _Requirements: 5.1, 5.2, 6.1, 6.4_

  - [x] 7.7 Escribir property test para exactitud de star rating (Property 10)
    - **Property 10: Exactitud del cálculo de star rating**
    - **Validates: Requirements 5.1, 5.2**
    - Generar con `fast-check` listas de scores enteros [1,5] y verificar que el resultado
      coincide con `round(mean(scores), 1)`

  - [x] 7.8 Escribir property test para star rating null (Property 11)
    - **Property 11: Star rating null para propiedades sin reseñas**
    - **Validates: Requirements 5.4**
    - Verificar que `getRating` retorna `starRating: null` para cualquier `propertyId` sin reseñas

  - [x] 7.9 Escribir property test para orden de reseñas (Property 13)
    - **Property 13: Invariante de orden en listado de reseñas**
    - **Validates: Requirements 6.4**
    - Insertar reseñas con timestamps arbitrarios y verificar que `listReviews` siempre devuelve
      orden `createdAt` estrictamente descendente

- [x] 8. Reviews Service — routes, controllers, swagger y health check
  - [x] 8.1 Implementar controllers, routes y wiring en `src/index.ts`
    - Endpoints: `POST /reviews`, `GET /reviews`, `GET /reviews/ratings/:propertyId`, `GET /health`
    - Montar middleware de logging, error handler global
    - _Requirements: 6.1, 6.4, 5.3, 13.4_

  - [x] 8.2 Implementar `GET /health` del Reviews Service
    - Verificar conexión PostgreSQL; retornar 200 o 503
    - _Requirements: 15.1, 15.2_

  - [x] 8.3 Configurar Swagger/OpenAPI del Reviews Service
    - _Requirements: 17.4_

  - [x] 8.4 Escribir unit tests del Reviews Service
    - Cubrir: `reviewService.ts`, `reviewValidator.ts` (score, comment sanitization) ≥ 80%
    - _Requirements: 16.3_

- [x] 9. Checkpoint — Reviews Service
  - Asegurarse de que todos los tests pasan y cobertura ≥ 80%. Preguntar si hay dudas antes de continuar.

- [x] 10. Reservations Service — scaffold, modelos y validadores
  - [x] 10.1 Crear `package.json`, `tsconfig.json` y `jest.config.ts` del Reservations Service
    - Instalar dependencias: `express`, `zod`, `knex`, `pg`, `pino`, `swagger-ui-express`
    - Configurar `strict: true`
    - _Requirements: 14.1_

  - [x] 10.2 Implementar `src/config/env.ts`, `src/db/postgres.ts` del Reservations Service
    - Validar `POSTGRES_*`, `PROPERTIES_SERVICE_URL`, `PAYMENT_MOCK_FAILURE_RATE`, `PORT`
    - _Requirements: 14.3_

  - [x] 10.3 Crear migración SQL del Reservations Service
    - Crear tipos ENUM `booking_type`, `booking_status`, `payment_status`
    - Crear tabla `bookings` con todos los constraints e índice de fechas del diseño
    - _Requirements: 7.1, 8.1_

  - [x] 10.4 Implementar `src/validators/bookingValidator.ts`
    - Schema Zod: `propertyId` UUID, `guestName`, `checkIn`/`checkOut` ISO date con
      `checkOut > checkIn`, `totalAmountUSD` positivo, `bookingType` enum
    - _Requirements: 7.5, 8.1, 8.2_

  - [x] 10.5 Escribir property test para validación de reserva (Property 2 — Reservations)
    - Generar con `fast-check` requests con campos inválidos o faltantes; verificar rechazo 422
    - **Validates: Requirements 8.1, 8.2**

- [x] 11. Reservations Service — lógica de negocio
  - [x] 11.1 Implementar `src/services/paymentGatewayMock.ts`
    - Métodos `charge(amount, currency)` y `refund(amount, transactionId)`
    - Controlar tasa de fallos via `PAYMENT_MOCK_FAILURE_RATE`
    - _Requirements: 7.1, 7.2, 9.1, 9.2_

  - [x] 11.2 Implementar `src/services/propertiesClient.ts`
    - Cliente HTTP hacia `PROPERTIES_SERVICE_URL` para `GET /properties/:id`
    - Retornar `cancellationPenaltyPercent`; lanzar error si el servicio no responde
    - _Requirements: 8.3, 10.4_

  - [x] 11.3 Implementar `src/services/bookingService.ts`
    - `createBooking`: verificar solapamiento de fechas → 409, obtener `cancellationPenaltyPercent`
      de Properties Service, ejecutar transacción atómica (INSERT + `paymentGatewayMock.charge`),
      manejar rollback en fallo de pago (HTTP 402) o fallo post-pago (HTTP 500)
    - `cancelBooking`: verificar estado `confirmed` → 409 si no; calcular reembolso
      (`refundable` = total, `non_refundable` = `total × (1 - penalty/100)`);
      ejecutar `paymentGatewayMock.refund`; actualizar `status=cancelled`, `cancelledAt=NOW()`
    - `getBooking`, `listBookingsByProperty`
    - _Requirements: 7.1–7.5, 8.1–8.3, 9.1–9.5, 10.4_

  - [x] 11.4 Escribir property test para atomicidad de reserva (Property 14)
    - **Property 14: Atomicidad de creación de reserva**
    - **Validates: Requirements 7.1, 7.2, 7.3**
    - Configurar `PAYMENT_MOCK_FAILURE_RATE=1.0`; generar requests válidos y verificar que
      no existe ningún registro en `bookings` tras fallo de pago

  - [x] 11.5 Escribir property test para post-condición de reserva exitosa (Property 15)
    - **Property 15: Post-condición de reserva exitosa**
    - **Validates: Requirements 7.4**
    - Para cualquier reserva creada exitosamente verificar `bookingStatus=confirmed` y
      `paymentStatus=paid`

  - [x] 11.6 Escribir property test para exclusión mutua de fechas (Property 16)
    - **Property 16: Exclusión mutua de fechas solapadas**
    - **Validates: Requirements 7.5**
    - Generar con `fast-check` rangos de fechas solapantes (parcial/total) y verificar HTTP 409

  - [x] 11.7 Escribir property test para snapshot de cancellation penalty (Property 17)
    - **Property 17: Snapshot de cancellation penalty en reserva**
    - **Validates: Requirements 8.3, 10.4**
    - Crear reserva, modificar `cancellationPenaltyPercent` de la propiedad, verificar que la
      reserva existente conserva el valor original

  - [x] 11.8 Escribir property test para reembolso parcial (Property 18)
    - **Property 18: Cálculo exacto de reembolso parcial**
    - **Validates: Requirements 9.2**
    - Generar con `fast-check` pares `(totalAmountUSD, cancellationPenaltyPercent)` y verificar
      que `refundedAmount = totalAmountUSD × (1 - penalty/100)` con precisión de 2 decimales

  - [x] 11.9 Escribir property test para transición de estado (Property 19)
    - **Property 19: Transición de estado de cancelación**
    - **Validates: Requirements 9.3**
    - Cancelar una reserva ya cancelada y verificar HTTP 409 sin modificación de estado

- [x] 12. Reservations Service — routes, controllers, swagger y health check
  - [x] 12.1 Implementar controllers, routes y wiring en `src/index.ts`
    - Endpoints: `POST /bookings`, `GET /bookings/:id`, `GET /bookings`, `DELETE /bookings/:id`,
      `GET /health`
    - Montar middleware de logging y error handler global
    - _Requirements: 7.1, 8.1, 9.1, 13.3_

  - [x] 12.2 Implementar `GET /health` del Reservations Service
    - Verificar conexión PostgreSQL; retornar 200 o 503
    - _Requirements: 15.1, 15.2_

  - [x] 12.3 Configurar Swagger/OpenAPI del Reservations Service
    - _Requirements: 17.4_

  - [x] 12.4 Escribir tests de integración del Reservations Service
    - Cubrir con Supertest: flujo de creación atómica (happy path + fallo de pago + fallo
      post-pago), cancelación refundable y no reembolsable
    - _Requirements: 16.2_

- [x] 13. Checkpoint — Reservations Service
  - Asegurarse de que todos los tests de integración pasan. Preguntar si hay dudas.

- [x] 14. Frontend — scaffold y configuración
  - [x] 14.1 Crear `package.json`, `tsconfig.json`, `vite.config.ts` del frontend
    - Instalar dependencias: `react`, `react-dom`, `react-router-dom`, `axios`
    - Instalar devDependencies: `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`,
      `@testing-library/react`, `@testing-library/user-event`, `msw`, `eslint`, `prettier`
    - Configurar `strict: true` en tsconfig y ESLint + Prettier
    - _Requirements: 13.1, 14.4_

  - [x] 14.2 Implementar `src/config/api.ts`
    - Leer `VITE_PROPERTIES_API_URL`, `VITE_RESERVATIONS_API_URL`, `VITE_REVIEWS_API_URL` de
      variables de entorno de build
    - Crear instancias de axios por servicio
    - _Requirements: 13.7, 14.4_

  - [x] 14.3 Implementar tipos TypeScript compartidos del frontend
    - Crear `src/types/` con interfaces `PropertyResponseDto`, `BookingResponseDto`,
      `CreateReviewDto`, etc. alineadas al diseño
    - _Requirements: 13.1_

- [x] 15. Frontend — servicios API y pages principales
  - [x] 15.1 Implementar `src/services/` del frontend
    - `propertiesService.ts`: CRUD de propiedades, rooms, fotos, atributos extendidos
    - `reservationsService.ts`: crear, listar, cancelar bookings
    - `reviewsService.ts`: listar y crear reseñas
    - Capturar errores de axios y re-lanzar con mensaje legible; nunca exponer stack traces
    - _Requirements: 13.5, 13.7_

  - [x] 15.2 Implementar `src/pages/PropertiesPage.tsx` y `PropertyDetailPage.tsx`
    - Listado y búsqueda de propiedades activas con star rating, fotos, servicios y atributos
      extendidos
    - Formulario de creación/edición con validación client-side antes de enviar al backend
    - Acción de soft delete con confirmación
    - Mostrar error amigable ante fallo de API
    - _Requirements: 13.1, 13.2, 13.5, 13.6_

  - [x] 15.3 Implementar `src/pages/BookingsPage.tsx`
    - Formulario de creación de reserva con selector de `bookingType`, validación client-side
    - Listado de reservas por propiedad y acción de cancelación
    - _Requirements: 13.3, 13.5, 13.6_

  - [x] 15.4 Implementar `src/pages/ReviewsPage.tsx`
    - Listado de reseñas con score y fecha; formulario de nueva reseña con validación client-side
    - _Requirements: 13.4, 13.5, 13.6_

  - [x] 15.5 Completar `src/App.tsx` con react-router-dom y navegación entre páginas
    - Definir rutas: `/`, `/properties/:id`, `/properties/:id/bookings`,
      `/properties/:id/reviews`
    - _Requirements: 13.1–13.4_

  - [x] 15.6 Escribir unit/integration tests del frontend
    - Usar Vitest + React Testing Library + MSW para mockear APIs
    - Cubrir: formulario de propiedad (validación), manejo de errores de API, flujo de booking
    - _Requirements: 13.5, 13.6_

- [x] 16. Documentación y README
  - [x] 16.1 Crear `README.md` raíz
    - Instrucciones para levantar el sistema con Docker Compose (prerequisitos de versión)
    - Sección de debug/hot-reload por microservicio
    - Documentación de todas las variables de entorno con tipo, propósito y valor de ejemplo
    - Descripción del esquema de base de datos por servicio y estructura del documento
      `extendedAttributes`
    - _Requirements: 17.1, 17.2, 17.3, 17.5_

- [x] 17. Checkpoint final — Integración y tests completos
  - Ejecutar `docker-compose -f docker-compose.test.yml up --abort-on-container-exit`
    y verificar que todas las suites pasan. Preguntar al usuario si hay dudas antes de cerrar.

---

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido.
- Los property tests usan la librería `fast-check` (ya incluida como devDependency en cada servicio).
- Cada tarea referencia requerimientos específicos para trazabilidad.
- Los checkpoints garantizan validación incremental antes de avanzar al siguiente servicio.
- La seguridad está integrada en todo el stack: validación Zod + sanitización DOMPurify, sin
  credenciales en logs ni en repositorio, HTTPS obligatorio en comunicaciones externas.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "7.1", "10.1", "14.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "2.4", "7.2", "7.3", "10.2", "10.3", "14.2", "14.3"] },
    { "id": 2, "tasks": ["3.1", "7.4", "10.4"] },
    { "id": 3, "tasks": ["3.2", "3.3", "7.5", "10.5"] },
    { "id": 4, "tasks": ["3.4", "4.1", "7.6", "11.1", "11.2"] },
    { "id": 5, "tasks": ["4.2", "4.3", "4.6", "7.7", "7.8", "7.9", "11.3"] },
    { "id": 6, "tasks": ["4.4", "4.5", "4.7", "4.8", "8.1", "8.2", "11.4", "11.5", "11.6", "11.7", "11.8", "11.9"] },
    { "id": 7, "tasks": ["4.9", "4.10", "4.11", "8.3", "8.4", "12.1", "12.2"] },
    { "id": 8, "tasks": ["5.1", "12.3", "12.4"] },
    { "id": 9, "tasks": ["5.2", "5.3", "15.1"] },
    { "id": 10, "tasks": ["5.4", "15.2", "15.3", "15.4"] },
    { "id": 11, "tasks": ["15.5"] },
    { "id": 12, "tasks": ["15.6", "16.1"] }
  ]
}
```
