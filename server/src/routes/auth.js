const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const USERS = [
  {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'indigo@2026',
    name: 'Administrator',
    role: 'admin',
  },
  {
    username: process.env.CLIENT_USERNAME || 'client',
    password: process.env.CLIENT_PASSWORD || 'client@2026',
    name: 'Client View',
    role: 'client',
  },
];

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = USERS.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { username: user.username, name: user.name, role: user.role },
    process.env.JWT_SECRET || 'indigo-wings-secret-key-2026',
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: { username: user.username, name: user.name, role: user.role },
  });
});

module.exports = router;
