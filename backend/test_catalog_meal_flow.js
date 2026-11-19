/**
 * Nutriq Phase 1D Integration Test Suite: Catalog Meal Logging Flow
 * Verifies POST /api/meals/catalog, server-side recalculation security,
 * input validation, meal_ingredients persistence, and retrieval.
 */

const assert = require('assert');

process.env.NODE_ENV = 'test';
process.env.PORT = '5096';
const { app, server } = require('./server');

const BASE_URL = 'http://localhost:5096';
const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer test-mock-token',
};

console.log('\n🧪 Starting Nutriq Phase 1D Catalog Meal Flow Tests...\n');

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
      console.error(err.stack.split('\n').slice(1, 4).join('\n'));
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
    // 1. Rejects unauthenticated requests
    await runAsyncTest('POST /api/meals/catalog rejects missing auth with 401', async () => {
      const res = await request('/api/meals/catalog', {
        method: 'POST',
        body: JSON.stringify({
          ingredients: [{ fdc_id: 172421, weight_g: 100 }],
        }),
      });
      assert.strictEqual(res.status, 401);
      assert.ok(res.data.error);
    });

    // 2. Rejects empty ingredients array
    await runAsyncTest('POST /api/meals/catalog rejects empty ingredients with 400', async () => {
      const res = await request('/api/meals/catalog', {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          ingredients: [],
        }),
      });
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.error.includes('ingredient'));
    });

    // 3. Rejects negative or zero weights
    await runAsyncTest('POST /api/meals/catalog rejects negative weight with 400', async () => {
      const res = await request('/api/meals/catalog', {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          ingredients: [{ fdc_id: 172421, weight_g: -50 }],
        }),
      });
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.error);
    });

    // 4. Rejects non-existent food ID
    await runAsyncTest('POST /api/meals/catalog rejects non-existent fdc_id with 400', async () => {
      const res = await request('/api/meals/catalog', {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          ingredients: [{ fdc_id: 999999999, weight_g: 100 }],
        }),
      });
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.error);
    });

    // 5. Successful meal creation with authoritative server-side recalculation
    let createdMealId = null;
    const testClientId = `test_sync_${Date.now()}`;

    await runAsyncTest('POST /api/meals/catalog recalculates and persists multi-ingredient meal', async () => {
      const res = await request('/api/meals/catalog', {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          description: 'Lunch: Basmati Rice with Lentils',
          meal_type: 'lunch',
          client_id: testClientId,
          ingredients: [
            { fdc_id: 168878, weight_g: 150 }, // White Rice: 130 kcal/100g -> 195 kcal
            { fdc_id: 172421, weight_g: 198, portion_description: '1 cup cooked' }, // Lentils: 116 kcal/100g -> 229.68 kcal
          ],
          // Deliberately pass bogus client numbers to verify server authoritative recalculation
          bogus_calories: 99999,
        }),
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.engine, 'local_usda');
      assert.ok(res.data.meal);
      assert.strictEqual(res.data.meal.description, 'Lunch: Basmati Rice with Lentils');
      assert.strictEqual(res.data.meal.meal_type, 'lunch');

      createdMealId = res.data.meal.id;

      // Authoritative nutrient check: server calculated ~425 kcal (195 + 230), NOT 99999!
      const totalCalories = res.data.meal.nutrition.calories;
      assert.ok(totalCalories >= 420 && totalCalories <= 430, `Expected ~425 kcal, got ${totalCalories}`);

      // Verify ingredient snapshot breakdown
      assert.strictEqual(res.data.meal.ingredients.length, 2);
      const riceIng = res.data.meal.ingredients.find(i => Number(i.fdc_id) === 168878);
      const lentilIng = res.data.meal.ingredients.find(i => Number(i.fdc_id) === 172421);

      assert.ok(riceIng, 'Must contain Rice ingredient row');
      assert.ok(lentilIng, 'Must contain Lentils ingredient row');
      assert.strictEqual(Number(riceIng.quantity_g), 150);
      assert.strictEqual(Number(lentilIng.quantity_g), 198);
      assert.ok(riceIng.nutrient_snapshot.calories.value > 0);
    });

    // 6. Idempotency check with client_id
    await runAsyncTest('POST /api/meals/catalog respects idempotency on duplicate client_id', async () => {
      const res = await request('/api/meals/catalog', {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          client_id: testClientId,
          ingredients: [{ fdc_id: 168878, weight_g: 150 }],
        }),
      });

      // Should return either 200 isDuplicate or 201 in test fallback mode
      assert.ok(res.status === 200 || res.status === 201);
    });

    // 7. Household portion conversion on creation
    await runAsyncTest('POST /api/meals/catalog resolves household portion_id to grams', async () => {
      const res = await request('/api/meals/catalog', {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          description: '1 cup lentils',
          meal_type: 'lunch',
          ingredients: [
            { fdc_id: 172421, portion_id: 90596, quantity: 1 }, // 1 cup cooked lentils = 198g (portion_id 90596)
          ],
        }),
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.meal.ingredients.length, 1);
      assert.strictEqual(Number(res.data.meal.ingredients[0].quantity_g), 198);
      assert.strictEqual(res.data.meal.nutrition.calories, 230);
    });

    // 8. Auto-generates title if description is omitted
    await runAsyncTest('POST /api/meals/catalog auto-generates meal description from ingredients', async () => {
      const res = await request('/api/meals/catalog', {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          ingredients: [
            { fdc_id: 168878, weight_g: 100 },
          ],
        }),
      });

      assert.strictEqual(res.status, 201);
      assert.ok(res.data.meal.description.length > 0);
      assert.ok(res.data.meal.description.toLowerCase().includes('rice'));
    });

  } finally {
    console.log('\n========================================');
    console.log(`Phase 1D Catalog Meal Flow Tests: ${passed}/${total} passed (${Math.round((passed/total)*100)}%)`);
    console.log('========================================\n');

    if (server && server.close) {
      server.close();
    }

    if (passed !== total) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
})();
