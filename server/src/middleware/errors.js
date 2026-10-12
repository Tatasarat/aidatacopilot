'use strict';

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

/** Wrap async route handlers so rejected promises reach the error handler. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...err.extra });
  }
  // Upload problems from multer
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'That file is too large. The limit is 10 MB.' });
  }
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ error: 'The upload could not be read. Send a single CSV file.' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'The request is too large.' });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'The request body is not valid JSON.' });
  }
  // Never send internal details to the browser; log them for yourself.
  console.error(`[${req.method} ${req.originalUrl}]`, err && err.stack ? err.stack : err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
}

module.exports = { HttpError, asyncHandler, notFound, errorHandler };
