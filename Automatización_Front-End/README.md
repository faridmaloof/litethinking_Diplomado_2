# Automatización Front-End

Plantilla base para practicar automatización de front-end con despliegue local en Docker.

## Estructura

- `src/`: ambiente base de la aplicación web (dockerizable)

## Flujo recomendado

1. Levantar ambiente web:
   - Ir a `src/`
   - Ejecutar: `docker compose up --build -d`
   - Abrir: `http://localhost:3000`

## Objetivo pedagógico

Este módulo deja una base funcional para que los estudiantes desarrollen por su cuenta:

- Practiquen automatización resiliente con polling.
- Extiendan el patrón POM para nuevas pantallas/escenarios.
- Integren CI/CD sin modificar la base del repo principal.
