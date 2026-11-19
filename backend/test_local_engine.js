/**
 * Nutriq Local Nutrition Calculation Engine Test Suite (Phase 1C)
 * 
 * Comprehensive tests covering:
 *  1. Exact food search
 *  2. Alias-based search (Indian staples & colloquial foods)
 *  3. Ambiguous food handling (dal, roti, paneer, chana, biryani)
 *  4. Portion lookup from verified database
 *  5. Gram conversion (food-specific vs metric vs imperial)
 *  6. Single-ingredient calculations & Known verification case (Cooked lentils 198g)
 *  7. Multiple-ingredient calculations
 *  8. Missing nutrient preservation (null preservation, partial sums)
 *  9. Invalid food IDs rejection
 * 10. Invalid serving sizes rejection (negative, zero, NaN)
 * 11. Incorrect units rejection
 * 12. Data source traceability
 * 13. HTTP API Endpoints (/api/foods/search, /api/foods/:fdcId/portions, /api/nutrition/calculate)
 * 14. Performance benchmark (<5ms per query/calculation)
 */

const assert = require('assert');

// Port for test server
process.env.PORT = '5097';
const { app, server } = require('./server');
const BASE_URL = 'http://localhost:5097';

const { foodCatalogService, ValidationError } = require('./services/foodCatalogService');

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
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    }
  }
}

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

