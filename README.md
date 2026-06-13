# Admin Propiedades

Sistema de administración de propiedades de alquiler compuesto por tres microservicios independientes
(Properties, Reservations, Reviews), una SPA React + TypeScript como frontend, y orquestación
Docker Compose con bases de datos PostgreSQL y MongoDB.

---

## Prerequisitos

| Herramienta        | Versión mínima |
|--------------------|---------------|
| Docker             | 24+           |
| Docker Compose     | v2 (plugin)   |
| Node.js            | 20 LTS+       |
| npm                | 10+           |

Verifica las versiones instaladas:

```bash
docker --version
docker compose version
node --version
npm --version
```

---

## Inicio Rápido

1. Copia el archivo de variables de entorno:

```bash
cp .env.example .env
```

2. Levanta todos los servicios:

```bash
docker compose up -d
```

3. Verifica que los servicios estén corriendo:

```bash
docker compose ps
```

### URLs de los servicios

| Servicio              | URL                        |
|-----------------------|----------------------------|
| Properties Service    | http://localhost:3001       |
| Reservations Service  | http://localhost:3002       |
| Reviews Service       | http://localhost:3003       |
| Frontend (SPA)        | http://localhost:5173       |

### Health checks

```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

Cada endpoint retorna `{"status":"ok"}` (HTTP 200) cuando el servicio y sus bases de datos están
disponibles, o `{"status":"error"}` (HTTP 503) si hay problemas de conectividad.

---

## Desarrollo Local (Hot-Reload)

Para desarrollo con hot-reload, levanta primero las bases de datos con Docker y luego
cada servicio de forma individual.

### 1. Levantar solo las bases de datos

```bash
docker compose up -d properties-postgres properties-mongo reservations-postgres reviews-postgres
```

### 2. Properties Service

```bash
cd services/properties
npm install
npm run dev
```

El servicio arranca en `http://localhost:3001` con hot-reload via `ts-node-dev` o `tsx --watch`.

Variables de entorno necesarias (crear `services/properties/.env` o exportar):

```bash
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DB=properties_db
export POSTGRES_USER=properties_user
export POSTGRES_PASSWORD=changeme_properties
export MONGO_URI=mongodb://localhost:27017/properties_docs
export REVIEWS_SERVICE_URL=http://localhost:3003
export PORT=3001
export PHOTO_MAX_SIZE_BYTES=10485760
export LOG_LEVEL=debug
```

### 3. Reservations Service

```bash
cd services/reservations
npm install
npm run dev
```

El servicio arranca en `http://localhost:3002` con hot-reload.

```bash
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DB=reservations_db
export POSTGRES_USER=reservations_user
export POSTGRES_PASSWORD=changeme_reservations
export PROPERTIES_SERVICE_URL=http://localhost:3001
export PAYMENT_MOCK_FAILURE_RATE=0
export PORT=3002
export LOG_LEVEL=debug
```

### 4. Reviews Service

```bash
cd services/reviews
npm install
npm run dev
```

El servicio arranca en `http://localhost:3003` con hot-reload.

```bash
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DB=reviews_db
export POSTGRES_USER=reviews_user
export POSTGRES_PASSWORD=changeme_reviews
export PORT=3003
export LOG_LEVEL=debug
```

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend arranca en `http://localhost:5173` con Vite HMR.

```bash
export VITE_PROPERTIES_API_URL=http://localhost:3001
export VITE_RESERVATIONS_API_URL=http://localhost:3002
export VITE_REVIEWS_API_URL=http://localhost:3003
```

---

## Variables de Entorno

### Properties Service

| Variable                    | Tipo     | Propósito                                         | Ejemplo                                         |
|-----------------------------|----------|---------------------------------------------------|-------------------------------------------------|
| `PORT`                      | number   | Puerto HTTP del servicio                          | `3001`                                          |
| `POSTGRES_HOST`             | string   | Host de PostgreSQL                                | `properties-postgres`                           |
| `POSTGRES_PORT`             | number   | Puerto de PostgreSQL                              | `5432`                                          |
| `POSTGRES_DB`               | string   | Nombre de la base de datos                        | `properties_db`                                 |
| `POSTGRES_USER`             | string   | Usuario de PostgreSQL                             | `properties_user`                               |
| `POSTGRES_PASSWORD`         | string   | Contraseña de PostgreSQL                          | `changeme_properties`                           |
| `MONGO_URI`                 | string   | URI de conexión a MongoDB                         | `mongodb://properties-mongo:27017/properties_docs` |
| `REVIEWS_SERVICE_URL`       | string   | URL base del Reviews Service (inter-servicio)     | `http://reviews-service:3003`                   |
| `PHOTO_MAX_SIZE_BYTES`      | number   | Tamaño máximo de foto en bytes (default 10 MB)    | `10485760`                                      |
| `LOG_LEVEL`                 | string   | Nivel de log Pino (trace/debug/info/warn/error)   | `info`                                          |

