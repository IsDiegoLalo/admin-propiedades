# Design Document — admin-propiedades

## Overview

Sistema de administración de propiedades de alquiler compuesto por tres microservicios independientes
dockerizados, una SPA en React + TypeScript como frontend, y bases de datos mixtas
(PostgreSQL + MongoDB). Cada servicio es autónomo, expone una API REST documentada con OpenAPI/Swagger,
y se despliega mediante Docker Compose.

---

## Architecture

### Diagrama de alto nivel

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Docker Compose Network                       │
│                                                                     │
│  ┌──────────────┐    REST    ┌─────────────────────┐                │
│  │   Frontend   │──────────▶│  Properties Service  │──▶ PostgreSQL  │
│  │  React/TS    │           │    :3001             │──▶ MongoDB     │
│  │  :5173       │           └─────────────────────┘                │
│  │              │    REST    ┌─────────────────────┐                │
│  │              │──────────▶│ Reservations Service │──▶ PostgreSQL  │
│  │              │           │    :3002             │                │
│  │              │    REST    └─────────────────────┘                │
│  │              │──────────▶│  Reviews Service     │──▶ PostgreSQL  │
│  └──────────────┘           │    :3003             │                │
│                             └─────────────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

El frontend consume directamente cada microservicio por su URL base configurada en variables de entorno
de build. No hay API Gateway en esta iteración — el routing lo hace el frontend.

### Comunicación entre microservicios

- **Properties Service → Reviews Service**: el Properties Service consulta el `starRating` agregado
  al responder un GET de propiedad. Lo hace via HTTP interno (`REVIEWS_SERVICE_URL`).
- **Reservations Service → Properties Service**: el Reservations Service consulta el
  `cancellationPenaltyPercent` de una propiedad al crear una reserva.
- La comunicación inter-servicio usa HTTP simple en la red de Docker Compose.

---

## Project Structure

```
admin-propiedades/
├── docker-compose.yml
├── docker-compose.test.yml       # perfil test
├── .env.example
├── .gitignore
├── README.md
├── services/
│   ├── properties/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── config/
│   │   │   │   └── env.ts
│   │   │   ├── db/
│   │   │   │   ├── postgres.ts
│   │   │   │   └── mongo.ts
│   │   │   ├── models/
│   │   │   │   ├── property.ts       # modelo PostgreSQL
│   │   │   │   ├── room.ts
│   │   │   │   └── propertyDoc.ts    # modelo MongoDB
│   │   │   ├── routes/
│   │   │   │   ├── properties.ts
│   │   │   │   ├── rooms.ts
│   │   │   │   └── photos.ts
│   │   │   ├── controllers/
│   │   │   │   ├── propertyController.ts
│   │   │   │   ├── roomController.ts
│   │   │   │   └── photoController.ts
│   │   │   ├── services/
│   │   │   │   ├── propertyService.ts
│   │   │   │   ├── roomService.ts
│   │   │   │   ├── photoService.ts
│   │   │   │   └── reviewsClient.ts  # cliente HTTP al Reviews Service
│   │   │   ├── validators/
│   │   │   │   ├── propertyValidator.ts
│   │   │   │   └── roomValidator.ts
│   │   │   ├── middleware/
│   │   │   │   ├── errorHandler.ts
│   │   │   │   └── requestLogger.ts
│   │   │   └── swagger.ts
│   │   └── tests/
│   │       ├── unit/
│   │       └── integration/
│   ├── reservations/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── config/
│   │   │   ├── db/
│   │   │   │   └── postgres.ts
│   │   │   ├── models/
│   │   │   │   └── booking.ts
│   │   │   ├── routes/
│   │   │   │   └── bookings.ts
│   │   │   ├── controllers/
│   │   │   │   └── bookingController.ts
│   │   │   ├── services/
│   │   │   │   ├── bookingService.ts
│   │   │   │   ├── paymentGatewayMock.ts
│   │   │   │   └── propertiesClient.ts  # cliente HTTP al Properties Service
│   │   │   ├── validators/
│   │   │   │   └── bookingValidator.ts
│   │   │   ├── middleware/
│   │   │   └── swagger.ts
│   │   └── tests/
│   └── reviews/
│       ├── Dockerfile
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── config/
│       │   ├── db/
│       │   │   └── postgres.ts
│       │   ├── models/
│       │   │   └── review.ts
│       │   ├── routes/
│       │   │   └── reviews.ts
│       │   ├── controllers/
│       │   │   └── reviewController.ts
│       │   ├── services/
│       │   │   └── reviewService.ts
│       │   ├── validators/
│       │   │   └── reviewValidator.ts
│       │   ├── middleware/
│       │   └── swagger.ts
│       └── tests/
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── config/
        │   └── api.ts
        ├── pages/
        │   ├── PropertiesPage.tsx
        │   ├── PropertyDetailPage.tsx
        │   ├── BookingsPage.tsx
        │   └── ReviewsPage.tsx
        ├── components/
        ├── hooks/
        ├── services/
        └── types/
```

