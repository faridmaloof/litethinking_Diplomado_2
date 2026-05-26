# Trazas resumidas

## trace-final-1044

| Estado | Servicio | Evento |
| --- | --- | --- |
| 200 OK | frontend | submit_transfer |
| 202 ACCEPTED | api-gateway | transfer_accepted |
| 200 OK | payments-microservice | transfer_processed |

Resultado: transferencia aprobada.

## trace-final-7731

| Estado | Servicio | Evento |
| --- | --- | --- |
| 200 OK | frontend | submit_transfer |
| 202 ACCEPTED | api-gateway | transfer_accepted |
| 200 OK | payments-microservice | transfer_processed |
| 500 ERROR | notifications-service | send_receipt |

Resultado: transferencia aprobada, comprobante no enviado.

## trace-final-5520

| Estado | Servicio | Evento |
| --- | --- | --- |
| 200 OK | frontend | submit_transfer |
| WARN | api-gateway | rate_limit_check |
| 200 OK | payments-microservice | transfer_processed |

Resultado: transferencia aprobada con advertencia operativa.
