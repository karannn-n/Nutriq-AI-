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
 *   2. Validates positive non-zero quantities (weight_g > 0).
 *   3. Converts units accurately (metric, imperial, and food-specific portion units).
 *   4. Supports direct portion_id lookup against verified food portions.
 *   5. Rejects invalid inputs with descriptive validation errors.
 */

const { foodCatalogService } = require('./foodCatalogService');

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
  gm: 1,
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

// Standard volume heuristics when specific food portion is missing
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

  const rawUnit = (unit || 'g').toString().toLowerCase().trim();
  const cleanUnit = rawUnit.replace(/s$/, ''); // singularize simple units

  // 1. Check universal weight units
  if (UNIVERSAL_WEIGHT_UNITS[rawUnit] !== undefined) {
    return Math.round(numQty * UNIVERSAL_WEIGHT_UNITS[rawUnit] * 1000) / 1000;
  }
  if (UNIVERSAL_WEIGHT_UNITS[cleanUnit] !== undefined) {
    return Math.round(numQty * UNIVERSAL_WEIGHT_UNITS[cleanUnit] * 1000) / 1000;
  }

  // 2. Check food-specific portion sizes from food object
  if (food) {
    // 2a. Check serving_weights_g dictionary
    if (food.serving_weights_g) {
      const sw = food.serving_weights_g;
      if (sw[rawUnit] !== undefined) {
        return Math.round(numQty * sw[rawUnit] * 1000) / 1000;
      }
      if (sw[cleanUnit] !== undefined) {
        return Math.round(numQty * sw[cleanUnit] * 1000) / 1000;
      }
      for (const [key, weight] of Object.entries(sw)) {
        if (key.toLowerCase() === rawUnit || key.toLowerCase() === cleanUnit) {
          return Math.round(numQty * weight * 1000) / 1000;
        }
      }
    }

    // 2b. Check portions array from database
    if (Array.isArray(food.portions) && food.portions.length > 0) {
      for (const p of food.portions) {
        const pUnit = (p.unit || '').toLowerCase().trim();
        const pMod = (p.modifier || '').toLowerCase().trim();
        const pDesc = (p.portion_description || '').toLowerCase().trim();
        const pDisp = (p.display_name || '').toLowerCase().trim();

        if (
          pUnit === rawUnit || pUnit === cleanUnit ||
          pMod === rawUnit || pMod === cleanUnit ||
          pDesc.includes(rawUnit) || pDisp.includes(rawUnit)
        ) {
          const ratio = p.amount && p.amount > 0 ? numQty / p.amount : numQty;
          return Math.round(ratio * p.gram_weight * 1000) / 1000;
        }
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
    ...(food?.serving_weights_g ? Object.keys(food.serving_weights_g) : []),
    ...(food?.portions ? food.portions.map(p => p.unit) : []),
  ];
  throw new ValidationError(
    `Unrecognized unit '${unit}' for ${food?.common_name || food?.name || 'food'}. Supported units: ${Array.from(new Set(availableUnits)).filter(Boolean).join(', ')}.`,
    'unit'
  );
}

/**
 * Deterministically calculate nutrients for a food by direct gram weight or portion
 * 
 * @param {Object} food - Normalized food record from database
 * @param {number|Object} quantityOrOptions - Quantity, or options object { weight_g, portion_id, quantity, unit }
 * @param {string} [unit='g'] - Unit of measurement if first param is quantity
 * @returns {Object} Calculated nutrient breakdown with metadata
 */
function calculateFoodNutrients(food, quantityOrOptions, unit = 'g') {
  if (!food || typeof food !== 'object') {
    throw new ValidationError('A valid food object is required.', 'food');
  }

  // Resolve gram weight
  let gramWeight = null;
  let inputQty = 1;
  let inputUnit = 'g';
  let matchedPortion = null;

  if (typeof quantityOrOptions === 'object' && quantityOrOptions !== null) {
    const opts = quantityOrOptions;
    if (opts.weight_g !== undefined && opts.weight_g !== null) {
      const numWeight = Number(opts.weight_g);
      if (isNaN(numWeight) || numWeight <= 0) {
        throw new ValidationError(`Weight must be a positive number greater than 0. Received: ${opts.weight_g}`, 'weight_g');
      }
      gramWeight = Math.round(numWeight * 1000) / 1000;
      inputQty = gramWeight;
      inputUnit = 'g';
    } else if (opts.portion_id) {
      // Direct portion ID lookup
      const portion = foodCatalogService.getPortionById(opts.portion_id);
      if (!portion) {
        throw new ValidationError(`Portion ID '${opts.portion_id}' was not found.`, 'portion_id');
      }
      if (food.fdc_id && portion.fdc_id !== food.fdc_id) {
        throw new ValidationError(`Portion ID '${opts.portion_id}' belongs to food FDC ${portion.fdc_id}, not ${food.fdc_id}.`, 'portion_id');
      }
      matchedPortion = portion;
      const q = opts.quantity !== undefined ? Number(opts.quantity) : 1;
      if (isNaN(q) || q <= 0) {
        throw new ValidationError(`Portion quantity must be greater than zero. Received: ${opts.quantity}`, 'quantity');
      }
      gramWeight = Math.round(q * portion.gram_weight * 1000) / 1000;
      inputQty = q;
      inputUnit = portion.display_name || portion.unit || 'serving';
    } else {
      inputQty = opts.quantity !== undefined ? opts.quantity : 1;
      inputUnit = opts.unit || 'g';
      gramWeight = convertToGrams(inputQty, inputUnit, food);
    }
  } else {
    inputQty = quantityOrOptions;
    inputUnit = unit || 'g';
    gramWeight = convertToGrams(inputQty, inputUnit, food);
  }

  if (gramWeight === null || isNaN(gramWeight) || gramWeight <= 0) {
    throw new ValidationError(`Calculated gram weight must be strictly positive (>0). Received: ${gramWeight}`, 'gram_weight');
  }

  // Canonical tracked nutrients
  const trackedKeys = [
    { key: 'calories', unit: 'kcal' },
    { key: 'protein_g', unit: 'g' },
    { key: 'carbs_g', unit: 'g' },
    { key: 'fat_g', unit: 'g' },
    { key: 'vitamin_d_mcg', unit: 'mcg' },
    { key: 'iron_mg', unit: 'mg' },
    { key: 'zinc_mg', unit: 'mg' },
    { key: 'b12_mcg', unit: 'mcg' },
  ];

  const nutrients = {};
  const unknownNutrients = [];
  const knownNutrients = [];

  for (const item of trackedKeys) {
    const key = item.key;
    const defaultUnit = item.unit;

    // Resolve nutrient value per 100g from either nutrients_per_100g structure or direct flat property
    let per100g = null;
    let nutUnit = defaultUnit;

    if (food.nutrients_per_100g && food.nutrients_per_100g[key] !== undefined) {
      const entry = food.nutrients_per_100g[key];
      if (typeof entry === 'object' && entry !== null) {
        per100g = entry.value;
        nutUnit = entry.unit || defaultUnit;
      } else {
        per100g = entry;
      }
    } else if (food[key] !== undefined) {
      per100g = food[key];
    }

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
        throw new ValidationError(`Corrupted nutrient data for '${key}' in food '${food.name || food.common_name}'.`, 'nutrient');
      }

      // Exact deterministic formula: (per100g * gramWeight) / 100
      const exactAmount = (numVal * gramWeight) / 100;
      const roundedAmount = Math.round(exactAmount * 100) / 100;

      nutrients[key] = {
        value: roundedAmount,
        raw_value: exactAmount,
        unit: nutUnit,
        isUnknown: false,
      };
      knownNutrients.push(key);
    }
  }

  return {
    food_id: food.id || `usda_${food.fdc_id}`,
    fdc_id: food.fdc_id || null,
    food_name: food.common_name || food.description || food.name,
    input_quantity: Number(inputQty),
    input_unit: inputUnit,
    gram_weight: gramWeight,
    portion_info: matchedPortion,
    nutrients,
    meta: {
      all_nutrients_known: unknownNutrients.length === 0,
      unknown_nutrients: unknownNutrients,
      known_nutrients: knownNutrients,
      source: food.source || 'USDA FoodData Central',
      source_identifier: food.fdc_id || food.id,
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
