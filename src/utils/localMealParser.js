/**
 * Nutriq Client-Side Natural-Language Meal Parser
 * 
 * Provides an instant in-browser NLP parser fallback when the backend API is unreachable
 * or running as a static GitHub Pages deployment.
 * Resolves entities, quantities, serving units, ambiguity prompts, and deterministic USDA nutrients.
 */

import foodDatabase from '../data/food_database.json';
import { searchFoods, calculateMealNutrition } from './localNutritionEngine';

// ─── 1. NUMBER & FRACTION WORDS ──────────────────────────────────────────────
const NUMBER_WORDS = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  hundred: 100,
  dozen: 12,
  half: 0.5,
  quarter: 0.25,
};

const FRACTION_EXPRESSIONS = [
  { pattern: /\b(one\s+and\s+a\s+half|1\s+and\s+a\s+half|1\s+1\/2)\b/gi, value: 1.5 },
  { pattern: /\b(two\s+and\s+a\s+half|2\s+and\s+a\s+half|2\s+1\/2)\b/gi, value: 2.5 },
  { pattern: /\b(three\s+and\s+a\s+half|3\s+and\s+a\s+half|3\s+1\/2)\b/gi, value: 3.5 },
  { pattern: /\b(half\s+a\s+dozen|half\s+dozen)\b/gi, value: 6 },
  { pattern: /\b(half\s+an?|a\s+half)\b/gi, value: 0.5 },
  { pattern: /\b(a\s+quarter\s+of|a\s+quarter)\b/gi, value: 0.25 },
  { pattern: /\b(three\s+quarters\s+of|three\s+quarters|3\/4)\b/gi, value: 0.75 },
  { pattern: /\b(1\/2)\b/gi, value: 0.5 },
  { pattern: /\b(1\/4)\b/gi, value: 0.25 },
  { pattern: /\b(1\/3)\b/gi, value: 0.33 },
  { pattern: /\b(2\/3)\b/gi, value: 0.67 },
];

const UNIT_SYNONYMS = {
  g: ['g', 'gram', 'grams', 'gm', 'gms', 'gr'],
  kg: ['kg', 'kgs', 'kilogram', 'kilograms', 'kilo', 'kilos'],
  ml: ['ml', 'mls', 'milliliter', 'milliliters'],
  oz: ['oz', 'ounce', 'ounces'],
  lb: ['lb', 'lbs', 'pound', 'pounds'],
  cup: ['cup', 'cups', 'c'],
  bowl: ['bowl', 'bowls', 'katori', 'katoris'],
  plate: ['plate', 'plates', 'thali'],
  glass: ['glass', 'glasses'],
  slice: ['slice', 'slices'],
  piece: ['piece', 'pieces', 'pc', 'pcs'],
  tablespoon: ['tbsp', 'tbsps', 'tablespoon', 'tablespoons'],
  teaspoon: ['tsp', 'tsps', 'teaspoon', 'teaspoons'],
  serving: ['serving', 'servings', 'portion', 'portions', 'helpings?'],
  handful: ['handful', 'handfuls'],
};

const PREPARATION_TERMS = [
  'boiled', 'hard-boiled', 'soft-boiled', 'poached', 'scrambled',
  'fried', 'deep-fried', 'pan-fried', 'grilled', 'roasted',
  'baked', 'steamed', 'cooked', 'raw', 'uncooked',
  'sauteed', 'sautéed', 'stir-fried', 'toasted', 'mashed',
  'sprouted', 'fermented',
];

