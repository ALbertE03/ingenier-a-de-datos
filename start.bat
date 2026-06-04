@echo off
cd backend

set ACTION=%~1

if "%ACTION%"=="" (
    echo Uso: start.bat [up^|build^|down]
    echo Ninguna accion especificada, ejecutando 'up' por defecto...
    docker compose up
    goto :eof
)

if "%ACTION%"=="build" (
    docker compose up --build
) else (
    docker compose %*
)
