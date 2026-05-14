const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { loadCSVIntoTable } = require('../db/postgres');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const content = req.file.buffer.toString('utf-8');

    const rows = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,         // handles weird quotes
      relax_column_count: true,   // handles uneven columns
      quote: '"',
      escape: '"',
    });

    if (!rows.length) return res.status(400).json({ error: 'CSV file is empty' });

    console.log(`Parsed ${rows.length} rows, columns:`, Object.keys(rows[0]));

    const tableName = 'csv_data';
    const columns = await loadCSVIntoTable(tableName, rows);

    res.json({
      success: true,
      tableName,
      columns,
      rowCount: rows.length,
      preview: rows.slice(0, 5),
    });

  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;