const CURATED_ALIASES = {
  roti: { fdc_id: 174075, name: 'Whole Wheat Chapati / Roti', category: 'Baked Products', default_unit: 'piece', default_weight: 43, ambiguous: false },
  rotis: { fdc_id: 174075, name: 'Whole Wheat Chapati / Roti', category: 'Baked Products', default_unit: 'piece', default_weight: 43, ambiguous: false },
  chapati: { fdc_id: 174075, name: 'Whole Wheat Chapati / Roti', category: 'Baked Products', default_unit: 'piece', default_weight: 43, ambiguous: false },
  chapatis: { fdc_id: 174075, name: 'Whole Wheat Chapati / Roti', category: 'Baked Products', default_unit: 'piece', default_weight: 43, ambiguous: false },
  phulka: { fdc_id: 174075, name: 'Whole Wheat Chapati / Roti (Phulka)', category: 'Baked Products', default_unit: 'piece', default_weight: 43, ambiguous: false },
  phulkas: { fdc_id: 174075, name: 'Whole Wheat Chapati / Roti (Phulka)', category: 'Baked Products', default_unit: 'piece', default_weight: 43, ambiguous: false },
  naan: { fdc_id: 174075, name: 'Naan Bread', category: 'Baked Products', default_unit: 'piece', default_weight: 90, ambiguous: false },
  paratha: { fdc_id: 174075, name: 'Plain Paratha', category: 'Baked Products', default_unit: 'piece', default_weight: 80, ambiguous: false },

  dal: {
    ambiguous: true,
    prompt: 'Which variety of dal / lentils did you have?',
    category: 'Legumes and Legume Products',
    candidates: [
      { fdc_id: 172421, common_name: 'Masoor Dal (Brown/Red Lentils)', food_category: 'Legumes and Legume Products' },
      { fdc_id: 169137, common_name: 'Moong Dal (Yellow Mung Beans)', food_category: 'Legumes and Legume Products' },
      { fdc_id: 170430, common_name: 'Toor / Arhar Dal (Pigeon Peas)', food_category: 'Legumes and Legume Products' },
      { fdc_id: 173757, common_name: 'Chana Dal (Bengal Gram Chickpeas)', food_category: 'Legumes and Legume Products' },
    ],
  },
  daal: {
    ambiguous: true,
    prompt: 'Which variety of daal / lentils did you have?',
    category: 'Legumes and Legume Products',
    candidates: [
      { fdc_id: 172421, common_name: 'Masoor Dal (Brown/Red Lentils)', food_category: 'Legumes and Legume Products' },
      { fdc_id: 169137, common_name: 'Moong Dal (Yellow Mung Beans)', food_category: 'Legumes and Legume Products' },
      { fdc_id: 170430, common_name: 'Toor / Arhar Dal (Pigeon Peas)', food_category: 'Legumes and Legume Products' },
      { fdc_id: 173757, common_name: 'Chana Dal (Bengal Gram Chickpeas)', food_category: 'Legumes and Legume Products' },
    ],
  },
  'moong dal': { fdc_id: 169137, name: 'Cooked Mung Beans (Moong Dal)', category: 'Legumes and Legume Products', default_unit: 'bowl', default_weight: 202, ambiguous: false },
  'mung dal': { fdc_id: 169137, name: 'Cooked Mung Beans (Moong Dal)', category: 'Legumes and Legume Products', default_unit: 'bowl', default_weight: 202, ambiguous: false },
  'masoor dal': { fdc_id: 172421, name: 'Cooked Lentils (Masoor Dal)', category: 'Legumes and Legume Products', default_unit: 'bowl', default_weight: 198, ambiguous: false },
  'toor dal': { fdc_id: 170430, name: 'Cooked Pigeonpeas (Toor Dal)', category: 'Legumes and Legume Products', default_unit: 'bowl', default_weight: 198, ambiguous: false },
  'arhar dal': { fdc_id: 170430, name: 'Cooked Pigeonpeas (Arhar Dal)', category: 'Legumes and Legume Products', default_unit: 'bowl', default_weight: 198, ambiguous: false },
  'chana dal': { fdc_id: 173757, name: 'Cooked Chickpeas (Chana Dal)', category: 'Legumes and Legume Products', default_unit: 'bowl', default_weight: 164, ambiguous: false },
  lentils: { fdc_id: 172421, name: 'Cooked Lentils', category: 'Legumes and Legume Products', default_unit: 'cup', default_weight: 198, ambiguous: false },
  chana: { fdc_id: 173757, name: 'Cooked Chickpeas (Chana / Chhole)', category: 'Legumes and Legume Products', default_unit: 'bowl', default_weight: 164, ambiguous: false },
  chhole: { fdc_id: 173757, name: 'Cooked Chickpeas (Chhole)', category: 'Legumes and Legume Products', default_unit: 'bowl', default_weight: 164, ambiguous: false },
  chickpeas: { fdc_id: 173757, name: 'Cooked Chickpeas', category: 'Legumes and Legume Products', default_unit: 'cup', default_weight: 164, ambiguous: false },
  rajma: { fdc_id: 175199, name: 'Cooked Kidney Beans (Rajma)', category: 'Legumes and Legume Products', default_unit: 'cup', default_weight: 177, ambiguous: false },
  'kidney beans': { fdc_id: 175199, name: 'Cooked Kidney Beans', category: 'Legumes and Legume Products', default_unit: 'cup', default_weight: 177, ambiguous: false },

  curd: { fdc_id: 171284, name: 'Plain Whole Milk Yogurt (Curd / Dahi)', category: 'Dairy and Egg Products', default_unit: 'cup', default_weight: 245, ambiguous: false },
  dahi: { fdc_id: 171284, name: 'Plain Whole Milk Yogurt (Dahi)', category: 'Dairy and Egg Products', default_unit: 'cup', default_weight: 245, ambiguous: false },
  yogurt: { fdc_id: 171284, name: 'Plain Whole Milk Yogurt', category: 'Dairy and Egg Products', default_unit: 'cup', default_weight: 245, ambiguous: false },
  buttermilk: { fdc_id: 167697, name: 'Cultured Reduced Fat Buttermilk (Chaas)', category: 'Dairy and Egg Products', default_unit: 'glass', default_weight: 245, ambiguous: false },
  chaas: { fdc_id: 167697, name: 'Cultured Buttermilk (Chaas)', category: 'Dairy and Egg Products', default_unit: 'glass', default_weight: 245, ambiguous: false },
  lassi: { fdc_id: 171284, name: 'Sweet Lassi (Yogurt Drink)', category: 'Dairy and Egg Products', default_unit: 'glass', default_weight: 250, ambiguous: false },
  paneer: {
    ambiguous: true,
    prompt: 'Was the paneer fresh/plain or part of a prepared dish (e.g. palak paneer)?',
    category: 'Dairy and Egg Products',
    candidates: [
      { fdc_id: 172179, common_name: 'Fresh Paneer / Cottage Cheese', food_category: 'Dairy and Egg Products' },
      { fdc_id: 168463, common_name: 'Palak Paneer (Spinach with Cheese)', food_category: 'Vegetables and Vegetable Products' },
    ],
  },
  'palak paneer': { fdc_id: 168463, name: 'Palak Paneer', category: 'Vegetables and Vegetable Products', default_unit: 'cup', default_weight: 200, ambiguous: false },

  rice: {
    ambiguous: true,
    prompt: 'Was the rice white or brown, and was it cooked?',
    category: 'Cereal Grains and Pasta',
    candidates: [
      { fdc_id: 168878, common_name: 'Cooked White Rice (Long-Grain)', food_category: 'Cereal Grains and Pasta' },
      { fdc_id: 168884, common_name: 'Cooked Brown Rice (Long-Grain)', food_category: 'Cereal Grains and Pasta' },
    ],
  },
  chawal: {
    ambiguous: true,
    prompt: 'Was the chawal / rice cooked white or brown rice?',
    category: 'Cereal Grains and Pasta',
    candidates: [
      { fdc_id: 168878, common_name: 'Cooked White Rice (Long-Grain)', food_category: 'Cereal Grains and Pasta' },
      { fdc_id: 168884, common_name: 'Cooked Brown Rice (Long-Grain)', food_category: 'Cereal Grains and Pasta' },
    ],
  },
  'cooked rice': { fdc_id: 168878, name: 'Cooked White Rice', category: 'Cereal Grains and Pasta', default_unit: 'cup', default_weight: 158, ambiguous: false },
  'white rice': { fdc_id: 168878, name: 'Cooked White Rice', category: 'Cereal Grains and Pasta', default_unit: 'cup', default_weight: 158, ambiguous: false },
  'brown rice': { fdc_id: 168884, name: 'Cooked Brown Rice', category: 'Cereal Grains and Pasta', default_unit: 'cup', default_weight: 195, ambiguous: false },
  'basmati rice': { fdc_id: 168878, name: 'Cooked White Basmati Rice', category: 'Cereal Grains and Pasta', default_unit: 'cup', default_weight: 158, ambiguous: false },
  biryani: { fdc_id: 2706538, name: 'Biryani with chicken', category: 'Rice mixed dishes', default_unit: 'plate', default_weight: 350, ambiguous: false },
  'chicken biryani': { fdc_id: 2706538, name: 'Biryani with chicken', category: 'Rice mixed dishes', default_unit: 'plate', default_weight: 350, ambiguous: false },
  oats: { fdc_id: 169705, name: 'Cooked Rolled Oats (Oatmeal)', category: 'Cereal Grains and Pasta', default_unit: 'cup', default_weight: 234, ambiguous: false },
  oatmeal: { fdc_id: 169705, name: 'Cooked Oatmeal', category: 'Cereal Grains and Pasta', default_unit: 'cup', default_weight: 234, ambiguous: false },

  'boiled egg': { fdc_id: 173424, name: 'Egg, whole, cooked, hard-boiled', category: 'Dairy and Egg Products', default_unit: 'piece', default_weight: 50, ambiguous: false },
  'boiled eggs': { fdc_id: 173424, name: 'Egg, whole, cooked, hard-boiled', category: 'Dairy and Egg Products', default_unit: 'piece', default_weight: 50, ambiguous: false },
  'hard-boiled egg': { fdc_id: 173424, name: 'Egg, whole, cooked, hard-boiled', category: 'Dairy and Egg Products', default_unit: 'piece', default_weight: 50, ambiguous: false },
  egg: {
    ambiguous: true,
    prompt: 'How was the egg prepared (boiled, fried, scrambled, or poached)?',
    category: 'Dairy and Egg Products',
    candidates: [
      { fdc_id: 173424, common_name: 'Hard-Boiled Egg', food_category: 'Dairy and Egg Products' },
      { fdc_id: 171287, common_name: 'Fried Egg', food_category: 'Dairy and Egg Products' },
      { fdc_id: 171291, common_name: 'Scrambled Egg', food_category: 'Dairy and Egg Products' },
      { fdc_id: 171289, common_name: 'Poached Egg', food_category: 'Dairy and Egg Products' },
    ],
  },
  eggs: {
    ambiguous: true,
    prompt: 'How were the eggs prepared (boiled, fried, scrambled, or poached)?',
    category: 'Dairy and Egg Products',
    candidates: [
      { fdc_id: 173424, common_name: 'Hard-Boiled Egg', food_category: 'Dairy and Egg Products' },
      { fdc_id: 171287, common_name: 'Fried Egg', food_category: 'Dairy and Egg Products' },
      { fdc_id: 171291, common_name: 'Scrambled Egg', food_category: 'Dairy and Egg Products' },
      { fdc_id: 171289, common_name: 'Poached Egg', food_category: 'Dairy and Egg Products' },
    ],
  },
  toast: { fdc_id: 172689, name: 'Whole-Wheat Bread, Toasted', category: 'Baked Products', default_unit: 'slice', default_weight: 25, ambiguous: false },
  'slices of toast': { fdc_id: 172689, name: 'Whole-Wheat Bread, Toasted', category: 'Baked Products', default_unit: 'slice', default_weight: 25, ambiguous: false },
  bread: { fdc_id: 174075, name: 'Whole-Wheat Bread', category: 'Baked Products', default_unit: 'slice', default_weight: 28, ambiguous: false },

  banana: { fdc_id: 173944, name: 'Raw Banana', category: 'Fruits and Fruit Juices', default_unit: 'piece', default_weight: 118, ambiguous: false },
  bananas: { fdc_id: 173944, name: 'Raw Banana', category: 'Fruits and Fruit Juices', default_unit: 'piece', default_weight: 118, ambiguous: false },
  apple: { fdc_id: 171688, name: 'Raw Apple (with skin)', category: 'Fruits and Fruit Juices', default_unit: 'piece', default_weight: 182, ambiguous: false },
  apples: { fdc_id: 171688, name: 'Raw Apple (with skin)', category: 'Fruits and Fruit Juices', default_unit: 'piece', default_weight: 182, ambiguous: false },

  'spinach sabzi': { fdc_id: 168463, name: 'Cooked Spinach (Spinach Sabzi)', category: 'Vegetables and Vegetable Products', default_unit: 'cup', default_weight: 180, ambiguous: false },
  sabzi: { fdc_id: 168463, name: 'Mixed Vegetable Sabzi', category: 'Vegetables and Vegetable Products', default_unit: 'cup', default_weight: 150, ambiguous: false },
  palak: { fdc_id: 168463, name: 'Cooked Spinach (Palak)', category: 'Vegetables and Vegetable Products', default_unit: 'cup', default_weight: 180, ambiguous: false },
  spinach: { fdc_id: 168463, name: 'Cooked Spinach', category: 'Vegetables and Vegetable Products', default_unit: 'cup', default_weight: 180, ambiguous: false },
  salad: { fdc_id: 168462, name: 'Mixed Green Salad', category: 'Vegetables and Vegetable Products', default_unit: 'cup', default_weight: 60, ambiguous: false },

  'grilled chicken': { fdc_id: 171477, name: 'Cooked Chicken Breast (Grilled/Roasted)', category: 'Poultry Products', default_unit: 'g', default_weight: 100, ambiguous: false },
  'chicken breast': { fdc_id: 171477, name: 'Cooked Chicken Breast (Roasted)', category: 'Poultry Products', default_unit: 'g', default_weight: 100, ambiguous: false },
  chicken: {
    ambiguous: true,
    prompt: 'Was the chicken cooked as roasted/grilled breast, chicken curry, or fried?',
    category: 'Poultry Products',
    candidates: [
      { fdc_id: 171477, common_name: 'Cooked Chicken Breast (Roasted/Grilled)', food_category: 'Poultry Products' },
      { fdc_id: 2706079, common_name: 'Chicken Curry / Biryani', food_category: 'Mixed Dishes' },
      { fdc_id: 171078, common_name: 'Fried Chicken Breast', food_category: 'Poultry Products' },
    ],
  },
  almonds: { fdc_id: 170567, name: 'Dry Roasted Almonds', category: 'Nut and Seed Products', default_unit: 'handful', default_weight: 28, ambiguous: false },
};

