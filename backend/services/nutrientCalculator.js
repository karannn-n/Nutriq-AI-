/**
 * Deterministic Nutrient Calculator Service
 * 
 * Computes exact nutrient amounts for foods based on verified USDA FoodData Central per-100g values
 * and serving weight in grams.
 * 
 * Formula:
 *   nutrient amount = nutrient per 100g * serving weight in grams / 100
 * 
 * Rules:
 *   1. Preserves missing/unknown nutrient values as null (never assumes zero).
 *   2. Validates positive non-zero quantities.
 *   3. Converts units accurately (metric, imperial, and food-specific portion units).
 *   4. Rejects invalid inputs with descriptive validation errors.
 */

class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

// Universal weight multipliers to convert to grams
const UNIVERSAL_WEIGHT_UNITS = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  mg: 0.001,
  milligram: 0.001,
  milligrams: 0.001,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  pound: 453.592,
  pounds: 453.592,
};

/**
 * Standard density heuristics for liquids / semi-solids when food-specific portion is missing
 */
const STANDARD_VOLUME_GRAMS = {
  ml: 1.0,
  milliliter: 1.0,
  milliliters: 1.0,
  l: 1000.0,
  liter: 1000.0,
  liters: 1000.0,
  tsp: 4.93,
  teaspoon: 4.93,
  teaspoons: 4.93,
  tbsp: 14.79,
  tablespoon: 14.79,
  tablespoons: 14.79,
  cup: 240.0,
  cups: 240.0,
};

/**
 * Convert quantity and unit to gram weight for a specific food
 */
function convertToGrams(quantity, unit, food = null) {
  if (quantity === undefined || quantity === null || typeof quantity === 'boolean') {
    throw new ValidationError('Quantity is required.', 'quantity');
  }

  const numQty = Number(quantity);
  if (isNaN(numQty) || !isFinite(numQty)) {
    throw new ValidationError(`Invalid numeric quantity: '${quantity}'.`, 'quantity');
  }

  if (numQty <= 0) {
    throw new ValidationError(`Quantity must be greater than zero. Received: ${numQty}.`, 'quantity');
  }

  const cleanUnit = (unit || 'g').toString().toLowerCase().trim().replace(/s$/, ''); // singularize simple units
  const rawUnit = (unit || 'g').toString().toLowerCase().trim();

  // 1. Check universal weight units
  if (UNIVERSAL_WEIGHT_UNITS[rawUnit] !== undefined) {
    return Math.round(numQty * UNIVERSAL_WEIGHT_UNITS[rawUnit] * 1000) / 1000;
  }
  if (UNIVERSAL_WEIGHT_UNITS[cleanUnit] !== undefined) {
    return Math.round(numQty * UNIVERSAL_WEIGHT_UNITS[cleanUnit] * 1000) / 1000;
  }

  // 2. Check food-specific portion sizes
  if (food && food.serving_weights_g) {
    const sw = food.serving_weights_g;
    if (sw[rawUnit] !== undefined) {
      return Math.round(numQty * sw[rawUnit] * 1000) / 1000;
    }
    if (sw[cleanUnit] !== undefined) {
      return Math.round(numQty * sw[cleanUnit] * 1000) / 1000;
    }

    // Try finding matching substring in food portion keys (e.g. 'slice' in 'slice')
    for (const [key, weight] of Object.entries(sw)) {
      if (key.toLowerCase() === rawUnit || key.toLowerCase() === cleanUnit) {
        return Math.round(numQty * weight * 1000) / 1000;
      }
    }
  }

  // 3. Check fallback volume units
  if (STANDARD_VOLUME_GRAMS[rawUnit] !== undefined) {
    return Math.round(numQty * STANDARD_VOLUME_GRAMS[rawUnit] * 1000) / 1000;
  }
  if (STANDARD_VOLUME_GRAMS[cleanUnit] !== undefined) {
    return Math.round(numQty * STANDARD_VOLUME_GRAMS[cleanUnit] * 1000) / 1000;
  }

  // Unit not recognized
  const availableUnits = [
    'g', 'kg', 'oz', 'lb',
    ...(food && food.serving_weights_g ? Object.keys(food.serving_weights_g) : []),
  ];
  throw new ValidationError(
    `Unrecognized unit '${unit}' for ${food?.common_name || 'food'}. Supported units: ${Array.from(new Set(availableUnits)).join(', ')}.`,
    'unit'
  );
}

/**
 * Deterministically calculate nutrients for a given food and serving weight.
 * 
 * @param {Object} food - Normalized food record from database
 * @param {number} quantity - Quantity of the food
 * @param {string} [unit='g'] - Unit of measurement
 * @returns {Object} Calculated nutrient breakdown with metadata
 */
function calculateFoodNutrients(food, quantity, unit = 'g') {
  if (!food || typeof food !== 'object') {
    throw new ValidationError('A valid food object is required.', 'food');
  }

  if (!food.nutrients_per_100g || typeof food.nutrients_per_100g !== 'object') {
    throw new ValidationError(`Food '${food.name || food.id}' is missing nutrients_per_100g schema.`, 'food');
  }

  // 1. Calculate gram weight
  const gramWeight = convertToGrams(quantity, unit, food);

  // 2. Compute each nutrient using the deterministic formula
  // Formula: nutrient amount = nutrient per 100 g * serving weight in grams / 100
  const nutrients = {};
  const unknownNutrients = [];
  const knownNutrients = [];

  for (const [key, nutrientInfo] of Object.entries(food.nutrients_per_100g)) {
    const per100g = nutrientInfo.value;
    const nutUnit = nutrientInfo.unit;

    if (per100g === null || per100g === undefined) {
      // PRESERVE AS UNKNOWN! DO NOT ASSUME ZERO!
      nutrients[key] = {
        value: null,
        unit: nutUnit,
        isUnknown: true,
        source: 'unmeasured_or_unknown',
      };
      unknownNutrients.push(key);
    } else {
      const numVal = Number(per100g);
      if (isNaN(numVal) || numVal < 0) {
        throw new ValidationError(`Corrupted nutrient data for '${key}' in food '${food.name}'.`, 'nutrient');
      }

      // Exact calculation
      const calculatedAmount = (numVal * gramWeight) / 100;
      // Round appropriately for nutritional reporting (2 decimals for macros/micros)
      const rounded = Math.round(calculatedAmount * 100) / 100;

      nutrients[key] = {
        value: rounded,
        raw_value: calculatedAmount,
        unit: nutUnit,
        isUnknown: false,
      };
      knownNutrients.push(key);
    }
  }

  return {
    food_id: food.id,
    food_name: food.common_name || food.name,
    input_quantity: Number(quantity),
    input_unit: unit,
    gram_weight: gramWeight,
    nutrients,
    meta: {
      all_nutrients_known: unknownNutrients.length === 0,
      unknown_nutrients: unknownNutrients,
      known_nutrients: knownNutrients,
      source: food.source,
    },
  };
}

module.exports = {
  calculateFoodNutrients,
  convertToGrams,
  ValidationError,
  UNIVERSAL_WEIGHT_UNITS,
  STANDARD_VOLUME_GRAMS,
};