(async () => {
  console.log('\n🧪 Starting Nutriq Phase 1C Local Nutrition Engine Test Suite...\n');

  // ─── 1. Exact Food Search ────────────────────────────────────────────────────

  runTest('1. Exact food search by FDC ID and name', () => {
    // Numeric FDC ID
    const foodByNum = foodCatalogService.getById(172421);
    assert.ok(foodByNum, 'Must retrieve lentils by numeric FDC ID 172421');
    assert.strictEqual(foodByNum.fdc_id, 172421);
    assert.strictEqual(foodByNum.source.name, 'USDA FoodData Central');

    // String ID formats
    const foodByStr = foodCatalogService.getById('172421');
    assert.strictEqual(foodByStr.fdc_id, 172421);

    const foodByPrefix = foodCatalogService.getById('usda_172421');
    assert.strictEqual(foodByPrefix.fdc_id, 172421);

    const foodByFdcPrefix = foodCatalogService.getById('usda_fdc_172421');
    assert.strictEqual(foodByFdcPrefix.fdc_id, 172421);

    // Search exact text
    const searchExact = foodCatalogService.searchFoods('172421');
    assert.strictEqual(searchExact.count, 1);
    assert.strictEqual(searchExact.foods[0].fdc_id, 172421);
  });

  // ─── 2. Alias-based Search ───────────────────────────────────────────────────

  runTest('2. Alias-based search for Indian staples and common foods', () => {
    // Test distinct aliases
    const aliasesToTest = [
      { query: 'rajma', expectedFdc: 2707381 },
      { query: 'ghee', expectedFdc: 171314 },
      { query: 'samosa', expectedFdc: 2708730 },
      { query: 'chicken curry', expectedFdc: 2706437 },
      { query: 'chutney', expectedFdc: 2709309 },
      { query: 'whole milk', expectedFdc: 2705385 },
      { query: 'egg white', expectedFdc: 323697 },
      { query: 'banana', expectedFdc: 173944 },
      { query: 'apple', expectedFdc: 171688 },
    ];

    for (const item of aliasesToTest) {
      const res = foodCatalogService.searchFoods(item.query);
      assert.ok(res.count > 0, `Search '${item.query}' should return results`);
      const match = res.candidates.find(c => c.fdc_id === item.expectedFdc) || res.foods.find(f => f.fdc_id === item.expectedFdc);
      assert.ok(match, `Search '${item.query}' should contain FDC ${item.expectedFdc}`);
    }

    // Test fuzzy typo variations
    const typoCases = [
      { typo: 'dhal', canonical: 'dal' },
      { typo: 'panir', canonical: 'paneer' },
      { typo: 'channa', canonical: 'chana' },
      { typo: 'rooti', canonical: 'roti' },
      { typo: 'biriyani', canonical: 'biryani' },
      { typo: 'rajmah', canonical: 'rajma' },
      { typo: 'spinnach', canonical: 'spinach' },
    ];

    for (const tc of typoCases) {
      const res = foodCatalogService.searchFoods(tc.typo);
      assert.ok(res.count > 0, `Typo '${tc.typo}' should successfully match '${tc.canonical}'`);
      assert.ok(res.matched_alias === tc.canonical || res.candidates.length > 0);
    }
  });

  // ─── 3. Ambiguous Food Handling ──────────────────────────────────────────────

  runTest('3. Ambiguous food handling flags clarification and returns candidates', () => {
    const ambiguousQueries = [
      { term: 'dal', minCandidates: 3, promptKeyword: 'variety' },
      { term: 'roti', minCandidates: 2, promptKeyword: 'wheat' },
      { term: 'chawal', minCandidates: 2, promptKeyword: 'white' },
      { term: 'paneer', minCandidates: 2, promptKeyword: 'fresh' },
      { term: 'chana', minCandidates: 2, promptKeyword: 'cooked' },
      { term: 'dosa', minCandidates: 2, promptKeyword: 'plain' },
      { term: 'biryani', minCandidates: 3, promptKeyword: 'chicken' },
      { term: 'milk', minCandidates: 2, promptKeyword: 'whole' },
    ];

    for (const amb of ambiguousQueries) {
      const res = foodCatalogService.searchFoods(amb.term);
      assert.strictEqual(res.is_ambiguous, true, `'${amb.term}' must be flagged is_ambiguous = true`);
      assert.ok(res.clarification_prompt, `'${amb.term}' must include clarification_prompt`);
      assert.ok(res.candidates.length >= amb.minCandidates, `'${amb.term}' must have at least ${amb.minCandidates} candidates`);
      
      for (const cand of res.candidates) {
        assert.ok(cand.fdc_id, 'Candidate must have fdc_id');
        assert.ok(cand.common_name, 'Candidate must have common_name');
        assert.ok(Array.isArray(cand.portions), 'Candidate must include portions array');
      }
    }
  });

  // ─── 4. Portion Lookup ───────────────────────────────────────────────────────

  runTest('4. Portion lookup retrieves verified conversions from foods.db', () => {
    const portions = foodCatalogService.getPortionsForFood(172421);
    assert.ok(portions.length >= 2, 'Lentils must have at least 2 portions');
    
    const cup = portions.find(p => p.unit === 'cup' || p.modifier === 'cup');
    assert.ok(cup, 'Must have cup portion for lentils');
    assert.strictEqual(cup.gram_weight, 198);
    assert.strictEqual(cup.display_name, '1 cup (198.0 g)');

    const tbsp = portions.find(p => p.unit === 'tbsp' || p.modifier === 'tbsp');
    assert.ok(tbsp, 'Must have tbsp portion for lentils');
    assert.strictEqual(tbsp.gram_weight, 12.3);

    const portionById = foodCatalogService.getPortionById(cup.portion_id);
    assert.ok(portionById, 'Must retrieve portion by portion_id');
    assert.strictEqual(portionById.gram_weight, 198);
    assert.strictEqual(portionById.fdc_id, 172421);
  });

  // ─── 5. Gram Conversion ──────────────────────────────────────────────────────

  runTest('5. Gram conversion handles metric, imperial, and food-specific units', () => {
    const lentils = foodCatalogService.getById(172421);

    const resGrams = foodCatalogService.calculateSingleFoodNutrients(lentils, { weight_g: 100 });
    assert.strictEqual(resGrams.serving_weight_in_grams, 100);

    const resCup = foodCatalogService.calculateSingleFoodNutrients(lentils, { quantity: 1, unit: 'cup' });
    assert.strictEqual(resCup.serving_weight_in_grams, 198);

    const resTwoCups = foodCatalogService.calculateSingleFoodNutrients(lentils, { quantity: 2, unit: 'cups' });
    assert.strictEqual(resTwoCups.serving_weight_in_grams, 396);

    const resTbsp = foodCatalogService.calculateSingleFoodNutrients(lentils, { quantity: 2, unit: 'tbsp' });
    assert.strictEqual(resTbsp.serving_weight_in_grams, 24.6);

    const resKg = foodCatalogService.calculateSingleFoodNutrients(lentils, { quantity: 0.5, unit: 'kg' });
    assert.strictEqual(resKg.serving_weight_in_grams, 500);

    const resOz = foodCatalogService.calculateSingleFoodNutrients(lentils, { quantity: 1, unit: 'oz' });
    assert.strictEqual(resOz.serving_weight_in_grams, 28.35);
  });

  // ─── 6. Single-Ingredient Calculation & Known Verification Case ──────────────

  runTest('6. Known Verification Case: Cooked lentils, 198g matches USDA analytical standards', () => {
    const result = foodCatalogService.calculateSingleFoodNutrients(172421, { weight_g: 198 });

    assert.strictEqual(result.fdc_id, 172421);
    assert.strictEqual(result.serving_weight_in_grams, 198);

    // Formula: nutrient = (per100g * 198) / 100
    assert.strictEqual(result.nutrients.calories.value, 229.68);
    assert.strictEqual(result.nutrients.protein_g.value, 17.86);
    assert.strictEqual(result.nutrients.carbs_g.value, 39.86);
    assert.strictEqual(result.nutrients.fat_g.value, 0.75);
    assert.strictEqual(result.nutrients.iron_mg.value, 6.59);
    assert.strictEqual(result.nutrients.zinc_mg.value, 2.51);
    assert.strictEqual(result.nutrients.vitamin_d_mcg.value, 0);
    assert.strictEqual(result.nutrients.b12_mcg.value, 0);

    assert.strictEqual(result.completeness.all_nutrients_known, true);
    assert.strictEqual(result.completeness.completeness_percentage, 100);

    assert.strictEqual(result.source.name, 'USDA FoodData Central');
    assert.strictEqual(result.source.fdc_id, 172421);
  });

  // ─── 7. Multiple-Ingredient Calculations ─────────────────────────────────────

  runTest('7. Multiple-ingredient composite meal calculates aggregate totals and consolidates duplicates', () => {
    const mealPayload = [
      { fdc_id: 172421, weight_g: 198 },
      { fdc_id: 171844, weight_g: 60 },
      { fdc_id: 172421, weight_g: 100 }, // Duplicate of lentils
    ];

    const meal = foodCatalogService.calculateDeterministicNutrition(mealPayload);

    assert.strictEqual(meal.ingredient_count, 2);
    assert.strictEqual(meal.total_weight_grams, 358);

    const lentilIng = meal.ingredients.find(i => i.fdc_id === 172421);
    assert.ok(lentilIng);
    assert.strictEqual(lentilIng.serving_weight_in_grams, 298);
    assert.strictEqual(lentilIng.was_consolidated, true);

    const chapatiIng = meal.ingredients.find(i => i.fdc_id === 171844);
    assert.ok(chapatiIng);
    assert.strictEqual(chapatiIng.serving_weight_in_grams, 60);

    // Total Calories: (116 * 2.98 = 345.68) + (297 * 0.60 = 178.2) = 523.88 kcal
    assert.strictEqual(meal.totals.calories.amount, 523.88);
    // Total Protein: (9.02 * 2.98 = 26.88) + (11.25 * 0.60 = 6.75) = 33.63 g
    assert.strictEqual(meal.totals.protein_g.amount, 33.63);
  });

  // ─── 8. Missing Nutrient Handling (Null Preservation) ────────────────────────

  runTest('8. Missing nutrients are preserved as null and flagged as partial in meal totals', () => {
    const chapatiOnly = foodCatalogService.calculateSingleFoodNutrients(171844, { weight_g: 60 });
    
    assert.strictEqual(chapatiOnly.nutrients.vitamin_d_mcg.value, null);
    assert.strictEqual(chapatiOnly.nutrients.vitamin_d_mcg.isUnknown, true);
    assert.strictEqual(chapatiOnly.nutrients.b12_mcg.value, null);
    assert.strictEqual(chapatiOnly.nutrients.b12_mcg.isUnknown, true);
    assert.strictEqual(chapatiOnly.completeness.all_nutrients_known, false);
    assert.ok(chapatiOnly.completeness.unknown_nutrients.includes('vitamin_d_mcg'));
    assert.ok(chapatiOnly.completeness.unknown_nutrients.includes('b12_mcg'));

    const meal = foodCatalogService.calculateDeterministicNutrition([
      { fdc_id: 172421, weight_g: 100 },
      { fdc_id: 171844, weight_g: 60 },
    ]);

    assert.strictEqual(meal.totals.vitamin_d_mcg.is_partial, true);
    assert.strictEqual(meal.totals.vitamin_d_mcg.is_complete, false);
    assert.ok(meal.totals.vitamin_d_mcg.missing_in_ingredients.some(name => name.includes('Chapati')));

    assert.strictEqual(meal.completeness.all_nutrients_known, false);
    assert.ok(meal.completeness.has_partial_totals);
    assert.ok(meal.completeness.partial_nutrients.includes('vitamin_d_mcg'));
    assert.ok(meal.completeness.partial_nutrients.includes('b12_mcg'));
  });

  // ─── 9. Invalid Food IDs Rejection ───────────────────────────────────────────

  runTest('9. Rejects invalid and non-existent food IDs with 400/ValidationError', () => {
    assert.throws(
      () => foodCatalogService.calculateSingleFoodNutrients(999999999, { weight_g: 100 }),
      err => err instanceof ValidationError && err.field === 'food_id'
    );

    assert.throws(
      () => foodCatalogService.calculateDeterministicNutrition([{ fdc_id: 999999999, weight_g: 100 }]),
      err => err instanceof ValidationError && err.field === 'food_id'
    );

    assert.throws(
      () => foodCatalogService.calculateDeterministicNutrition([{ weight_g: 100 }]),
      err => err instanceof ValidationError && err.field === 'fdc_id'
    );
  });

  // ─── 10. Invalid Serving Sizes Rejection ─────────────────────────────────────

  runTest('10. Rejects negative, zero, and non-numeric serving sizes', () => {
    assert.throws(
      () => foodCatalogService.calculateSingleFoodNutrients(172421, { weight_g: -50 }),
      err => err instanceof ValidationError && err.field === 'weight_g'
    );

    assert.throws(
      () => foodCatalogService.calculateSingleFoodNutrients(172421, { weight_g: 0 }),
      err => err instanceof ValidationError && err.field === 'weight_g'
    );

    assert.throws(
      () => foodCatalogService.calculateSingleFoodNutrients(172421, { weight_g: 'invalid' }),
      err => err instanceof ValidationError && err.field === 'weight_g'
    );

    assert.throws(
      () => foodCatalogService.calculateDeterministicNutrition([{ fdc_id: 172421, weight_g: -10 }]),
      err => err instanceof ValidationError
    );
  });

  // ─── 11. Incorrect Units Rejection ───────────────────────────────────────────

  runTest('11. Rejects unverified or unsupported units for a given food', () => {
    assert.throws(
      () => foodCatalogService.calculateSingleFoodNutrients(172421, { quantity: 1, unit: 'gallons' }),
      err => err instanceof ValidationError && err.field === 'unit'
    );

    assert.throws(
      () => foodCatalogService.calculateSingleFoodNutrients(172421, { quantity: 1, unit: 'slices' }),
      err => err instanceof ValidationError && err.field === 'unit'
    );
  });

  // ─── 12. Data Source Traceability ────────────────────────────────────────────

  runTest('12. Preserves FDC ID, category, data_type, and publication_date', () => {
    const result = foodCatalogService.calculateSingleFoodNutrients(172421, { weight_g: 100 });
    
    assert.strictEqual(result.source.name, 'USDA FoodData Central');
    assert.strictEqual(result.source.fdc_id, 172421);
    assert.strictEqual(result.source.data_type, 'sr_legacy_food');
    assert.ok(result.source.publication_date, 'Must include publication date');
    assert.strictEqual(result.food_category, 'Legumes and Legume Products');
  });

  // ─── 13. HTTP API Endpoints Tests ────────────────────────────────────────────

  await runAsyncTest('13. HTTP API Endpoints (/api/foods/search, /api/foods/:fdcId/portions, /api/nutrition/calculate)', async () => {
    // 13a. GET /api/foods/search?q=dal
    const resSearch = await fetch(`${BASE_URL}/api/foods/search?q=dal`);
    assert.strictEqual(resSearch.status, 200);
    const dataSearch = await resSearch.json();
    assert.strictEqual(dataSearch.query, 'dal');
    assert.strictEqual(dataSearch.is_ambiguous, true);
    assert.ok(dataSearch.candidates.length >= 3);

    // 13b. GET /api/foods/search?q=panir (fuzzy spelling)
    const resFuzzy = await fetch(`${BASE_URL}/api/foods/search?q=panir`);
    assert.strictEqual(resFuzzy.status, 200);
    const dataFuzzy = await resFuzzy.json();
    assert.ok(dataFuzzy.count > 0);
    assert.ok(dataFuzzy.candidates.some(c => c.common_name.includes('Paneer')));

    // 13c. GET /api/foods/172421/portions
    const resPortions = await fetch(`${BASE_URL}/api/foods/172421/portions`);
    assert.strictEqual(resPortions.status, 200);
    const dataPortions = await resPortions.json();
    assert.strictEqual(dataPortions.fdc_id, 172421);
    assert.ok(dataPortions.portions.length >= 2);
    assert.ok(dataPortions.portions.some(p => p.unit === 'cup'));

    // 13d. POST /api/nutrition/calculate (Structured Phase 1C multi-ingredient payload)
    const resCalc = await fetch(`${BASE_URL}/api/nutrition/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredients: [
          { fdc_id: 172421, weight_g: 198 },
          { fdc_id: 171844, weight_g: 60 },
        ],
      }),
    });
    assert.strictEqual(resCalc.status, 200);
    const dataCalc = await resCalc.json();
    assert.strictEqual(dataCalc.ingredient_count, 2);
    assert.strictEqual(dataCalc.total_weight_grams, 258);
    assert.strictEqual(dataCalc.totals.calories.amount, 407.88); // 229.68 + 178.2 = 407.88
    assert.strictEqual(dataCalc.totals.protein_g.amount, 24.61); // 17.86 + 6.75 = 24.61
    assert.strictEqual(dataCalc.totals.iron_mg.amount, 8.4); // 6.59 + 1.81 = 8.40

    // 13e. POST /api/nutrition/calculate with portion_id
    const resPortionCalc = await fetch(`${BASE_URL}/api/nutrition/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredients: [
          { fdc_id: 172421, portion_id: 90596, quantity: 1 }, // 1 cup cooked lentils = 198g
        ],
      }),
    });
    assert.strictEqual(resPortionCalc.status, 200);
    const dataPortionCalc = await resPortionCalc.json();
    assert.strictEqual(dataPortionCalc.total_weight_grams, 198);
    assert.strictEqual(dataPortionCalc.totals.calories.amount, 229.68);

    // 13f. POST /api/nutrition/calculate error handling
    const resInvalid = await fetch(`${BASE_URL}/api/nutrition/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredients: [
          { fdc_id: 172421, weight_g: -50 },
        ],
      }),
    });
    assert.strictEqual(resInvalid.status, 400);
  });

  // ─── 14. Performance Benchmark ───────────────────────────────────────────────

  runTest('14. Sub-millisecond performance benchmark (<5ms per query)', () => {
    const iterations = 50;

    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) {
      foodCatalogService.searchFoods('dal');
    }
    const avgSearchMs = (performance.now() - t0) / iterations;
    console.log(`     Search avg latency: ${avgSearchMs.toFixed(3)} ms`);
    assert.ok(avgSearchMs < 5.0, `Search avg latency must be <5ms, was ${avgSearchMs.toFixed(3)}ms`);

    const t1 = performance.now();
    for (let i = 0; i < iterations; i++) {
      foodCatalogService.calculateDeterministicNutrition([
        { fdc_id: 172421, weight_g: 198 },
        { fdc_id: 171844, weight_g: 60 },
      ]);
    }
    const avgCalcMs = (performance.now() - t1) / iterations;
    console.log(`     Calculation avg latency: ${avgCalcMs.toFixed(3)} ms`);
    assert.ok(avgCalcMs < 5.0, `Calculation avg latency must be <5ms, was ${avgCalcMs.toFixed(3)}ms`);
  });

  // Close server and report results
  server.close(() => {
    console.log('\n========================================');
    console.log(`Local Nutrition Engine Tests: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)`);
    console.log('========================================\n');

    if (passed !== total) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
})();
