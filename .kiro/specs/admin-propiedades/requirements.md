# Requirements Document

## Introduction

Aplicación web full stack para la administración de propiedades de alquiler (casas y departamentos). El sistema está compuesto por tres microservicios independientes dockerizados: **Properties Service** (gestión de propiedades y sus atributos), **Reservations Service** (reservas y pagos simulados), y **Reviews Service** (reseñas y calificaciones). El frontend es una SPA desarrollada en React + TypeScript. Cada microservicio posee su propia base de datos: PostgreSQL para entidades relacionales y MongoDB/DynamoDB para atributos extensibles y almacenamiento de fotos. No se requiere autenticación en esta iteración.

---

## Glossary

- **Properties Service**: Microservicio responsable del CRUD de propiedades, habitaciones, fotos y atributos extensibles.
- **Reservations Service**: Microservicio responsable de la creación, consulta y cancelación de reservas, incluyendo el procesamiento de pagos simulados.
- **Reviews Service**: Microservicio responsable de las reseñas y calificaciones de propiedades.
- **Property**: Entidad que representa una casa o departamento disponible para alquiler.
- **Room**: Habitación dentro de una propiedad, con sus atributos descriptivos.
- **Booking**: Reserva de una propiedad para un rango de fechas determinado.
- **Refundable Booking**: Reserva en la que el pago es devuelto íntegramente al cancelar.
- **Non-Refundable Booking**: Reserva con penalidad de cancelación configurable.
- **Payment Gateway Mock**: Módulo simulado de cobro que actualiza un flag `paid/unpaid` en la base de datos, reemplazable en el futuro por Stripe o MercadoPago.
- **Review**: Reseña escrita de un usuario sobre una propiedad, con calificación numérica de 1 a 5 estrellas.
- **Star Rating**: Promedio de calificaciones calculado a partir de las reseñas de una propiedad.
- **Currency**: Moneda utilizada para expresar el precio de alquiler. El precio de referencia es en USD.
- **Extended Attributes**: Atributos adicionales de una propiedad almacenados en formato flexible (documento NoSQL) para permitir extensibilidad futura.
- **Cancellation Penalty**: Porcentaje del monto total cobrado como penalidad al cancelar una reserva no reembolsable.
- **Frontend App**: Aplicación SPA en React + TypeScript que consume los microservicios via API REST.
- **API Gateway**: Punto de entrada único (o proxy) que enruta las peticiones del frontend a los microservicios correspondientes.
- **Docker Compose**: Herramienta de orquestación local para levantar todos los contenedores del sistema.

---

## Requirements

### Requirement 1 — Gestión de Propiedades (CRUD)

**User Story:** As a property administrator, I want to create, read, update, and delete properties with all their attributes, so that I can maintain an accurate and up-to-date catalog of available rentals.

#### Acceptance Criteria

1. THE Properties Service SHALL expose a REST API that allows creating, reading, updating, and deleting properties.
2. WHEN a create-property request is received, THE Properties Service SHALL persist the property with the following mandatory fields: `name`, `type` (house or apartment), `address`, `pricePerDayUSD`, `currency`, `rooms`, `maxGuests`.
3. WHEN a create-property request is received with any mandatory field missing or with an invalid value, THE Properties Service SHALL return HTTP 422 with a structured error response describing each validation failure.
4. WHEN a property update request is received for a non-existent property ID, THE Properties Service SHALL return HTTP 404.
5. WHEN a property delete request is received, THE Properties Service SHALL mark the property as deleted (soft delete) and SHALL NOT remove it physically from the database.
6. THE Properties Service SHALL store extended attributes for each property in a MongoDB or DynamoDB document, allowing arbitrary key-value pairs to be added without schema changes.
7. WHEN a get-property request is received, THE Properties Service SHALL return the property data including its extended attributes in a single response payload.
8. THE Properties Service SHALL validate and sanitize all string inputs to prevent injection attacks before persisting any data.

---

### Requirement 2 — Gestión de Habitaciones

**User Story:** As a property administrator, I want to manage the rooms within a property, so that I can describe the layout and capacity of each rental unit.

