require('dotenv').config();
const app  = require('./src/app');
const { loadData } = require('./src/utils/dataLoader');

const PORT = process.env.PORT || 4001;

// Reload endpoint (local dev only)
app.post('/api/reload', (req, res) => {
  loadData();
  res.json({ message: 'Data reloaded' });
});

loadData();

app.listen(PORT, () => {
  console.log(`\n🚀 IndiGo Scholarship Dashboard`);
  console.log(`   Server: http://localhost:${PORT}`);
  console.log(`   Login:  admin / indigo@2026\n`);
});