function singularize(word) {
  if (!word) return '';
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('es') && (word.endsWith('ches') || word.endsWith('shes') || word.endsWith('sses') || word.endsWith('xes'))) {
    return word.slice(0, -2);
  }
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us') && !word.endsWith('is')) {
    return word.slice(0, -1);
  }
  return word;
}

function canonicalizeUnit(unitStr) {
  if (!unitStr) return null;
  const lower = unitStr.toLowerCase().trim();
  for (const [canonical, synonyms] of Object.entries(UNIT_SYNONYMS)) {
    if (canonical === lower || synonyms.includes(lower)) return canonical;
  }
  return lower;
}

function findClientFood(fdcId) {
  return foodDatabase.find(f => {
    return (
      String(f.id) === `usda_fdc_${fdcId}` ||
      f.source?.source_id === String(fdcId) ||
      f.id === fdcId
    );
  }) || null;
}

function normalizeInputText(text) {
  let s = text.toLowerCase().trim();
  s = s.replace(/[.,;!?]+$/g, '');
  s = s.replace(/^(?:for\s+(?:breakfast|lunch|dinner|snack|supper|brunch)(?::|\s+i\s+had|\s+i\s+ate)?)\s*/gi, '');
  s = s.replace(/^(?:breakfast|lunch|dinner|snack|supper)\s+(?:was|consisted\s+of|included)\s*/gi, '');
  s = s.replace(/^(?:today\s+i\s+(?:ate|had))\s*/gi, '');
  s = s.replace(/^(?:yesterday\s+i\s+(?:ate|had))\s*/gi, '');
  s = s.replace(/^(?:i\s+(?:had|ate|drank|consumed|took|prepared|made|enjoyed|finished))\s*(?:around|approx|approximately|about|roughly)?\s*/gi, '');
  s = s.replace(/^(?:just\s+had|had|ate|drank|consumed)\s+/gi, '');

  for (const fe of FRACTION_EXPRESSIONS) {
    s = s.replace(fe.pattern, String(fe.value));
  }
  for (const [word, val] of Object.entries(NUMBER_WORDS)) {
    const reg = new RegExp(`\\b${word}\\b`, 'gi');
    s = s.replace(reg, String(val));
  }
  return s.trim();
}

