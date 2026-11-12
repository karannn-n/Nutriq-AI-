/**
 * Client-Side Local Nutrition Engine
 * 
 * Provides instant in-browser lookup, autocomplete, and deterministic nutrition calculation
 * based on the normalized USDA FoodData Central dataset.
 */

import foodDatabase from '../data/food_database.json';

const UNIVERSAL_WEIGHT_UNITS = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  mg: 0.001,
  milligram: 0.001,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  pound: 453.592,
};

const STANDARD_VOLUME_GRAMS = {
  ml: 1.0,
  tsp: 4.93,
  teaspoon: 4.93,
  tbsp: 14.79,
  tablespoon: 14.79,
  cup: 240.0,
  glass: 250.0,
  bowl: 200.0,
};

export const normalize = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
};

export const searchFoods = (query, limit = 10) => {
  if (!query || typeof query !== 'string') return foodDatabase.slice(0, limit);
  const norm = normalize(query);
  if (!norm) return foodDatabase.slice(0, limit);

  const scored = [];
  for (const food of foodDatabase) {
    let score = 0;
    const normName = normalize(food.name);
    const normCommon = normalize(food.common_name);

    if (normName === norm || normCommon === norm) score = 1.0;
    else if (food.aliases?.some(a => normalize(a) === norm)) score = 0.95;
    else if (normCommon.startsWith(norm)) score = 0.85;
    else if (normCommon.includes(norm)) score = 0.75;
    else if (food.aliases?.some(a => normalize(a).includes(norm))) score = 0.65;
    else if (normName.includes(norm)) score = 0.50;

    if (score > 0) scored.push({ food, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.food);
};

export const getFoodById = (id) => {
  return foodDatabase.find(f => f.id === id) || null;
};

export const convertToGrams = (quantity, unit, food = null) => {
  const num = Number(quantity);
  if (isNaN(num) || num <= 0) return 0;

  const rawUnit = (unit || 'g').toLowerCase().trim();
  const cleanUnit = rawUnit.replace(/s$/, '');

  if (UNIVERSAL_WEIGHT_UNITS[rawUnit]) return Math.round(num * UNIVERSAL_WEIGHT_UNITS[rawUnit] * 100) / 100;
  if (UNIVERSAL_WEIGHT_UNITS[cleanUnit]) return Math.round(num * UNIVERSAL_WEIGHT_UNITS[cleanUnit] * 100) / 100;

  if (food && food.serving_weights_g) {
    const sw = food.serving_weights_g;
    if (sw[rawUnit]) return Math.round(num * sw[rawUnit] * 100) / 100;
    if (sw[cleanUnit]) return Math.round(num * sw[cleanUnit] * 100) / 100;
  }

  if (STANDARD_VOLUME_GRAMS[rawUnit]) return Math.round(num * STANDARD_VOLUME_GRAMS[rawUnit] * 100) / 100;
  if (STANDARD_VOLUME_GRAMS[cleanUnit]) return Math.round(num * STANDARD_VOLUME_GRAMS[cleanUnit] * 100) / 100;

  return num; // Default fallback to gram equivalent
};

export const calculateFoodNutrients = (food, quantity, unit = 'g') => {
  if (!food || !food.nutrients_per_100g) return null;
  const gramWeight = convertToGrams(quantity, unit, food);

  const nutrients = {};
  for (const [key, nut] of Object.entries(food.nutrients_per_100g)) {
    if (nut.value === null || nut.value === undefined) {
      nutrients[key] = { value: null, unit: nut.unit, isUnknown: true };
    } else {
      const calculated = (Number(nut.value) * gramWeight) / 100;
      nutrients[key] = {
        value: Math.round(calculated * 100) / 100,
        unit: nut.unit,
        isUnknown: false,
      };
    }
  }

  return {
    food_id: food.id,
    food_name: food.common_name || food.name,
    quantity: Number(quantity),
    unit,
    gram_weight: gramWeight,
    nutrients,
    source: food.source,
  };
};

export const calculateMealNutrition = (ingredients) => {
  if (!Array.isArray(ingredients)) return null;

  const totals = {
    calories: { amount: 0, unit: 'kcal', isComplete: true, missingIn: [] },
    protein_g: { amount: 0, unit: 'g', isComplete: true, missingIn: [] },
    carbs_g: { amount: 0, unit: 'g', isComplete: true, missingIn: [] },
    fat_g: { amount: 0, unit: 'g', isComplete: true, missingIn: [] },
    vitamin_d_mcg: { amount: 0, unit: 'mcg', isComplete: true, missingIn: [] },
    iron_mg: { amount: 0, unit: 'mg', isComplete: true, missingIn: [] },
    zinc_mg: { amount: 0, unit: 'mg', isComplete: true, missingIn: [] },
    b12_mcg: { amount: 0, unit: 'mcg', isComplete: true, missingIn: [] },
  };

  let totalWeight = 0;
  const computedIngredients = [];

  for (const item of ingredients) {
    if (item.confirmed === false) continue;
    const food = item.food || getFoodById(item.food_id);
    if (!food) continue;

    const calculated = calculateFoodNutrients(food, item.quantity, item.unit || 'g');
    if (!calculated) continue;

    computedIngredients.push(calculated);
    totalWeight += calculated.gram_weight;

    for (const [key, nut] of Object.entries(calculated.nutrients)) {
      if (nut.isUnknown || nut.value === null) {
        totals[key].isComplete = false;
        totals[key].missingIn.push(calculated.food_name);
      } else {
        totals[key].amount = Math.round((totals[key].amount + nut.value) * 100) / 100;
      }
    }
  }

  return {
    total_weight_grams: Math.round(totalWeight * 10) / 10,
    ingredient_count: computedIngredients.length,
    ingredients: computedIngredients,
    totals,
    db_compatible_nutrition: {
      calories: Math.round(totals.calories.amount),
      protein_g: totals.protein_g.amount,
      carbs_g: totals.carbs_g.amount,
      fat_g: totals.fat_g.amount,
      vitamin_d_mcg: totals.vitamin_d_mcg.amount,
      iron_mg: totals.iron_mg.amount,
      zinc_mg: totals.zinc_mg.amount,
      b12_mcg: totals.b12_mcg.amount,
    },
  };
};

export default {
  searchFoods,
  getFoodById,
  convertToGrams,
  calculateFoodNutrients,
  calculateMealNutrition,
  allFoods: foodDatabase,
};

