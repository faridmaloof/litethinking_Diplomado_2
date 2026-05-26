# Solucionario instructor: War Room QA

## Incidente principal

- Trace ID: `trace-final-7731`
- Usuario: `Mario_778`
- Monto: `1200.00`
- Servicio con error: `notifications-service`
- Evento: `send_receipt`
- Error: `SchemaValidationError`
- Archivo y linea: `ReceiptPayloadMapper.ts:88`
- Causa raiz: `missing_email`

## Lectura correcta

La transferencia fue aprobada por `payments-microservice`, pero el comprobante no fue enviado porque el evento `transfer_processed` no incluyo el campo `email`.

No es un bug de dinero perdido, sino un bug de comunicacion/auditoria. Aun asi tiene riesgo de negocio porque el usuario no recibe evidencia de la transaccion y puede generar tickets de soporte o reclamos.

## Equipo sugerido

Reportar al equipo que define/publica el contrato del evento `transfer_processed`. Si el owner del evento es Payments, el fix principal esta ahi. Notifications tambien debe validar de forma defensiva y generar un error controlado.

## Prueba automatizada esperada

Una buena respuesta puede proponer:

- Contract test del evento `transfer_processed` validando que incluya `user_id`, `amount`, `target_account`, `status` y `email`.
- Prueba E2E asincrona que cree una transferencia y haga polling hasta confirmar comprobante enviado.
- Prueba de observabilidad post-deploy que falle si aparecen logs `FATAL` en `notifications-service` para el release.

## Respuestas aceptadas por el validador

```powershell
.\validar-lab.ps1 -TraceId "trace-final-7731" -Service "notifications-service" -RootCause "missing_email"
```
