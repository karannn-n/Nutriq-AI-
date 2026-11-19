/**
 * Nutriq Phase 2 Test Suite: Natural Language Meal Parsing Engine
 * 
 * Verifies:
 *  - Deterministic text normalization, number word replacement, compound fractions
 *  - Multi-item segmentation on conjunctions, punctuation, and prepositions
 *  - Ingredient entity extraction, preparation detection, and size modifiers
 *  - Curated Indian aliases and USDA FoodData Central entity resolution
 *  - Portion weight resolution from household units to exact grams
 *  - Ambiguity detection and candidate selection prompts
 *  - Missing portion handling for unspecified quantities ("some salad")
 *  - All 6 benchmark sentences from the Phase 2 specification
 *  - POST /api/meals/parse HTTP API endpoint (draft analysis without database persistence)
 *  - POST /api/meals decoupling (Gemini decoupled for text, local_nlp engine)
 *  - Future ML training schema with character spans and opt-in flag
 */

const assert = require('assert');

process.env.NODE_ENV = 'test';
process.env.PORT = '5095';
const { app, server } = require('./server');
const { mealParserService } = require('./services/mealParserService');
const { foodCatalogService } = require('./services/foodCatalogService');

const BASE_URL = 'http://localhost:5095';
const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer test-mock-token',
};

console.log('\n🧪 Starting Nutriq Phase 2 Natural Language Meal Parser Tests...\n');

let passed = 0;
let total = 0;

