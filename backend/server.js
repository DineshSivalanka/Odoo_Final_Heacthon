const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check with DB ping
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', message: 'Mini ERP API is running', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'DB connection failed', error: err.message });
  }
});

// Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/products',      require('./routes/products'));
app.use('/api/sales',         require('./routes/sales'));
app.use('/api/purchase',      require('./routes/purchase'));
app.use('/api/manufacturing', require('./routes/manufacturing'));
app.use('/api/dashboard',     require('./routes/dashboard'));

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
