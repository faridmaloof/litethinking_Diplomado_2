# Reporte de bug - Incidente productivo

## Resumen

Transferencia aceptada por la UI/API, pero fallida durante el procesamiento asincrono en el microservicio de pagos.

## Impacto

- Usuario afectado:
- Monto:
- Flujo afectado:
- Riesgo para negocio:

## Evidencia tecnica

- Trace ID:
- Servicio con error:
- Span ID:
- Timestamp:
- Archivo:
- Linea:
- Tipo de error:
- Campo defectuoso:

## Causa probable

Describe que componente origino el dato incorrecto o incompleto.

## Equipo sugerido para correccion

Frontend / Backend / DevOps / Datos:

## Criterio de aceptacion del fix

- La transferencia no debe enviarse sin `target_account`.
- La UI debe validar el campo antes de crear el evento.
- El backend debe rechazar payloads incompletos con un error claro.
- Los logs deben conservar `trace_id` para auditoria.
