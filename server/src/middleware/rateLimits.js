'use strict';
const rateLimit = require('express-rate-limit');

const make = (windowMs, max, error) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error },
  });

const MIN = 60 * 1000;

module.exports = {
  apiLimiter: make(15 * MIN, 600, 'Too many requests. Please slow down and try again shortly.'),
  authLimiter: make(15 * MIN, 30, 'Too many sign-in attempts. Please wait a few minutes and try again.'),
  otpLimiter: make(15 * MIN, 8, 'Too many code requests. Please wait a few minutes and try again.'),
  askLimiter: make(10 * MIN, 40, 'You are asking questions very quickly. Please wait a moment.'),
  uploadLimiter: make(15 * MIN, 30, 'Too many uploads. Please wait a few minutes and try again.'),
  emailLimiter: make(60 * MIN, 6, 'You have sent several reports already. Please try again in an hour.'),
};
