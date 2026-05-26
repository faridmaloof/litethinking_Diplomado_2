param(
  [Parameter(Mandatory=$true)]
  [string]$TraceId,

  [Parameter(Mandatory=$true)]
  [string]$Service,

  [Parameter(Mandatory=$true)]
  [string]$RootCause
)

$expectedTraceId = "trace-final-7731"
$expectedService = "notifications-service"
$expectedRootCause = "missing_email"

$score = 0

if ($TraceId -eq $expectedTraceId) {
  $score += 1
  Write-Host "OK Trace ID correcto"
} else {
  Write-Host "ERROR Trace ID incorrecto. Revisa la traza con 500 ERROR."
}

if ($Service -eq $expectedService) {
  $score += 1
  Write-Host "OK Servicio correcto"
} else {
  Write-Host "ERROR Servicio incorrecto. Busca el log con level FATAL."
}

if ($RootCause -eq $expectedRootCause) {
  $score += 1
  Write-Host "OK Causa raiz correcta"
} else {
  Write-Host "ERROR Causa raiz incorrecta. Revisa el campo root_cause del log fatal."
}

Write-Host ""
Write-Host "Resultado: $score/3"

if ($score -eq 3) {
  Write-Host "Laboratorio aprobado. El equipo tiene evidencia suficiente para defender el incidente."
  exit 0
}

Write-Host "Laboratorio incompleto. Ajusta el reporte antes de la defensa."
exit 1
