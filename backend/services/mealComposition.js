/**
 * Meal Composition & Multi-Ingredient Nutrition Aggregator
 * 
 * Supports multi-ingredient composite meals, deterministic nutrient summation,
 * ambiguity detection, duplicate ingredient consolidation, and portion confirmation requests.
 */

const { foodDatabase } = require('./foodDatabase');
const { calculateFoodNutrients, convertToGrams, ValidationError } = require('./nutrientCalculator');

/**
 * Standard unit extraction regex patterns
 */
const UNIT_SYNONYMS = {
  g: ['g', 'gram', 'grams', 'gm'],
  kg: ['kg', 'kilogram', 'kilograms'],
  oz: ['oz', 'ounce', 'ounces'],
  lb: ['lb', 'lbs', 'pound', 'pounds'],
  cup: ['cup', 'cups', 'katori'],
  tbsp: ['tbsp', 'tablespoon', 'tablespoons'],
  tsp: ['tsp', 'teaspoon', 'teaspoons'],
  bowl: ['bowl', 'bowls', 'vati'],
  slice: ['slice', 'slices'],
  piece: ['piece', 'pieces', 'pc', 'pcs'],
  plate: ['plate', 'plates'],
  glass: ['glass', 'glasses'],
  fillet: ['fillet', 'fillets'],
  clove: ['clove', 'cloves'],
  breast: ['breast', 'breasts'],
  thigh: ['thigh', 'thighs'],
  egg: ['egg', 'eggs'],
  roti: ['roti', 'rotis', 'chapati', 'chapatis', 'phulka'],
  medium: ['medium'],
  large: ['large'],
  small: ['small'],
};

function normalizeUnit(unitStr) {
  if (!unitStr) return 'g';
  const clean = unitStr.toLowerCase().trim();
  for (const [canonical, synonyms] of Object.entries(UNIT_SYNONYMS)) {
    if (synonyms.includes(clean)) return canonical;
  }
  return clean;
}

/**
 * Calculate totals for a multi-ingredient composite meal
 * 
 * Accepts an array of ingredients:
 * [
 *   { fdc_id: 172421, weight_g: 198 },
 *   { fdc_id: 171844, portion_id: 81549, quantity: 2 },
 *   { food_id: 'usda_168878', quantity: 150, unit: 'g' }
 * ]
 * 
 * @param {Array} ingredients - List of ingredient objects
 * @param {Object} [options] - Optional flags
 * @returns {Object} Deterministic meal nutrition summary
 */
