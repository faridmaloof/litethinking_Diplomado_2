const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5
    });
  }

  return pool;
}

async function waitForDatabase(maxAttempts = 20, delayMs = 1500) {
  const db = getPool();

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await db.query('select 1');
      return true;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return false;
}

module.exports = {
  getPool,
  waitForDatabase
};
