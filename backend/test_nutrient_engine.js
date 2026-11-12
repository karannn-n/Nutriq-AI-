/**
 * Nutriq Local Nutrition Engine Test Suite
 * 
 * Verifies:
 * 1. Database loading and indexing of USDA FoodData Central records.
 * 2. Serving size and unit conversions (g, kg, oz, lb, cup, tbsp, slice, bowl).
 * 3. Exact deterministic nutrient calculations against USDA FDC verified benchmarks.
 * 4. Preservation of unknown/missing nutrient values as null (never assumed zero).
 * 5. Input validation (negative weights, zero weights, NaN, invalid units, missing food).
 * 6. Meal composition (summing multiple ingredients, composite meals).
 * 7. Ambiguity detection and portion confirmation handling.
 */

const assert = require('assert');
const { foodDatabase } = require('./services/foodDatabase');
const { calculateFoodNutrients, convertToGrams, ValidationError } = require('./services/nutrientCalculator');
const { calculateMealNutrition, parseMealDescription, parseIngredientString } = require('./services/mealComposition');

console.log('🧪 Starting Nutriq Local Food Nutrition Engine Test Suite...\n');

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

// ─── 1. Database Loading & Indexing Tests ────────────────────────────────────

runTest('FoodDatabase loads normalized USDA dataset with all required fields', () => {
  assert.ok(foodDatabase.count >= 40, `Expected at least 40 foods, found ${foodDatabase.count}`);
  const rice = foodDatabase.getById('usda_fdc_168878');
  assert.ok(rice, 'White rice must be found by ID');
  assert.strictEqual(rice.id, 'usda_fdc_168878');
  assert.strictEqual(rice.source.name, 'USDA FoodData Central');
  assert.strictEqual(rice.source.source_id, '168878');
  assert.ok(rice.nutrients_per_100g.calories, 'Has calories per 100g');
  assert.ok(rice.nutrients_per_100g.protein_g, 'Has protein per 100g');
  assert.ok(rice.nutrients_per_100g.carbs_g, 'Has carbs per 100g');
  assert.ok(rice.nutrients_per_100g.fat_g, 'Has fat per 100g');
  assert.ok(rice.nutrients_per_100g.vitamin_d_mcg, 'Has vitamin D per 100g');
  assert.ok(rice.nutrients_per_100g.iron_mg, 'Has iron per 100g');
  assert.ok(rice.nutrients_per_100g.zinc_mg, 'Has zinc per 100g');
  assert.ok(rice.nutrients_per_100g.b12_mcg, 'Has b12 per 100g');
});

runTest('FoodDatabase resolves foods by colloquial alias and exact names', () => {
  // Test Indian staples
  const dalMatch = foodDatabase.matchFood('dal');
  assert.ok(dalMatch.match, 'Should match dal to lentils');
  assert.strictEqual(dalMatch.match.id, 'usda_fdc_172421');

  const chawalMatch = foodDatabase.matchFood('chawal');
  assert.ok(chawalMatch.match, 'Should match chawal to white rice');

  const palakMatch = foodDatabase.matchFood('palak');
  assert.ok(palakMatch.match, 'Should match palak to spinach');

  const chanaMatch = foodDatabase.matchFood('chana');
  assert.ok(chanaMatch.match, 'Should match chana to chickpeas');
});

// ─── 2. Serving Size & Unit Conversion Tests ─────────────────────────────────

runTest('convertToGrams handles universal metric and imperial units accurately', () => {
  assert.strictEqual(convertToGrams(100, 'g'), 100);
  assert.strictEqual(convertToGrams(1, 'kg'), 1000);
  assert.strictEqual(convertToGrams(2, 'ounces'), 56.699); // 2 * 28.3495
  assert.strictEqual(convertToGrams(1, 'lb'), 453.592);
});

runTest('convertToGrams resolves food-specific portion weights', () => {
  const lentils = foodDatabase.getById('usda_fdc_172421');
  const bread = foodDatabase.getById('usda_fdc_172688');
  const egg = foodDatabase.getById('usda_fdc_171287');

  // 1 cup lentils = 198g in USDA SR Legacy
  assert.strictEqual(convertToGrams(1, 'cup', lentils), 198);
  assert.strictEqual(convertToGrams(2, 'cups', lentils), 396);

  // 1 slice bread = 32g
  assert.strictEqual(convertToGrams(2, 'slices', bread), 64);

  // 1 large egg = 50g
  assert.strictEqual(convertToGrams(3, 'eggs', egg), 150);
});

// ─── 3. Deterministic Formula Verification Against USDA Benchmarks ───────────