#### Acceptance Criteria

1. WHEN a create-room request is received for an existing property, THE Properties Service SHALL persist the room with the following mandatory fields: `name`, `type`, `beds`, `description`.
2. WHEN a create-room request is received for a non-existent property ID, THE Properties Service SHALL return HTTP 404.
3. WHEN a list-rooms request is received for a property, THE Properties Service SHALL return all active rooms associated with that property.
4. WHEN a room update request is received, THE Properties Service SHALL update only the fields provided in the request body and SHALL preserve all other existing room fields.

---

### Requirement 3 — Gestión de Fotos

**User Story:** As a property administrator, I want to upload and manage photos for each property, so that potential guests can view accurate images of the rental.

#### Acceptance Criteria

1. WHEN a photo upload request is received for an existing property, THE Properties Service SHALL store the photo reference (URL and metadata) in the document store (MongoDB or DynamoDB) associated with that property.
2. WHEN a photo upload request contains a file exceeding 10 MB, THE Properties Service SHALL reject the request and return HTTP 413.
3. WHEN a photo delete request is received, THE Properties Service SHALL remove the photo reference from the document store and SHALL confirm deletion with HTTP 200.
4. WHEN a list-photos request is received for a property, THE Properties Service SHALL return all photo references associated with that property in upload-date ascending order.

---

### Requirement 4 — Precios en Múltiples Monedas

**User Story:** As a property administrator, I want to set the rental price in multiple currencies with USD as reference, so that guests from different regions can understand the cost in their local currency.

#### Acceptance Criteria

1. THE Properties Service SHALL store the canonical price of each property in USD (`pricePerDayUSD`).
2. THE Properties Service SHALL accept an optional list of additional currencies with their conversion rates when creating or updating a property.
3. WHEN a get-property request is received with a `currency` query parameter, THE Properties Service SHALL return the price converted to the requested currency using the stored conversion rate.
4. IF a conversion rate for the requested currency is not stored, THEN THE Properties Service SHALL return the price in USD and SHALL include a `currency_fallback: true` flag in the response.

---

### Requirement 5 — Calificaciones por Estrellas

**User Story:** As a guest, I want to see the star rating of a property based on aggregated reviews, so that I can make an informed decision before booking.

#### Acceptance Criteria

1. THE Reviews Service SHALL calculate the star rating of a property as the arithmetic mean of all review scores for that property, rounded to one decimal place.
2. WHEN a new review is submitted for a property, THE Reviews Service SHALL recalculate and persist the updated star rating for that property.
3. WHEN a get-property request is received, THE Properties Service SHALL include the current `starRating` value in the response, sourced from the Reviews Service.
4. WHILE a property has no reviews, THE Properties Service SHALL return `starRating: null` in the response.

---

### Requirement 6 — Gestión de Reseñas

**User Story:** As a guest, I want to submit a written review and star rating for a property I stayed at, so that future guests can benefit from my experience.

#### Acceptance Criteria

1. WHEN a create-review request is received, THE Reviews Service SHALL persist the review with the following mandatory fields: `propertyId`, `guestName`, `score` (integer 1–5), `comment`.
2. WHEN a create-review request is received with a `score` outside the range 1–5, THE Reviews Service SHALL return HTTP 422.
3. WHEN a create-review request is received with a blank `comment`, THE Reviews Service SHALL return HTTP 422.
4. WHEN a list-reviews request is received for a property, THE Reviews Service SHALL return all reviews for that property in descending creation-date order.
5. THE Reviews Service SHALL sanitize the `comment` field to prevent XSS and injection attacks before persisting.

---

### Requirement 7 — Creación Atómica de Reservas

**User Story:** As a guest, I want my booking and payment to be processed as a single atomic operation, so that I never end up with an unpaid booking or a charged booking that was not created.

#### Acceptance Criteria