### Reservations Service

| Variable                    | Tipo     | Propósito                                         | Ejemplo                                         |
|-----------------------------|----------|---------------------------------------------------|-------------------------------------------------|
| `PORT`                      | number   | Puerto HTTP del servicio                          | `3002`                                          |
| `POSTGRES_HOST`             | string   | Host de PostgreSQL                                | `reservations-postgres`                         |
| `POSTGRES_PORT`             | number   | Puerto de PostgreSQL                              | `5432`                                          |
| `POSTGRES_DB`               | string   | Nombre de la base de datos                        | `reservations_db`                               |
| `POSTGRES_USER`             | string   | Usuario de PostgreSQL                             | `reservations_user`                             |
| `POSTGRES_PASSWORD`         | string   | Contraseña de PostgreSQL                          | `changeme_reservations`                         |
| `PROPERTIES_SERVICE_URL`    | string   | URL base del Properties Service (inter-servicio)  | `http://properties-service:3001`                |
| `PAYMENT_MOCK_FAILURE_RATE` | number   | Tasa de fallo del mock de pagos (0.0–1.0)         | `0`                                             |
| `LOG_LEVEL`                 | string   | Nivel de log Pino                                 | `info`                                          |

### Reviews Service

| Variable                    | Tipo     | Propósito                                         | Ejemplo                                         |
|-----------------------------|----------|---------------------------------------------------|-------------------------------------------------|
| `PORT`                      | number   | Puerto HTTP del servicio                          | `3003`                                          |
| `POSTGRES_HOST`             | string   | Host de PostgreSQL                                | `reviews-postgres`                              |
| `POSTGRES_PORT`             | number   | Puerto de PostgreSQL                              | `5432`                                          |
| `POSTGRES_DB`               | string   | Nombre de la base de datos                        | `reviews_db`                                    |
| `POSTGRES_USER`             | string   | Usuario de PostgreSQL                             | `reviews_user`                                  |
| `POSTGRES_PASSWORD`         | string   | Contraseña de PostgreSQL                          | `changeme_reviews`                              |
| `LOG_LEVEL`                 | string   | Nivel de log Pino                                 | `info`                                          |

### Frontend (build-time)

| Variable                      | Tipo   | Propósito                              | Ejemplo                      |
|-------------------------------|--------|----------------------------------------|------------------------------|
| `VITE_PROPERTIES_API_URL`     | string | URL base del Properties Service        | `http://localhost:3001`      |
| `VITE_RESERVATIONS_API_URL`   | string | URL base del Reservations Service      | `http://localhost:3002`      |
| `VITE_REVIEWS_API_URL`        | string | URL base del Reviews Service           | `http://localhost:3003`      |

---

## Esquema de Base de Datos

### Properties Service — PostgreSQL

#### Tabla `properties`

| Columna                      | Tipo            | Constraints / Default                              |
|------------------------------|-----------------|----------------------------------------------------|
| `id`                         | UUID            | PK, default `gen_random_uuid()`                    |
| `name`                       | VARCHAR(255)    | NOT NULL                                           |
| `type`                       | VARCHAR(20)     | NOT NULL, CHECK IN ('house', 'apartment')          |
| `address`                    | TEXT            | NOT NULL                                           |
| `price_per_day_usd`         | NUMERIC(12,2)   | NOT NULL, CHECK > 0                                |
| `currency`                   | VARCHAR(10)     | NOT NULL, default 'USD'                            |
| `max_guests`                 | INTEGER         | NOT NULL, CHECK > 0                                |
| `cancellation_penalty_pct`  | NUMERIC(5,2)    | NOT NULL, default 0, CHECK [0, 100]                |
| `services`                   | TEXT[]          | NOT NULL, default '{}'                             |
| `deleted`                    | BOOLEAN         | NOT NULL, default FALSE                            |
| `created_at`                 | TIMESTAMPTZ     | NOT NULL, default NOW()                            |
| `updated_at`                 | TIMESTAMPTZ     | NOT NULL, default NOW()                            |

