# Laboratorio de observabilidad y shift-right

Este directorio contiene una demo completa para el Dia 6:

- Frontend de transferencia con selector de escenarios.
- API Gateway con trazas y autenticacion simulada.
- Servicio de autenticacion con consulta real a PostgreSQL.
- Broker de eventos tipo Kafka con API HTTP local.
- Worker de pagos consumiendo eventos desde el broker local.
- Consola de observabilidad para filtrar logs JSON por `trace_id`.

## Como ejecutar

1. Desde este directorio ejecuta:
   `docker compose up --build`
2. Abre la UI en `http://localhost:8080`
3. Abre la consola de observabilidad en `http://localhost:8080/observability/`

## Escenarios del laboratorio

- `happy`: flujo completo exitoso.
- `frontend`: el frontend omite `target_account`.
- `backend`: el gateway rompe al calcular una tarifa con un objeto ausente.
- `kafka`: el worker recibe un `event_action` que no sabe resolver.
- `db`: el worker usa una columna que no existe en la tabla de auditoria.

## Puntos de observabilidad

- Todos los servicios escriben logs JSON en el volumen compartido `logs`.
- Cada evento incluye `trace_id`, `span_id`, `service_name` y `event_action`.
- La consola permite localizar el fallo con el mismo `trace_id` que retorna la UI.
- Los clicks de caso, la generacion de trace y el submit del formulario tambien se registran como eventos de frontend-web en el contenedor del gateway.
- La consola de observabilidad incluye una vista de timeline para revisar la secuencia completa sin filtrar a mano.
- La consola de observabilidad incluye un resumen del incidente con causa raiz sugerida, contadores por nivel y servicios afectados.
- La consola expone `/api/summary` para resumir el trace activo y destacar fallos de base de datos con mas contexto.

## Como ver los logs del contenedor

- Gateway: `docker compose logs -f api-gateway`
- Consola de observabilidad: `docker compose logs -f observability-console`
- Frontend: `docker compose logs -f frontend-web`
- Broker local: `docker compose logs -f kafka-broker`

Si quieres ver la evidencia dentro de la app, abre `http://localhost:8080/observability/` y usa el campo de `trace_id` o el boton `Ver timeline`.