runTest('calculateFoodNutrients calculates exact USDA benchmark values for White Rice', () => {
  // USDA FDC 168878 per 100g:
  // Calories: 130 kcal, Protein: 2.69g, Carbs: 28.17g, Fat: 0.28g, Iron: 1.20mg, Zinc: 0.49mg
  const rice = foodDatabase.getById('usda_fdc_168878');
  
  // Calculate for 150g serving:
  // nutrient = per_100g * 150 / 100
  const result = calculateFoodNutrients(rice, 150, 'g');

  assert.strictEqual(result.gram_weight, 150);
  assert.strictEqual(result.nutrients.calories.value, 195); // 130 * 1.5 = 195
  assert.strictEqual(result.nutrients.protein_g.value, 4.04); // 2.69 * 1.5 = 4.035 -> 4.04
  assert.strictEqual(result.nutrients.carbs_g.value, 42.26); // 28.17 * 1.5 = 42.255 -> 42.26
  assert.strictEqual(result.nutrients.fat_g.value, 0.42); // 0.28 * 1.5 = 0.42
  assert.strictEqual(result.nutrients.iron_mg.value, 1.80); // 1.20 * 1.5 = 1.80
  assert.strictEqual(result.nutrients.zinc_mg.value, 0.74); // 0.49 * 1.5 = 0.735 -> 0.74
  assert.strictEqual(result.nutrients.vitamin_d_mcg.value, 0);
  assert.strictEqual(result.nutrients.b12_mcg.value, 0);
});

runTest('calculateFoodNutrients calculates exact USDA benchmark values for Cooked Salmon Fillet', () => {
  // USDA FDC 173686 per 100g:
  // Calories: 206 kcal, Protein: 22.10g, Fat: 12.35g, Vitamin D: 10.9 mcg, Vitamin B12: 3.18 mcg
  const salmon = foodDatabase.getById('usda_fdc_173686');
  
  // Calculate for 200g
  const result = calculateFoodNutrients(salmon, 200, 'g');

  assert.strictEqual(result.gram_weight, 200);
  assert.strictEqual(result.nutrients.calories.value, 412); // 206 * 2
  assert.strictEqual(result.nutrients.protein_g.value, 44.20); // 22.10 * 2
  assert.strictEqual(result.nutrients.fat_g.value, 24.70); // 12.35 * 2
  assert.strictEqual(result.nutrients.vitamin_d_mcg.value, 21.80); // 10.9 * 2
  assert.strictEqual(result.nutrients.b12_mcg.value, 6.36); // 3.18 * 2
});

// ─── 4. Missing Nutrient Preservation (Never Assume Zero) ────────────────────

runTest('Preserves unmeasured/unknown nutrient values as null rather than assuming zero', () => {
  // FDC 990001: Wild Morel Mushroom has unanalyzed Vitamin D and B12 (null)
  const morel = foodDatabase.getById('usda_fdc_990001');
  assert.ok(morel, 'Morel mushroom test food should exist');

  const result = calculateFoodNutrients(morel, 100, 'g');

  // Measured nutrients should have exact numbers
  assert.strictEqual(result.nutrients.calories.value, 31);
  assert.strictEqual(result.nutrients.iron_mg.value, 12.18);
  assert.strictEqual(result.nutrients.zinc_mg.value, 2.03);

  // UNMEASURED nutrients MUST BE NULL, NOT ZERO!
  assert.strictEqual(result.nutrients.vitamin_d_mcg.value, null, 'Vitamin D must be null');
  assert.strictEqual(result.nutrients.vitamin_d_mcg.isUnknown, true, 'Vitamin D must be flagged as isUnknown');
  assert.strictEqual(result.nutrients.b12_mcg.value, null, 'Vitamin B12 must be null');
  assert.strictEqual(result.nutrients.b12_mcg.isUnknown, true, 'Vitamin B12 must be flagged as isUnknown');

  assert.strictEqual(result.meta.all_nutrients_known, false);
  assert.ok(result.meta.unknown_nutrients.includes('vitamin_d_mcg'));
  assert.ok(result.meta.unknown_nutrients.includes('b12_mcg'));
});

// ─── 5. Input Validation & Error Handling Tests ──────────────────────────────

runTest('Validates inputs and rejects negative or zero serving sizes', () => {
  const rice = foodDatabase.getById('usda_fdc_168878');

  assert.throws(() => {
    calculateFoodNutrients(rice, -50, 'g');
  }, /Quantity must be greater than zero/);

  assert.throws(() => {
    calculateFoodNutrients(rice, 0, 'g');
  }, /Quantity must be greater than zero/);

  assert.throws(() => {
    calculateFoodNutrients(rice, 'invalid_number', 'g');
  }, /Invalid numeric quantity/);

  assert.throws(() => {
    calculateFoodNutrients(rice, 100, 'unsupported_galaxy_units');
  }, /Unrecognized unit/);

  assert.throws(() => {
    calculateFoodNutrients(null, 100, 'g');
  }, /A valid food object is required/);
});

// ─── 6. Multi-Ingredient Meal Composition Tests ──────────────────────────────

