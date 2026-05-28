const { createLogger, createSpanId, createTraceId } = require('./logger');
const { getPool, waitForDatabase } = require('./db');

const serviceName = process.env.SERVICE_NAME || 'payments-microservice';
const logDir = process.env.LOG_DIR || '/app/logs';
const kafkaUrl = process.env.KAFKA_URL || 'http://kafka:3002';
const kafkaTopic = process.env.KAFKA_TOPIC || 'transfer-events';
const logger = createLogger(serviceName, logDir);
let lastSeenId = 0;

function parseEvent(message) {
  try {
    return JSON.parse(message.value.toString('utf8'));
  } catch (_error) {
    return null;
  }
}

async function processTransfer(event) {
  const pool = getPool();
  const auditOperation = event.scenario === 'db'
    ? 'insert payment_audit with missing beneficiary_account'
    : 'insert payment_audit with beneficiary_account';

  if (event.event_action !== 'transfer.created') {
    const unsupportedError = new Error(`Unsupported event_action: ${event.event_action}`);
    unsupportedError.name = 'UnsupportedEventError';
    throw unsupportedError;
  }

  await pool.query('begin');

  try {
    await pool.query(
      'insert into transfers (id, trace_id, user_id, source_account, target_account, amount, status) values ($1, $2, $3, $4, $5, $6, $7)',
      [
        createTraceId(),
        event.trace_id,
        event.user_id,
        event.source_account,
        event.target_account,
        event.amount,
        'processing'
      ]
    );

    if (event.scenario === 'db') {
      await pool.query(
        'insert into payment_audit (id, trace_id, source_account, target_account, amount, status) values ($1, $2, $3, $4, $5, $6)',
        [
          createTraceId(),
          event.trace_id,
          event.source_account,
          event.target_account,
          event.amount,
          'queued'
        ]
      );
    } else {
      await pool.query(
        'insert into payment_audit (id, trace_id, source_account, beneficiary_account, amount, status) values ($1, $2, $3, $4, $5, $6)',
        [
          createTraceId(),
          event.trace_id,
          event.source_account,
          event.target_account,
          event.amount,
          'queued'
        ]
      );
    }

    await pool.query('update transfers set status = $1 where trace_id = $2', ['completed', event.trace_id]);
    await pool.query('commit');

    logger.info('Transfer processed successfully', {
      trace_id: event.trace_id,
      span_id: createSpanId(),
      event_action: 'payment_completed',
      operation: auditOperation,
      amount: event.amount,
      scenario: event.scenario
    });
  } catch (error) {
    await pool.query('rollback').catch(() => undefined);
    throw error;
  }
}

async function handleMessage(message) {
  const event = parseEvent(message);
  if (!event) {
    logger.fatal('Malformed Kafka message received', {
      trace_id: createTraceId(),
      span_id: createSpanId(),
      event_action: 'malformed_message',
      error_details: {
        error_type: 'ParseError',
        file: 'payments-worker/src/worker.js',
        line: 19,
        message: 'Kafka message could not be parsed as JSON'
      }
    });
    return;
  }

  logger.info('Kafka event received', {
    trace_id: event.trace_id,
    span_id: createSpanId(),
    event_action: 'kafka_event_received',
    operation: event.event_action,
    scenario: event.scenario,
    topic: kafkaTopic
  });

  try {
    await processTransfer(event);
  } catch (error) {
    const errorType = error?.name || 'Error';
    logger.fatal('Payments microservice failed to process transfer', {
      trace_id: event.trace_id,
      span_id: createSpanId(),
      event_action: 'payment_failure',
      operation: auditOperation,
      scenario: event.scenario,
      error_details: {
        error_type: errorType,
        table: 'payment_audit',
        operation: auditOperation,
        file: 'payments-worker/src/worker.js',
        line: errorType === 'UnsupportedEventError' ? 27 : event.scenario === 'db' ? 58 : 42,
        message: error?.message || 'Unknown payment failure'
      }
    });
  }
}

async function pollBroker() {
  const response = await fetch(`${kafkaUrl}/topics/${kafkaTopic}/messages?after=${lastSeenId}`);

  if (!response.ok) {
    throw new Error(`Kafka broker returned ${response.status}`);
  }

  const body = await response.json();

  for (const message of body.messages) {
    lastSeenId = Math.max(lastSeenId, message.id);
    await handleMessage({
      value: Buffer.from(message.value),
      key: message.key,
      headers: message.headers
    });
  }
}

async function boot() {
  await waitForDatabase();

  setInterval(() => {
    pollBroker().catch((error) => {
      logger.warn('Kafka broker poll failed', {
        trace_id: createTraceId(),
        span_id: createSpanId(),
        event_action: 'broker_poll_failed',
        error_details: {
          error_type: error?.name || 'Error',
          file: 'payments-worker/src/worker.js',
          line: 113,
          message: error?.message || 'Unknown poll failure'
        }
      });
    });
  }, 1500);

  logger.info('Payments worker ready', {
    trace_id: createTraceId(),
    span_id: createSpanId(),
    event_action: 'service_ready',
    topic: kafkaTopic
  });
}

async function startWithRetry() {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      await boot();
      return;
    } catch (error) {
      logger.warn('Payments worker bootstrap retry scheduled', {
        trace_id: createTraceId(),
        span_id: createSpanId(),
        event_action: 'bootstrap_retry',
        attempt,
        error_details: {
          error_type: error?.name || 'Error',
          file: 'payments-worker/src/worker.js',
          line: 151,
          message: error?.message || 'Unknown bootstrap failure'
        }
      });

      if (attempt === 20) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

startWithRetry().catch((error) => {
  logger.fatal('Payments worker failed to boot', {
    trace_id: createTraceId(),
    span_id: createSpanId(),
    event_action: 'service_boot_failure',
    error_details: {
      error_type: error?.name || 'Error',
      file: 'payments-worker/src/worker.js',
      line: 173,
      message: error?.message || 'Unknown boot failure'
    }
  });
  process.exit(1);
});
