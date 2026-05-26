# Laboratorio final: War Room QA

Este laboratorio convierte el Dia 7 en una simulacion practica. El instructor actua como Arquitecto de Software y los alumnos como SDETs responsables de investigar un incidente antes de autorizar el release.

## Escenario

El release candidato paso pruebas locales y pipeline, pero soporte reporta 3 usuarios con inconsistencias en transferencias.

Tu mision:

1. Revisar los logs simulados.
2. Encontrar la transaccion con mayor impacto.
3. Identificar el `trace_id`.
4. Determinar el servicio, archivo, linea y causa probable.
5. Completar el reporte de bug.
6. Proponer una prueba automatizada para evitar la regresion.

## Recursos

- [recursos/production-logs.jsonl](recursos/production-logs.jsonl): logs estructurados mezclados.
- [recursos/traces.md](recursos/traces.md): trazas resumidas por transaccion.
- [reporte-war-room-template.md](reporte-war-room-template.md): plantilla para entregar.
- [solucionario-instructor.md](solucionario-instructor.md): solucion para el instructor.
- [validar-lab.ps1](validar-lab.ps1): validador simple de respuestas.

## Ejecucion sugerida

Desde esta carpeta:

```powershell
Get-Content .\recursos\production-logs.jsonl | ConvertFrom-Json | Format-Table timestamp,level,service,trace_id,user_id,event,error_type
```

Filtra por errores:

```powershell
Get-Content .\recursos\production-logs.jsonl | ConvertFrom-Json | Where-Object level -in "ERROR","FATAL" | Format-List
```

Valida la respuesta del equipo:

```powershell
.\validar-lab.ps1 -TraceId "trace-final-7731" -Service "notifications-service" -RootCause "missing_email"
```

## Entregable

Cada equipo debe completar `reporte-war-room-template.md` y defender en 3 minutos:

- Que paso.
- Como lo demostraron.
- A quien se lo reportan.
- Que prueba automatizada agregarian al pipeline.

## Criterios de evaluacion

- Usa evidencia concreta, no opiniones.
- Reconstruye la historia con `trace_id`.
- Diferencia sintoma de causa raiz.
- Propone una prueba automatizada realista.
- Comunica el riesgo de negocio con claridad.
