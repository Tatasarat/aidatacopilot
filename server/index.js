const express = require('express');
const cors = require('cors');
require('dotenv').config();

const queryRoute = require('./src/routes/query');
const uploadRoute = require('./src/routes/upload');

const app = express();

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://aidatacopilot-qqy5.vercel.app',
    'https://aidatacopilot-qqy5-7vcr8hfs6-tata-sarats-projects.vercel.app',
    process.env.CLIENT_URL
  ],
  credentials: true
}));

app.use(express.json());
app.use('/api', uploadRoute);
app.use('/api', queryRoute);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});