#### Tabla `property_currency_rates`

| Columna        | Tipo            | Constraints / Default                              |
|----------------|-----------------|----------------------------------------------------|
| `id`           | UUID            | PK, default `gen_random_uuid()`                    |
| `property_id`  | UUID            | NOT NULL, FK → properties(id) ON DELETE CASCADE    |
| `currency`     | VARCHAR(10)     | NOT NULL                                           |
| `rate`         | NUMERIC(18,6)   | NOT NULL, CHECK > 0                                |
| `created_at`   | TIMESTAMPTZ     | NOT NULL, default NOW()                            |

UNIQUE constraint: `(property_id, currency)`

#### Tabla `rooms`

| Columna        | Tipo            | Constraints / Default                              |
|----------------|-----------------|----------------------------------------------------|
| `id`           | UUID            | PK, default `gen_random_uuid()`                    |
| `property_id`  | UUID            | NOT NULL, FK → properties(id) ON DELETE CASCADE    |
| `name`         | VARCHAR(255)    | NOT NULL                                           |
| `type`         | VARCHAR(100)    | NOT NULL                                           |
| `beds`         | INTEGER         | NOT NULL, CHECK > 0                                |
| `description`  | TEXT            | NOT NULL                                           |
| `active`       | BOOLEAN         | NOT NULL, default TRUE                             |
| `created_at`   | TIMESTAMPTZ     | NOT NULL, default NOW()                            |
| `updated_at`   | TIMESTAMPTZ     | NOT NULL, default NOW()                            |

### Properties Service — MongoDB

Colección: `property_documents`

```typescript
interface PropertyDocument {
  propertyId: string;                        // FK al ID de PostgreSQL
  extendedAttributes: Record<string, unknown>; // pares clave-valor arbitrarios
  photos: PhotoReference[];
  updatedAt: Date;
}

interface PhotoReference {
  photoId: string;       // UUID
  url: string;           // URL o path del archivo
  filename: string;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: Date;
}
```

El documento `extendedAttributes` permite almacenar atributos adicionales sin necesidad de
migraciones de esquema. Cualquier par clave-valor se persiste y devuelve tal cual fue enviado.

### Reservations Service — PostgreSQL

#### Tipos ENUM

- `booking_type`: `'refundable'` | `'non_refundable'`
- `booking_status`: `'confirmed'` | `'cancelled'`
- `payment_status`: `'paid'` | `'unpaid'` | `'refunded'` | `'partial_refund'`

#### Tabla `bookings`

| Columna                      | Tipo            | Constraints / Default                              |
|------------------------------|-----------------|----------------------------------------------------|
| `id`                         | UUID            | PK, default `gen_random_uuid()`                    |
| `property_id`                | UUID            | NOT NULL                                           |
| `guest_name`                 | VARCHAR(255)    | NOT NULL                                           |
| `check_in`                   | DATE            | NOT NULL                                           |
| `check_out`                  | DATE            | NOT NULL, CHECK > check_in                         |
| `total_amount_usd`          | NUMERIC(12,2)   | NOT NULL, CHECK > 0                                |
| `booking_type`               | booking_type    | NOT NULL                                           |
| `cancellation_penalty_pct`  | NUMERIC(5,2)    | NOT NULL, default 0                                |
| `booking_status`             | booking_status  | NOT NULL, default 'confirmed'                      |
| `payment_status`             | payment_status  | NOT NULL, default 'paid'                           |
| `cancelled_at`               | TIMESTAMPTZ     | nullable                                           |
| `created_at`                 | TIMESTAMPTZ     | NOT NULL, default NOW()                            |
| `updated_at`                 | TIMESTAMPTZ     | NOT NULL, default NOW()                            |

Índice parcial: `idx_bookings_property_dates ON (property_id, check_in, check_out) WHERE booking_status = 'confirmed'`

### Reviews Service — PostgreSQL

#### Tabla `reviews`

| Columna        | Tipo            | Constraints / Default                              |
|----------------|-----------------|----------------------------------------------------|
| `id`           | UUID            | PK, default `gen_random_uuid()`                    |
| `property_id`  | UUID            | NOT NULL                                           |
| `guest_name`   | VARCHAR(255)    | NOT NULL                                           |
| `score`        | SMALLINT        | NOT NULL, CHECK >= 1 AND <= 5                      |
| `comment`      | TEXT            | NOT NULL                                           |
| `created_at`   | TIMESTAMPTZ     | NOT NULL, default NOW()                            |

