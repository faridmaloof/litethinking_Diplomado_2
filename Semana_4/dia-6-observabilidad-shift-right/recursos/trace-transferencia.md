# Traza simulada: transferencia Juan_123

Trace ID: `trace-99x88y77z`

| Estado | Origen | Destino | Observacion |
| --- | --- | --- | --- |
| 200 OK | Frontend | API Gateway | La UI envio la solicitud y recibio respuesta exitosa. |
| 200 OK | API Gateway | Servicio de Autenticacion | El usuario fue autenticado correctamente. |
| 202 ACCEPTED | API Gateway | Kafka: `transferencias-creadas` | La solicitud fue aceptada para procesamiento asincrono. |
| 500 ERROR | Kafka | Microservicio de Pagos | El consumidor fallo al procesar el evento. |

## Preguntas para la clase

1. Que significa que el API Gateway responda `202 ACCEPTED`?
2. En que tramo ocurre el fallo real?
3. Que identificador permite buscar todos los eventos relacionados?
4. El error debe reportarse solo como "fallo en pagos" o hay que seguir investigando?
