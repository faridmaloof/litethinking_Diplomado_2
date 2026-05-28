const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');

function createTraceId() {
  return `trace-${randomBytes(5).toString('hex')}`;
}

function createSpanId() {
  return `span-${randomBytes(4).toString('hex')}`;
}

function createLogger(serviceName, logDir) {
  fs.mkdirSync(logDir, { recursive: true });
  const filePath = path.join(logDir, `${serviceName}.jsonl`);

  function write(level, message, fields = {}) {
    const entry = {
      '@timestamp': new Date().toISOString(),
      level: level.toUpperCase(),
      service_name: fields.service_name || serviceName,
      trace_id: fields.trace_id || createTraceId(),
      span_id: fields.span_id || createSpanId(),
      event_action: fields.event_action || 'log',
      message
    };

    const extraFields = { ...fields };
    delete extraFields.service_name;
    delete extraFields.trace_id;
    delete extraFields.span_id;
    delete extraFields.event_action;
    delete extraFields.message;

    const fullEntry = { ...entry, ...extraFields };
    fs.appendFileSync(filePath, `${JSON.stringify(fullEntry)}\n`);
    console.log(JSON.stringify(fullEntry));
    return fullEntry;
  }

  return {
    debug: (message, fields) => write('DEBUG', message, fields),
    info: (message, fields) => write('INFO', message, fields),
    warn: (message, fields) => write('WARN', message, fields),
    error: (message, fields) => write('ERROR', message, fields),
    fatal: (message, fields) => write('FATAL', message, fields)
  };
}

module.exports = {
  createLogger,
  createSpanId,
  createTraceId
};
