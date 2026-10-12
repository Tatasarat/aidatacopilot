'use strict';
const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { HttpError, asyncHandler } = require('../middleware/errors');
const { uploadLimiter } = require('../middleware/rateLimits');
const ingest = require('../analytics/ingest');
const repo = require('../analytics/repo');
const { generateSample } = require('../sample/sampleData');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

const TYPES = ['orders', 'products'];

// Public: the CSV templates contain only example rows.
router.get('/data/template/:type', (req, res) => {
  const { type } = req.params;
  if (!TYPES.includes(type)) throw new HttpError(404, 'Unknown template.');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${type}-template.csv"`);
  res.send(type === 'orders' ? ingest.ORDERS_TEMPLATE : ingest.PRODUCTS_TEMPLATE);
});

router.get('/data/status', requireAuth, asyncHandler(async (req, res) => {
  res.json(await repo.status(req.user.id));
}));

router.post('/data/upload/:type', requireAuth, uploadLimiter, upload.single('file'), asyncHandler(async (req, res) => {
  const { type } = req.params;
  if (!TYPES.includes(type)) throw new HttpError(404, 'Unknown upload type.');
  if (!req.file) throw new HttpError(400, 'Choose a CSV file to upload.');
  if (!/\.(csv|txt)$/i.test(req.file.originalname)) throw new HttpError(400, 'Upload a .csv file.');

  let result;
  try {
    result = ingest.ingestCsv(type, req.file.buffer.toString('utf-8'));
  } catch (err) {
    if (err instanceof ingest.IngestError) throw new HttpError(400, err.message, { details: err.details });
    throw err;
  }

  if (!ingest.isAcceptable(result)) {
    throw new HttpError(
      400,
      result.rowsValid === 0
        ? 'None of the rows could be used, so nothing was changed.'
        : 'More than 20% of the rows have problems, so nothing was changed. Fix the rows below and upload again.',
      { errors: result.errors, error_count: result.errorCount, rows_read: result.rowsRead }
    );
  }

  const rejected = result.rowsRead - result.rowsValid;
  await repo.replaceData(req.user.id, type, result.valid, { fileName: req.file.originalname.slice(0, 200), rejected });

  res.json({
    success: true,
    type,
    rows_read: result.rowsRead,
    rows_accepted: result.rowsValid,
    rows_rejected: rejected,
    errors: result.errors,
    error_count: result.errorCount,
    warnings: result.warnings,
    message: `Loaded ${result.rowsValid.toLocaleString('en-US')} ${type === 'orders' ? 'order lines' : 'products'}.`,
  });
}));

router.post('/data/sample', requireAuth, uploadLimiter, asyncHandler(async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const { orders, products } = generateSample(today);
  await repo.replaceBoth(req.user.id, orders, products, 'sample-store');
  res.json({ success: true, message: `Loaded a sample store with ${orders.length.toLocaleString('en-US')} order lines. You can delete it any time.`, orders: orders.length, products: products.length });
}));

router.delete('/data', requireAuth, asyncHandler(async (req, res) => {
  await repo.deleteAll(req.user.id);
  res.json({ success: true, message: 'Your store data and question history were deleted.' });
}));

module.exports = router;
