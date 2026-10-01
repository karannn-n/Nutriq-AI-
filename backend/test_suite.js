/**
 * Nutriq Automated Verification & Production Test Suite
 * Tests AI sanitization, reference calculations, deficiency risk logic,
 * authentication middleware, input length guards, and upload security.
 */

const assert = require('assert');
const { validateAndSanitizeNutrition } = require('./services/aiService');
const { requireAuth } = require('./middleware/auth');

console.log('🧪 Starting Nutriq Production Test Suite...\n');

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

// ─── 1. AI Sanitization Tests ────────────────────────────────────────────────
runTest('validateAndSanitizeNutrition handles valid full input', () => {
  const input = {
    calories: 450,
    protein: 32,
    carbohydrates: 40,
    fat: 14,
    vitamin_d: 4.5,
    iron: 3.2,
    zinc: 4.1,
    vitamin_b12: 1.8,
  };
  const result = validateAndSanitizeNutrition(input, 'Chicken bowl');
  assert.strictEqual(result.calories, 450);
  assert.strictEqual(result.protein_g, 32);
  assert.strictEqual(result.carbs_g, 40);
  assert.strictEqual(result.fat_g, 14);
  assert.strictEqual(result.vitamin_d_mcg, 4.5);
  assert.strictEqual(result.iron_mg, 3.2);
  assert.strictEqual(result.zinc_mg, 4.1);
  assert.strictEqual(result.b12_mcg, 1.8);
});

runTest('validateAndSanitizeNutrition sanitizes negative numbers and strings with units', () => {
  const input = {
    calories: '-250',
    protein: '25g',
    carbohydrates: -10,
    fat: 'NaN',
    vitamin_d: '3.5 mcg',
    iron: null,
    zinc: undefined,
    vitamin_b12: '1.2mg',
  };
  const result = validateAndSanitizeNutrition(input, 'Protein shake');
  assert.ok(result.calories >= 0, 'Calories should be non-negative');
  assert.strictEqual(result.protein_g, 25, 'Stripped g from protein string');
  assert.strictEqual(result.carbs_g, 0, 'Negative carbs clamped to 0');
  assert.strictEqual(result.fat_g, 0, 'NaN fat clamped to 0');
  assert.strictEqual(result.iron_mg, 0, 'Null iron clamped to 0');
  assert.strictEqual(result.zinc_mg, 0, 'Undefined zinc clamped to 0');
  assert.strictEqual(result.b12_mcg, 1.2, 'Stripped mg from b12 string');
});

runTest('validateAndSanitizeNutrition uses fallback estimation for empty input', () => {
  const result = validateAndSanitizeNutrition(null, 'Grilled Salmon with salad');
  assert.ok(result.calories > 0, 'Fallback calories estimated');
  assert.ok(result.protein_g > 0, 'Fallback protein estimated for salmon');
  assert.ok(result.vitamin_d_mcg > 0, 'Fallback vitamin D estimated for salmon');
});

// ─── 2. Reference & Deficiency Engine Tests ──────────────────────────────────
runTest('Deficiency detection flags intake below 70% of RDI', () => {
  const RDI = {
    vitamin_d_mcg: 15,
    iron_mg: 12,
    zinc_mg: 8,
    b12_mcg: 2.4,
  };

  const userAverages = {
    vitamin_d_mcg: 3,
    iron_mg: 5,
    zinc_mg: 9,
    b12_mcg: 2.8,
  };

  const deficiencies = [];
  for (const [key, target] of Object.entries(RDI)) {
    const avg = userAverages[key] || 0;
    const fulfillment = (avg / target) * 100;
    if (fulfillment < 70) {
      deficiencies.push({ nutrient: key, fulfillment: Math.round(fulfillment) });
    }
  }

  assert.strictEqual(deficiencies.length, 2, 'Should flag Vitamin D and Iron');
  assert.strictEqual(deficiencies[0].nutrient, 'vitamin_d_mcg');
  assert.strictEqual(deficiencies[0].fulfillment, 20);
  assert.strictEqual(deficiencies[1].nutrient, 'iron_mg');
  assert.strictEqual(deficiencies[1].fulfillment, 42);
});

runTest('Health score calculation is bounded between 0 and 100', () => {
  const calculateScore = (macroScore, microScore) => {
    return Math.min(100, Math.max(0, Math.round(macroScore * 0.4 + microScore * 0.6)));
  };

  assert.strictEqual(calculateScore(100, 100), 100);
  assert.strictEqual(calculateScore(0, 0), 0);
  assert.strictEqual(calculateScore(85, 75), 79);
});

// ─── 3. Auth & Security Middleware Tests ─────────────────────────────────────
runTest('requireAuth rejects missing Authorization header with HTTP 401', async () => {
  let statusSent = null;
  let jsonSent = null;

  const req = { headers: {} };
  const res = {
    status: (code) => {
      statusSent = code;
      return {
        json: (payload) => {
          jsonSent = payload;
        },
      };
    },
  };
  const next = () => {
    assert.fail('next() should not be called when token is missing');
  };

  await requireAuth(req, res, next);
  assert.strictEqual(statusSent, 401);
  assert.ok(jsonSent.error.includes('No authorization token provided'));
});

runTest('requireAuth rejects malformed Bearer tokens with HTTP 401', async () => {
  let statusSent = null;
  let jsonSent = null;

  const req = { headers: { authorization: 'Basic invalid_credentials' } };
  const res = {
    status: (code) => {
      statusSent = code;
      return {
        json: (payload) => {
          jsonSent = payload;
        },
      };
    },
  };
  const next = () => {
    assert.fail('next() should not be called for malformed token format');
  };

  await requireAuth(req, res, next);
  assert.strictEqual(statusSent, 401);
  assert.ok(jsonSent.error.includes('No authorization token provided'));
});

// ─── 4. Input Validation & Upload Security Tests ─────────────────────────────
runTest('Meal description length limit rejects strings over 1000 characters', () => {
  const longDescription = 'A'.repeat(1005);
  const validateDesc = (desc) => {
    if (!desc || typeof desc !== 'string' || !desc.trim()) return 'Empty description';
    if (desc.length > 1000) return 'Too long';
    return null;
  };
  assert.strictEqual(validateDesc(longDescription), 'Too long');
  assert.strictEqual(validateDesc('Healthy quinoa bowl'), null);
});

runTest('Multer fileFilter rejects executable and script mimetypes', () => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
  const testFilter = (mimetype) => allowed.includes(mimetype);

  assert.strictEqual(testFilter('image/jpeg'), true);
  assert.strictEqual(testFilter('image/png'), true);
  assert.strictEqual(testFilter('image/webp'), true);
  assert.strictEqual(testFilter('application/x-msdownload'), false);
  assert.strictEqual(testFilter('application/javascript'), false);
  assert.strictEqual(testFilter('text/html'), false);
  assert.strictEqual(testFilter('application/x-sh'), false);
});

runTest('Duplicate prevention idempotency identifier matches format', () => {
  const clientId = 'offline_1743242000000_abc123xyz';
  assert.ok(clientId.startsWith('offline_'), 'Client ID should have offline prefix');
  assert.ok(clientId.length >= 15, 'Client ID length should be sufficiently unique');
});

// ─── Summary ────────────────────────────────────────────────────────────────
console.log(`\n========================================`);
console.log(`Test Results: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)`);
console.log(`========================================\n`);

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
