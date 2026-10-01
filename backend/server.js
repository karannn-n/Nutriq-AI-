const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { supabaseAdmin, isConfigured } = require('./supabase');
const { requireAuth } = require('./middleware/auth');
const {
  analyzeMeal,
  analyzeMealFromImage,
  generateRecommendation,
  generateInsightsSummary,
  validateAndSanitizeNutrition,
} = require('./services/aiService');

// Ensure temporary uploads directory exists
const uploadDir = path.join(__dirname, 'uploads_tmp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, GIF, and HEIC images are allowed.'), false);
    }
  },
});

const app = express();

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Production-ready CORS configuration
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  'https://karannn-n.github.io',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Allow non-browser agents
    const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.github.io') || origin.endsWith('.onrender.com');
    if (isAllowed || !isProduction) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy blocked access from origin: ${origin}`));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// General API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP. Please try again later.' },
});
app.use('/api/', apiLimiter);

// AI-specific Rate Limiter
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI analysis rate limit reached. Please wait a moment before analyzing more meals.' },
});

// ─── Reference Daily Intakes (RDI) Benchmarks ───────────────────────────────
const RDI = {
  vitamin_d_mcg: 15,   // mcg/day
  iron_mg:       12,   // mg/day
  zinc_mg:        8,   // mg/day
  b12_mcg:        2.4, // mcg/day
  calories:    2000,   // standard baseline kcal/day
  protein_g:     60,   // baseline grams/day
};

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    supabaseConfigured: isConfigured,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// ─── 1. MEAL CRUD ENDPOINTS ──────────────────────────────────────────────────

/**
 * POST /api/meals
 * Creates a meal from natural language text using Gemini NLP.
 * Supports offline sync idempotency via client_id.
 */
app.post('/api/meals', requireAuth, aiLimiter, async (req, res, next) => {
  const { description, client_id, logged_at } = req.body;
  if (!description || typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ error: 'Please provide a valid meal description.' });
  }

  if (description.length > 1000) {
    return res.status(400).json({ error: 'Meal description cannot exceed 1,000 characters.' });
  }

  const userId = req.user.id;

  try {
    // 0. Idempotency / Duplicate Prevention for offline sync
    if (client_id && typeof client_id === 'string' && client_id.trim()) {
      const cleanClientId = client_id.trim();
      const { data: existingMeal } = await supabaseAdmin
        .from('meals')
        .select('*, nutrition(*)')
        .eq('user_id', userId)
        .eq('client_id', cleanClientId)
        .maybeSingle();

      if (existingMeal) {
        return res.status(200).json({
          message: 'Meal already synchronized.',
          meal: existingMeal,
          data: Array.isArray(existingMeal.nutrition) ? existingMeal.nutrition[0] : existingMeal.nutrition,
          isDuplicate: true,
        });
      }
    }

    const cleanDesc = description.trim();
    const rawNutrition = await analyzeMeal(cleanDesc);
    const n = validateAndSanitizeNutrition(rawNutrition, cleanDesc);

    // 1. Insert meal entry
    const mealPayload = {
      user_id: userId,
      description: n.description || cleanDesc,
      logged_at: logged_at ? new Date(logged_at).toISOString() : new Date().toISOString(),
    };
    if (client_id && typeof client_id === 'string' && client_id.trim()) {
      mealPayload.client_id = client_id.trim();
    }

    const { data: meal, error: mealErr } = await supabaseAdmin
      .from('meals')
      .insert(mealPayload)
      .select('id, description, logged_at, created_at, client_id')
      .single();

    if (mealErr) throw mealErr;

    // 2. Insert corresponding nutrition record
    const { data: nutrition, error: nutErr } = await supabaseAdmin
      .from('nutrition')
      .insert({
        meal_id: meal.id,
        user_id: userId,
        calories: n.calories,
        protein_g: n.protein_g,
        carbs_g: n.carbs_g,
        fat_g: n.fat_g,
        vitamin_d_mcg: n.vitamin_d_mcg,
        iron_mg: n.iron_mg,
        zinc_mg: n.zinc_mg,
        b12_mcg: n.b12_mcg,
      })
      .select()
      .single();

    if (nutErr) throw nutErr;

    res.status(201).json({
      message: 'Meal analyzed and logged successfully.',
      meal: {
        ...meal,
        nutrition,
      },
      data: n,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/meals/image
 * Creates a meal from an uploaded photo using Gemini Vision.
 */
app.post('/api/meals/image', requireAuth, aiLimiter, upload.single('image'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded.' });
  }

  const userId = req.user.id;
  const tmpPath = req.file.path;
  const safeOriginalName = path.basename(req.file.originalname).replace(/[^a-zA-Z0-9._ -]/g, '');

  try {
    const rawNutrition = await analyzeMealFromImage(tmpPath, req.file.mimetype);
    const n = validateAndSanitizeNutrition(rawNutrition, safeOriginalName || 'Food photo');

    const description = n.description || safeOriginalName || 'Uploaded meal';

    // 1. Insert meal
    const { data: meal, error: mealErr } = await supabaseAdmin
      .from('meals')
      .insert({
        user_id: userId,
        description,
        logged_at: new Date().toISOString(),
      })
      .select('id, description, logged_at, created_at')
      .single();

    if (mealErr) throw mealErr;

    // 2. Insert nutrition
    const { data: nutrition, error: nutErr } = await supabaseAdmin
      .from('nutrition')
      .insert({
        meal_id: meal.id,
        user_id: userId,
        calories: n.calories,
        protein_g: n.protein_g,
        carbs_g: n.carbs_g,
        fat_g: n.fat_g,
        vitamin_d_mcg: n.vitamin_d_mcg,
        iron_mg: n.iron_mg,
        zinc_mg: n.zinc_mg,
        b12_mcg: n.b12_mcg,
      })
      .select()
      .single();

    if (nutErr) throw nutErr;

    res.status(201).json({
      message: 'Meal image analyzed and logged successfully.',
      meal: {
        ...meal,
        nutrition,
      },
      data: n,
    });
  } catch (error) {
    next(error);
  } finally {
    fs.unlink(tmpPath, () => {});
  }
});

/**
 * GET /api/meals
 * Paginated, searchable, and date-filtered meal history.
 */
app.get('/api/meals', requireAuth, async (req, res, next) => {
  const userId = req.user.id;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const search = req.query.search ? String(req.query.search).trim() : '';
  const startDate = req.query.startDate ? String(req.query.startDate) : '';
  const endDate = req.query.endDate ? String(req.query.endDate) : '';

  try {
    let query = supabaseAdmin
      .from('meals')
      .select('id, description, image_url, logged_at, created_at, nutrition(*)', { count: 'exact' })
      .eq('user_id', userId)
      .order('logged_at', { ascending: false });

    if (search) {
      query = query.ilike('description', `%${search}%`);
    }

    if (startDate) {
      query = query.gte('logged_at', startDate);
    }

    if (endDate) {
      query = query.lte('logged_at', endDate);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: meals, count, error } = await query.range(from, to);

    if (error) throw error;

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    res.json({
      meals: meals || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/meals/:id
 * Retrieve single meal details with full nutrition metrics.
 */
app.get('/api/meals/:id', requireAuth, async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const { data: meal, error } = await supabaseAdmin
      .from('meals')
      .select('id, description, image_url, logged_at, created_at, nutrition(*)')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !meal) {
      return res.status(404).json({ error: 'Meal not found or unauthorized.' });
    }

    res.json({ meal });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/meals/:id
 * Edit meal description and its nutrition breakdown.
 */
app.put('/api/meals/:id', requireAuth, async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { description, calories, protein_g, carbs_g, fat_g, vitamin_d_mcg, iron_mg, zinc_mg, b12_mcg } = req.body;

  try {
    // 1. Verify ownership and update description if provided
    if (description !== undefined) {
      const { error: mealErr } = await supabaseAdmin
        .from('meals')
        .update({ description: String(description).trim() })
        .eq('id', id)
        .eq('user_id', userId);

      if (mealErr) throw mealErr;
    }

    // 2. Update nutrition if nutritional fields are provided
    const nutUpdates = {};
    if (calories !== undefined) nutUpdates.calories = Math.max(0, Number(calories) || 0);
    if (protein_g !== undefined) nutUpdates.protein_g = Math.max(0, Number(protein_g) || 0);
    if (carbs_g !== undefined) nutUpdates.carbs_g = Math.max(0, Number(carbs_g) || 0);
    if (fat_g !== undefined) nutUpdates.fat_g = Math.max(0, Number(fat_g) || 0);
    if (vitamin_d_mcg !== undefined) nutUpdates.vitamin_d_mcg = Math.max(0, Number(vitamin_d_mcg) || 0);
    if (iron_mg !== undefined) nutUpdates.iron_mg = Math.max(0, Number(iron_mg) || 0);
    if (zinc_mg !== undefined) nutUpdates.zinc_mg = Math.max(0, Number(zinc_mg) || 0);
    if (b12_mcg !== undefined) nutUpdates.b12_mcg = Math.max(0, Number(b12_mcg) || 0);

    if (Object.keys(nutUpdates).length > 0) {
      const { error: nutErr } = await supabaseAdmin
        .from('nutrition')
        .update(nutUpdates)
        .eq('meal_id', id)
        .eq('user_id', userId);

      if (nutErr) throw nutErr;
    }

    // Return the updated meal
    const { data: updatedMeal, error: fetchErr } = await supabaseAdmin
      .from('meals')
      .select('id, description, image_url, logged_at, created_at, nutrition(*)')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchErr) throw fetchErr;

    res.json({ message: 'Meal updated successfully.', meal: updatedMeal });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/meals/:id
 * Permanently deletes a meal and cascades to its nutrition record.
 */
app.delete('/api/meals/:id', requireAuth, async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const { data, error } = await supabaseAdmin
      .from('meals')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Meal not found or unauthorized.' });
    }

    res.json({ message: 'Meal deleted successfully.', id });
  } catch (error) {
    next(error);
  }
});

// ─── 2. DASHBOARD & INSIGHTS ENDPOINTS ───────────────────────────────────────

/**
 * GET /api/dashboard
 * Live, data-driven dashboard metrics calculated over rolling 7 days.
 */
app.get('/api/dashboard', requireAuth, async (req, res, next) => {
  const userId = req.user.id;

  try {
    // 1. Fetch recent meals (latest 5 for display, with link to full history)
    const { data: recentMealsData, error: recentErr } = await supabaseAdmin
      .from('meals')
      .select('id, description, logged_at, created_at, nutrition(calories)')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(5);

    if (recentErr) throw recentErr;

    const recentMeals = (recentMealsData || []).map((m) => {
      const timeStr = new Date(m.logged_at || m.created_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return {
        id: m.id,
        name: m.description,
        cals: m.nutrition ? Math.round(m.nutrition.calories || 0) : 0,
        time: timeStr,
      };
    });

    // 2. Fetch rolling 7-day nutrition records
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: nutRecords, error: nutErr } = await supabaseAdmin
      .from('nutrition')
      .select('calories, protein_g, carbs_g, fat_g, vitamin_d_mcg, iron_mg, zinc_mg, b12_mcg, created_at')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (nutErr) throw nutErr;

    const records = nutRecords || [];
    const count = records.length;

    // Daily buckets for chart & trend visualization
    const dayMap = {};
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = daysOfWeek[d.getDay()];
      const dateKey = d.toISOString().split('T')[0];
      dayMap[dateKey] = {
        name: dayName,
        completion: 0,
        optimal: RDI.vitamin_d_mcg,
      };
    }

    let totalCals = 0;
    let sumVitD = 0;
    let sumIron = 0;
    let sumZinc = 0;
    let sumB12 = 0;

    records.forEach((r) => {
      const dateKey = r.created_at.split('T')[0];
      const vitD = Number(r.vitamin_d_mcg) || 0;
      if (dayMap[dateKey]) {
        dayMap[dateKey].completion += vitD;
      }
      totalCals += Number(r.calories) || 0;
      sumVitD += vitD;
      sumIron += Number(r.iron_mg) || 0;
      sumZinc += Number(r.zinc_mg) || 0;
      sumB12 += Number(r.b12_mcg) || 0;
    });

    const chartData = Object.values(dayMap).map((d) => ({
      ...d,
      completion: Math.round(d.completion * 10) / 10,
    }));

    const distinctDays = Math.max(1, new Set(records.map((r) => r.created_at.split('T')[0])).size);
    const avgCalories = count > 0 ? Math.round(totalCals / distinctDays) : 0;
    const avgVitD = count > 0 ? sumVitD / distinctDays : 0;
    const avgIron = count > 0 ? sumIron / distinctDays : 0;
    const avgZinc = count > 0 ? sumZinc / distinctDays : 0;
    const avgB12 = count > 0 ? sumB12 / distinctDays : 0;

    // Deficiency prediction & alerts
    const nutrientMap = [
      { key: 'vit_d', label: 'Vitamin D', avg: avgVitD, rdi: RDI.vitamin_d_mcg },
      { key: 'iron',  label: 'Iron',      avg: avgIron, rdi: RDI.iron_mg },
      { key: 'zinc',  label: 'Zinc',      avg: avgZinc, rdi: RDI.zinc_mg },
      { key: 'b12',   label: 'Vitamin B12', avg: avgB12, rdi: RDI.b12_mcg },
    ];

    const alerts = [];
    for (const { label, avg, rdi } of nutrientMap) {
      if (count > 0 && avg < rdi * 0.6) {
        const severity = avg < rdi * 0.3 ? 'deficient' : 'low';
        const message = await generateRecommendation(label, {
          recentMeals: recentMeals.map((m) => m.name),
        });

        alerts.push({
          target: label,
          severity,
          message,
          disclaimer: 'Nutritional risk indicator based on 7-day intake trends; not a medical diagnosis.',
        });

        // Upsert into deficiency_alerts table in Supabase
        await supabaseAdmin.from('deficiency_alerts').insert({
          user_id: userId,
          nutrient: label,
          severity,
          current_avg: Math.round(avg * 10) / 10,
          target_rdi: rdi,
          message,
        }).catch((e) => console.warn('Could not persist alert:', e.message));
      }
    }

    // Health Score calculation (0 - 100) based on micronutrient benchmarks
    const vitDScore = Math.min(100, Math.round((avgVitD / RDI.vitamin_d_mcg) * 100));
    const ironScore = Math.min(100, Math.round((avgIron / RDI.iron_mg) * 100));
    const zincScore = Math.min(100, Math.round((avgZinc / RDI.zinc_mg) * 100));
    const b12Score = Math.min(100, Math.round((avgB12 / RDI.b12_mcg) * 100));

    const compositeScore = count === 0
      ? 88
      : Math.round((vitDScore + ironScore + zincScore + b12Score) / 4);

    res.json({
      recentMeals,
      chartData,
      alerts,
      alertData: alerts.length > 0 ? alerts[0] : null,
      topMetrics: {
        score: Math.min(100, Math.max(40, compositeScore)),
        calories: avgCalories,
      },
      disclaimer: 'All metrics represent calculated nutritional estimates and dietary risk indicators, not medical diagnoses.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/insights
 * Full nutritional analytics breakdown, radar chart data, and Gemini weekly summary.
 */
app.get('/api/insights', requireAuth, async (req, res, next) => {
  const userId = req.user.id;

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: records, error } = await supabaseAdmin
      .from('nutrition')
      .select('calories, protein_g, carbs_g, fat_g, vitamin_d_mcg, iron_mg, zinc_mg, b12_mcg, created_at')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    const list = records || [];
    const hasMeals = list.length > 0;
    const totalMeals = list.length;

    // Daily trend aggregates for charts
    const dayMap = {};
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = daysOfWeek[d.getDay()];
      const key = d.toISOString().split('T')[0];
      dayMap[key] = {
        day: dayName,
        vit_d: 0,
        iron: 0,
        zinc: 0,
        b12: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
    }

    let totVitD = 0, totIron = 0, totZinc = 0, totB12 = 0;
    let totProtein = 0, totCarbs = 0, totFat = 0, totCals = 0;

    list.forEach((r) => {
      const key = r.created_at.split('T')[0];
      if (dayMap[key]) {
        dayMap[key].vit_d += Number(r.vitamin_d_mcg) || 0;
        dayMap[key].iron += Number(r.iron_mg) || 0;
        dayMap[key].zinc += Number(r.zinc_mg) || 0;
        dayMap[key].b12 += Number(r.b12_mcg) || 0;
        dayMap[key].calories += Number(r.calories) || 0;
        dayMap[key].protein += Number(r.protein_g) || 0;
        dayMap[key].carbs += Number(r.carbs_g) || 0;
        dayMap[key].fat += Number(r.fat_g) || 0;
      }
      totVitD += Number(r.vitamin_d_mcg) || 0;
      totIron += Number(r.iron_mg) || 0;
      totZinc += Number(r.zinc_mg) || 0;
      totB12 += Number(r.b12_mcg) || 0;
      totProtein += Number(r.protein_g) || 0;
      totCarbs += Number(r.carbs_g) || 0;
      totFat += Number(r.fat_g) || 0;
      totCals += Number(r.calories) || 0;
    });

    const dailyTrends = Object.values(dayMap).map((d) => ({
      ...d,
      vit_d: Math.round(d.vit_d * 10) / 10,
      iron: Math.round(d.iron * 10) / 10,
      zinc: Math.round(d.zinc * 10) / 10,
      b12: Math.round(d.b12 * 100) / 100,
      calories: Math.round(d.calories),
      protein: Math.round(d.protein * 10) / 10,
      carbs: Math.round(d.carbs * 10) / 10,
      fat: Math.round(d.fat * 10) / 10,
    }));

    const distinctDays = Math.max(1, new Set(list.map((r) => r.created_at.split('T')[0])).size);
    const avg_vit_d = hasMeals ? Math.round((totVitD / distinctDays) * 10) / 10 : 0;
    const avg_iron  = hasMeals ? Math.round((totIron / distinctDays) * 10) / 10 : 0;
    const avg_zinc  = hasMeals ? Math.round((totZinc / distinctDays) * 10) / 10 : 0;
    const avg_b12   = hasMeals ? Math.round((totB12 / distinctDays) * 100) / 100 : 0;

    const nutrientChecks = [
      { key: 'vit_d', label: 'Vitamin D', avg: avg_vit_d, rdi: RDI.vitamin_d_mcg, unit: 'mcg' },
      { key: 'iron',  label: 'Iron',      avg: avg_iron,  rdi: RDI.iron_mg,       unit: 'mg' },
      { key: 'zinc',  label: 'Zinc',      avg: avg_zinc,  rdi: RDI.zinc_mg,       unit: 'mg' },
      { key: 'b12',   label: 'Vitamin B12', avg: avg_b12, rdi: RDI.b12_mcg,      unit: 'mcg' },
    ];

    const deficiencies = [];
    const nutrientStatus = nutrientChecks.map(({ label, avg, rdi, unit }) => {
      const pct = Math.min(100, Math.round((avg / rdi) * 100));
      const status = pct >= 80 ? 'good' : pct >= 50 ? 'low' : 'deficient';
      if (status === 'deficient' && hasMeals) deficiencies.push(label);
      return { label, avg, rdi, unit, pct, status };
    });

    let aiSummary = null;
    if (hasMeals) {
      const averages = {
        'Vitamin D': `${avg_vit_d} mcg`,
        Iron: `${avg_iron} mg`,
        Zinc: `${avg_zinc} mg`,
        'Vitamin B12': `${avg_b12} mcg`,
      };
      aiSummary = await generateInsightsSummary(deficiencies, averages, distinctDays);
    }

    res.json({
      hasMeals,
      totalMeals,
      dailyTrends,
      nutrientStatus,
      macros: {
        protein: hasMeals ? Math.round((totProtein / totalMeals) * 10) / 10 : 0,
        carbs:   hasMeals ? Math.round((totCarbs / totalMeals) * 10) / 10 : 0,
        fat:     hasMeals ? Math.round((totFat / totalMeals) * 10) / 10 : 0,
        calories: hasMeals ? Math.round(totCals / distinctDays) : 0,
      },
      aiSummary,
      deficiencies,
      disclaimer: 'Nutritional risk indicators and recommendations are based on dietary trends and do not constitute clinical diagnosis.',
    });
  } catch (error) {
    next(error);
  }
});

// ─── 3. DEFICIENCY ALERTS & RECOMMENDATIONS ENDPOINTS ────────────────────────

/**
 * GET /api/alerts
 * Lists active alerts for the user.
 */
app.get('/api/alerts', requireAuth, async (req, res, next) => {
  const userId = req.user.id;
  try {
    const { data: alerts, error } = await supabaseAdmin
      .from('deficiency_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ alerts: alerts || [] });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/alerts/:id/dismiss
 * Dismisses a specific alert.
 */
app.put('/api/alerts/:id/dismiss', requireAuth, async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const { error } = await supabaseAdmin
      .from('deficiency_alerts')
      .update({ is_dismissed: true })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ message: 'Alert dismissed.', id });
  } catch (error) {
    next(error);
  }
});

// ─── 4. USER PROFILE & SETTINGS ENDPOINTS ────────────────────────────────────

app.get('/api/user/profile', requireAuth, async (req, res, next) => {
  const userId = req.user.id;
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;

    res.json({
      profile: profile || {
        id: userId,
        email: req.user.email,
        full_name: req.user.user_metadata?.full_name || '',
      },
    });
  } catch (error) {
    next(error);
  }
});

app.put('/api/user/profile', requireAuth, async (req, res, next) => {
  const userId = req.user.id;
  const { full_name, phone, bio, avatar_url } = req.body;

  try {
    const updates = {
      id: userId,
      email: req.user.email,
      updated_at: new Date().toISOString(),
    };
    if (full_name !== undefined) updates.full_name = String(full_name).trim();
    if (phone !== undefined) updates.phone = String(phone).trim();
    if (bio !== undefined) updates.bio = String(bio).trim();
    if (avatar_url !== undefined) updates.avatar_url = String(avatar_url).trim();

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert(updates)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Profile updated successfully.', profile: data });
  } catch (error) {
    next(error);
  }
});

app.get('/api/user/settings', requireAuth, async (req, res, next) => {
  const userId = req.user.id;
  try {
    const { data: settings, error } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    res.json({
      settings: settings || {
        theme: 'mint',
        target_calories: 2000,
        dietary_preference: 'standard',
        email_notifications: true,
        deficiency_alerts_enabled: true,
        daily_reminder_time: '20:00',
      },
    });
  } catch (error) {
    next(error);
  }
});

app.put('/api/user/settings', requireAuth, async (req, res, next) => {
  const userId = req.user.id;
  const {
    theme,
    target_calories,
    dietary_preference,
    email_notifications,
    deficiency_alerts_enabled,
    daily_reminder_time,
  } = req.body;

  try {
    const updates = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };
    if (theme !== undefined) updates.theme = theme;
    if (target_calories !== undefined) updates.target_calories = Math.max(500, Number(target_calories) || 2000);
    if (dietary_preference !== undefined) updates.dietary_preference = String(dietary_preference);
    if (email_notifications !== undefined) updates.email_notifications = Boolean(email_notifications);
    if (deficiency_alerts_enabled !== undefined) updates.deficiency_alerts_enabled = Boolean(deficiency_alerts_enabled);
    if (daily_reminder_time !== undefined) updates.daily_reminder_time = String(daily_reminder_time);

    const { data, error } = await supabaseAdmin
      .from('user_settings')
      .upsert(updates)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Settings updated successfully.', settings: data });
  } catch (error) {
    next(error);
  }
});

// ─── Centralized Error Handling Middleware ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[API Error]', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error occurred.',
    status,
  });
});

// ─── Start Server & Graceful Shutdown ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`[Nutriq Backend] Running on port ${PORT}`);
  console.log(`[Nutriq Backend] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Nutriq Backend] Database: Supabase PostgreSQL (${isConfigured ? 'Connected' : 'Pending Configuration'})`);
});

const gracefulShutdown = (signal) => {
  console.log(`[Nutriq Backend] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('[Nutriq Backend] HTTP server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[Nutriq Backend] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