---

## Data Models

### Properties Service — PostgreSQL

```sql
-- Tabla principal de propiedades
CREATE TABLE properties (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      VARCHAR(255) NOT NULL,
  type                      VARCHAR(20)  NOT NULL CHECK (type IN ('house', 'apartment')),
  address                   TEXT         NOT NULL,
  price_per_day_usd         NUMERIC(12,2) NOT NULL CHECK (price_per_day_usd > 0),
  currency                  VARCHAR(10)  NOT NULL DEFAULT 'USD',
  max_guests                INTEGER      NOT NULL CHECK (max_guests > 0),
  cancellation_penalty_pct  NUMERIC(5,2) NOT NULL DEFAULT 0
                              CHECK (cancellation_penalty_pct >= 0 AND cancellation_penalty_pct <= 100),
  services                  TEXT[]       NOT NULL DEFAULT '{}',
  deleted                   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Tasas de cambio por propiedad
CREATE TABLE property_currency_rates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID        NOT NULL REFERENCES properties(id),
  currency     VARCHAR(10) NOT NULL,
  rate         NUMERIC(18,6) NOT NULL CHECK (rate > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (property_id, currency)
);

-- Habitaciones
CREATE TABLE rooms (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID         NOT NULL REFERENCES properties(id),
  name         VARCHAR(255) NOT NULL,
  type         VARCHAR(100) NOT NULL,
  beds         INTEGER      NOT NULL CHECK (beds > 0),
  description  TEXT         NOT NULL,
  active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

### Properties Service — MongoDB

```typescript
// Colección: property_documents
interface PropertyDocument {
  propertyId: string;           // FK al ID de PostgreSQL
  extendedAttributes: Record<string, unknown>;
  photos: PhotoReference[];
  updatedAt: Date;
}

interface PhotoReference {
  photoId: string;              // UUID generado al subir
  url: string;                  // URL de almacenamiento (puede ser path local o S3)
  filename: string;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: Date;
}
```

### Reservations Service — PostgreSQL

```sql
CREATE TYPE booking_type   AS ENUM ('refundable', 'non_refundable');
CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('paid', 'unpaid', 'refunded', 'partial_refund');

