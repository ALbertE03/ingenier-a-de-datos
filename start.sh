#!/bin/bash

cd backend || exit 1

ACTION=$1

if [ -z "$ACTION" ]; then
    echo "Uso: ./start.sh [up|build|down]"
    echo "Ninguna accion especificada, ejecutando 'up' por defecto..."
    docker compose up
elif [ "$ACTION" == "build" ]; then
    docker compose up --build
else
    docker compose "$@"
fi
