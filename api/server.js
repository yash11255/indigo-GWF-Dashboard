// Vercel serverless entry point — wraps the Express app.
// Pre-built JSON cache is loaded on cold start (~50ms).

const { loadData } = require('../server/src/utils/dataLoader');
const app = require('../server/src/app');

// Load cached data on first invocation (fast — reads JSON not Excel)
let initialized = false;
const _originalHandler = app;

module.exports = (req, res) => {
  if (!initialized) {
    loadData();
    initialized = true;
  }
  return _originalHandler(req, res);
};
