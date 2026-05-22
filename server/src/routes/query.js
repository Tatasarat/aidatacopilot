const express = require('express');
const router = express.Router();
const { generateSQL } = require('../chains/sqlChain');
const { pool } = require('../db/postgres');
const https = require('https');
const http = require('http');

const PYTHON_URL = process.env.PYTHON_AI_URL || 'http://localhost:8000';

function callPythonAPI(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const url = new URL(PYTHON_URL + path);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = lib.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(responseBody)); }
        catch (e) { reject(new Error('Invalid JSON from Python service')); }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

router.post('/query', async (req, res) => {
  const { question, tableName, email } = req.body;
  if (!question) return res.status(400).json({ error: 'No question provided' });
  if (!tableName) return res.status(400).json({ error: 'No table. Please upload a CSV first.' });

  try {
    // Check credits
    if (email) {
      const creditCheck = await pool.query('SELECT * FROM user_credits WHERE email = $1', [email]);
      if (creditCheck.rows.length) {
        const credits = creditCheck.rows[0];
        if (credits.plan !== 'enterprise' && credits.credits_used >= credits.credits_limit) {
          return res.status(403).json({
            error: 'Credit limit reached',
            upgrade_required: true,
            plan: credits.plan,
            credits_used: credits.credits_used,
            credits_limit: credits.credits_limit
          });
        }
        // Use one credit
        await pool.query('UPDATE user_credits SET credits_used = credits_used + 1 WHERE email = $1', [email]);
      }
    }

    // Generate SQL
    const sql = await generateSQL(question, tableName);
    console.log('Generated SQL:', sql);

    // Run SQL
    const { rows } = await pool.query(sql);
    console.log('Rows returned:', rows.length);

    // Python AI analysis
    let aiAnalysis = null;
    try {
      aiAnalysis = await callPythonAPI('/analyze', {
        table_name: tableName,
        question,
        data: rows
      });
    } catch (pyErr) {
      console.error('Python AI error:', pyErr.message);
    }

    res.json({
      sql,
      results: rows,
      anomalies: aiAnalysis?.anomalies?.summary || '',
      anomaly_details: aiAnalysis?.anomalies?.details || [],
      explanation: aiAnalysis?.explanation || `Query returned ${rows.length} rows.`,
      stats: aiAnalysis?.stats || {},
      trends: aiAnalysis?.trends || [],
      correlations: aiAnalysis?.correlations || [],
      clusters: aiAnalysis?.clusters || []
    });

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/full-report', async (req, res) => {
  const { tableName } = req.body;
  if (!tableName) return res.status(400).json({ error: 'No table name' });
  try {
    const { rows } = await pool.query(`SELECT * FROM "${tableName}" LIMIT 1000`);
    const report = await callPythonAPI('/full-report', {
      table_name: tableName,
      question: 'full report',
      data: rows
    });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;