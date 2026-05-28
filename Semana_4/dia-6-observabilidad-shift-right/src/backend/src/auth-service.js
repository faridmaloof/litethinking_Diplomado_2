const express = require('express');
const { createLogger, createSpanId, createTraceId } = require('./logger');
const { getPool, waitForDatabase } = require('./db');

const serviceName = process.env.SERVICE_NAME || 'auth-service';
const logDir = process.env.LOG_DIR || '/app/logs';
const logger = createLogger(serviceName, logDir);
const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: serviceName });
});

app.post('/internal/verify', async (req, res) => {
  const traceId = req.header('x-trace-id') || req.body.trace_id || createTraceId();
  const spanId = createSpanId();
  const userId = req.body.user_id;

  logger.info('Auth verification started', {
    trace_id: traceId,
    span_id: spanId,
    event_action: 'auth_verify_started',
    user_id: userId
  });

  if (!userId) {
    logger.warn('Auth request missing user_id', {
      trace_id: traceId,
      span_id: createSpanId(),
      event_action: 'auth_validation_error',
      file: 'auth-service/src/auth-service.js',
      line: 25
    });

    return res.status(400).json({ message: 'user_id is required', trace_id: traceId });
  }

  try {
    await waitForDatabase();
    const pool = getPool();
    const query = await pool.query(
      'select id, username, full_name from users where username = $1 limit 1',
      [userId]
    );

    if (query.rowCount === 0) {
      logger.error('User not found during auth verification', {
        trace_id: traceId,
        span_id: createSpanId(),
        event_action: 'auth_user_not_found',
        user_id: userId,
        error_details: {
          error_type: 'RecordNotFound',
          file: 'auth-service/src/auth-service.js',
          line: 40,
          message: `No user named ${userId} exists in the database`
        }
      });

      return res.status(404).json({ message: 'User not found', trace_id: traceId });
    }

    logger.info('Auth verification succeeded', {
      trace_id: traceId,
      span_id: createSpanId(),
      event_action: 'auth_verify_succeeded',
      user_id: userId
    });

    return res.json({
      status: 'verified',
      trace_id: traceId,
      user: query.rows[0]
    });
  } catch (error) {
    logger.fatal('Auth service failed', {
      trace_id: traceId,
      span_id: createSpanId(),
      event_action: 'auth_failure',
      error_details: {
        error_type: error?.name || 'Error',
        file: 'auth-service/src/auth-service.js',
        line: 58,
        message: error?.message || 'Unknown auth failure'
      }
    });

    return res.status(500).json({ message: 'Auth service failure', trace_id: traceId });
  }
});

async function boot() {
  await waitForDatabase().catch(() => undefined);
  const port = Number(process.env.PORT || 3001);

  app.listen(port, () => {
    logger.info('Auth service ready', {
      trace_id: createTraceId(),
      span_id: createSpanId(),
      event_action: 'service_ready',
      port
    });
  });
}

boot().catch((error) => {
  logger.fatal('Auth service failed to boot', {
    trace_id: createTraceId(),
    span_id: createSpanId(),
    event_action: 'service_boot_failure',
    error_details: {
      error_type: error?.name || 'Error',
      file: 'auth-service/src/auth-service.js',
      line: 91,
      message: error?.message || 'Unknown boot failure'
    }
  });
  process.exit(1);
});
