/**
 * Meal Composition & Natural Language Decomposition Service
 * 
 * Supports multi-ingredient composite meals, deterministic nutrient summation,
 * ambiguity detection, and portion confirmation requests.
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

/**
 * Calculate totals for a multi-ingredient composite meal
 * 
 * @param {Array} ingredients - List of ingredient objects
 * @returns {Object} Deterministic meal nutrition summary
 */
function calculateMealNutrition(ingredients, options = {}) {
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    throw new ValidationError('A meal must contain at least one ingredient.', 'ingredients');
  }

  const ingredientResults = [];
  const unconfirmedItems = [];
  const totals = {
    calories: { value: 0, unit: 'kcal', isPartial: false, missingIn: [] },
    protein_g: { value: 0, unit: 'g', isPartial: false, missingIn: [] },
    carbs_g: { value: 0, unit: 'g', isPartial: false, missingIn: [] },
    fat_g: { value: 0, unit: 'g', isPartial: false, missingIn: [] },
    vitamin_d_mcg: { value: 0, unit: 'mcg', isPartial: false, missingIn: [] },
    iron_mg: { value: 0, unit: 'mg', isPartial: false, missingIn: [] },
    zinc_mg: { value: 0, unit: 'mg', isPartial: false, missingIn: [] },
    b12_mcg: { value: 0, unit: 'mcg', isPartial: false, missingIn: [] },
  };

  let totalWeightGrams = 0;

  for (let i = 0; i < ingredients.length; i++) {
    const item = ingredients[i];

    // If marked unconfirmed or ambiguous and user didn't force-confirm
    if (item.confirmed === false || item.requiresConfirmation) {
      unconfirmedItems.push({
        index: i,
        item,
        reason: item.reason || 'Ingredient confirmation required before calculation.',
      });
      continue;
    }

    // Resolve food object
    let food = item.food;
    if (!food || typeof food !== 'object') {
      const foodId = item.food_id || item.id;
      if (foodId) {
        food = foodDatabase.getById(foodId);
      } else if (item.name) {
        const matchResult = foodDatabase.matchFood(item.name);
        if (matchResult.match) {
          food = matchResult.match;
        } else {
          unconfirmedItems.push({
            index: i,
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
        index: i,
        item,
        reason: `Ingredient at index ${i} is missing a valid food reference.`,
      });
      continue;
    }

    // Check quantity
    if (!item.quantity || Number(item.quantity) <= 0) {
      unconfirmedItems.push({
        index: i,
        item,
        foodName: food.common_name,
        reason: `Portion quantity missing or non-positive for ${food.common_name}.`,
      });
      continue;
    }

    const calculated = calculateFoodNutrients(food, item.quantity, item.unit || 'g');
    ingredientResults.push(calculated);
    totalWeightGrams += calculated.gram_weight;

    // Sum nutrients
    for (const [key, nutInfo] of Object.entries(calculated.nutrients)) {
      if (nutInfo.isUnknown || nutInfo.value === null) {
        totals[key].isPartial = true;
        totals[key].missingIn.push(calculated.food_name);
      } else {
        totals[key].value = Math.round((totals[key].value + nutInfo.value) * 100) / 100;
      }
    }
  }

  // Format final response
  const sanitizedTotals = {};
  for (const [key, nut] of Object.entries(totals)) {
    sanitizedTotals[key] = {
      amount: nut.value,
      unit: nut.unit,
      isComplete: !nut.isPartial,
      missingIn: nut.missingIn,
    };
  }

  return {
    total_weight_grams: Math.round(totalWeightGrams * 10) / 10,
    ingredient_count: ingredientResults.length,
    ingredients: ingredientResults,
    totals: sanitizedTotals,
    // Database-compatible flat nutrition values for existing Supabase schema
    db_compatible_nutrition: {
      calories: Math.round(totals.calories.value),
      protein_g: totals.protein_g.value,
      carbs_g: totals.carbs_g.value,
      fat_g: totals.fat_g.value,
      vitamin_d_mcg: totals.vitamin_d_mcg.value,
      iron_mg: totals.iron_mg.value,
      zinc_mg: totals.zinc_mg.value,
      b12_mcg: totals.b12_mcg.value,
    },
    unconfirmed_items: unconfirmedItems,
    has_unconfirmed_items: unconfirmedItems.length > 0,
    all_confirmed: unconfirmedItems.length === 0,
  };
}

/**
 * Parse a single ingredient text token (e.g. '150g basmati rice', '1 cup lentils', '2 eggs')
 */
function parseIngredientString(phrase) {
  const clean = phrase.trim();
  if (!clean) return null;

  // Regex to extract quantity, optional unit, and food name
  // Matches: "150g rice", "1.5 cups dal", "2 slices of bread", "1/2 cup spinach", "rice"
  const regex = /^([\d]+(?:\.[\d]+)?|\d+\/\d+)?\s*([a-zA-Z]+)?(?:\s+of)?\s+(.+)$/i;
  const match = clean.match(regex);

  let rawQty = null;
  let rawUnit = null;
  let foodQuery = clean;

  if (match) {
    if (match[1]) {
      // Fraction or decimal
      if (match[1].includes('/')) {
        const [num, den] = match[1].split('/').map(Number);
        rawQty = den ? num / den : null;
      } else {
        rawQty = parseFloat(match[1]);
      }
    }

    if (match[2]) {
      const candidateUnit = match[2].toLowerCase();
      // Check if candidateUnit is a known unit
      const normalizedUnit = normalizeUnit(candidateUnit);
      if (normalizedUnit) {
        rawUnit = normalizedUnit;
        foodQuery = match[3] ? match[3].trim() : '';
      } else {
        // Not a unit, might be part of the food name (e.g. "2 boiled eggs")
        foodQuery = `${match[2]} ${match[3] || ''}`.trim();
      }
    } else if (match[3]) {
      foodQuery = match[3].trim();
    }
  }

  // Also check if clean was just "150g rice" with no space between num & unit
  const fusedMatch = clean.match(/^(\d+(?:\.\d+)?)(g|kg|oz|lb|cup|tbsp|tsp|pc|pcs)\s+(.+)$/i);
  if (fusedMatch) {
    rawQty = parseFloat(fusedMatch[1]);
    rawUnit = normalizeUnit(fusedMatch[2]);
    foodQuery = fusedMatch[3].trim();
  }

  // Match food against local database
  const matchResult = foodDatabase.matchFood(foodQuery);

  // If unit wasn't explicitly given with a count (e.g. "1 apple", "2 eggs", "2 rotis")
  if (!rawUnit && rawQty !== null) {
    if (matchResult.match && matchResult.match.serving_weights_g) {
      const sw = matchResult.match.serving_weights_g;
      if (sw.egg) rawUnit = 'egg';
      else if (sw.roti) rawUnit = 'roti';
      else if (sw.slice) rawUnit = 'slice';
      else if (sw.medium) rawUnit = 'medium';
      else if (sw.piece) rawUnit = 'piece';
      else if (sw.fillet) rawUnit = 'fillet';
      else if (sw.breast) rawUnit = 'breast';
      else if (sw.thigh) rawUnit = 'thigh';
      else if (sw.serving) rawUnit = 'serving';
      else rawUnit = 'g';
    } else {
      rawUnit = 'g';
    }
  }

  const reasons = [];
  let requiresConfirmation = false;
  let status = 'confirmed';

  if (matchResult.isAmbiguous) {
    status = 'ambiguous';
    requiresConfirmation = true;
    reasons.push(matchResult.reason);
  } else if (matchResult.notFound) {
    status = 'not_found';
    requiresConfirmation = true;
    reasons.push(`Food '${foodQuery}' was not recognized in the local food database.`);
  }

  if (rawQty === null || rawQty <= 0) {
    requiresConfirmation = true;
    reasons.push(`Serving quantity for '${foodQuery}' was not specified. Please enter portion size.`);
    if (status === 'confirmed') status = 'missing_quantity';
  }

  return {
    raw_text: clean,
    food_query: foodQuery,
    parsed_quantity: rawQty,
    parsed_unit: rawUnit || 'g',
    matched_food: matchResult.match ? {
      id: matchResult.match.id,
      name: matchResult.match.common_name,
      food_group: matchResult.match.food_group,
      serving_weights_g: matchResult.match.serving_weights_g,
      nutrients_per_100g: matchResult.match.nutrients_per_100g,
      source: matchResult.match.source,
    } : null,
    candidates: matchResult.candidates || [],
    status,
    requiresConfirmation,
    reasons,
  };
}

/**
 * Normalize unit string to canonical name
 */
function normalizeUnit(unitStr) {
  if (!unitStr) return null;
  const lower = unitStr.toLowerCase().trim();

  for (const [canonical, synonyms] of Object.entries(UNIT_SYNONYMS)) {
    if (canonical === lower || synonyms.includes(lower)) {
      return canonical;
    }
  }
  return null;
}

/**
 * Decompose full meal text into individual ingredients and check ambiguity
 * 
 * @param {string} mealText - Natural language meal text (e.g. "150g rice, 1 cup lentils and 100g spinach")
 * @returns {Object} Structured meal composition
 */
function parseMealDescription(mealText) {
  if (!mealText || typeof mealText !== 'string' || !mealText.trim()) {
    throw new ValidationError('Meal description text cannot be empty.', 'mealText');
  }

  // Split on delimiters: commas, 'and', '+', '&', 'with', newlines
  const phrases = mealText
    .split(/,|\band\b|\+|\bwith\b|&|\n/i)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  if (phrases.length === 0) {
    throw new ValidationError('Could not extract any food items from description.', 'mealText');
  }

  const parsedIngredients = phrases
    .map(phrase => parseIngredientString(phrase))
    .filter(Boolean);

  const confirmed = [];
  const ambiguous = [];

  for (const item of parsedIngredients) {
    if (item.requiresConfirmation) {
      ambiguous.push(item);
    } else {
      confirmed.push({
        food: item.matched_food,
        food_id: item.matched_food.id,
        quantity: item.parsed_quantity,
        unit: item.parsed_unit,
        confirmed: true,
        raw_text: item.raw_text,
      });
    }
  }

  // If there are confirmed ingredients, calculate their deterministic nutrition
  let nutritionResult = null;
  if (confirmed.length > 0) {
    nutritionResult = calculateMealNutrition(confirmed);
  }

  return {
    original_text: mealText,
    parsed_items: parsedIngredients,
    confirmed_ingredients: confirmed,
    ambiguous_ingredients: ambiguous,
    requires_user_confirmation: ambiguous.length > 0,
    nutrition: nutritionResult,
  };
}

module.exports = {
  calculateMealNutrition,
  parseMealDescription,
  parseIngredientString,
  normalizeUnit,
  UNIT_SYNONYMS,
};
