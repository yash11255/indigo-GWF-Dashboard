const express = require('express');
const cors    = require('cors');

const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');

const app = express();

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:4001'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // same-origin / curl / mobile
    if (allowedOrigins.some(o => origin === o || origin.endsWith(o.replace(/^https?:\/\//, '')))) return cb(null, true);
    if (/\.vercel\.app$/.test(origin)) return cb(null, true); // all Vercel preview URLs
    cb(null, true); // permissive — API is behind JWT anyway
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root — confirms the API is live (visited in browser or health checks)
app.get('/', (req, res) => {
  res.json({ service: 'IndiGo GWF Dashboard API', status: 'ok', version: '1.0.0' });
});

// 404 only for /api routes — non-API routes fall through (SPA or desktop catch-all)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found', method: req.method, path: req.path });
});

module.exports = app;
