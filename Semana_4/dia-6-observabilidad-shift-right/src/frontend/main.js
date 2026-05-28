const traceIdField = document.getElementById('traceId');
const observabilityLink = document.getElementById('observabilityLink');
const scenarioField = document.getElementById('scenario');
const targetAccountField = document.getElementById('targetAccount');
const resultField = document.getElementById('result');
const form = document.getElementById('transferForm');
const caseButtons = document.querySelectorAll('[data-scenario]');

function createTraceId() {
  return `trace-${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 6)}`;
}

let currentTraceId = createTraceId();

function syncTraceUi() {
  traceIdField.textContent = currentTraceId;
  observabilityLink.href = `/observability/?trace_id=${encodeURIComponent(currentTraceId)}`;
}

function setResult(payload) {
  resultField.textContent = JSON.stringify(payload, null, 2);
}

async function sendUiEvent(eventAction, payload = {}) {
  await fetch('/api/client-events', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-trace-id': currentTraceId
    },
    body: JSON.stringify({
      trace_id: currentTraceId,
      event_action: eventAction,
      scenario: scenarioField.value,
      payload
    })
  });
}

function buildPayload() {
  const scenario = scenarioField.value;
  const payload = {
    trace_id: currentTraceId,
    user_id: document.getElementById('userId').value.trim(),
    source_account: document.getElementById('sourceAccount').value.trim(),
    amount: Number(document.getElementById('amount').value),
    scenario
  };

  if (scenario !== 'frontend') {
    payload.target_account = targetAccountField.value.trim();
  }

  if (scenario === 'backend') {
    payload.feeConfig = undefined;
  }

  return payload;
}

function applyScenario(scenario) {
  scenarioField.value = scenario;

  const isFrontendIncident = scenario === 'frontend';
  targetAccountField.disabled = isFrontendIncident;
  targetAccountField.closest('label').classList.toggle('muted', isFrontendIncident);

  if (scenario === 'frontend') {
    targetAccountField.value = '';
  } else if (!targetAccountField.value.trim()) {
    targetAccountField.value = 'ACC-002';
  }

  if (scenario === 'backend') {
    setResult({
      scenario,
      note: 'Escenario listo: el gateway fallará al leer feeConfig.'
    });
  } else if (scenario === 'kafka') {
    setResult({
      scenario,
      note: 'Escenario listo: el worker recibirá un event_action no soportado.'
    });
  } else if (scenario === 'db') {
    setResult({
      scenario,
      note: 'Escenario listo: la persistencia fallará por una columna no mapeada.'
    });
  } else if (scenario === 'frontend') {
    setResult({
      scenario,
      note: 'Escenario listo: el frontend omitirá target_account.'
    });
  } else {
    setResult({
      scenario,
      note: 'Escenario listo: el flujo debería completarse correctamente.'
    });
  }

  sendUiEvent('frontend_case_selected', {
    scenario,
    target_account_present: Boolean(targetAccountField.value.trim())
  }).catch(() => undefined);
}

document.getElementById('newTrace').addEventListener('click', () => {
  currentTraceId = createTraceId();
  syncTraceUi();
  setResult({ message: 'Nuevo trace generado', trace_id: currentTraceId });
  sendUiEvent('frontend_trace_generated', {
    note: 'El operador generó un nuevo trace para seguir el incidente.'
  }).catch(() => undefined);
});

caseButtons.forEach((button) => {
  button.addEventListener('click', () => {
    applyScenario(button.dataset.scenario);
  });
});

scenarioField.addEventListener('change', () => {
  applyScenario(scenarioField.value);
});

applyScenario(scenarioField.value);

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = buildPayload();
  if (payload.scenario === 'frontend') {
    delete payload.target_account;
  }

  try {
    await sendUiEvent('frontend_prepare_transfer', payload);
    const response = await fetch('/api/transfers', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-trace-id': currentTraceId
      },
      body: JSON.stringify(payload)
    });

    const body = await response.json();
    setResult({
      http_status: response.status,
      trace_id: currentTraceId,
      payload,
      response: body
    });

    if (body.observability_url) {
      observabilityLink.href = body.observability_url;
    }
  } catch (error) {
    setResult({
      trace_id: currentTraceId,
      error: error.message
    });
  }
});

syncTraceUi();
