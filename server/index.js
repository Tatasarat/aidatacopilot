const express = require('express');
const cors = require('cors');
require('dotenv').config();

const queryRoute = require('./src/routes/query');
const uploadRoute = require('./src/routes/upload');
const authRoute = require('./src/routes/auth');

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(cors());
app.use(express.json());

app.use('/api', authRoute);
app.use('/api', uploadRoute);
app.use('/api', queryRoute);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});