function calculateMealNutrition(ingredients, options = {}) {
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    throw new ValidationError('A meal must contain at least one ingredient.', 'ingredients');
  }

  // 1. Deduplicate / consolidate identical ingredients (same food & same portion/unit)
  const consolidated = [];
  const seenFoodMap = new Map();

  for (let i = 0; i < ingredients.length; i++) {
    const rawItem = ingredients[i];
    if (!rawItem || typeof rawItem !== 'object') {
      throw new ValidationError(`Ingredient at index ${i} must be an object.`, 'ingredients');
    }

    const foodKey = rawItem.fdc_id || rawItem.food_id || rawItem.id || (rawItem.food && rawItem.food.fdc_id) || rawItem.name;
    const portionKey = rawItem.portion_id || rawItem.unit || 'g';
    const compositeKey = `${foodKey}__${portionKey}`;

    if (foodKey && seenFoodMap.has(compositeKey)) {
      // Consolidate quantity or weight
      const existing = seenFoodMap.get(compositeKey);
      if (rawItem.weight_g !== undefined && existing.weight_g !== undefined) {
        existing.weight_g += Number(rawItem.weight_g);
        existing.wasConsolidated = true;
      } else if (rawItem.quantity !== undefined && existing.quantity !== undefined) {
        existing.quantity += Number(rawItem.quantity);
        existing.wasConsolidated = true;
      } else {
        consolidated.push({ ...rawItem, originalIndex: i });
      }
    } else {
      const cloned = { ...rawItem, originalIndex: i };
      consolidated.push(cloned);
      if (foodKey) {
        seenFoodMap.set(compositeKey, cloned);
      }
    }
  }

  const ingredientResults = [];
  const unconfirmedItems = [];
  const totals = {
    calories: { value: 0, unit: 'kcal', isPartial: false, missingIn: [], knownCount: 0 },
    protein_g: { value: 0, unit: 'g', isPartial: false, missingIn: [], knownCount: 0 },
    carbs_g: { value: 0, unit: 'g', isPartial: false, missingIn: [], knownCount: 0 },
    fat_g: { value: 0, unit: 'g', isPartial: false, missingIn: [], knownCount: 0 },
    vitamin_d_mcg: { value: 0, unit: 'mcg', isPartial: false, missingIn: [], knownCount: 0 },
    iron_mg: { value: 0, unit: 'mg', isPartial: false, missingIn: [], knownCount: 0 },
    zinc_mg: { value: 0, unit: 'mg', isPartial: false, missingIn: [], knownCount: 0 },
    b12_mcg: { value: 0, unit: 'mcg', isPartial: false, missingIn: [], knownCount: 0 },
  };

  let totalWeightGrams = 0;

  for (let i = 0; i < consolidated.length; i++) {
    const item = consolidated[i];

    // Check if item was marked unconfirmed by caller
    if (item.confirmed === false || item.requiresConfirmation) {
      unconfirmedItems.push({
        index: item.originalIndex ?? i,
        item,
        reason: item.reason || 'Ingredient confirmation required before calculation.',
      });
      continue;
    }

    // Resolve food entity
    let food = item.food;
    if (!food || typeof food !== 'object') {
      const foodId = item.fdc_id || item.food_id || item.id;
      if (foodId) {
        food = foodDatabase.getById(foodId);
      } else if (item.name) {
        const matchResult = foodDatabase.matchFood(item.name);
        if (matchResult.match) {
          food = matchResult.match;
        } else {
          unconfirmedItems.push({
            index: item.originalIndex ?? i,
            item,
            reason: matchResult.reason || `Food '${item.name}' could not be unambiguously resolved.`,
            candidates: matchResult.candidates || [],
          });
          continue;
        }
      }
    }

    if (!food) {
      unconfirmedItems.push({
        index: item.originalIndex ?? i,
        item,
        reason: `Food ID '${item.fdc_id || item.food_id || item.id || item.name}' not found in database.`,
      });
      continue;
    }

    // Determine weight/portion specification
    let calcOptions;
    if (item.weight_g !== undefined && item.weight_g !== null) {
      calcOptions = { weight_g: item.weight_g };
    } else if (item.portion_id) {
      calcOptions = { portion_id: item.portion_id, quantity: item.quantity !== undefined ? item.quantity : 1 };
    } else if (item.quantity !== undefined && item.quantity !== null) {
      calcOptions = { quantity: item.quantity, unit: item.unit || 'g' };
    } else {
      unconfirmedItems.push({
        index: item.originalIndex ?? i,
        item,
        foodName: food.common_name || food.name,
        reason: `Missing weight_g or portion specification for '${food.common_name || food.name}'.`,
      });
      continue;
    }

    // Calculate individual nutrients
    const calculated = calculateFoodNutrients(food, calcOptions);
    ingredientResults.push({
      ...calculated,
      was_consolidated: Boolean(item.wasConsolidated),
    });
    totalWeightGrams += calculated.gram_weight;

    // Sum nutrients into aggregate totals
    for (const [key, nutInfo] of Object.entries(calculated.nutrients)) {
      if (totals[key]) {
        if (nutInfo.isUnknown || nutInfo.value === null) {
          totals[key].isPartial = true;
          totals[key].missingIn.push(calculated.food_name);
        } else {
          totals[key].value = Math.round((totals[key].value + nutInfo.value) * 100) / 100;
          totals[key].knownCount += 1;
        }
      }
    }
  }

  // Format final response
  const sanitizedTotals = {};
  for (const [key, nut] of Object.entries(totals)) {
    const allMissing = nut.knownCount === 0;
    sanitizedTotals[key] = {
      amount: allMissing ? null : nut.value,
      unit: nut.unit,
      isComplete: !nut.isPartial && !allMissing,
      missingIn: nut.missingIn,
    };
  }

  return {
    total_weight_grams: Math.round(totalWeightGrams * 10) / 10,
    ingredient_count: ingredientResults.length,
    ingredients: ingredientResults,
    totals: sanitizedTotals,
    // Flat database-compatible values for Supabase nutrition table
    db_compatible_nutrition: {
      calories: sanitizedTotals.calories.amount !== null ? Math.round(sanitizedTotals.calories.amount) : null,
      protein_g: sanitizedTotals.protein_g.amount,
      carbs_g: sanitizedTotals.carbs_g.amount,
      fat_g: sanitizedTotals.fat_g.amount,
      vitamin_d_mcg: sanitizedTotals.vitamin_d_mcg.amount,
      iron_mg: sanitizedTotals.iron_mg.amount,
      zinc_mg: sanitizedTotals.zinc_mg.amount,
      b12_mcg: sanitizedTotals.b12_mcg.amount,
    },
    unconfirmed_items: unconfirmedItems,
    has_unconfirmed_items: unconfirmedItems.length > 0,
    all_confirmed: unconfirmedItems.length === 0,
    source: 'USDA FoodData Central',
  };
}

/**
 * Parse a single ingredient text token (e.g. '150g basmati rice', '1 cup lentils', '2 eggs')
 */
