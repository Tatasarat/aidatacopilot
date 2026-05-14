const express = require('express');
const router = express.Router();
const { generateSQL } = require('../chains/sqlChain');
const { detectAnomalies } = require('../chains/anomalyChain');
const { explainResults } = require('../chains/explainChain');
const { pool } = require('../db/postgres');

router.post('/query', async (req, res) => {
  const { question, tableName } = req.body;
  if (!question) return res.status(400).json({ error: 'No question provided' });
  if (!tableName) return res.status(400).json({ error: 'No table. Please upload a CSV first.' });

  try {
    const sql = await generateSQL(question, tableName);
    console.log('Generated SQL:', sql);

    const { rows } = await pool.query(sql);
    console.log('Rows returned:', rows.length);

    const anomalies = await detectAnomalies(question, sql, rows);
    const explanation = await explainResults(question, rows, anomalies);

    res.json({ sql, results: rows, anomalies, explanation });

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;