runTest('calculateMealNutrition accurately sums nutrients for multi-ingredient meals', () => {
  // Test meal: 150g Rice + 1 cup Cooked Lentils (198g) + 100g Boiled Spinach
  const rice = foodDatabase.getById('usda_fdc_168878');
  const lentils = foodDatabase.getById('usda_fdc_172421');
  const spinach = foodDatabase.getById('usda_fdc_170460');

  const ingredients = [
    { food: rice, quantity: 150, unit: 'g', confirmed: true },
    { food: lentils, quantity: 1, unit: 'cup', confirmed: true }, // 198g
    { food: spinach, quantity: 100, unit: 'g', confirmed: true },
  ];

  const mealSummary = calculateMealNutrition(ingredients);

  // Total weight: 150 + 198 + 100 = 448g
  assert.strictEqual(mealSummary.total_weight_grams, 448);
  assert.strictEqual(mealSummary.ingredient_count, 3);
  assert.strictEqual(mealSummary.all_confirmed, true);

  // Expected totals:
  // Calories: Rice(195) + Lentils(116 * 1.98 = 229.68) + Spinach(23) = 447.68 -> 448
  const expectedCals = Math.round(195 + 229.68 + 23);
  assert.strictEqual(mealSummary.totals.calories.amount, 447.68);
  assert.strictEqual(mealSummary.db_compatible_nutrition.calories, expectedCals);

  // Protein: Rice(4.04) + Lentils(9.02 * 1.98 = 17.86) + Spinach(2.97) = 24.87g
  assert.strictEqual(mealSummary.totals.protein_g.amount, 24.87);
  assert.strictEqual(mealSummary.db_compatible_nutrition.protein_g, 24.87);

  // Iron: Rice(1.80) + Lentils(3.33 * 1.98 = 6.59) + Spinach(3.57) = 11.96mg
  assert.strictEqual(mealSummary.totals.iron_mg.amount, 11.96);
  assert.strictEqual(mealSummary.db_compatible_nutrition.iron_mg, 11.96);

  // Zinc: Rice(0.74) + Lentils(1.27 * 1.98 = 2.51) + Spinach(0.76) = 4.01mg
  assert.strictEqual(mealSummary.totals.zinc_mg.amount, 4.01);
  assert.strictEqual(mealSummary.db_compatible_nutrition.zinc_mg, 4.01);
});

runTest('Meal composition transparently flags partial sums when an ingredient has unknown nutrients', () => {
  const rice = foodDatabase.getById('usda_fdc_168878');
  const morel = foodDatabase.getById('usda_fdc_990001'); // Unknown Vit D and B12

  const ingredients = [
    { food: rice, quantity: 150, unit: 'g', confirmed: true },
    { food: morel, quantity: 100, unit: 'g', confirmed: true },
  ];

  const mealSummary = calculateMealNutrition(ingredients);

  // Iron is known in both: Rice(1.80) + Morel(12.18) = 13.98
  assert.strictEqual(mealSummary.totals.iron_mg.amount, 13.98);
  assert.strictEqual(mealSummary.totals.iron_mg.isComplete, true);

  // Vitamin D is unknown in Morel: should be flagged as partial!
  assert.strictEqual(mealSummary.totals.vitamin_d_mcg.isComplete, false);
  assert.ok(mealSummary.totals.vitamin_d_mcg.missingIn.includes('Wild Morel Mushroom'));
});

// ─── 7. Ambiguity Detection & User Confirmation Tests ────────────────────────

runTest('parseMealDescription detects ambiguous foods and requests user confirmation', () => {
  // "milk" matches multiple types: whole milk, skim milk, soy milk, almond milk
  const parseResult = parseMealDescription('1 glass milk and 1 apple');

  assert.ok(parseResult.requires_user_confirmation, 'Must require confirmation for ambiguous milk');
  assert.strictEqual(parseResult.ambiguous_ingredients.length, 1);
  
  const milkItem = parseResult.ambiguous_ingredients[0];
  assert.strictEqual(milkItem.food_query, 'milk');
  assert.ok(milkItem.candidates.length > 1, 'Should return candidate milk variants');
  assert.ok(milkItem.candidates.some(c => c.name.includes('Whole Milk')));
  assert.ok(milkItem.candidates.some(c => c.name.includes('Skim Milk')));
});

runTest('parseMealDescription detects missing portion weights and requests user confirmation', () => {
  // "rice, lentils and vegetables" has missing portions and ambiguous foods
  const parseResult = parseMealDescription('rice, lentils and vegetables');

  assert.ok(parseResult.requires_user_confirmation, 'Must require confirmation for missing portions');
  assert.ok(parseResult.ambiguous_ingredients.length >= 2, 'Ingredients should be flagged for portion clarification');

  for (const item of parseResult.ambiguous_ingredients) {
    assert.strictEqual(item.requiresConfirmation, true);
    assert.ok(item.reasons.length > 0);
  }
});

runTest('parseMealDescription cleanly parses fully specified composite meal', () => {
  const parseResult = parseMealDescription('150g white rice, 1 cup lentils and 100g boiled spinach');

  assert.strictEqual(parseResult.requires_user_confirmation, false);
  assert.strictEqual(parseResult.confirmed_ingredients.length, 3);
  assert.ok(parseResult.nutrition, 'Calculates deterministic nutrition immediately for confirmed meal');
  assert.strictEqual(parseResult.nutrition.ingredient_count, 3);
  assert.ok(parseResult.nutrition.totals.calories.amount > 400);
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n========================================');
console.log(`Local Nutrient Engine Tests: ${passed}/${total} passed (${Math.round((passed/total)*100)}%)`);
console.log('========================================\n');

if (passed !== total) {
  process.exit(1);
}

