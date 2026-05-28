const express = require('express');
const fs = require('fs');
const path = require('path');

const logDir = process.env.LOG_DIR || '/app/logs';
const app = express();

function normalizeFilterValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeQuery(query) {
  const traceId = normalizeFilterValue(query.trace_id || query.id || query.traceId);
  const serviceName = normalizeFilterValue(query.service_name || query.service || query.servicio || query.servicio_name);
  const level = normalizeFilterValue(query.level || query.nivel).toUpperCase();

  const normalized = {};

  if (traceId) {
    normalized.trace_id = traceId;
  }

  if (serviceName) {
    normalized.service_name = serviceName;
  }

  if (level) {
    normalized.level = level;
  }

  return normalized;
}

function readJsonlFiles() {
  if (!fs.existsSync(logDir)) {
    return [];
  }

  const files = fs
    .readdirSync(logDir)
    .filter((file) => file.endsWith('.jsonl'))
    .map((file) => path.join(logDir, file));

  const entries = [];

  for (const filePath of files) {
    const contents = fs.readFileSync(filePath, 'utf8');
    const lines = contents.split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        entries.push(JSON.parse(line));
      } catch (_error) {
        // Ignore malformed lines so one bad log entry does not block the lab.
      }
    }
  }

  return entries.sort((left, right) => String(left['@timestamp']).localeCompare(String(right['@timestamp'])));
}

function filterEntries(entries, query) {
  const filters = normalizeQuery(query);

  return entries.filter((entry) => {
    if (filters.trace_id && entry.trace_id !== filters.trace_id) {
      return false;
    }

    if (filters.service_name && entry.service_name !== filters.service_name) {
      return false;
    }

    if (filters.level && entry.level !== filters.level) {
      return false;
    }

    return true;
  });
}

function mapTimelineEntries(entries) {
  return entries.map((entry) => ({
    timestamp: entry['@timestamp'] || '',
    level: entry.level || '',
    service_name: entry.service_name || '',
    trace_id: entry.trace_id || '',
    event_action: entry.event_action || '',
    operation: entry.operation || '',
    scenario: entry.scenario || '',
    message: entry.message || '',
    error_details: entry.error_details || null
  }));
}

function buildIncidentSummary(entries) {
  function inferRootCause(entry) {
    if (!entry) {
      return 'Aun no hay datos para resumir.';
    }

    const details = entry.error_details || {};
    const rawMessage = String(details.message || entry.message || '').toLowerCase();
    const operation = details.operation || entry.operation || '';
    const table = details.table || '';

    if (entry.service_name === 'payments-microservice' && rawMessage.includes('uuid')) {
      return 'payments-microservice · falla al persistir la transferencia en PostgreSQL · ' + (details.message || entry.message || 'error de base de datos') + (operation ? ' · ' + operation : '') + (table ? ' · table:' + table : '');
    }

    if (entry.service_name === 'payments-microservice' && entry.event_action === 'payment_failure') {
      return 'payments-microservice · fallo de procesamiento de pagos · ' + (details.message || entry.message || 'error no clasificado') + (operation ? ' · ' + operation : '') + (table ? ' · table:' + table : '');
    }

    if (entry.level === 'FATAL' || entry.level === 'ERROR') {
      return [
        entry.service_name || 'unknown-service',
        entry.message || 'Mensaje no disponible',
        details.message || '',
        operation,
        table ? `table:${table}` : ''
      ].filter(Boolean).join(' · ');
    }

    return [entry.service_name || 'unknown-service', entry.message || 'Mensaje no disponible'].join(' · ');
  }

  const summary = entries.reduce((accumulator, entry) => {
    const level = entry.level || 'UNKNOWN';
    const service = entry.service_name || 'unknown';

    accumulator.levels[level] = (accumulator.levels[level] || 0) + 1;
    accumulator.services[service] = (accumulator.services[service] || 0) + 1;

    if (!accumulator.latestError && (level === 'FATAL' || level === 'ERROR')) {
      accumulator.latestError = entry;
    }

    return accumulator;
  }, { levels: {}, services: {}, latestError: null });

  const latestEntry = entries[entries.length - 1] || null;
  const latestError = summary.latestError || latestEntry;

  return {
    total: entries.length,
    levels: summary.levels,
    services: summary.services,
    latestTrace: latestError?.trace_id || latestEntry?.trace_id || '',
    latestService: latestError?.service_name || latestEntry?.service_name || '',
    rootCause: inferRootCause(latestError)
  };
}

