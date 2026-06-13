const express = require('express');
const router = express.Router();
const { pool } = require('../db/postgres');
const multer = require('multer');
const { parse } = require('csv-parse/sync');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// ── Create Tables ─────────────────────────────────────────
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketplace_resources (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      type TEXT NOT NULL,
      price_credits INTEGER DEFAULT 0,
      is_free BOOLEAN DEFAULT true,
      file_name TEXT,
      file_size INTEGER,
      file_data BYTEA,
      preview_data JSONB,
      tags TEXT[],
      submitted_by TEXT NOT NULL,
      approved BOOLEAN DEFAULT false,
      downloads INTEGER DEFAULT 0,
      rows_count INTEGER DEFAULT 0,
      format TEXT DEFAULT 'csv',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketplace_downloads (
      id SERIAL PRIMARY KEY,
      resource_id INTEGER NOT NULL,
      user_email TEXT NOT NULL,
      credits_spent INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(resource_id, user_email)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketplace_earnings (
      id SERIAL PRIMARY KEY,
      submitter_email TEXT NOT NULL,
      resource_id INTEGER NOT NULL,
      credits_earned INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

// ── Seed some default resources ───────────────────────────
async function seedDefaultResources() {
  const count = await pool.query('SELECT COUNT(*) FROM marketplace_resources');
  if (parseInt(count.rows[0].count) > 0) return;

  const defaults = [
    { title: 'Global COVID-19 Dataset', description: 'Comprehensive COVID-19 statistics from 195 countries including cases, deaths, vaccinations from 2020-2023.', category: 'Healthcare', type: 'dataset', price_credits: 0, is_free: true, file_name: 'covid19_global.csv', file_size: 2400000, tags: ['covid', 'health', 'global'], submitted_by: 'InsightAI', approved: true, downloads: 1240, rows_count: 85000, format: 'csv' },
    { title: 'S&P 500 Stock Prices 2010-2023', description: 'Daily stock prices, volume, and market cap for all S&P 500 companies over 13 years.', category: 'Finance', type: 'dataset', price_credits: 15, is_free: false, file_name: 'sp500_prices.csv', file_size: 18000000, tags: ['stocks', 'finance', 'market'], submitted_by: 'InsightAI', approved: true, downloads: 892, rows_count: 420000, format: 'csv' },
    { title: 'IPL Cricket Matches 2008-2023', description: 'Complete IPL match data including scores, players, venues, and results for all seasons.', category: 'Sports', type: 'dataset', price_credits: 0, is_free: true, file_name: 'ipl_matches.csv', file_size: 1200000, tags: ['cricket', 'ipl', 'sports'], submitted_by: 'InsightAI', approved: true, downloads: 2100, rows_count: 12000, format: 'csv' },
    { title: 'E-commerce Customer Behavior', description: 'Customer purchase history, browsing patterns, and demographic data from a major e-commerce platform.', category: 'E-commerce', type: 'dataset', price_credits: 20, is_free: false, file_name: 'ecommerce_behavior.csv', file_size: 8500000, tags: ['ecommerce', 'customer', 'behavior'], submitted_by: 'InsightAI', approved: true, downloads: 567, rows_count: 150000, format: 'csv' },
    { title: 'AI & Machine Learning Research 2024', description: 'Curated collection of 500+ ML research papers with abstracts, citations, and key findings from top conferences.', category: 'Education', type: 'research', price_credits: 25, is_free: false, file_name: 'ml_research_2024.pdf', file_size: 45000000, tags: ['AI', 'ML', 'research', 'papers'], submitted_by: 'InsightAI', approved: true, downloads: 340, rows_count: 0, format: 'pdf' },
    { title: 'Weekly AI Industry Newsletter', description: 'Latest developments in AI, startup funding, product launches, and market analysis. Updated weekly.', category: 'Technology', type: 'newsletter', price_credits: 5, is_free: false, file_name: 'ai_newsletter_weekly.pdf', file_size: 500000, tags: ['AI', 'newsletter', 'technology'], submitted_by: 'InsightAI', approved: true, downloads: 1800, rows_count: 0, format: 'pdf' },
    { title: 'India Census 2011 District Data', description: 'Complete district-level census data including population, literacy, occupation, and infrastructure.', category: 'Government', type: 'dataset', price_credits: 0, is_free: true, file_name: 'india_census_2011.csv', file_size: 5600000, tags: ['india', 'census', 'government'], submitted_by: 'InsightAI', approved: true, downloads: 3200, rows_count: 640000, format: 'csv' },
    { title: 'Student Performance Analytics', description: 'Academic performance data of 10,000 students including grades, attendance, socioeconomic factors.', category: 'Education', type: 'dataset', price_credits: 0, is_free: true, file_name: 'student_performance.csv', file_size: 890000, tags: ['education', 'students', 'academics'], submitted_by: 'InsightAI', approved: true, downloads: 4500, rows_count: 10000, format: 'csv' },
    { title: 'Global Climate Change Data', description: 'Temperature, CO2 levels, sea level, and extreme weather events from 1880-2023 across 150 countries.', category: 'Environment', type: 'dataset', price_credits: 10, is_free: false, file_name: 'climate_change.csv', file_size: 12000000, tags: ['climate', 'environment', 'global'], submitted_by: 'InsightAI', approved: true, downloads: 2300, rows_count: 280000, format: 'csv' },
    { title: 'Startup Funding Database 2023', description: 'Comprehensive database of 50,000+ startup funding rounds including investors, amounts, and valuations.', category: 'Finance', type: 'dataset', price_credits: 30, is_free: false, file_name: 'startup_funding.csv', file_size: 22000000, tags: ['startup', 'funding', 'venture'], submitted_by: 'InsightAI', approved: true, downloads: 780, rows_count: 50000, format: 'csv' },
  ];

  for (const r of defaults) {
    await pool.query(`
      INSERT INTO marketplace_resources (title, description, category, type, price_credits, is_free, file_name, file_size, tags, submitted_by, approved, downloads, rows_count, format)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [r.title, r.description, r.category, r.type, r.price_credits, r.is_free, r.file_name, r.file_size, r.tags, r.submitted_by, r.approved, r.downloads, r.rows_count, r.format]);
  }
}

// ── Get All Resources ─────────────────────────────────────
router.get('/marketplace', async (req, res) => {
  try {
    await ensureTables();
    await seedDefaultResources();

    const { category, type, search, free } = req.query;
    let query = 'SELECT id, title, description, category, type, price_credits, is_free, file_name, file_size, tags, submitted_by, downloads, rows_count, format, created_at FROM marketplace_resources WHERE approved = true';
    const params = [];

    if (category && category !== 'All') { params.push(category); query += ` AND category = $${params.length}`; }
    if (type && type !== 'All') { params.push(type); query += ` AND type = $${params.length}`; }
    if (free === 'true') { query += ' AND is_free = true'; }
    if (search) { params.push(`%${search}%`); query += ` AND (title ILIKE $${params.length} OR description ILIKE $${params.length} OR $${params.length} = ANY(tags::text[]))`; }

    query += ' ORDER BY downloads DESC';
    const result = await pool.query(query, params);
    res.json({ resources: result.rows });
  } catch (err) {
    console.error('Marketplace error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Download Resource ─────────────────────────────────────
router.post('/marketplace/download', async (req, res) => {
  const { resource_id, email } = req.body;
  try {
    await ensureTables();

    const resource = await pool.query('SELECT * FROM marketplace_resources WHERE id = $1', [resource_id]);
    if (!resource.rows.length) return res.status(404).json({ error: 'Resource not found' });

    const r = resource.rows[0];

    // Check if already downloaded
    const existing = await pool.query('SELECT * FROM marketplace_downloads WHERE resource_id = $1 AND user_email = $2', [resource_id, email]);
    if (existing.rows.length) return res.json({ success: true, already_downloaded: true, message: 'Already in your library' });

    // Check credits if paid
    if (!r.is_free && r.price_credits > 0) {
      const credits = await pool.query('SELECT * FROM user_credits WHERE email = $1', [email]);
      if (!credits.rows.length) return res.status(403).json({ error: 'No credits found' });

      const userCredits = credits.rows[0];
      const available = userCredits.credits_limit - userCredits.credits_used;

      if (available < r.price_credits) {
        return res.status(403).json({ error: `Not enough credits. Need ${r.price_credits}, have ${available}`, upgrade_required: true });
      }

      // Deduct credits
      await pool.query('UPDATE user_credits SET credits_used = credits_used + $1 WHERE email = $2', [r.price_credits, email]);

      // Credit the submitter
      await pool.query('INSERT INTO marketplace_earnings (submitter_email, resource_id, credits_earned) VALUES ($1, $2, $3)', [r.submitted_by, resource_id, Math.floor(r.price_credits * 0.7)]);
    }

    // Record download
    await pool.query('INSERT INTO marketplace_downloads (resource_id, user_email, credits_spent) VALUES ($1, $2, $3)', [resource_id, email, r.is_free ? 0 : r.price_credits]);

    // Increment download count
    await pool.query('UPDATE marketplace_resources SET downloads = downloads + 1 WHERE id = $1', [resource_id]);

    res.json({ success: true, resource: { title: r.title, file_name: r.file_name, format: r.format } });
  } catch (err) {
    console.error('Download error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Submit Resource ───────────────────────────────────────
router.post('/marketplace/submit', upload.single('file'), async (req, res) => {
  try {
    await ensureTables();
    const { title, description, category, type, price_credits, is_free, tags, email } = req.body;
    if (!title || !category || !type || !email) return res.status(400).json({ error: 'Missing required fields' });

    let file_name = null, file_size = 0, rows_count = 0, preview_data = null, format = 'csv';

    if (req.file) {
      file_name = req.file.originalname;
      file_size = req.file.size;
      format = file_name.split('.').pop().toLowerCase();

      if (format === 'csv') {
        try {
          const rows = parse(req.file.buffer.toString('utf-8'), { columns: true, skip_empty_lines: true, to: 6 });
          rows_count = rows.length;
          preview_data = JSON.stringify(rows.slice(0, 5));
        } catch (e) { console.error('CSV parse error:', e.message); }
      }
    }

    const tagArray = tags ? tags.split(',').map(t => t.trim()) : [];

    await pool.query(`
      INSERT INTO marketplace_resources (title, description, category, type, price_credits, is_free, file_name, file_size, file_data, preview_data, tags, submitted_by, approved, rows_count, format)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, $13, $14)
    `, [title, description, category, type, parseInt(price_credits) || 0, is_free === 'true', file_name, file_size, req.file?.buffer || null, preview_data, tagArray, email, rows_count, format]);

    res.json({ success: true, message: 'Resource submitted for review! It will be published after approval.' });
  } catch (err) {
    console.error('Submit error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── My Downloads ──────────────────────────────────────────
router.get('/marketplace/my-downloads/:email', async (req, res) => {
  const { email } = req.params;
  try {
    await ensureTables();
    const result = await pool.query(`
      SELECT r.id, r.title, r.category, r.type, r.file_name, r.format, r.downloads, d.created_at, d.credits_spent
      FROM marketplace_downloads d
      JOIN marketplace_resources r ON r.id = d.resource_id
      WHERE d.user_email = $1
      ORDER BY d.created_at DESC
    `, [email]);
    res.json({ downloads: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── My Submissions ────────────────────────────────────────
router.get('/marketplace/my-submissions/:email', async (req, res) => {
  const { email } = req.params;
  try {
    await ensureTables();
    const result = await pool.query(`
      SELECT id, title, category, type, is_free, price_credits, downloads, approved, created_at
      FROM marketplace_resources WHERE submitted_by = $1
      ORDER BY created_at DESC
    `, [email]);

    const earnings = await pool.query('SELECT SUM(credits_earned) as total FROM marketplace_earnings WHERE submitter_email = $1', [email]);

    res.json({ submissions: result.rows, total_earnings: earnings.rows[0].total || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;