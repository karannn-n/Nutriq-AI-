/**
 * HTTP Integration Test Suite for Nutriq Local Nutrition Engine Endpoints
 */

const assert = require('assert');

// Set port for test runner
process.env.PORT = '5099';
const { app, server } = require('./server');

const BASE_URL = 'http://localhost:5099';

console.log('🧪 Starting Nutriq Local Engine HTTP Endpoint Tests...\n');

let passed = 0;
let total = 0;

async function runAsyncTest(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 3).join('\n'));
    }
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const resp = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await resp.json().catch(() => null);
  return { status: resp.status, ok: resp.ok, data };
}

(async () => {
  try {
    // 1. Health check includes local food DB status
    await runAsyncTest('GET /api/health reports local USDA database loaded', async () => {
      const res = await request('/api/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'ok');
      assert.strictEqual(res.data.localFoodDbLoaded, true);
      assert.ok(res.data.localFoodsCount >= 40);
    });

    // 2. List foods
    await runAsyncTest('GET /api/nutrition/foods returns catalog items', async () => {
      const res = await request('/api/nutrition/foods?limit=5');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.foods.length, 5);
      assert.ok(res.data.total >= 40);
      const food = res.data.foods[0];
      assert.ok(food.id && food.name && food.nutrients_per_100g);
    });

    // 3. Search foods
    await runAsyncTest('GET /api/nutrition/foods?query=lentils finds lentils', async () => {
      const res = await request('/api/nutrition/foods?query=lentils');
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.foods.length >= 1);
      const match = res.data.foods.find(f => f.id === 'usda_fdc_172421');
      assert.ok(match, 'Must find Cooked Lentils 172421');
    });

    // 4. Get food by ID
    await runAsyncTest('GET /api/nutrition/foods/:id returns single food details', async () => {
      const res = await request('/api/nutrition/foods/usda_fdc_168878');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.food.id, 'usda_fdc_168878');
      assert.strictEqual(res.data.food.source.name, 'USDA FoodData Central');
      assert.strictEqual(res.data.food.nutrients_per_100g.calories.value, 130);
    });

    // 5. Calculate single food
    await runAsyncTest('POST /api/nutrition/calculate computes single food nutrients', async () => {
      const res = await request('/api/nutrition/calculate', {
        method: 'POST',
        body: JSON.stringify({
          food_id: 'usda_fdc_168878', // White Rice
          quantity: 200,
          unit: 'g',
        }),
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.type, 'single_food');
      assert.strictEqual(res.data.gram_weight, 200);
      assert.strictEqual(res.data.nutrients.calories.value, 260); // 130 * 2
      assert.strictEqual(res.data.nutrients.protein_g.value, 5.38); // 2.69 * 2
    });

    // 6. Calculate composite meal
    await runAsyncTest('POST /api/nutrition/calculate sums multi-ingredient meal', async () => {
      const res = await request('/api/nutrition/calculate', {
        method: 'POST',
        body: JSON.stringify({
          ingredients: [
            { food_id: 'usda_fdc_168878', quantity: 150, unit: 'g', confirmed: true },
            { food_id: 'usda_fdc_172421', quantity: 1, unit: 'cup', confirmed: true },
          ],
        }),
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.type, 'meal');
      assert.strictEqual(res.data.ingredient_count, 2);
      assert.ok(res.data.totals.calories.amount > 400);
      assert.ok(res.data.db_compatible_nutrition.calories > 400);
    });

    // 7. Calculate with unknown nutrients preserves null
    await runAsyncTest('POST /api/nutrition/calculate preserves null for unknown nutrients', async () => {
      const res = await request('/api/nutrition/calculate', {
        method: 'POST',
        body: JSON.stringify({
          food_id: 'usda_fdc_990001', // Wild Morel (Vit D is null, B12 is null)
          quantity: 100,
          unit: 'g',
        }),
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.nutrients.vitamin_d_mcg.value, null);
      assert.strictEqual(res.data.nutrients.vitamin_d_mcg.isUnknown, true);
    });

    // 8. Reject invalid inputs
    await runAsyncTest('POST /api/nutrition/calculate rejects invalid input with 400', async () => {
      const res = await request('/api/nutrition/calculate', {
        method: 'POST',
        body: JSON.stringify({
          food_id: 'usda_fdc_168878',
          quantity: -10,
          unit: 'g',
        }),
      });
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.error.includes('greater than zero'));
    });

    // 9. Parse natural language meal
    await runAsyncTest('POST /api/nutrition/parse-meal decomposes meal and detects ambiguities', async () => {
      const res = await request('/api/nutrition/parse-meal', {
        method: 'POST',
        body: JSON.stringify({
          description: '150g rice, 1 cup lentils and 1 glass milk',
        }),
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.parsed_items.length >= 3);
      assert.strictEqual(res.data.requires_user_confirmation, true, 'Milk should be flagged as ambiguous');
      assert.ok(res.data.ambiguous_ingredients.some(a => a.food_query === 'milk'));
    });

    // 10. Parse confirmed meal
    await runAsyncTest('POST /api/nutrition/parse-meal immediately calculates confirmed meal', async () => {
      const res = await request('/api/nutrition/parse-meal', {
        method: 'POST',
        body: JSON.stringify({
          description: '150g white rice, 1 cup lentils and 100g boiled spinach',
        }),
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.requires_user_confirmation, false);
      assert.strictEqual(res.data.confirmed_ingredients.length, 3);
      assert.ok(res.data.nutrition.totals.calories.amount > 400);
    });

  } finally {
    console.log('\n========================================');
    console.log(`Endpoint Test Results: ${passed}/${total} passed (${Math.round((passed/total)*100)}%)`);
    console.log('========================================\n');
    server.close();
    process.exit(passed === total ? 0 : 1);
  }
})();
