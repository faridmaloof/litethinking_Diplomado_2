# Dia 7: Defensa Final, Certificacion y War Room QA

Este dia combina defensa tecnica, examen integrador y una practica final para que el cierre sea mas aplicado que teorico.

Incluye:
- Guia de defensa para el instructor.
- Preguntas de validacion durante presentaciones.
- Examen final integrador.
- Laboratorio practico extra: War Room QA.

## Agenda sugerida

| Minutos | Actividad | Enfoque |
| --- | --- | --- |
| 00:00 - 00:15 | Reglas de juego | Simulacion corporativa |
| 00:15 - 00:55 | War Room QA | Resolver incidente final por equipos |
| 00:55 - 01:25 | Defensa de proyectos | Estrategia, pipeline y evidencias |
| 01:25 - 01:45 | Examen final | Validacion teorica |
| 01:45 - 02:00 | Roadmap laboral y cierre | Proyeccion profesional |

## Defensa final

Cada equipo debe mostrar:

- Flujo de pruebas automatizadas.
- Manejo de asincronia o polling.
- Evidencia del pipeline en GitHub Actions.
- Reporte o evidencia de calidad.
- Riesgos conocidos y como los mitigarian.

Preguntas sugeridas para el instructor:

- Veo que configuraste un timeout de 10 segundos en tu polling. Por que no usar `Thread.sleep(10000)`?
- En tu YAML aparece `runs-on: ubuntu-latest`. Que significa fisicamente?
- Si Kafka se cae por 5 minutos, los eventos del usuario se pierden?
- Que evidencia adjuntarias en Jira para reducir el MTTR?
- Como sabrias si un fallo es de UI, API, broker o consumidor?

## Laboratorio practico extra

Antes de la defensa, ejecuta [lab-final-war-room/README.md](lab-final-war-room/README.md).

La practica pide investigar logs de produccion simulados, encontrar la transaccion fallida, documentar el bug y proponer una prueba automatizada que evite la regresion.

## Examen final

El examen esta en [examen-final-integrador.md](examen-final-integrador.md).
El solucionario para el instructor esta en [solucionario-examen-final.md](solucionario-examen-final.md).