function listLogFiles() {
  if (!fs.existsSync(logDir)) {
    return [];
  }

  return fs
    .readdirSync(logDir)
    .filter((file) => file.endsWith('.jsonl'))
    .map((file) => {
      const fullPath = path.join(logDir, file);
      const stats = fs.statSync(fullPath);
      return {
        file,
        size: stats.size,
        updated_at: stats.mtime.toISOString()
      };
    })
    .sort((left, right) => left.file.localeCompare(right.file));
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'observability' });
});

app.get('/api/logs', (req, res) => {
  const entries = filterEntries(readJsonlFiles(), req.query);
  res.json({ count: entries.length, entries });
});

app.get('/api/timeline', (req, res) => {
  const filters = normalizeQuery(req.query);
  const entries = Object.keys(filters).length ? filterEntries(readJsonlFiles(), filters) : readJsonlFiles();
  res.json({
    count: entries.length,
    entries: mapTimelineEntries(entries)
  });
});

app.get('/api/files', (_req, res) => {
  const files = listLogFiles();
  res.json({ count: files.length, files });
});

app.get('/api/traces/:traceId', (req, res) => {
  const entries = filterEntries(readJsonlFiles(), { trace_id: req.params.traceId });
  const grouped = entries.reduce((accumulator, entry) => {
    const key = entry.service_name || 'unknown';
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(entry);
    return accumulator;
  }, {});

  res.json({ trace_id: req.params.traceId, count: entries.length, grouped });
});

app.get('/api/summary', (req, res) => {
  const entries = filterEntries(readJsonlFiles(), req.query);
  res.json(buildIncidentSummary(entries));
});

