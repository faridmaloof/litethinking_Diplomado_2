# Dia 6: Observabilidad y Shift-Right Testing

Este dia cambia el rol del QA/SDET: dejamos de ejecutar solo pruebas en local y pasamos a investigar incidentes reales usando telemetria.

Incluye:
- Talk-track del instructor.
- Laboratorio forense: La Caza del Bug.
- Recursos de trazas y logs JSON.
- Taller teorico con solucionario.

## Objetivo de aprendizaje

- Diferenciar monitoreo y observabilidad.
- Entender los 3 pilares: metricas, trazas y logs.
- Usar un `trace_id` para reconstruir una transaccion fallida.
- Reportar un bug con evidencia accionable: log exacto, servicio, archivo, linea y causa probable.

## Agenda sugerida

| Minutos | Actividad | Enfoque |
| --- | --- | --- |
| 00:00 - 00:30 | Revision del reto Dia 5 | Validar pipeline en GitHub Actions |
| 00:30 - 01:00 | Shift-Right y MTTR | Produccion como autopista real |
| 01:00 - 01:40 | 3 pilares de observabilidad | Metricas, trazas y logs |
| 01:40 - 01:55 | Break | Descanso previo a la practica |
| 01:55 - 03:00 | Laboratorio forense | Resolver el incidente con evidencia |

## Laboratorio: La Caza del Bug

Escenario para leer a la clase:

> Atencion equipo. Acaba de llegar un ticket de soporte critico. El usuario `Juan_123` intento transferir 500. La pantalla del banco no mostro error, pero el dinero desaparecio de su cuenta y no llego al destino. Como SDETs, no vamos a correr Playwright: vamos a investigar la infraestructura.

### Paso 1: Leer la traza

Abre [recursos/trace-transferencia.md](recursos/trace-transferencia.md) y pide al grupo identificar donde se atasco la transaccion.

Respuesta esperada:

- El flujo llega bien hasta Kafka.
- El fallo ocurre entre Kafka y `payments-microservice`.
- El `trace_id` que se debe usar para filtrar es `trace-99x88y77z`.

### Paso 2: Leer el log JSON

Abre [recursos/log-payment-fatal.json](recursos/log-payment-fatal.json) y pide al grupo responder:

- Que servicio fallo.
- Que usuario esta afectado.
- Cual es el `trace_id`.
- Que archivo y linea aparecen en el error.
- Que campo llego nulo.
- A que equipo se debe reportar.

Respuesta esperada:

- Servicio: `payments-microservice`.
- Usuario: `Juan_123`.
- Trace ID: `trace-99x88y77z`.
- Archivo y linea: `TransactionValidator.java:142`.
- Campo nulo: `target_account`.
- Equipo responsable probable: Frontend, porque el log indica que el campo no llego desde el JSON original.

### Paso 3: Crear reporte de bug

Usa [recursos/reporte-bug-template.md](recursos/reporte-bug-template.md) para que cada equipo documente el hallazgo.

## Taller teorico

El taller esta en [taller-teorico-dia-6.md](taller-teorico-dia-6.md).
El solucionario para el instructor esta en [solucionario-dia-6.md](solucionario-dia-6.md).
