const express = require('express');
const { createLogger, createSpanId, createTraceId } = require('./logger');
const { waitForDatabase } = require('./db');

const serviceName = process.env.SERVICE_NAME || 'api-gateway';
const logDir = process.env.LOG_DIR || '/app/logs';
const authUrl = process.env.AUTH_URL || 'http://auth-service:3001';
const kafkaUrl = process.env.KAFKA_URL || 'http://kafka:3002';
const kafkaTopic = process.env.KAFKA_TOPIC || 'transfer-events';

const logger = createLogger(serviceName, logDir);
const app = express();
app.use(express.json());

async function callAuthService({ traceId, userId }) {
  const response = await fetch(`${authUrl}/internal/verify`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-trace-id': traceId
    },
    body: JSON.stringify({ trace_id: traceId, user_id: userId })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Auth service returned ${response.status}`);
  }

  return response.json();
}

async function publishToBroker(event) {
  const response = await fetch(`${kafkaUrl}/topics/${kafkaTopic}/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      key: event.trace_id,
      value: JSON.stringify(event),
      headers: {
        trace_id: event.trace_id,
        span_id: event.span_id,
        scenario: event.scenario
      }
    })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Kafka broker returned ${response.status}`);
  }

  return response.json();
}

function buildObservabilityUrl(traceId) {
  return `http://localhost:8080/observability/?trace_id=${encodeURIComponent(traceId)}`;
}

function calculateRiskFee(payload) {
  const feeConfig = payload.feeConfig;
  return Number(feeConfig.rate.toFixed(2));
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: serviceName });
});

app.post('/api/client-events', (req, res) => {
  const traceId = req.header('x-trace-id') || req.body.trace_id || createTraceId();
  const spanId = createSpanId();
  logger.info('Frontend event captured', {
    trace_id: traceId,
    span_id: spanId,
    event_action: req.body.event_action || 'frontend_event',
    service_name: 'frontend-web',
    payload: req.body.payload || {},
    scenario: req.body.scenario || 'unknown'
  });

  res.json({ status: 'recorded', trace_id: traceId, span_id: spanId });
});

app.post('/api/transfers', async (req, res) => {
  const traceId = req.header('x-trace-id') || req.body.trace_id || createTraceId();
  const requestSpan = createSpanId();
  const scenario = req.body.scenario || 'happy';
  const payload = {
    user_id: req.body.user_id || 'Juan_123',
    source_account: req.body.source_account,
    target_account: req.body.target_account,
    amount: Number(req.body.amount),
    scenario
  };

  logger.info('Transfer request received', {
    trace_id: traceId,
    span_id: requestSpan,
    event_action: 'transfer_received',
    scenario,
    payload
  });

  if (!payload.target_account) {
    logger.warn('Frontend omitted target_account in request payload', {
      trace_id: traceId,
      span_id: createSpanId(),
      event_action: 'frontend_validation_error',
      service_name: 'frontend-web',
      file: 'frontend/src/main.js',
      line: 62,
      missing_field: 'target_account',
      payload
    });

    return res.status(400).json({
      status: 'rejected',
      trace_id: traceId,
      message: 'target_account is required',
      observability_url: buildObservabilityUrl(traceId)
    });
  }

  try {
    await callAuthService({ traceId, userId: payload.user_id });

    if (scenario === 'backend') {
      const fee = calculateRiskFee(payload);
      logger.info('Risk fee calculated', {
        trace_id: traceId,
        span_id: createSpanId(),
        event_action: 'risk_fee_calculated',
        fee
      });
    }

    const eventAction = scenario === 'kafka' ? 'transfer.unknown_handler' : 'transfer.created';
    const event = {
      event_action: eventAction,
      trace_id: traceId,
      span_id: createSpanId(),
      user_id: payload.user_id,
      source_account: payload.source_account,
      target_account: payload.target_account,
      amount: payload.amount,
      scenario,
      created_at: new Date().toISOString()
    };

    await publishToBroker(event);

    logger.info('Event published to Kafka', {
      trace_id: traceId,
      span_id: createSpanId(),
      event_action: 'kafka_publish',
      topic: kafkaTopic,
      scenario
    });

    return res.status(202).json({
      status: 'accepted',
      trace_id: traceId,
      span_id: requestSpan,
      scenario,
      message: 'Transfer accepted for asynchronous processing',
      observability_url: buildObservabilityUrl(traceId)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown gateway failure';
    logger.fatal('Gateway failure while processing transfer', {
      trace_id: traceId,
      span_id: createSpanId(),
      event_action: 'gateway_failure',
      scenario,
      error_details: {
        error_type: error?.name || 'Error',
        file: 'backend/src/index.js',
        line: 104,
        message
      }
    });

    return res.status(500).json({
      status: 'error',
      trace_id: traceId,
      message,
      observability_url: buildObservabilityUrl(traceId)
    });
  }
});

async function boot() {
  await waitForDatabase().catch(() => undefined);

  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    logger.info('API gateway ready', {
      trace_id: createTraceId(),
      span_id: createSpanId(),
      event_action: 'service_ready',
      port
    });
  });
}

boot().catch((error) => {
  logger.fatal('API gateway failed to boot', {
    trace_id: createTraceId(),
    span_id: createSpanId(),
    event_action: 'service_boot_failure',
    error_details: {
      error_type: error?.name || 'Error',
      file: 'backend/src/index.js',
      line: 172,
      message: error?.message || 'Unknown boot failure'
    }
  });
  process.exit(1);
});