function parseIngredientString(phrase) {
  const clean = phrase.trim();
  if (!clean) return null;

  const regex = /^([\d]+(?:\.[\d]+)?|\d+\/\d+)?\s*([a-zA-Z]+)?(?:\s+of)?\s+(.+)$/i;
  const match = clean.match(regex);

  let rawQty = null;
  let rawUnit = null;
  let foodQuery = clean;

  if (match) {
    if (match[1]) {
      if (match[1].includes('/')) {
        const [num, den] = match[1].split('/').map(Number);
        rawQty = den ? num / den : null;
      } else {
        rawQty = parseFloat(match[1]);
      }
    }

    if (match[2]) {
      const candidateUnit = match[2].toLowerCase();
      const normalizedUnit = normalizeUnit(candidateUnit);
      if (normalizedUnit) {
        rawUnit = normalizedUnit;
        foodQuery = match[3] ? match[3].trim() : '';
      } else {
        foodQuery = `${match[2]} ${match[3] || ''}`.trim();
      }
    } else if (match[3]) {
      foodQuery = match[3].trim();
    }
  }

  // Fused number + unit (e.g. "150g rice")
  const fusedMatch = clean.match(/^(\d+(?:\.\d+)?)(g|kg|oz|lb|cup|tbsp|tsp|pc|pcs)\s+(.+)$/i);
  if (fusedMatch) {
    rawQty = parseFloat(fusedMatch[1]);
    rawUnit = normalizeUnit(fusedMatch[2]);
    foodQuery = fusedMatch[3].trim();
  }

  // Match food against local catalog
  const matchResult = foodDatabase.matchFood(foodQuery);

  if (matchResult.match) {
    const isMissingQty = rawQty === null || rawQty <= 0;
    const reasonMsg = isMissingQty ? `Please confirm serving quantity for '${matchResult.match.common_name}'.` : null;
    return {
      raw_text: clean,
      food_name: foodQuery,
      food_query: foodQuery,
      food: matchResult.match,
      quantity: rawQty,
      unit: rawUnit || 'g',
      requires_confirmation: isMissingQty,
      requiresConfirmation: isMissingQty,
      reason: reasonMsg,
      reasons: reasonMsg ? [reasonMsg] : [],
      available_portions: matchResult.match.portions || [],
    };
  }

  if (matchResult.isAmbiguous) {
    const reasonMsg = matchResult.reason || `Multiple matches found for '${foodQuery}'. Please confirm the exact food variant.`;
    return {
      raw_text: clean,
      food_name: foodQuery,
      food_query: foodQuery,
      quantity: rawQty,
      unit: rawUnit || 'g',
      requires_confirmation: true,
      requiresConfirmation: true,
      reason: reasonMsg,
      reasons: [reasonMsg],
      candidates: matchResult.candidates || [],
    };
  }

  const notFoundReason = `Food '${foodQuery}' was not recognized in the local USDA database.`;
  return {
    raw_text: clean,
    food_name: foodQuery,
    food_query: foodQuery,
    quantity: rawQty,
    unit: rawUnit || 'g',
    requires_confirmation: true,
    requiresConfirmation: true,
    reason: notFoundReason,
    reasons: [notFoundReason],
    candidates: [],
  };
}

/**
 * Natural language meal parser decomposing multi-item meal descriptions
 */
function parseMealDescription(description) {
  if (!description || typeof description !== 'string') {
    throw new ValidationError('A non-empty meal description string is required.', 'description');
  }

  // Split phrases by delimiters
  const rawPhrases = description
    .split(/[,;\n\+]|\band\b|\bwith\b|\bplus\b/i)
    .map(p => p.trim())
    .filter(p => p.length > 0 && !/^(a|an|the|some|of)$/i.test(p));

  if (rawPhrases.length === 0) {
    throw new ValidationError('Could not extract any food items from the provided text.', 'description');
  }

  const parsedIngredients = [];
  const ambiguousItems = [];
  const missingQuantityItems = [];
  const confirmedIngredients = [];

  for (const phrase of rawPhrases) {
    const parsed = parseIngredientString(phrase);
    if (!parsed) continue;

    parsedIngredients.push(parsed);

    if (parsed.food && parsed.quantity !== null && parsed.quantity > 0) {
      confirmedIngredients.push({
        food: parsed.food,
        food_id: parsed.food.id,
        quantity: parsed.quantity,
        unit: parsed.unit || 'g',
        confirmed: true,
      });
    } else if (parsed.food && (parsed.quantity === null || parsed.quantity <= 0)) {
      missingQuantityItems.push(parsed);
    } else {
      ambiguousItems.push(parsed);
    }
  }

  const requiresConfirmation = ambiguousItems.length > 0 || missingQuantityItems.length > 0;
  const allAmbiguous = [...ambiguousItems, ...missingQuantityItems];

  // Calculate nutrition for confirmed items
  let calculatedNutrition = null;
  if (confirmedIngredients.length > 0) {
    calculatedNutrition = calculateMealNutrition(confirmedIngredients);
  }

  return {
    original_description: description,
    original_text: description,
    total_parsed_items: parsedIngredients.length,
    confirmed_items_count: confirmedIngredients.length,
    confirmed_ingredients: confirmedIngredients,
    requires_user_confirmation: requiresConfirmation,
    confirmation_reasons: [
      ...ambiguousItems.map(a => a.reason),
      ...missingQuantityItems.map(m => m.reason),
    ],
    items: parsedIngredients,
    parsed_items: parsedIngredients,
    ambiguous_items: ambiguousItems,
    ambiguous_ingredients: allAmbiguous,
    missing_quantity_items: missingQuantityItems,
    nutrition: calculatedNutrition,
  };
}

module.exports = {
  calculateMealNutrition,
  parseMealDescription,
  parseIngredientString,
  normalizeUnit,
  UNIT_SYNONYMS,
};
