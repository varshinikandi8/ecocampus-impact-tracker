const express = require('express');
const { Pool } = require('pg');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'ecocampus',
  user: process.env.DB_USER || 'eco_user',
  password: process.env.DB_PASSWORD || 'ChangeThisLocal123'
});
const categories = new Set(['Transport', 'Energy', 'Waste', 'Food', 'Water', 'Nature']);

async function initialiseDatabase() {
  for (let attempt = 1; attempt <= 25; attempt++) {
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS eco_actions (
        id BIGSERIAL PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        category VARCHAR(20) NOT NULL CHECK (category IN ('Transport','Energy','Waste','Food','Water','Nature')),
        impact_kg NUMERIC(7,1) NOT NULL DEFAULT 0 CHECK (impact_kg >= 0),
        note VARCHAR(240) NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
      console.log('EcoCampus database is ready');
      return;
    } catch (error) {
      console.log(`Database startup ${attempt}/25: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
  }
  throw new Error('Could not initialise the database');
}

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', db: true }); }
  catch { res.status(503).json({ status: 'degraded', db: false }); }
});

app.get('/api/actions', async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, title, category, impact_kg, note, created_at FROM eco_actions ORDER BY created_at DESC, id DESC LIMIT 100');
    res.json(rows);
  } catch (error) { next(error); }
});

app.get('/api/summary', async (_req, res, next) => {
  try {
    const total = await pool.query('SELECT COUNT(*)::int AS total_actions, COALESCE(SUM(impact_kg),0)::numeric(10,1) AS total_impact FROM eco_actions');
    const leader = await pool.query('SELECT category FROM eco_actions GROUP BY category ORDER BY COUNT(*) DESC, category ASC LIMIT 1');
    res.json({ total_actions: total.rows[0].total_actions, total_impact: total.rows[0].total_impact, leading_category: leader.rows[0]?.category || null });
  } catch (error) { next(error); }
});

app.post('/api/actions', async (req, res, next) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const category = typeof req.body.category === 'string' ? req.body.category : '';
  const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
  const impact = Number(req.body.impact_kg);
  if (!title || title.length > 100) return res.status(400).json({ error: 'Action name is required and must be 100 characters or fewer.' });
  if (!categories.has(category)) return res.status(400).json({ error: 'Choose a valid category.' });
  if (!Number.isFinite(impact) || impact < 0 || impact > 1000) return res.status(400).json({ error: 'CO₂ estimate must be between 0 and 1000 kg.' });
  if (note.length > 240) return res.status(400).json({ error: 'Detail must be 240 characters or fewer.' });
  try {
    const { rows } = await pool.query('INSERT INTO eco_actions(title, category, impact_kg, note) VALUES($1,$2,$3,$4) RETURNING id, title, category, impact_kg, note, created_at', [title, category, impact, note]);
    res.status(201).json(rows[0]);
  } catch (error) { next(error); }
});

app.delete('/api/actions/:id', async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'Invalid action ID.' });
  try {
    const result = await pool.query('DELETE FROM eco_actions WHERE id = $1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Action not found.' });
    res.json({ deleted: true });
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error.message);
  res.status(500).json({ error: 'The request could not be completed.' });
});

initialiseDatabase().then(() => {
  const port = Number(process.env.PORT || 5000);
  app.listen(port, '0.0.0.0', () => console.log(`EcoCampus API listening on ${port}`));
}).catch(error => { console.error(error.message); process.exit(1); });
