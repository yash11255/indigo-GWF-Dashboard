// Vercel serverless entry point for the backend project.
// Loaded from pre-built data/cache.json on cold start (~50ms).

const path = require('path');
const { loadData } = require('../src/utils/dataLoader');
const app = require('../src/app');

let initialized = false;

module.exports = (req, res) => {
  if (!initialized) {
    loadData();
    initialized = true;
  }
  return app(req, res);
};
