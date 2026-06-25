require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET not set. Copy .env.example to .env and configure it.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const storeRoutes = require('./routes/stores');
const aiRoutes = require('./routes/ai');
const userModel = require('./models/user');
const { startCleanupJob } = require('./services/cleanup');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/ai', aiRoutes);

// /api/users/me — delegated to stores router via /user/me alias
// Re-expose at the correct path
const authMiddleware = require('./middleware/auth');
app.get('/api/users/me', authMiddleware, (req, res) => {
  const user = userModel.findById(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const usage = userModel.getUsage(req.user.userId);
  res.json({
    username: user.email,
    email: user.email,
    max_stores: user.max_stores,
    max_storage: user.max_storage_gi,
    current_stores: usage.store_count,
    current_storage: usage.total_storage_gi,
  });
});

app.listen(PORT, () => {
  console.log(`KubeCart backend running on http://localhost:${PORT}`);
  startCleanupJob();
});
