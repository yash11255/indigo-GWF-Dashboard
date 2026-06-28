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
