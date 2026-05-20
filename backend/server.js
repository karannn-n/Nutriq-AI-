const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { pool, initializeDatabase } = require('./db');
const { analyzeMeal, generateRecommendation, generateInsightsSummary } = require('./services/aiService');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Reference Daily Intakes ──────────────────────────────────────────────────
const RDI = {
  vitamin_d_mcg: 15,   // mcg/day
  iron_mg:       12,   // mg/day
  zinc_mg:        8,   // mg/day
  b12_mcg:        2.4, // mcg/day
};

// ─── POST /api/meals ──────────────────────────────────────────────────────────
// Log a meal via natural language → parsed by Gemini → saved to DB
app.post('/api/meals', async (req, res) => {
  const { description } = req.body;
  if (!description) return res.status(400).json({ error: 'Missing meal description' });

  try {
    console.log(`Analyzing: "${description}"...`);
    const n = await analyzeMeal(description);

    await pool.query(
      `INSERT INTO meals (description, calories, protein_g, carbs_g, fat_g, vitamin_d_mcg, iron_mg, zinc_mg, b12_mcg)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [description, n.calories, n.protein_g, n.carbs_g, n.fat_g, n.vitamin_d_mcg, n.iron_mg, n.zinc_mg, n.b12_mcg]
    );

    res.json({ message: 'Meal logged successfully via AI', data: n });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process meal.' });
  }
});

// ─── GET /api/dashboard ───────────────────────────────────────────────────────
app.get('/api/dashboard', async (req, res) => {
  try {
    // 1. Recent meals
    const [recentMeals] = await pool.query(
      `SELECT description as name, calories as cals,
              DATE_FORMAT(created_at, '%h:%i %p') as time
       FROM meals ORDER BY created_at DESC LIMIT 3`
    );

    // 2. Rolling 7-day averages for all tracked nutrients + calories
    const [agg] = await pool.query(
      `SELECT
         AVG(vitamin_d_mcg) as avg_vit_d,
         AVG(iron_mg)       as avg_iron,
         AVG(zinc_mg)       as avg_zinc,
         AVG(b12_mcg)       as avg_b12,
         ROUND(SUM(calories) / NULLIF(COUNT(DISTINCT DATE(created_at)), 0)) as avg_calories
       FROM meals
       WHERE created_at >= DATE(NOW()) - INTERVAL 7 DAY`
    );
    const stats = agg[0];

    // 3. Chart data — daily Vitamin D totals for the past 7 days
    const [chartDataRaw] = await pool.query(
      `SELECT DATE_FORMAT(MIN(created_at), '%a') as name,
              ROUND(SUM(vitamin_d_mcg), 1) as completion
       FROM meals
       WHERE created_at >= DATE(NOW()) - INTERVAL 7 DAY
       GROUP BY DATE(created_at)
       ORDER BY MIN(created_at) ASC`
    );

    let chartData = chartDataRaw.length === 0
      ? [{ name: 'Mon', completion: 0, optimal: 15 }, { name: 'Tue', completion: 0, optimal: 15 }, { name: 'Wed', completion: 0, optimal: 15 }]
      : chartDataRaw.map(d => ({ ...d, optimal: RDI.vitamin_d_mcg }));

    // 4. Multi-nutrient deficiency detection
    const nutrientMap = [
      { key: 'avg_vit_d', label: 'Vitamin D', rdi: RDI.vitamin_d_mcg },
      { key: 'avg_iron',  label: 'Iron',      rdi: RDI.iron_mg },
      { key: 'avg_zinc',  label: 'Zinc',      rdi: RDI.zinc_mg },
      { key: 'avg_b12',   label: 'Vitamin B12', rdi: RDI.b12_mcg },
    ];

    const alerts = [];
    for (const { key, label, rdi } of nutrientMap) {
      const avg = parseFloat(stats[key]) || 0;
      // Flag if daily average per-meal intake suggests projected 7-day shortfall
      if (avg > 0 && avg < rdi * 0.6) {
        const message = await generateRecommendation(label);
        alerts.push({ target: label, message });
      }
    }

    // Weekly score: % of RDIs being met, capped 0-100
    const vitDAvg = parseFloat(stats.avg_vit_d) || 0;
    const score = Math.min(100, Math.round((vitDAvg / RDI.vitamin_d_mcg) * 100));

    res.json({
      recentMeals,
      chartData,
      alerts,                                      // array of { target, message }
      alertData: alerts.length > 0 ? alerts[0] : null,  // keep backward-compat
      topMetrics: {
        score: alerts.length === 0 ? 92 : Math.max(50, score),
        calories: stats.avg_calories || 0,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Dashboard engine failure.' });
  }
});

// ─── GET /api/insights ────────────────────────────────────────────────────────
// Full nutrient breakdown + AI-generated weekly summary
app.get('/api/insights', async (req, res) => {
  try {
    // 1. Weekly averages per nutrient (per-meal level, grouped by day sums)
    const [agg] = await pool.query(
      `SELECT
         ROUND(AVG(vitamin_d_mcg), 2) as avg_vit_d,
         ROUND(AVG(iron_mg), 2)       as avg_iron,
         ROUND(AVG(zinc_mg), 2)       as avg_zinc,
         ROUND(AVG(b12_mcg), 2)       as avg_b12,
         ROUND(AVG(protein_g), 1)     as avg_protein,
         ROUND(AVG(carbs_g), 1)       as avg_carbs,
         ROUND(AVG(fat_g), 1)         as avg_fat,
         ROUND(SUM(calories) / NULLIF(COUNT(DISTINCT DATE(created_at)), 0)) as avg_calories,
         COUNT(*) as total_meals
       FROM meals
       WHERE created_at >= DATE(NOW()) - INTERVAL 7 DAY`
    );
    const stats = agg[0];
    const hasMeals = parseInt(stats.total_meals) > 0;

    // 2. Daily trend data per nutrient for charts
    const [dailyRaw] = await pool.query(
      `SELECT
         DATE_FORMAT(MIN(created_at), '%a') as day,
         ROUND(SUM(vitamin_d_mcg), 1) as vit_d,
         ROUND(SUM(iron_mg), 1)       as iron,
         ROUND(SUM(zinc_mg), 1)       as zinc,
         ROUND(SUM(b12_mcg), 2)       as b12,
         ROUND(SUM(calories))         as calories,
         ROUND(SUM(protein_g), 1)     as protein,
         ROUND(SUM(carbs_g), 1)       as carbs,
         ROUND(SUM(fat_g), 1)         as fat
       FROM meals
       WHERE created_at >= DATE(NOW()) - INTERVAL 7 DAY
       GROUP BY DATE(created_at)
       ORDER BY MIN(created_at) ASC`
    );

    // 3. Deficiency detection
    const nutrientChecks = [
      { key: 'avg_vit_d', label: 'Vitamin D', rdi: RDI.vitamin_d_mcg, unit: 'mcg' },
      { key: 'avg_iron',  label: 'Iron',      rdi: RDI.iron_mg,       unit: 'mg' },
      { key: 'avg_zinc',  label: 'Zinc',      rdi: RDI.zinc_mg,       unit: 'mg' },
      { key: 'avg_b12',   label: 'Vitamin B12', rdi: RDI.b12_mcg,    unit: 'mcg' },
    ];

    const deficiencies = [];
    const nutrientStatus = nutrientChecks.map(({ key, label, rdi, unit }) => {
      const avg = parseFloat(stats[key]) || 0;
      const pct = Math.min(100, Math.round((avg / rdi) * 100));
      const status = pct >= 80 ? 'good' : pct >= 50 ? 'low' : 'deficient';
      if (status === 'deficient' && hasMeals) deficiencies.push(label);
      return { label, avg, rdi, unit, pct, status };
    });

    // 4. AI summary (only call Gemini if we have actual meal data)
    let aiSummary = null;
    if (hasMeals) {
      const averages = {
        'Vitamin D': `${stats.avg_vit_d} mcg`,
        Iron: `${stats.avg_iron} mg`,
        Zinc: `${stats.avg_zinc} mg`,
        'Vitamin B12': `${stats.avg_b12} mcg`,
      };
      aiSummary = await generateInsightsSummary(deficiencies, averages);
    }

    res.json({
      hasMeals,
      totalMeals: parseInt(stats.total_meals),
      dailyTrends: dailyRaw,
      nutrientStatus,
      macros: {
        protein: stats.avg_protein || 0,
        carbs: stats.avg_carbs || 0,
        fat: stats.avg_fat || 0,
        calories: stats.avg_calories || 0,
      },
      aiSummary,
      deficiencies,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Insights engine failure.' });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Backend Server running on port ${PORT}`);
  await initializeDatabase();
});
