# EcoTrans — Sistema de Monitoreo de Transporte Urbano

Plataforma de monitoreo y análisis de la red de transporte público. Evalúa frecuencias, retrasos, eficiencia operativa e incidentes.

## Stack

- **Backend**: Python 3.12 + FastAPI + SQLAlchemy (ORM puro) + Alembic
- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 + Recharts
- **Base de datos**: PostgreSQL 17 + asyncpg
- **Infraestructura**: Docker Compose (3 servicios)

## Requisitos

- **Docker** y **Docker Compose** (recomendado)
- **Python 3.12+** y **uv** (para desarrollo local)
- **Node.js 20+** (para desarrollo local del frontend)

## Inicio rápido (Docker)

```bash
# Clonar el repositorio
git clone <repo-url> ecotrans
cd ecotrans

# Copiar variables de entorno y ajustar si es necesario
cp .env.example .env

# Construir e iniciar todos los servicios
docker compose up --build
```

Esto levanta:
- **PostgreSQL** en `localhost:5433`
- **Backend API** en `http://localhost:8000`
- **Frontend** en `http://localhost:3000`

El backend ejecuta automáticamente:
1. Migraciones de Alembic (creación de tablas)
2. Población de la base de datos con datos históricos (CSV)
3. Descarga de datos climáticos (Open-Meteo)
4. Inicio del servidor

### Usuarios preconfigurados

| Rol | Email | Contraseña |
|------|-------|-----------|
| Admin | admin@ecotrans.com | admin123 |

Los usuarios adicionales se registran desde la misma interfaz de login.

## Desarrollo local

### 1. Base de datos

```bash
# Iniciar solo PostgreSQL
docker compose up database -d
```

### 2. Backend

```bash
cd backend

# Crear entorno virtual
uv venv
source .venv/bin/activate

# Instalar dependencias
uv sync

# Configurar variables de entorno
export DATABASE_URL="postgresql+asyncpg://ecotrans:ecotrans123@localhost:5433/ecotrans"
export SECRET_KEY="secret_key"
export ORIGINS="http://localhost:3000"

# Ejecutar migraciones
uv run alembic upgrade heads

# Poblar base de datos (opcional — datos históricos)
uv run populate_db

# Descargar datos climáticos (opcional)
uv run python src/utils/fetch_weather.py

# Iniciar servidor
uv run uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend/id

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

El frontend corre en `http://localhost:3000` y se conecta al backend en `http://localhost:8000`.

## Estructura del proyecto

```
ecotrans/
├── backend/
│   ├── alembic/            # Migraciones de base de datos
│   ├── src/
│   │   ├── db/             # Modelos ORM y sesión
│   │   ├── routes/         # Endpoints de la API
│   │   │   ├── auth/       # Autenticación y usuarios
│   │   │   ├── analytics/  # Analítica y reportes
│   │   │   └── incidents.py # Incidentes
│   │   └── utils/          # Auth, carga de datos, clima
│   ├── main.py             # Punto de entrada FastAPI
│   └── Dockerfile
├── frontend/id/
│   ├── app/
│   │   ├── auth/           # Login, registro, dashboards
│   │   └── page.tsx        # Página principal
│   └── Dockerfile
└── docker-compose.yml
```

## Roles del sistema

| Rol | Acceso |
|------|--------|
| **Admin** | Todo: analítica, incidentes, gestión de usuarios |
| **Analyst** | Panel de analítica: retrasos, rutas, clima, eficiencia |
| **Inspector** | Panel de incidentes: reportar, listar, resolver |

## Endpoints de la API

### Autenticación (`/api/v1/auth`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/register` | Registrar usuario |
| POST | `/login` | Iniciar sesión (devuelve JWT) |
| GET | `/me` | Perfil del usuario autenticado |
| GET | `/users` | Listar usuarios (admin) |
| PATCH | `/users/{id}/role` | Cambiar rol (admin) |

### Analítica (`/api/v1/analytics`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/summary` | Resumen general de la red |
| GET | `/delays-by-route` | Retrasos agregados por ruta |
| GET | `/delays-by-month` | Retrasos agregados por mes |
| GET | `/delays-by-day` | Retrasos agregados por día |
| GET | `/delays-by-type` | Retrasos por tipo de incidente |
| GET | `/worst-locations` | Ubicaciones con más retrasos |
| GET | `/weather-impact` | Impacto del clima en retrasos |
| GET | `/route-compliance` | Índice de cumplimiento por ruta |

### Incidentes (`/api/v1/incidents`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/` | Crear incidente (inspector/admin) |
| GET | `/` | Listar incidentes (cualquier autenticado) |
| PATCH | `/{id}/resolve` | Resolver incidente (inspector/admin) |
