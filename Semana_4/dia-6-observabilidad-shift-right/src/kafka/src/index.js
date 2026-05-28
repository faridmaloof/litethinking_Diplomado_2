const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const dataDir = process.env.DATA_DIR || '/app/data';
const storeFile = path.join(dataDir, 'topics.json');

fs.mkdirSync(dataDir, { recursive: true });

function readStore() {
  if (!fs.existsSync(storeFile)) {
    return { lastId: 0, topics: {} };
  }

  return JSON.parse(fs.readFileSync(storeFile, 'utf8'));
}

function writeStore(store) {
  fs.writeFileSync(storeFile, JSON.stringify(store, null, 2));
}

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'kafka-broker' });
});

app.post('/topics/:topic/messages', (req, res) => {
  const store = readStore();
  const topic = req.params.topic;
  const entry = {
    id: store.lastId + 1,
    key: req.body.key || null,
    value: req.body.value || '',
    headers: req.body.headers || {},
    created_at: new Date().toISOString()
  };

  store.lastId = entry.id;
  if (!store.topics[topic]) {
    store.topics[topic] = [];
  }

  store.topics[topic].push(entry);
  writeStore(store);

  res.status(201).json({ status: 'queued', topic, message_id: entry.id });
});

app.get('/topics/:topic/messages', (req, res) => {
  const store = readStore();
  const topic = req.params.topic;
  const after = Number(req.query.after || 0);
  const messages = (store.topics[topic] || []).filter((message) => message.id > after);

  res.json({ topic, messages });
});

app.post('/topics/:topic/reset', (req, res) => {
  const store = readStore();
  store.topics[req.params.topic] = [];
  writeStore(store);
  res.json({ status: 'reset', topic: req.params.topic });
});

const port = Number(process.env.PORT || 3002);
app.listen(port, () => {
  console.log(`kafka broker listening on ${port}`);
});