app.get('/', (_req, res) => {
  res.type('html').send(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Observability Console</title>
        <style>
          :root {
            color-scheme: dark;
            --bg: #05101d;
            --panel: rgba(14, 26, 45, 0.92);
            --line: rgba(255,255,255,0.12);
            --text: #eef4ff;
            --muted: #9fb1cc;
            --accent: #f9a826;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            font-family: Inter, ui-sans-serif, system-ui, sans-serif;
            color: var(--text);
            background: radial-gradient(circle at top, rgba(249,168,38,.12), transparent 32%), linear-gradient(180deg, #02060d, #081325 40%, #07101c 100%);
          }
          main { width: min(1400px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 56px; }
          header, section { border: 1px solid var(--line); border-radius: 22px; background: var(--panel); box-shadow: 0 20px 60px rgba(0,0,0,.26); }
          header { padding: 24px; margin-bottom: 18px; }
          h1 { margin: 0 0 8px; font-size: clamp(2rem, 4vw, 3.6rem); }
          .muted { color: var(--muted); }
          .controls { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; padding: 24px; margin-bottom: 18px; }
          input, button, select { width: 100%; border-radius: 14px; border: 1px solid var(--line); background: rgba(255,255,255,.04); color: var(--text); padding: 12px 14px; font: inherit; }
          button { cursor: pointer; background: linear-gradient(180deg, rgba(249,168,38,.22), rgba(249,168,38,.08)); }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 12px 14px; border-bottom: 1px solid var(--line); vertical-align: top; text-align: left; font-size: .92rem; }
          th { color: var(--muted); font-weight: 600; }
          .table-wrap { overflow: auto; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(249,168,38,.28); color: var(--accent); font-size: .78rem; }
          .trace-toolbar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
          .summary-panel { margin-bottom: 18px; padding: 24px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
          .summary-card { padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); }
          .summary-card span { display: block; color: var(--muted); font-size: .82rem; margin-bottom: 8px; }
          .summary-card strong { display: block; font-size: 1.2rem; }
          .summary-root-cause { margin-top: 16px; padding: 16px; border-radius: 16px; border: 1px solid rgba(249,168,38,.22); background: rgba(249,168,38,.08); }
          .summary-root-cause code { display: block; margin-top: 8px; white-space: pre-wrap; word-break: break-word; color: #ffe7bf; }
          .files-panel { margin-bottom: 18px; padding: 18px 24px; border: 1px solid var(--line); border-radius: 22px; background: rgba(255,255,255,.04); }
          .files-list { display: flex; flex-wrap: wrap; gap: 10px; }
          .file-chip { padding: 8px 12px; border-radius: 999px; border: 1px solid rgba(249,168,38,.22); background: rgba(249,168,38,.08); color: var(--text); font-size: .85rem; }
          .timeline-panel { margin-bottom: 18px; padding: 24px; }
          .timeline-header { margin-bottom: 16px; }
          .timeline-list { display: grid; gap: 12px; }
          .timeline-item { padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); }
          .timeline-top { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 10px; }
          .timeline-top strong { color: var(--accent); }
          .timeline-top span, .timeline-top small { color: var(--muted); }
          .timeline-item p { margin: 0 0 8px; }
          .timeline-item code, .timeline-item pre { display: block; white-space: pre-wrap; word-break: break-word; color: #dbe7ff; }
          .timeline-meta { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0 10px; }
          .timeline-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.04); color: var(--muted); font-size: .78rem; }
          .timeline-pill.error { border-color: rgba(255, 96, 96, .35); background: rgba(255, 96, 96, .10); color: #ffb4b4; }
          .timeline-pill.warn { border-color: rgba(255, 192, 64, .35); background: rgba(255, 192, 64, .10); color: #ffe3a2; }
          .timeline-pill.info { border-color: rgba(124, 196, 255, .35); background: rgba(124, 196, 255, .10); color: #cfe8ff; }
          .timeline-empty { color: var(--muted); font-style: italic; }
          a { color: #7cc4ff; }
          @media (max-width: 1100px) { .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
          @media (max-width: 900px) { .controls { grid-template-columns: 1fr; } .summary-grid { grid-template-columns: 1fr; } }
        </style>
      </head>
      <body>
        <main>
          <header>
            <span class="badge">Observability / Shift-right</span>
            <h1>Trace console</h1>
            <p class="muted">Filtra logs JSON por trace_id, servicio y nivel para reconstruir el incidente paso a paso.</p>
            <p class="muted">Leyendo archivos desde <code>/app/logs</code> dentro del contenedor observability-console.</p>
          </header>

          <section class="summary-panel">
            <h2>Resumen del incidente</h2>
            <p class="muted">Se recalcula con los filtros activos para que la causa raíz no quede escondida detrás del nombre del servicio.</p>
            <div class="summary-grid">
              <div class="summary-card"><span>Eventos visibles</span><strong id="summaryTotal">0</strong></div>
              <div class="summary-card"><span>Errores</span><strong id="summaryErrors">0</strong></div>
              <div class="summary-card"><span>Servicios</span><strong id="summaryServices">0</strong></div>
              <div class="summary-card"><span>Último trace</span><strong id="summaryTrace">-</strong></div>
            </div>
            <div class="summary-root-cause">
              <span class="badge">Causa raíz sugerida</span>
              <code id="summaryRootCause">Aun no hay datos para resumir.</code>
            </div>
          </section>

          <section class="files-panel">
            <h2>Archivos de log</h2>
            <div id="filesList" class="files-list"></div>
          </section>

          <section class="controls">
            <label>
              Trace ID
              <input id="traceId" placeholder="trace-99x88y77z" />
            </label>
            <label>
              Servicio
              <select id="serviceName">
                <option value="">Todos</option>
                <option value="frontend-web">frontend-web</option>
                <option value="api-gateway">api-gateway</option>
                <option value="auth-service">auth-service</option>
                <option value="payments-microservice">payments-microservice</option>
              </select>
            </label>
            <label>
              Nivel
              <select id="level">
                <option value="">Todos</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
                <option value="FATAL">FATAL</option>
              </select>
            </label>
            <div class="trace-toolbar">
              <button id="searchButton" type="button">Buscar logs</button>
              <button id="timelineButton" type="button">Ver timeline</button>
              <a href="/api/traces/trace-99x88y77z" target="_blank" rel="noreferrer">Abrir trace de ejemplo</a>
            </div>
          </section>

          <section class="timeline-panel">
            <header class="timeline-header">
              <h2>Timeline reciente</h2>
              <p class="muted">Eventos ordenados por tiempo para reconstruir el caso sin cambiar filtros manualmente.</p>
            </header>
            <div class="timeline-list" id="timelineList"></div>
          </section>

          <section>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Level</th>
                    <th>Service</th>
                    <th>Trace</th>
                    <th>Event</th>
                    <th>Message</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody id="rows"></tbody>
              </table>
            </div>
          </section>
        </main>

        <script>
          const rows = document.getElementById('rows');
          const timelineList = document.getElementById('timelineList');
          const filesList = document.getElementById('filesList');
          const traceInput = document.getElementById('traceId');
          const serviceInput = document.getElementById('serviceName');
          const levelInput = document.getElementById('level');
          const summaryTotal = document.getElementById('summaryTotal');
          const summaryErrors = document.getElementById('summaryErrors');
          const summaryServices = document.getElementById('summaryServices');
          const summaryTrace = document.getElementById('summaryTrace');
          const summaryRootCause = document.getElementById('summaryRootCause');
          const apiBase = window.location.pathname.startsWith('/observability/') ? '/observability/api' : '/api';

          const params = new URLSearchParams(window.location.search);

          traceInput.value = params.get('trace_id') || params.get('id') || params.get('traceId') || '';
          serviceInput.value = params.get('service_name') || params.get('service') || params.get('servicio') || '';
          levelInput.value = (params.get('level') || params.get('nivel') || '').toUpperCase();

          function buildQuery() {
            const query = new URLSearchParams();
            if (traceInput.value.trim()) query.set('trace_id', traceInput.value.trim());
            if (serviceInput.value) query.set('service_name', serviceInput.value);
            if (levelInput.value) query.set('level', levelInput.value);
            return query;
          }

          function syncUrl(query) {
            const queryString = query.toString();
            const nextUrl = queryString ? window.location.pathname + '?' + queryString : window.location.pathname;
            window.history.replaceState({}, '', nextUrl);
          }

          function renderTimelinePills(entry) {
            return [
              entry.operation ? '<span class="timeline-pill info">' + entry.operation + '</span>' : '',
              entry.scenario ? '<span class="timeline-pill">scenario: ' + entry.scenario + '</span>' : '',
              entry.error_details && entry.error_details.error_type ? '<span class="timeline-pill error">' + entry.error_details.error_type + '</span>' : ''
            ].join('');
          }

          async function loadLogs() {
            const query = buildQuery();
            syncUrl(query);

            const response = await fetch(apiBase + '/logs?' + query.toString());
            const body = await response.json();

            rows.innerHTML = body.entries.map((entry) => {
              const errorDetails = entry.error_details ? JSON.stringify(entry.error_details) : '';
              return [
                '<tr>',
                '<td>' + (entry['@timestamp'] || '') + '</td>',
                '<td>' + (entry.level || '') + '</td>',
                '<td>' + (entry.service_name || '') + '</td>',
                '<td>' + (entry.trace_id || '') + '</td>',
                '<td>' + (entry.event_action || '') + '</td>',
                '<td>' + (entry.message || '') + '</td>',
                '<td>' + errorDetails + '</td>',
                '</tr>'
              ].join('');
            }).join('') || '<tr><td colspan="7">No hay logs para esos filtros.</td></tr>';
          }

          async function loadTimeline() {
            const query = buildQuery();

            const response = await fetch(apiBase + '/timeline?' + query.toString());
            const body = await response.json();

            timelineList.innerHTML = body.entries.map((entry) => {
              const errorSummary = entry.error_details ? JSON.stringify(entry.error_details) : '';
              return '<article class="timeline-item">' +
                '<div class="timeline-top">' +
                '<strong>' + entry.service_name + '</strong>' +
                '<span>' + entry.level + '</span>' +
                '<small>' + entry.timestamp + '</small>' +
                '</div>' +
                '<div class="timeline-meta">' + renderTimelinePills(entry) + '</div>' +
                '<p>' + entry.message + '</p>' +
                '<code>' + entry.trace_id + ' · ' + entry.event_action + '</code>' +
                (errorSummary ? '<pre>' + errorSummary + '</pre>' : '') +
                '</article>';
            }).join('') || '<div class="timeline-empty">No hay eventos para mostrar.</div>';
          }

          async function loadSummary() {
            const query = buildQuery();
            const response = await fetch(apiBase + '/summary?' + query.toString());
            const body = await response.json();

            summaryTotal.textContent = body.total || 0;
            summaryErrors.textContent = ((body.levels && (body.levels.ERROR || 0)) + (body.levels && (body.levels.FATAL || 0)) || 0);
            summaryServices.textContent = Object.keys(body.services || {}).length;
            summaryTrace.textContent = body.latestTrace || '-';
            summaryRootCause.textContent = body.rootCause || 'Aun no hay datos para resumir.';
          }

          async function loadFiles() {
            const response = await fetch(apiBase + '/files');
            const body = await response.json();

            filesList.innerHTML = body.files.map((file) => {
              return '<span class="file-chip">' + file.file + ' · ' + file.size + ' bytes</span>';
            }).join('') || '<div class="timeline-empty">Aun no hay archivos de log.</div>';
          }

          function refreshAll() {
            loadLogs();
            loadTimeline();
            loadFiles();
            loadSummary();
          }

          document.getElementById('searchButton').addEventListener('click', loadLogs);
          document.getElementById('timelineButton').addEventListener('click', loadTimeline);
          refreshAll();
          setInterval(refreshAll, 3000);
        </script>
      </body>
    </html>
  `);
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`observability service listening on ${port}`);
});
