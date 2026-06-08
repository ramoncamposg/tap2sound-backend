const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'tap2sound backend is running' });
});

// Welcome endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to tap2sound backend',
    version: '1.0.0',
    endpoints: {
      health: '/health'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