CREATE TABLE bookings (
  id                         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id                UUID          NOT NULL,
  guest_name                 VARCHAR(255)  NOT NULL,
  check_in                   DATE          NOT NULL,
  check_out                  DATE          NOT NULL,
  CHECK (check_out > check_in),
  total_amount_usd           NUMERIC(12,2) NOT NULL CHECK (total_amount_usd > 0),
  booking_type               booking_type  NOT NULL,
  cancellation_penalty_pct   NUMERIC(5,2)  NOT NULL DEFAULT 0,
  booking_status             booking_status NOT NULL DEFAULT 'confirmed',
  payment_status             payment_status NOT NULL DEFAULT 'paid',
  cancelled_at               TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_property_dates
  ON bookings (property_id, check_in, check_out)
  WHERE booking_status = 'confirmed';
```

### Reviews Service — PostgreSQL

```sql
CREATE TABLE reviews (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID        NOT NULL,
  guest_name   VARCHAR(255) NOT NULL,
  score        SMALLINT    NOT NULL CHECK (score >= 1 AND score <= 5),
  comment      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de ratings agregados para consulta eficiente
CREATE TABLE property_ratings (
  property_id  UUID        PRIMARY KEY,
  star_rating  NUMERIC(3,1),
  review_count INTEGER     NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_property_created
  ON reviews (property_id, created_at DESC);
```

---

## Components & Interfaces

### Properties Service

#### REST Endpoints

| Método  | Path                                   | Descripción                              |
|---------|----------------------------------------|------------------------------------------|
| POST    | /properties                            | Crear propiedad                          |
| GET     | /properties                            | Listar propiedades activas               |
| GET     | /properties/:id                        | Obtener propiedad con starRating         |
| PUT     | /properties/:id                        | Actualizar propiedad                     |
| DELETE  | /properties/:id                        | Soft delete                              |
| GET     | /properties/:id/rooms                  | Listar habitaciones                      |
| POST    | /properties/:id/rooms                  | Crear habitación                         |
| PUT     | /properties/:id/rooms/:roomId          | Actualizar habitación                    |
| GET     | /properties/:id/photos                 | Listar fotos (orden ascendente)          |
| POST    | /properties/:id/photos                 | Subir foto (multipart/form-data)         |
| DELETE  | /properties/:id/photos/:photoId        | Eliminar foto                            |
| GET     | /properties/:id/extended-attributes    | Obtener atributos extendidos             |
| GET     | /health                                | Health check                             |

#### DTOs TypeScript

```typescript
// POST /properties — request body
interface CreatePropertyDto {
  name: string;
  type: 'house' | 'apartment';
  address: string;
  pricePerDayUSD: number;
  currency?: string;
  rooms: number;           // número de habitaciones para el core (no el sub-recurso)
  maxGuests: number;
  cancellationPenaltyPercent?: number;  // default: 0
  services?: string[];
  currencyRates?: Array<{ currency: string; rate: number }>;
  extendedAttributes?: Record<string, unknown>;
}

// GET /properties/:id — response
interface PropertyResponseDto {
  id: string;
  name: string;
  type: 'house' | 'apartment';
  address: string;
  pricePerDayUSD: number;
  priceConverted?: number;        // presente si se pasa ?currency=
  currency: string;
  currencyFallback?: boolean;     // true si no hay tasa almacenada
  maxGuests: number;
  cancellationPenaltyPercent: number;
  services: string[];
  rooms: RoomDto[];
  photos: PhotoReferenceDto[];
  extendedAttributes: Record<string, unknown>;
  starRating: number | null;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ValidationErrorDto {
  field: string;
  message: string;
}

interface ErrorResponseDto {
  error: string;
  details?: ValidationErrorDto[];
}
```

### Reservations Service

#### REST Endpoints

| Método | Path                    | Descripción                                  |
|--------|-------------------------|----------------------------------------------|
| POST   | /bookings               | Crear reserva (atómica con pago)             |
| GET    | /bookings/:id           | Obtener reserva                              |
| GET    | /bookings?propertyId=   | Listar reservas por propiedad                |
| DELETE | /bookings/:id           | Cancelar reserva                             |
| GET    | /health                 | Health check                                 |

#### DTOs TypeScript

```typescript
// POST /bookings — request body
interface CreateBookingDto {
  propertyId: string;
  guestName: string;
  checkIn: string;    // ISO 8601 date: "YYYY-MM-DD"
  checkOut: string;
  totalAmountUSD: number;
  bookingType: 'refundable' | 'non_refundable';
}

// GET /bookings/:id — response
interface BookingResponseDto {
  id: string;
  propertyId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  totalAmountUSD: number;
  bookingType: 'refundable' | 'non_refundable';
  cancellationPenaltyPercent: number;
  bookingStatus: 'confirmed' | 'cancelled';
  paymentStatus: 'paid' | 'unpaid' | 'refunded' | 'partial_refund';
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Reviews Service

#### REST Endpoints

| Método | Path                            | Descripción                          |
|--------|---------------------------------|--------------------------------------|
| POST   | /reviews                        | Crear reseña                         |
| GET    | /reviews?propertyId=            | Listar reseñas de propiedad (desc)   |
| GET    | /reviews/ratings/:propertyId    | Obtener starRating de propiedad      |
| GET    | /health                         | Health check                         |

#### DTOs TypeScript

```typescript
// POST /reviews — request body
interface CreateReviewDto {
  propertyId: string;
  guestName: string;
  score: number;    // entero 1-5
  comment: string;  // no puede ser vacío ni solo whitespace
}

// GET /reviews/ratings/:propertyId — response
interface PropertyRatingDto {
  propertyId: string;
  starRating: number | null;  // null si no hay reviews
  reviewCount: number;
}
```

---

## Key Flows

### 1. Creación atómica de reserva con pago

```
Frontend                 Reservations Service           Properties Service
    │                           │                              │
    │── POST /bookings ─────────▶│                              │
    │                           │── GET /properties/:id ───────▶│
    │                           │◀─ { cancellationPenaltyPct } ─│
    │                           │                              
    │                           │── BEGIN TRANSACTION
    │                           │── INSERT bookings (status=pending)
    │                           │── paymentGatewayMock.charge()
    │                           │   ├─ SUCCESS → UPDATE bookings SET status=confirmed, payment=paid
    │                           │   │            COMMIT
    │                           │   └─ FAILURE → ROLLBACK → return HTTP 402
    │◀─ 201 BookingResponseDto ─│
```

### 2. Cancelación de reserva

```
Frontend                 Reservations Service
    │                           │
    │── DELETE /bookings/:id ───▶│
    │                           │── SELECT booking WHERE id = :id
    │                           │   ├─ NOT FOUND → HTTP 404
    │                           │   ├─ status != confirmed → HTTP 409
    │                           │   └─ FOUND (confirmed):
    │                           │      ├─ bookingType = refundable:
    │                           │      │   refundAmount = totalAmount
    │                           │      └─ bookingType = non_refundable:
    │                           │          refundAmount = totalAmount * (1 - penalty/100)
    │                           │── paymentGatewayMock.refund(refundAmount)
    │                           │── UPDATE SET status=cancelled, cancelledAt=NOW()
    │                           │── COMMIT
    │◀─ 200 BookingResponseDto ─│
```

### 3. GET propiedad con starRating

```
Frontend           Properties Service           Reviews Service
    │                     │                           │
    │── GET /properties/:id ──▶│                       │
    │                     │── GET /reviews/ratings/:id ──▶│
    │                     │◀─ { starRating, count } ──────│
    │                     │── (merge en respuesta)
    │◀─ PropertyResponseDto ──│
```

---

## Payment Gateway Mock

El mock simula un procesador de pagos con las siguientes reglas configurables:

```typescript
// services/reservations/src/services/paymentGatewayMock.ts

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  errorCode?: string;
}

interface RefundResult {
  success: boolean;
  refundedAmount: number;
  transactionId?: string;
}

class PaymentGatewayMock {
  // Controlado por variable de entorno PAYMENT_MOCK_FAILURE_RATE (default: 0)
  async charge(amount: number, currency: string): Promise<PaymentResult>
  async refund(amount: number, transactionId: string): Promise<RefundResult>
}
```

El flag `paid/unpaid` se persiste en la columna `payment_status` de la tabla `bookings`.
Para simular fallos en tests se usa `PAYMENT_MOCK_FAILURE_RATE=1.0`.

---

## Input Validation & Sanitization

Cada servicio implementa una capa de validación con **Zod** antes de cualquier lógica de negocio:

```typescript
// Ejemplo: Properties Service
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Sanitizador reutilizable
const sanitizeString = (s: string): string =>
  DOMPurify.sanitize(s.trim());

const createPropertySchema = z.object({
  name: z.string().min(1).max(255).transform(sanitizeString),
  type: z.enum(['house', 'apartment']),
  address: z.string().min(1).transform(sanitizeString),
  pricePerDayUSD: z.number().positive(),
  currency: z.string().min(3).max(10).default('USD'),
  rooms: z.number().int().positive(),
  maxGuests: z.number().int().positive(),
  cancellationPenaltyPercent: z.number().min(0).max(100).default(0),
  services: z.array(z.string().transform(sanitizeString)).default([]),
  currencyRates: z.array(z.object({
    currency: z.string().min(3).max(10),
    rate: z.number().positive()
  })).optional(),
  extendedAttributes: z.record(z.unknown()).optional()
});
```

En caso de error de validación el middleware devuelve HTTP 422 con estructura:

```json
{
  "error": "Validation failed",
  "details": [
    { "field": "pricePerDayUSD", "message": "Expected positive number" }
  ]
}
```

---

## Error Handling

Middleware global de errores en cada servicio:

```typescript
// middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(422).json({
      error: 'Validation failed',
      details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
    });
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  if (err instanceof ConflictError) {
    res.status(409).json({ error: err.message });
    return;
  }
  if (err instanceof PaymentError) {
    res.status(402).json({ error: err.message });
    return;
  }
  // Error no esperado: log interno, respuesta genérica al cliente
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
}
```

El frontend captura cualquier respuesta de error y muestra un mensaje amigable,
**sin exponer** `stack`, detalles internos ni `errorCode` de sistemas internos.

---

## Structured Logging

Todos los servicios usan **Pino** como logger JSON a stdout:

```typescript
// middleware/requestLogger.ts
import pino from 'pino';

export const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - start
      // NO incluir: body, headers de auth, PII
    });
  });
  next();
}
```

---

## Health Check

Cada servicio implementa `GET /health` con verificación activa de la conexión a base de datos:

```typescript
// routes/health.ts
router.get('/health', async (_req, res) => {
  try {
    await db.raw('SELECT 1');           // PostgreSQL
    await mongoClient.db().command({ ping: 1 }); // MongoDB (solo Properties Service)
    res.status(200).json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'error', reason: 'database unavailable' });
  }
});
```

---

## Environment Variables

### Properties Service

```env
# PostgreSQL
POSTGRES_HOST=properties-postgres
POSTGRES_PORT=5432
POSTGRES_DB=properties_db
POSTGRES_USER=properties_user
POSTGRES_PASSWORD=...

# MongoDB
MONGO_URI=mongodb://properties-mongo:27017/properties_docs

# Servicios externos
REVIEWS_SERVICE_URL=http://reviews-service:3003

# App
PORT=3001
LOG_LEVEL=info
PHOTO_MAX_SIZE_BYTES=10485760   # 10 MB
```

### Reservations Service

```env
POSTGRES_HOST=reservations-postgres
POSTGRES_PORT=5432
POSTGRES_DB=reservations_db
POSTGRES_USER=reservations_user
POSTGRES_PASSWORD=...

PROPERTIES_SERVICE_URL=http://properties-service:3001

PAYMENT_MOCK_FAILURE_RATE=0     # 0.0 a 1.0

PORT=3002
LOG_LEVEL=info
```

### Reviews Service

```env
POSTGRES_HOST=reviews-postgres
POSTGRES_PORT=5432
POSTGRES_DB=reviews_db
POSTGRES_USER=reviews_user
POSTGRES_PASSWORD=...

PORT=3003
LOG_LEVEL=info
```

### Frontend

```env
VITE_PROPERTIES_API_URL=http://localhost:3001
VITE_RESERVATIONS_API_URL=http://localhost:3002
VITE_REVIEWS_API_URL=http://localhost:3003
```

---

## Docker Compose

```yaml
# docker-compose.yml (esquema simplificado)
services:
  properties-service:
    build: ./services/properties
    ports: ["3001:3001"]
    depends_on: [properties-postgres, properties-mongo]
    env_file: .env
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      retries: 3

  properties-postgres:
    image: postgres:16-alpine
    volumes: [properties-pg-data:/var/lib/postgresql/data]

  properties-mongo:
    image: mongo:7
    volumes: [properties-mongo-data:/data/db]

  reservations-service:
    build: ./services/reservations
    ports: ["3002:3002"]
    depends_on: [reservations-postgres]
    env_file: .env

  reservations-postgres:
    image: postgres:16-alpine
    volumes: [reservations-pg-data:/var/lib/postgresql/data]

  reviews-service:
    build: ./services/reviews
    ports: ["3003:3003"]
    depends_on: [reviews-postgres]
    env_file: .env

  reviews-postgres:
    image: postgres:16-alpine
    volumes: [reviews-pg-data:/var/lib/postgresql/data]

  frontend:
    build: ./frontend
    ports: ["5173:80"]
    env_file: .env

volumes:
  properties-pg-data:
  properties-mongo-data:
  reservations-pg-data:
  reviews-pg-data:
```

---

## Testing Strategy

### Pirámide de tests por servicio

**Properties Service (Jest + Supertest)**
- Unit tests: `propertyService.ts`, `roomService.ts`, `photoService.ts`, validadores — ≥80% cobertura
- Integration: crear/leer/actualizar/eliminar propiedades con DB en memoria (testcontainers)
- Property-based: ver sección Correctness Properties

**Reservations Service (Jest + Supertest)**
- Integration: flujo de creación atómica (happy path + fallo de pago + fallo post-pago)
- Integration: cancelación refundable y no reembolsable
- Property-based: cálculo de refund, validación de solapamiento de fechas

**Reviews Service (Jest)**
- Unit tests: `reviewService.ts`, validadores (score, comment sanitization) — ≥80% cobertura
- Property-based: cálculo de star rating, validación de score

**Frontend (Vitest + React Testing Library)**
- Unit tests: componentes de formulario, manejo de errores
- Integration: flujos de UI con msw (mock service worker)

### Configuración Jest compartida

```typescript
// jest.config.ts (base compartida)
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts'],
  coverageThreshold: { global: { lines: 80 } }
};
```

---

## Correctness Properties

*Una propiedad es una característica o comportamiento que debe cumplirse en todas las ejecuciones válidas
del sistema — una especificación formal de qué debe hacer el software. Las propiedades sirven de puente
entre las especificaciones legibles por humanos y las garantías de correctitud verificables automáticamente.*

### Property 1: Round-trip de creación de propiedad

*Para cualquier* conjunto válido de campos obligatorios de una propiedad, crear la propiedad y luego
recuperarla por su ID debe devolver exactamente los mismos valores de campo.

**Validates: Requirements 1.2, 1.7**

---

### Property 2: Rechazo universal de propiedades inválidas

*Para cualquier* request de creación de propiedad con al menos un campo obligatorio ausente o con un
valor inválido (tipo incorrecto, número negativo, string vacío), el servicio debe responder HTTP 422
con un body de error que identifique el campo fallido.

**Validates: Requirements 1.3, 8.1, 8.2**

---

### Property 3: Soft delete — invisibilidad en listados

*Para cualquier* propiedad existente, después de procesarse una solicitud de eliminación, esa propiedad
no debe aparecer en el listado activo, pero su registro debe seguir presente en la base de datos con
`deleted = true`.

**Validates: Requirements 1.5**

---

### Property 4: Round-trip de atributos extendidos y servicios

*Para cualquier* conjunto arbitrario de pares clave-valor como `extendedAttributes` y cualquier array
de strings como `services`, persistirlos y luego recuperarlos debe devolver exactamente los mismos
valores sin pérdida ni transformación inesperada.

**Validates: Requirements 1.6, 1.7, 11.1, 11.2, 11.3, 12.1, 12.2**

---

### Property 5: Sanitización de inputs de texto

*Para cualquier* string de entrada que contenga caracteres especiales, payloads XSS o secuencias de
inyección NoSQL, el valor almacenado y devuelto por la API debe ser la versión sanitizada, sin que el
payload original pueda ejecutarse o almacenarse sin procesar.

**Validates: Requirements 1.8, 6.5**

---

### Property 6: Preservación parcial en updates de habitación

*Para cualquier* habitación y cualquier subconjunto de sus campos enviados en un request de
actualización, los campos **no incluidos** en el request deben mantener sus valores previos sin
modificación.

**Validates: Requirements 2.4**

---

### Property 7: Invariante de orden en fotos

*Para cualquier* conjunto de fotos asociadas a una propiedad, el endpoint de listado siempre debe
devolverlas ordenadas por `uploadedAt` de manera estrictamente ascendente.

**Validates: Requirements 3.4**

---

### Property 8: Conversión de moneda

*Para cualquier* propiedad con una tasa de cambio almacenada para una moneda `C`, el precio devuelto
al consultar con `?currency=C` debe ser exactamente `pricePerDayUSD × rate(C)`, con precisión de
hasta 2 decimales.

**Validates: Requirements 4.3**

---

### Property 9: Fallback de moneda desconocida

*Para cualquier* código de moneda que no tenga tasa almacenada para una propiedad dada, el endpoint
debe devolver el precio en USD con el flag `currencyFallback: true` en el response body.

**Validates: Requirements 4.4**

---

### Property 10: Exactitud del cálculo de star rating

*Para cualquier* lista no vacía de scores enteros entre 1 y 5, el `starRating` calculado y persistido
debe ser igual a la media aritmética de esos scores, redondeada a exactamente un decimal.

**Validates: Requirements 5.1, 5.2**

---

### Property 11: Star rating null para propiedades sin reseñas

*Para cualquier* propiedad que no tenga ninguna reseña asociada, el valor de `starRating` devuelto
en el response debe ser `null`.

**Validates: Requirements 5.4**

---

### Property 12: Validación de score de reseña

*Para cualquier* valor numérico de `score` fuera del rango cerrado [1, 5], el servicio debe rechazar
la reseña con HTTP 422. *Para cualquier* score entero dentro del rango [1, 5], la reseña debe
aceptarse y persistirse correctamente.

**Validates: Requirements 6.2**

---

### Property 13: Invariante de orden en listado de reseñas

*Para cualquier* conjunto de reseñas de una propiedad, el endpoint de listado siempre debe
devolverlas ordenadas por `createdAt` de manera estrictamente descendente.

**Validates: Requirements 6.4**

---

### Property 14: Atomicidad de creación de reserva

*Para cualquier* intento de creación de reserva, el sistema debe garantizar que no puede existir una
reserva confirmada sin un pago exitoso, ni un pago procesado sin su reserva correspondiente. Si el
Payment Gateway Mock devuelve fallo, no debe existir registro de reserva en la base de datos.

**Validates: Requirements 7.1, 7.2, 7.3**

---

### Property 15: Post-condición de reserva exitosa

*Para cualquier* reserva creada exitosamente, su `bookingStatus` debe ser `confirmed` y su
`paymentStatus` debe ser `paid`.

**Validates: Requirements 7.4**

---

### Property 16: Exclusión mutua de fechas solapadas

*Para cualquier* propiedad con una reserva confirmada en el rango `[checkIn, checkOut)`, cualquier
intento de crear una nueva reserva para la misma propiedad con fechas que se solapen con ese rango
debe resultar en HTTP 409, independientemente del tipo de solapamiento (parcial o total).

**Validates: Requirements 7.5**

---

### Property 17: Snapshot de cancellation penalty en reserva

*Para cualquier* reserva de tipo `non_refundable`, el valor de `cancellationPenaltyPercent`
almacenado en la reserva debe ser el valor que tenía la propiedad en el momento de la creación de
la reserva. Cambios posteriores al `cancellationPenaltyPercent` de la propiedad no deben alterar
el valor registrado en reservas preexistentes.

**Validates: Requirements 8.3, 10.4**

---

### Property 18: Cálculo exacto de reembolso parcial

*Para cualquier* reserva `non_refundable` confirmada con `totalAmountUSD = A` y
`cancellationPenaltyPercent = P`, al cancelarla el monto reembolsado debe ser exactamente
`A × (1 − P / 100)`, con precisión de hasta 2 decimales.

**Validates: Requirements 9.2**

---

### Property 19: Transición de estado de cancelación

*Para cualquier* reserva en estado distinto de `confirmed` (por ejemplo `cancelled`), intentar
cancelarla debe resultar en HTTP 409 sin modificar el estado actual de la reserva.

**Validates: Requirements 9.3**

---

### Property 20: Validación de rango de cancellation penalty

*Para cualquier* valor numérico fuera del rango cerrado [0, 100] enviado como
`cancellationPenaltyPercent` en un request de creación o actualización de propiedad, el servicio
debe responder HTTP 422. *Para cualquier* valor dentro del rango, debe persistirse y recuperarse
correctamente, incluyendo el valor default `0` cuando no se envía.

**Validates: Requirements 10.1, 10.2, 10.3**

---

### Property 21: Logs estructurados por request

*Para cualquier* request HTTP procesada por cualquiera de los microservicios, el log emitido a
stdout debe ser JSON válido y debe contener los campos `method`, `path`, `statusCode` y `durationMs`,
sin incluir datos sensibles como credenciales, tokens o información personal identificable.

**Validates: Requirements 15.3, 15.4**