1. WHEN a create-booking request is received, THE Reservations Service SHALL execute the payment simulation and the booking record creation within a single atomic transaction.
2. IF the Payment Gateway Mock returns a failure response, THEN THE Reservations Service SHALL roll back the transaction and SHALL return HTTP 402 with a payment failure error.
3. IF an internal error occurs after payment succeeds but before the booking record is committed, THEN THE Reservations Service SHALL roll back the payment flag and SHALL return HTTP 500 with a rollback confirmation.
4. WHEN a booking is successfully created, THE Reservations Service SHALL set the booking status to `confirmed` and the payment flag to `paid`.
5. WHEN a create-booking request is received for dates that overlap with an existing `confirmed` booking for the same property, THE Reservations Service SHALL return HTTP 409.

---

### Requirement 8 — Tipos de Reserva: Reembolsable y No Reembolsable

**User Story:** As a guest, I want to choose between a refundable and a non-refundable booking, so that I can balance flexibility against cost.

#### Acceptance Criteria

1. WHEN a create-booking request is received, THE Reservations Service SHALL require a `bookingType` field with value `refundable` or `non_refundable`.
2. WHEN a create-booking request is received with an invalid `bookingType` value, THE Reservations Service SHALL return HTTP 422.
3. WHEN a non-refundable booking is created, THE Reservations Service SHALL persist the `cancellationPenaltyPercent` configured for the property at the time of booking creation.
4. THE Reservations Service SHALL expose an endpoint to retrieve the configured `cancellationPenaltyPercent` for a given property before a booking is made.

---

### Requirement 9 — Cancelación de Reservas

**User Story:** As a guest, I want to cancel my booking at any time, so that I can free up the dates if my plans change, understanding that a non-refundable booking may incur a penalty.

#### Acceptance Criteria

1. WHEN a cancel-booking request is received for a `confirmed` booking with `bookingType: refundable`, THE Reservations Service SHALL set the booking status to `cancelled` and SHALL trigger a full refund via the Payment Gateway Mock.
2. WHEN a cancel-booking request is received for a `confirmed` booking with `bookingType: non_refundable`, THE Reservations Service SHALL set the booking status to `cancelled` and SHALL trigger a partial refund equal to `totalAmount * (1 - cancellationPenaltyPercent / 100)` via the Payment Gateway Mock.
3. WHEN a cancel-booking request is received for a booking with status other than `confirmed`, THE Reservations Service SHALL return HTTP 409.
4. WHEN a cancel-booking request is received for a non-existent booking ID, THE Reservations Service SHALL return HTTP 404.
5. WHEN a cancellation is processed, THE Reservations Service SHALL update the booking status to `cancelled` and SHALL record the `cancelledAt` timestamp.

---

### Requirement 10 — Penalidad de Cancelación Configurable

**User Story:** As a property administrator, I want to configure the cancellation penalty percentage per property, so that I can set different commercial policies for each rental.

#### Acceptance Criteria

1. THE Properties Service SHALL store a `cancellationPenaltyPercent` field (0–100) for each property.
2. WHEN a property is created without a `cancellationPenaltyPercent` value, THE Properties Service SHALL default the value to `0`.
3. WHEN a property update request sets `cancellationPenaltyPercent` to a value outside the range 0–100, THE Properties Service SHALL return HTTP 422.
4. WHEN the `cancellationPenaltyPercent` of a property is updated, THE Reservations Service SHALL use the new value only for future bookings and SHALL preserve the penalty value recorded at the time of existing bookings.

---

### Requirement 11 — Extensibilidad de Propiedades

**User Story:** As a developer, I want the property model to support arbitrary additional attributes without schema migrations, so that new features can be added incrementally without downtime.

#### Acceptance Criteria

1. THE Properties Service SHALL store all non-core attributes of a property in an `extendedAttributes` document in MongoDB or DynamoDB, keyed by the property ID.
2. WHEN a property update request includes fields not present in the core schema, THE Properties Service SHALL persist those fields in the `extendedAttributes` document without returning an error.
3. WHEN the `extendedAttributes` document for a property is requested, THE Properties Service SHALL return all stored key-value pairs for that property.

---

### Requirement 12 — Servicios e Instalaciones

**User Story:** As a property administrator, I want to list the services and amenities available in a property, so that guests know what is included in the rental.

#### Acceptance Criteria