Índice: `idx_reviews_property_created ON (property_id, created_at DESC)`

#### Tabla `property_ratings`

| Columna        | Tipo            | Constraints / Default                              |
|----------------|-----------------|----------------------------------------------------|
| `property_id`  | UUID            | PK                                                 |
| `star_rating`  | NUMERIC(3,1)    | nullable (null si no hay reviews)                  |
| `review_count` | INTEGER         | NOT NULL, default 0                                |
| `updated_at`   | TIMESTAMPTZ     | NOT NULL, default NOW()                            |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Docker Compose Network                           │
│                                                                         │
│  ┌──────────────┐    REST    ┌──────────────────────┐                   │
│  │   Frontend   │──────────▶│  Properties Service   │──▶ PostgreSQL     │
│  │  React + TS  │           │  :3001                │──▶ MongoDB        │
│  │  :5173       │           └──────────────────────┘                   │
│  │              │    REST    ┌──────────────────────┐                   │
│  │              │──────────▶│ Reservations Service  │──▶ PostgreSQL     │
│  │              │           │  :3002                │                   │
│  │              │    REST    └──────────────────────┘                   │
│  │              │──────────▶┌──────────────────────┐                   │
│  └──────────────┘           │  Reviews Service      │──▶ PostgreSQL     │
│                             │  :3003                │                   │
│                             └──────────────────────┘                   │
│                                                                         │
│  Comunicación inter-servicio (red interna Docker):                      │
│  • Properties ──HTTP──▶ Reviews (obtener starRating)                    │
│  • Reservations ──HTTP──▶ Properties (obtener cancellationPenalty)       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Stack tecnológico

- **Backend**: Node.js 20 + Express + TypeScript (strict)
- **Validación**: Zod + DOMPurify (sanitización XSS)
- **ORM/Query Builder**: Knex.js (PostgreSQL), Mongoose (MongoDB)
- **Logging**: Pino (JSON estructurado a stdout)
- **API Docs**: swagger-ui-express (OpenAPI 3.0)
- **Frontend**: React 18 + TypeScript + Vite + React Router
- **Testing**: Jest + Supertest + fast-check (property-based) / Vitest (frontend)
- **Contenedores**: Docker + Docker Compose v2

---

## Tests

### Properties Service

```bash
cd services/properties
npm test                    # correr todos los tests
npm test -- --coverage      # con reporte de cobertura (umbral: 80%)
```

### Reservations Service

```bash
cd services/reservations
npm test
npm test -- --coverage
```

### Reviews Service

```bash
cd services/reviews
npm test
npm test -- --coverage
```

### Frontend

```bash
cd frontend
npm test                    # Vitest
npm test -- --coverage
```

### Todos los servicios en contenedores (CI)

```bash
docker compose -f docker-compose.test.yml up --abort-on-container-exit
```

Este comando levanta contenedores de test aislados y ejecuta todas las suites. Sale con código
no-cero si alguna falla.

---

## API Docs (Swagger UI)

Cada microservicio expone documentación OpenAPI interactiva:

| Servicio              | Swagger UI URL                          |
|-----------------------|-----------------------------------------|
| Properties Service    | http://localhost:3001/api-docs           |
| Reservations Service  | http://localhost:3002/api-docs           |
| Reviews Service       | http://localhost:3003/api-docs           |

---

## Seguridad — Detección de Secrets (Pre-commit Hook)

Este proyecto incluye un hook de pre-commit para escanear credenciales antes de cada commit
usando [gitleaks](https://github.com/gitleaks/gitleaks).

### Instalación de gitleaks

```bash
# macOS
brew install gitleaks

# Linux (Debian/Ubuntu)
sudo apt install gitleaks

# O descargar el binario desde GitHub Releases:
# https://github.com/gitleaks/gitleaks/releases
```

### Activar el hook

```bash
# Copiar el script como hook de git
cp scripts/pre-commit-secrets.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### Uso manual (sin hook)

```bash
# Escanear todo el repositorio
gitleaks detect --config .gitleaks.toml --verbose

# Escanear solo archivos staged
gitleaks protect --staged --config .gitleaks.toml --verbose
```

### Configuración

La configuración de reglas está en `.gitleaks.toml`. Para agregar falsos positivos al allowlist,
edita la sección `[allowlist]` de ese archivo.

---

## Licencia

Proyecto interno — uso restringido.