function segmentInputPhrases(normalizedText) {
  const rawTokens = normalizedText
    .split(/[,;\n+]|\b(?:and|along\s+with|plus|followed\s+by|as\s+well\s+as|together\s+with|served\s+with)\b/i)
    .map(t => t.trim().replace(/^[.,;!?\s]+|[.,;!?\s]+$/g, ''))
    .filter(t => t.length > 0);

  const phrases = [];
  for (const token of rawTokens) {
    if (/\bwith\b/i.test(token)) {
      const subParts = token.split(/\bwith\b/i).map(sp => sp.trim().replace(/^[.,;!?\s]+|[.,;!?\s]+$/g, '')).filter(Boolean);
      phrases.push(...subParts);
    } else {
      phrases.push(token);
    }
  }
  return phrases.filter(p => !/^(a|an|the|of|some|roughly|approx|around)$/i.test(p.trim()));
}

function resolveClientPortionWeight(food, quantity, unit, sizeModifier, defaultWeight) {
  if (unit === 'g') return { weight_g: Math.round(quantity * 10) / 10, portion_description: `${quantity}g` };
  if (unit === 'kg') return { weight_g: Math.round(quantity * 1000 * 10) / 10, portion_description: `${quantity * 1000}g` };

  const sw = food?.serving_weights_g || {};
  const normUnit = (unit || '').toLowerCase();

  if (sw[normUnit]) {
    let gw = sw[normUnit];
    if (sizeModifier === 'small' && normUnit === 'bowl') gw = Math.round(gw * 0.75);
    const totalGrams = Math.round(quantity * gw * 10) / 10;
    return {
      weight_g: totalGrams,
      portion_id: normUnit,
      portion_description: `${quantity} ${unit} (${totalGrams}g)`,
    };
  }

  // Fallbacks based on unit
  let baseWeight = defaultWeight || 100;
  if (normUnit === 'cup') baseWeight = 200;
  else if (normUnit === 'bowl') baseWeight = sizeModifier === 'small' ? 150 : 200;
  else if (normUnit === 'plate') baseWeight = 350;
  else if (normUnit === 'glass') baseWeight = 240;
  else if (normUnit === 'slice') baseWeight = 28;
  else if (normUnit === 'piece') baseWeight = 50;

  const totalGrams = Math.round(quantity * baseWeight * 10) / 10;
  return {
    weight_g: totalGrams,
    portion_id: normUnit || 'serving',
    portion_description: `${quantity} ${unit || 'serving'} (${totalGrams}g)`,
  };
}