1. THE Properties Service SHALL accept a `services` field as an array of strings when creating or updating a property.
2. WHEN a get-property request is received, THE Properties Service SHALL include the full `services` array in the response.
3. WHEN a property update request modifies the `services` array, THE Properties Service SHALL replace the entire array with the new value provided.

---

### Requirement 13 — Frontend SPA

**User Story:** As a guest or property administrator, I want a responsive web interface to manage and browse properties, so that I can interact with the system without using raw API calls.

#### Acceptance Criteria

1. THE Frontend App SHALL provide views to list, create, edit, and delete properties.
2. THE Frontend App SHALL display photos, star rating, services, and extended attributes for each property.
3. THE Frontend App SHALL provide a view to create, view, and cancel bookings for a property.
4. THE Frontend App SHALL provide a view to list and submit reviews for a property.
5. WHEN an API call fails, THE Frontend App SHALL display a human-readable error message to the user and SHALL NOT expose internal error details or stack traces.
6. THE Frontend App SHALL validate all form inputs on the client side before submitting requests to the backend.
7. THE Frontend App SHALL communicate with the microservices exclusively via HTTPS.

---

### Requirement 14 — Configuración y Entorno

**User Story:** As a developer, I want all environment-specific configuration to be externalized, so that the application can be deployed to different environments without code changes.

#### Acceptance Criteria

1. THE Properties Service, THE Reservations Service, and THE Reviews Service SHALL read all database connection parameters (host, port, name, user, password) from environment variables or configuration files, and SHALL NOT hardcode any connection string.
2. THE Docker Compose SHALL define environment variables for all services using `.env` files that are excluded from version control via `.gitignore`.
3. WHEN a required environment variable is missing at service startup, THE service SHALL log a descriptive error message and SHALL exit with a non-zero exit code.
4. THE Frontend App SHALL read the base URLs of the microservices from build-time environment variables.

---

### Requirement 15 — Observabilidad y Salud

**User Story:** As a developer or operator, I want health-check endpoints and structured logging, so that I can monitor the state of each service and diagnose issues quickly.

#### Acceptance Criteria

1. THE Properties Service, THE Reservations Service, and THE Reviews Service SHALL expose a `GET /health` endpoint that returns HTTP 200 with a JSON body `{"status": "ok"}` when the service and its database connection are healthy.
2. IF the database connection is unavailable, THEN the `GET /health` endpoint SHALL return HTTP 503.
3. THE Properties Service, THE Reservations Service, and THE Reviews Service SHALL emit structured JSON logs to stdout for every incoming request, including `method`, `path`, `statusCode`, and `durationMs`.
4. THE services SHALL NOT include sensitive data (credentials, PII, tokens) in log output.

---

### Requirement 16 — Tests

**User Story:** As a developer, I want unit and integration tests for each service, so that regressions are detected automatically before deployment.

#### Acceptance Criteria

1. THE Properties Service SHALL have unit tests covering all business logic functions with at least 80% line coverage.
2. THE Reservations Service SHALL have integration tests covering the atomic booking creation flow, the refundable cancellation flow, and the non-refundable cancellation flow.
3. THE Reviews Service SHALL have unit tests covering score validation and star rating calculation.
4. THE Docker Compose SHALL include a `test` profile that runs all service test suites in isolated containers.
5. WHEN any test suite fails, THE CI pipeline SHALL report the failure and SHALL NOT proceed to subsequent stages.

---

### Requirement 17 — Documentación y README

**User Story:** As a developer joining the project, I want comprehensive documentation and a README with debug instructions, so that I can set up and run the project locally without assistance.

#### Acceptance Criteria

1. THE repository SHALL contain a `README.md` at the root with instructions to start the full system using Docker Compose, including prerequisite versions.
2. THE README SHALL include a section describing how to run each microservice in debug mode with hot-reload enabled.
3. THE README SHALL document all environment variables required by each service with their type, purpose, and an example value.
4. THE Properties Service, THE Reservations Service, and THE Reviews Service SHALL include OpenAPI (Swagger) documentation for all exposed endpoints.
5. THE README SHALL describe the database schema for each service and the structure of the `extendedAttributes` document.
