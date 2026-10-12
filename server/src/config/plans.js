'use strict';

/**
 * Single source of truth for plans. Amounts are in paise (Razorpay's smallest unit).
 * Credits are spent only by "Ask AI" questions. The dashboard and weekly report are free.
 * Plan ids ("pro", "enterprise") match what is already stored in your database.
 */
const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    amount: 0,
    credits: 10,
    unlimited: false,
    blurb: '10 AI questions a month, full dashboard and weekly report',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    amount: 99900,
    credits: 100,
    unlimited: false,
    blurb: '100 AI questions a month, full dashboard and weekly report',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Business',
    amount: 499900,
    credits: 999999,
    unlimited: true,
    blurb: 'Unlimited AI questions, full dashboard and weekly report',
  },
};

const PAID_PLAN_IDS = Object.values(PLANS).filter((p) => p.amount > 0).map((p) => p.id);

module.exports = { PLANS, PAID_PLAN_IDS };