async function runTest(name, fn) {
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
    // ─── UNIT TESTS: mealParserService Core Pipeline ─────────────────────────

    await runTest('1. Benchmark 1: "I had 2 rotis, one bowl of dal and a cup of curd."', () => {
      const res = mealParserService.parseMeal('I had 2 rotis, one bowl of dal and a cup of curd.');
      assert.strictEqual(res.ingredients.length, 3);
      assert.strictEqual(res.status, 'needs_confirmation');
      assert.strictEqual(res.has_ambiguities, true);

      // Rotis
      const roti = res.ingredients[0];
      assert.strictEqual(roti.quantity, 2);
      assert.strictEqual(roti.unit, 'piece');
      assert.strictEqual(roti.fdc_id, 174075);
      assert.strictEqual(roti.weight_g, 86);
      assert.strictEqual(roti.status, 'confirmed');

      // Dal (Ambiguous)
      const dal = res.ingredients[1];
      assert.strictEqual(dal.quantity, 1);
      assert.strictEqual(dal.unit, 'bowl');
      assert.strictEqual(dal.status, 'ambiguous_food');
      assert.ok(dal.candidates.length >= 3);
      assert.ok(res.clarifications.some(c => c.type === 'ambiguous_food' && c.question.includes('dal')));

      // Curd
      const curd = res.ingredients[2];
      assert.strictEqual(curd.quantity, 1);
      assert.strictEqual(curd.unit, 'cup');
      assert.strictEqual(curd.fdc_id, 171284);
      assert.strictEqual(curd.weight_g, 245);
      assert.strictEqual(curd.status, 'confirmed');
    });

    await runTest('2. Benchmark 2: "Breakfast was 3 boiled eggs with 2 slices of toast and a banana."', () => {
      const res = mealParserService.parseMeal('Breakfast was 3 boiled eggs with 2 slices of toast and a banana.');
      assert.strictEqual(res.ingredients.length, 3);
      assert.strictEqual(res.status, 'ready');
      assert.strictEqual(res.has_ambiguities, false);
      assert.strictEqual(res.has_missing_portions, false);

      // Eggs
      const eggs = res.ingredients[0];
      assert.strictEqual(eggs.quantity, 3);
      assert.strictEqual(eggs.weight_g, 150);
      assert.strictEqual(eggs.fdc_id, 173424);
      assert.strictEqual(eggs.preparation, 'boiled');

      // Toast
      const toast = res.ingredients[1];
      assert.strictEqual(toast.quantity, 2);
      assert.strictEqual(toast.weight_g, 50);
      assert.strictEqual(toast.fdc_id, 172689);

      // Banana
      const banana = res.ingredients[2];
      assert.strictEqual(banana.quantity, 1);
      assert.strictEqual(banana.weight_g, 118);
      assert.strictEqual(banana.fdc_id, 173944);

      // Nutrition calculated
      assert.ok(res.calculated_nutrition);
      assert.ok(res.calculated_nutrition.totals.calories.amount > 400);
      assert.ok(res.calculated_nutrition.totals.protein_g.amount > 20);
    });

    await runTest('3. Benchmark 3: "I ate around 150 grams of paneer with 1 cup cooked rice."', () => {
      const res = mealParserService.parseMeal('I ate around 150 grams of paneer with 1 cup cooked rice.');
      assert.strictEqual(res.ingredients.length, 2);
      assert.strictEqual(res.status, 'needs_confirmation');

      // Paneer
      const paneer = res.ingredients[0];
      assert.strictEqual(paneer.quantity, 150);
      assert.strictEqual(paneer.unit, 'g');
      assert.strictEqual(paneer.weight_g, 150);
      assert.strictEqual(paneer.status, 'ambiguous_food');

      // Cooked rice
      const rice = res.ingredients[1];
      assert.strictEqual(rice.quantity, 1);
      assert.strictEqual(rice.unit, 'cup');
      assert.strictEqual(rice.weight_g, 158);
      assert.strictEqual(rice.fdc_id, 168878);
      assert.strictEqual(rice.status, 'confirmed');
    });

    await runTest('4. Benchmark 4: "Had a plate of chicken biryani with a glass of buttermilk."', () => {
      const res = mealParserService.parseMeal('Had a plate of chicken biryani with a glass of buttermilk.');
      assert.strictEqual(res.ingredients.length, 2);
      assert.strictEqual(res.status, 'ready');

      // Chicken biryani
      const biryani = res.ingredients[0];
      assert.strictEqual(biryani.quantity, 1);
      assert.strictEqual(biryani.unit, 'plate');
      assert.strictEqual(biryani.fdc_id, 2706538);
      assert.ok(biryani.weight_g > 150);

      // Buttermilk
      const buttermilk = res.ingredients[1];
      assert.strictEqual(buttermilk.quantity, 1);
      assert.strictEqual(buttermilk.unit, 'glass');
      assert.strictEqual(buttermilk.fdc_id, 167697);
      assert.strictEqual(buttermilk.weight_g, 245);
    });

    await runTest('5. Benchmark 5: "One small bowl of moong dal, 2 chapatis and some spinach sabzi."', () => {
      const res = mealParserService.parseMeal('One small bowl of moong dal, 2 chapatis and some spinach sabzi.');
      assert.strictEqual(res.ingredients.length, 3);
      assert.strictEqual(res.status, 'needs_confirmation');
      assert.strictEqual(res.has_missing_portions, true);

      // Moong dal
      const moong = res.ingredients[0];
      assert.strictEqual(moong.fdc_id, 169137);
      assert.strictEqual(moong.status, 'confirmed');
      assert.strictEqual(moong.weight_g, 93); // 0.5 * 186g for small bowl

      // Chapatis
      const chapati = res.ingredients[1];
      assert.strictEqual(chapati.quantity, 2);
      assert.strictEqual(chapati.fdc_id, 174075);
      assert.strictEqual(chapati.weight_g, 86);

      // Spinach sabzi
      const spinach = res.ingredients[2];
      assert.strictEqual(spinach.status, 'missing_portion');
      assert.strictEqual(spinach.quantity, null);
      assert.strictEqual(spinach.weight_g, null);
      assert.ok(res.clarifications.some(c => c.type === 'missing_portion'));
    });

    await runTest('6. Benchmark 6: "200g grilled chicken, 100g rice and some salad."', () => {
      const res = mealParserService.parseMeal('200g grilled chicken, 100g rice and some salad.');
      assert.strictEqual(res.ingredients.length, 3);
      assert.strictEqual(res.status, 'needs_confirmation');

      // Chicken
      const chicken = res.ingredients[0];
      assert.strictEqual(chicken.quantity, 200);
      assert.strictEqual(chicken.weight_g, 200);
      assert.strictEqual(chicken.fdc_id, 171477);
      assert.strictEqual(chicken.preparation, 'grilled');

      // Rice (Ambiguous white vs brown)
      const rice = res.ingredients[1];
      assert.strictEqual(rice.quantity, 100);
      assert.strictEqual(rice.weight_g, 100);
      assert.strictEqual(rice.status, 'ambiguous_food');

      // Salad (Missing portion)
      const salad = res.ingredients[2];
      assert.strictEqual(salad.status, 'missing_portion');
    });

    await runTest('7. Handles fractions, compound fractions, and number words', () => {
      const res = mealParserService.parseMeal('half a cup of oats, 1/4 cup of almonds and two bananas');
      assert.strictEqual(res.ingredients.length, 3);

      const oats = res.ingredients[0];
      assert.strictEqual(oats.quantity, 0.5);
      assert.strictEqual(oats.unit, 'cup');

      const almonds = res.ingredients[1];
      assert.strictEqual(almonds.quantity, 0.25);
      assert.strictEqual(almonds.unit, 'cup');

      const bananas = res.ingredients[2];
      assert.strictEqual(bananas.quantity, 2);
      assert.strictEqual(bananas.unit, 'piece');
    });

    await runTest('8. Future ML training annotation schema conforms to specification', () => {
      const text = 'I had 2 rotis and 1 cup curd';
      const parsed = mealParserService.parseMeal(text);
      const ml = mealParserService.formatMlAnnotation(text, parsed.ingredients, [], true);

      assert.strictEqual(ml.raw_text, text);
      assert.strictEqual(ml.allowed_for_training, true);
      assert.ok(Array.isArray(ml.entities));
      assert.ok(ml.entities.some(e => e.entity_type === 'FOOD'));
      assert.ok(ml.entities.some(e => e.entity_type === 'QUANTITY'));
      assert.ok(ml.entities.some(e => e.entity_type === 'UNIT'));

      // Check opt-out privacy enforcement
      const optOut = mealParserService.formatMlAnnotation(text, parsed.ingredients, [], false);
      assert.strictEqual(optOut.allowed_for_training, false);
    });

    // ─── INTEGRATION TESTS: HTTP API Endpoints ───────────────────────────────

    await runTest('9. POST /api/meals/parse returns structured draft without database write', async () => {
      const res = await request('/api/meals/parse', {
        method: 'POST',
        body: JSON.stringify({
          description: '3 boiled eggs with 2 slices of toast and a banana',
        }),
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'ready');
      assert.strictEqual(res.data.ingredient_count, 3);
      assert.ok(res.data.confidence_score >= 0.9);
      assert.ok(res.data.calculated_nutrition);
      assert.strictEqual(typeof res.data.calculated_nutrition.totals.calories.amount, 'number');
    });

    await runTest('10. POST /api/meals/parse returns clarification questions for ambiguous input', async () => {
      const res = await request('/api/meals/parse', {
        method: 'POST',
        body: JSON.stringify({
          description: '1 bowl of dal and 1 cup rice',
        }),
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'needs_confirmation');
      assert.strictEqual(res.data.has_ambiguities, true);
      assert.ok(res.data.clarifications.length >= 1);
      assert.ok(res.data.clarifications[0].options.length >= 2);
    });

    await runTest('11. POST /api/meals/parse rejects empty description with 400', async () => {
      const res = await request('/api/meals/parse', {
        method: 'POST',
        body: JSON.stringify({ description: '' }),
      });
      assert.strictEqual(res.status, 400);
    });

    await runTest('12. POST /api/meals routes text through local_nlp engine and saves when ready', async () => {
      const res = await request('/api/meals', {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          description: '3 boiled eggs with 2 slices of toast and a banana',
        }),
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.engine, 'local_nlp');
      assert.ok(res.data.meal.id);
      assert.ok(res.data.meal.nutrition);
      assert.ok(res.data.meal.nutrition.calories > 400);
    });

    await runTest('13. POST /api/meals prompts for confirmation when input is ambiguous', async () => {
      const res = await request('/api/meals', {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          description: '1 bowl of dal',
        }),
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.requiresConfirmation, true);
      assert.ok(res.data.parseResult.has_ambiguities);
      assert.ok(res.data.parseResult.clarifications.length > 0);
    });

    await runTest('14. POST /api/meals overrides confirmation when confirmAmbiguity: true', async () => {
      const res = await request('/api/meals', {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          description: '1 bowl of dal',
          confirmAmbiguity: true,
        }),
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.engine, 'local_nlp');
      assert.ok(res.data.meal.id);
    });

  } catch (err) {
    console.error('Fatal test error:', err);
  } finally {
    console.log('\n========================================');
    console.log(`Phase 2 Meal Parser Tests: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)`);
    console.log('========================================\n');

    if (server && server.close) {
      server.close();
    }
    process.exit(passed === total ? 0 : 1);
  }
})();