export function parseMealClient(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      original_text: text || '',
      status: 'error',
      error: 'Please provide a non-empty meal description.',
      ingredients: [],
      clarifications: [],
      confidence_score: 0,
    };
  }

  const cleanInput = text.trim();
  const normalized = normalizeInputText(cleanInput);
  const phrases = segmentInputPhrases(normalized);

  const parsedIngredients = [];
  const clarifications = [];

  phrases.forEach((phrase, index) => {
    let clean = phrase.trim().replace(/^[.,;!?\s]+|[.,;!?\s]+$/g, '');
    if (!clean) return;

    let rawQuantity = null;
    let rawUnit = null;
    let preparation = null;
    let foodQuery = clean;
    let isApproximate = false;
    let sizeModifier = null;

    if (/\b(around|approx|approximately|about|roughly|nearly)\b/i.test(clean)) {
      isApproximate = true;
      foodQuery = foodQuery.replace(/\b(around|approx|approximately|about|roughly|nearly)\b/gi, '').trim();
    }

    let isUnspecifiedQty = false;
    if (/\b(some|a\s+little|little|a\s+bit\s+of|few|a\s+few)\b/i.test(foodQuery)) {
      isUnspecifiedQty = true;
      foodQuery = foodQuery.replace(/\b(some|a\s+little|little|a\s+bit\s+of|few|a\s+few)\b/gi, '').trim();
    }

    foodQuery = foodQuery.replace(/^(?:had|ate|drank|consumed)\s+/i, '').trim();

    const sizeMatch = foodQuery.match(/^(?:(\d+(?:\.\d+)?)\s+)?(small|medium|large|big)\s+(bowl|cup|plate|glass|serving|size|sized)?\s*(?:of)?\s*(.*)$/i);
    if (sizeMatch) {
      if (sizeMatch[1]) rawQuantity = parseFloat(sizeMatch[1]);
      sizeModifier = sizeMatch[2].toLowerCase();
      if (sizeMatch[3] && sizeMatch[3] !== 'size' && sizeMatch[3] !== 'sized') {
        rawUnit = canonicalizeUnit(sizeMatch[3]);
      }
      foodQuery = sizeMatch[4].trim();
    }

    // Pattern 1: Number + Metric Weight
    if (rawQuantity === null) {
      const metricMatch = foodQuery.match(/^(\d+(?:\.\d+)?)\s*(g|grams?|gm|gms|kg|kilos?|kilograms?|ml|milliliters?|oz|ounces?|lbs?|pounds?)\b\s*(?:of)?\s*(.*)$/i);
      if (metricMatch) {
        rawQuantity = parseFloat(metricMatch[1]);
        rawUnit = canonicalizeUnit(metricMatch[2]);
        foodQuery = metricMatch[3].trim();
      }
    }

    // Pattern 2: Fused number + unit
    if (rawQuantity === null) {
      const fusedMatch = foodQuery.match(/^(\d+(?:\.\d+)?)(g|gram|grams|gm|gms|kg|kilo|kilos|ml|oz|lb)\b\s*(?:of)?\s*(.*)$/i);
      if (fusedMatch) {
        rawQuantity = parseFloat(fusedMatch[1]);
        rawUnit = canonicalizeUnit(fusedMatch[2]);
        foodQuery = fusedMatch[3].trim();
      }
    }

    // Pattern 3: Number + Container
    if (rawQuantity === null) {
      const containerMatch = foodQuery.match(/^(\d+(?:\.\d+)?)\s*(cups?|bowls?|katori|katoris|plates?|glasses?|glass|slices?|pieces?|pcs?|tbsp|tablespoons?|tsp|teaspoons?|servings?|handfuls?)\b\s*(?:of)?\s*(.*)$/i);
      if (containerMatch) {
        rawQuantity = parseFloat(containerMatch[1]);
        rawUnit = canonicalizeUnit(containerMatch[2]);
        foodQuery = containerMatch[3].trim();
      }
    }

    // Pattern 4: Article + Container
    if (rawQuantity === null && !isUnspecifiedQty) {
      const articleContainerMatch = foodQuery.match(/^(?:a|an)\s+(cups?|bowls?|katori|plates?|glasses?|glass|slices?|pieces?|handful)\b\s*(?:of)?\s*(.*)$/i);
      if (articleContainerMatch) {
        rawQuantity = 1;
        rawUnit = canonicalizeUnit(articleContainerMatch[1]);
        foodQuery = articleContainerMatch[2].trim();
      }
    }

    // Pattern 5: Number + Food directly
    if (rawQuantity === null) {
      const countMatch = foodQuery.match(/^(\d+(?:\.\d+)?)\s+(.*)$/i);
      if (countMatch) {
        rawQuantity = parseFloat(countMatch[1]);
        rawUnit = 'piece';
        foodQuery = countMatch[2].trim();
      }
    }

    // Pattern 6: Article + food
    if (rawQuantity === null && !isUnspecifiedQty) {
      const plainArticleMatch = foodQuery.match(/^(?:a|an)\s+(.+)$/i);
      if (plainArticleMatch) {
        rawQuantity = 1;
        rawUnit = 'piece';
        foodQuery = plainArticleMatch[1].trim();
      }
    }

    foodQuery = foodQuery.replace(/^[.,;!?\s]+|[.,;!?\s]+$/g, '');
    foodQuery = foodQuery.replace(/^of\s+/i, '').trim();

    for (const prep of PREPARATION_TERMS) {
      const prepReg = new RegExp(`\\b${prep}\\b`, 'i');
      if (prepReg.test(foodQuery)) {
        preparation = prep;
        break;
      }
    }

    // Resolve Entity
    const cleanQuery = foodQuery.toLowerCase().trim();
    const singularQuery = singularize(cleanQuery);
    let matchedAlias = CURATED_ALIASES[cleanQuery] || CURATED_ALIASES[singularQuery] || null;
    let matchedFood = null;
    let isAmbiguous = false;
    let candidates = [];
    let clarificationPrompt = null;
    let defaultWeight = null;
    let displayName = foodQuery;
    let fdcId = null;

    if (matchedAlias) {
      if (matchedAlias.ambiguous) {
        isAmbiguous = true;
        clarificationPrompt = matchedAlias.prompt;
        candidates = matchedAlias.candidates;
        displayName = matchedAlias.candidates[0].common_name.split('(')[0].trim();
      } else {
        fdcId = matchedAlias.fdc_id;
        displayName = matchedAlias.name;
        defaultWeight = matchedAlias.default_weight;
        matchedFood = findClientFood(fdcId);
      }
    } else {
      const searchRes = searchFoods(cleanQuery, 4);
      if (searchRes.length > 0) {
        matchedFood = searchRes[0];
        displayName = matchedFood.common_name || matchedFood.name;
        fdcId = matchedFood.source?.source_id ? Number(matchedFood.source.source_id) : matchedFood.id;
      }
    }

    const finalQuantity = isUnspecifiedQty ? null : rawQuantity;
    const ingId = `ing_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`;
    let resolvedWeightG = null;
    let portionId = null;
    let portionDescription = null;

    if (finalQuantity !== null && finalQuantity > 0) {
      const weightCalc = resolveClientPortionWeight(matchedFood, finalQuantity, rawUnit, sizeModifier, defaultWeight);
      if (weightCalc) {
        resolvedWeightG = weightCalc.weight_g;
        portionId = weightCalc.portion_id;
        portionDescription = weightCalc.portion_description;
      }
    }

    let status = 'confirmed';
    let confidence = 0.95;

    if (isAmbiguous) {
      status = 'ambiguous_food';
      confidence = 0.60;
    } else if (finalQuantity === null || resolvedWeightG === null) {
      status = 'missing_portion';
      confidence = matchedFood || fdcId ? 0.75 : 0.50;
    } else if (!matchedFood && !fdcId) {
      status = 'unrecognized';
      confidence = 0.40;
    }

    const itemObj = {
      id: ingId,
      raw_text: clean,
      food_query: foodQuery,
      food_name: displayName,
      fdc_id: isAmbiguous ? null : fdcId,
      quantity: finalQuantity,
      unit: rawUnit || (finalQuantity ? 'piece' : null),
      weight_g: resolvedWeightG,
      confidence,
      status,
      preparation,
      is_approximate: isApproximate,
      portion_id: portionId,
      portion_description: portionDescription || (resolvedWeightG ? `${resolvedWeightG}g` : null),
      candidates,
      clarification_prompt: clarificationPrompt,
      available_portions: matchedFood?.serving_weights_g
        ? Object.entries(matchedFood.serving_weights_g).map(([u, w], i) => ({
            id: i + 1,
            portion_id: i + 1,
            amount: 1,
            unit: u,
            gram_weight: w,
            display_name: `1 ${u} (${w}g)`
          }))
        : []
    };

    parsedIngredients.push(itemObj);

    if (itemObj.status === 'ambiguous_food' && itemObj.candidates.length > 0) {
      clarifications.push({
        ingredient_id: itemObj.id,
        ingredient_index: index,
        type: 'ambiguous_food',
        raw_text: itemObj.raw_text,
        food_query: itemObj.food_query,
        question: itemObj.clarification_prompt || `Which variety of ${itemObj.food_query} did you have?`,
        options: itemObj.candidates.map(c => ({
          fdc_id: c.fdc_id,
          name: c.common_name || c.name,
          food_category: c.food_category,
        })),
      });
    } else if (itemObj.status === 'missing_portion') {
      clarifications.push({
        ingredient_id: itemObj.id,
        ingredient_index: index,
        type: 'missing_portion',
        raw_text: itemObj.raw_text,
        food_query: itemObj.food_query,
        question: `Please specify the serving quantity or weight for '${itemObj.food_name}' (e.g. 100g, 1 cup).`,
        options: [],
      });
    }
  });

  const hasAmbiguities = parsedIngredients.some(item => item.status === 'ambiguous_food');
  const hasMissingPortions = parsedIngredients.some(item => item.status === 'missing_portion');
  const overallStatus = (hasAmbiguities || hasMissingPortions || parsedIngredients.length === 0)
    ? 'needs_confirmation'
    : 'ready';

  const totalConfidence = parsedIngredients.reduce((acc, curr) => acc + (curr.confidence || 0.5), 0);
  const avgConfidence = parsedIngredients.length > 0
    ? Math.round((totalConfidence / parsedIngredients.length) * 100) / 100
    : 0;

  let calculatedNutrition = null;
  if (overallStatus === 'ready' && parsedIngredients.length > 0) {
    const calcInput = parsedIngredients.map(ing => {
      const food = findClientFood(ing.fdc_id);
      return {
        food_id: ing.fdc_id ? `usda_fdc_${ing.fdc_id}` : null,
        food,
        quantity: ing.weight_g || 100,
        unit: 'g',
      };
    });
    calculatedNutrition = calculateMealNutrition(calcInput);
  }

  return {
    original_text: cleanInput,
    status: overallStatus,
    has_ambiguities: hasAmbiguities,
    has_missing_portions: hasMissingPortions,
    has_unrecognized: parsedIngredients.some(item => item.status === 'unrecognized'),
    ingredient_count: parsedIngredients.length,
    confidence_score: avgConfidence,
    ingredients: parsedIngredients,
    clarifications,
    calculated_nutrition: calculatedNutrition,
  };
}

export default {
  parseMealClient,
};
