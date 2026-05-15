const express = require('express');
const cors = require('cors');
require('dotenv').config();

const queryRoute = require('./src/routes/query');
const uploadRoute = require('./src/routes/upload');

const app = express();

app.use(cors({
  origin: [
    'http://localhost:3000',
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