#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Starting PostgreSQL ==="
docker compose -f "$ROOT_DIR/backend/docker-compose.yml" up -d
echo "Waiting for PostgreSQL to be ready..."
until docker exec backend-postgres pg_isready -U backend -d backend >/dev/null 2>&1; do
  sleep 1
done
echo "PostgreSQL is ready."

echo "=== Running migrations ==="
cd "$ROOT_DIR/backend"
.venv/bin/alembic upgrade heads
echo "Migrations applied."

echo "=== Starting Backend (uvicorn) ==="
kill $(lsof -ti:8000) 2>/dev/null || true
.venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

sleep 2

echo "=== Starting Frontend (Next.js) ==="
kill $(lsof -ti:3000) 2>/dev/null || true
cd "$ROOT_DIR/frontend/id"
npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "=========================================="
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:3000"
echo "  API Docs: http://localhost:8000/docs"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop all services."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; docker compose -f $ROOT_DIR/backend/docker-compose.yml stop" EXIT SIGINT SIGTERM
wait
