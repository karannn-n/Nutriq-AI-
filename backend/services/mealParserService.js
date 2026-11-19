/**
 * Nutriq Local Natural-Language Meal Parsing Engine (Phase 2)
 * 
 * Provides deterministic, AI-free natural-language understanding for meal descriptions.
 * Extracts food entities, quantities, serving units, preparation modifiers, and aliases;
 * checks food ambiguities; maps to verified USDA FoodData Central FDC IDs; and resolves
 * exact gram weights using foods.db portion conversions.
 * 
 * Designed to support future supervised ML entity-extraction model integration.
 */

const { foodCatalogService } = require('./foodCatalogService');

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

// Compound fractions and expressions
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

// ─── 2. UNIT SYNONYMS ────────────────────────────────────────────────────────
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

// ─── 3. PREPARATION MODIFIERS ────────────────────────────────────────────────
const PREPARATION_TERMS = [
  'boiled',
  'hard-boiled',
  'soft-boiled',
  'poached',
  'scrambled',
  'fried',
  'deep-fried',
  'pan-fried',
  'grilled',
  'roasted',
  'baked',
  'steamed',
  'cooked',
  'raw',
  'uncooked',
  'sauteed',
  'sautéed',
  'stir-fried',
  'toasted',
  'mashed',
  'sprouted',
  'fermented',
];

// ─── 4. COMMON INDIAN STAPLES & ALIAS DICTIONARY ─────────────────────────────
const CURATED_ALIASES = {
  // Breads / Rotis
  roti: { fdc_id: 174075, name: 'Whole Wheat Chapati / Roti', category: 'Baked Products', default_unit: 'piece', default_weight: 43, ambiguous: false },
  rotis: { fdc_id: 174075, name: 'Whole Wheat Chapati / Roti', category: 'Baked Products', default_unit: 'piece', default_weight: 43, ambiguous: false },
  chapati: { fdc_id: 174075, name: 'Whole Wheat Chapati / Roti', category: 'Baked Products', default_unit: 'piece', default_weight: 43, ambiguous: false },
  chapatis: { fdc_id: 174075, name: 'Whole Wheat Chapati / Roti', category: 'Baked Products', default_unit: 'piece', default_weight: 43, ambiguous: false },
  phulka: { fdc_id: 174075, name: 'Whole Wheat Chapati / Roti (Phulka)', category: 'Baked Products', default_unit: 'piece', default_weight: 43, ambiguous: false },
  phulkas: { fdc_id: 174075, name: 'Whole Wheat Chapati / Roti (Phulka)', category: 'Baked Products', default_unit: 'piece', default_weight: 43, ambiguous: false },
  naan: { fdc_id: 174075, name: 'Naan Bread', category: 'Baked Products', default_unit: 'piece', default_weight: 90, ambiguous: false },
  paratha: { fdc_id: 174075, name: 'Plain Paratha', category: 'Baked Products', default_unit: 'piece', default_weight: 80, ambiguous: false },

  // Dals / Lentils
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

  // Dairy & Indian Curds
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

  // Grains & Rice
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

  // Eggs & Breakfast items
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

  // Fruits
  banana: { fdc_id: 173944, name: 'Raw Banana', category: 'Fruits and Fruit Juices', default_unit: 'piece', default_weight: 118, ambiguous: false },
  bananas: { fdc_id: 173944, name: 'Raw Banana', category: 'Fruits and Fruit Juices', default_unit: 'piece', default_weight: 118, ambiguous: false },
  apple: { fdc_id: 171688, name: 'Raw Apple (with skin)', category: 'Fruits and Fruit Juices', default_unit: 'piece', default_weight: 182, ambiguous: false },
  apples: { fdc_id: 171688, name: 'Raw Apple (with skin)', category: 'Fruits and Fruit Juices', default_unit: 'piece', default_weight: 182, ambiguous: false },

  // Vegetables & Sabzi
  'spinach sabzi': { fdc_id: 168463, name: 'Cooked Spinach (Spinach Sabzi)', category: 'Vegetables and Vegetable Products', default_unit: 'cup', default_weight: 180, ambiguous: false },
  sabzi: { fdc_id: 168463, name: 'Mixed Vegetable Sabzi', category: 'Vegetables and Vegetable Products', default_unit: 'cup', default_weight: 150, ambiguous: false },
  palak: { fdc_id: 168463, name: 'Cooked Spinach (Palak)', category: 'Vegetables and Vegetable Products', default_unit: 'cup', default_weight: 180, ambiguous: false },
  spinach: { fdc_id: 168463, name: 'Cooked Spinach', category: 'Vegetables and Vegetable Products', default_unit: 'cup', default_weight: 180, ambiguous: false },
  salad: { fdc_id: 168462, name: 'Mixed Green Salad', category: 'Vegetables and Vegetable Products', default_unit: 'cup', default_weight: 60, ambiguous: false },

  // Meats & Poultry
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

class MealParserService {
  constructor() {
    this.catalog = foodCatalogService;
  }

  /**
   * Main entry point: Parses natural-language meal description into structured draft.
   * Does NOT save meals to database; returns structured draft for user review.
   * 
   * @param {string} text - User input (e.g. "I had 2 rotis, one bowl of dal and a cup of curd.")
   * @returns {Object} Structured meal parse result
   */
  parseMeal(text) {
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
    const normalized = this.normalizeText(cleanInput);
    const phrases = this.segmentPhrases(normalized);

    const parsedIngredients = [];
    const clarifications = [];

    for (let i = 0; i < phrases.length; i++) {
      const phrase = phrases[i];
      const parsedItem = this.parseItemPhrase(phrase, i);
      if (parsedItem) {
        parsedIngredients.push(parsedItem);

        if (parsedItem.status === 'ambiguous_food' && parsedItem.candidates && parsedItem.candidates.length > 0) {
          clarifications.push({
            ingredient_id: parsedItem.id,
            ingredient_index: i,
            type: 'ambiguous_food',
            raw_text: parsedItem.raw_text,
            food_query: parsedItem.food_query,
            question: parsedItem.clarification_prompt || `Which variety of ${parsedItem.food_query} did you have?`,
            options: parsedItem.candidates.map(c => ({
              fdc_id: c.fdc_id,
              name: c.common_name || c.name || c.description,
              food_category: c.food_category,
            })),
          });
        } else if (parsedItem.status === 'missing_portion') {
          clarifications.push({
            ingredient_id: parsedItem.id,
            ingredient_index: i,
            type: 'missing_portion',
            raw_text: parsedItem.raw_text,
            food_query: parsedItem.food_query,
            question: `Please specify the serving quantity or weight for '${parsedItem.food_name}' (e.g., 100g, 1 cup).`,
            options: [],
          });
        }
      }
    }

    // Determine overall status
    const hasAmbiguities = parsedIngredients.some(item => item.status === 'ambiguous_food');
    const hasMissingPortions = parsedIngredients.some(item => item.status === 'missing_portion');
    const hasUnrecognized = parsedIngredients.some(item => item.status === 'unrecognized');

    const overallStatus = (hasAmbiguities || hasMissingPortions || hasUnrecognized || parsedIngredients.length === 0)
      ? 'needs_confirmation'
      : 'ready';

    // Calculate overall confidence score (mean confidence)
    const totalConfidence = parsedIngredients.reduce((acc, curr) => acc + (curr.confidence || 0.5), 0);
    const avgConfidence = parsedIngredients.length > 0
      ? Math.round((totalConfidence / parsedIngredients.length) * 100) / 100
      : 0;

    // Calculate deterministic nutrition if ready
    let calculatedNutrition = null;
    if (overallStatus === 'ready' && parsedIngredients.length > 0) {
      try {
        const calcIngredients = parsedIngredients.map(ing => ({
          fdc_id: ing.fdc_id,
          weight_g: ing.weight_g,
          food_name: ing.food_name,
          portion_id: ing.portion_id,
          quantity: ing.quantity,
          unit: ing.unit,
        }));
        calculatedNutrition = this.catalog.calculateDeterministicNutrition(calcIngredients);
      } catch (err) {
        // Log warning but don't fail parsing
      }
    }

    const futureMlSchema = this.formatMlAnnotation(cleanInput, parsedIngredients, [], true);

    return {
      original_text: cleanInput,
      status: overallStatus,
      has_ambiguities: hasAmbiguities,
      has_missing_portions: hasMissingPortions,
      has_unrecognized: hasUnrecognized,
      ingredient_count: parsedIngredients.length,
      confidence_score: avgConfidence,
      ingredients: parsedIngredients,
      clarifications,
      calculated_nutrition: calculatedNutrition,
      future_ml_schema: futureMlSchema,
    };
  }

  /**
   * Text normalization: strip narrative prefixes, handle compound fractions, standardize units.
   */
  normalizeText(text) {
    let s = text.toLowerCase().trim();

    // Strip trailing punctuation
    s = s.replace(/[.,;!?]+$/g, '');

    // Remove narrative & conversational introductions
    s = s.replace(/^(?:for\s+(?:breakfast|lunch|dinner|snack|supper|brunch)(?::|\s+i\s+had|\s+i\s+ate)?)\s*/gi, '');
    s = s.replace(/^(?:breakfast|lunch|dinner|snack|supper)\s+(?:was|consisted\s+of|included)\s*/gi, '');
    s = s.replace(/^(?:today\s+i\s+(?:ate|had))\s*/gi, '');
    s = s.replace(/^(?:yesterday\s+i\s+(?:ate|had))\s*/gi, '');
    s = s.replace(/^(?:i\s+(?:had|ate|drank|consumed|took|prepared|made|enjoyed|finished))\s*(?:around|approx|approximately|about|roughly)?\s*/gi, '');
    s = s.replace(/^(?:just\s+had|had|ate|drank|consumed)\s+/gi, '');

    // Substitute compound fraction expressions
    for (const fe of FRACTION_EXPRESSIONS) {
      s = s.replace(fe.pattern, String(fe.value));
    }

    // Replace English number words when preceded/followed by food or unit contexts
    for (const [word, val] of Object.entries(NUMBER_WORDS)) {
      const reg = new RegExp(`\\b${word}\\b`, 'gi');
      s = s.replace(reg, String(val));
    }

    return s.trim();
  }

  /**
   * Segment multi-item meal descriptions into discrete food phrases.
   */
  segmentPhrases(normalizedText) {
    // Delimiters: commas, semicolons, +, &, and, with, along with, followed by, as well as, newlines
    const rawTokens = normalizedText
      .split(/[,;\n\+]|\b(?:and|along\s+with|plus|followed\s+by|as\s+well\s+as|together\s+with|served\s+with)\b/i)
      .map(t => t.trim().replace(/^[.,;!?\s]+|[.,;!?\s]+$/g, ''))
      .filter(t => t.length > 0);

    const phrases = [];
    for (const token of rawTokens) {
      // Handle sub-split on 'with' (e.g. "3 boiled eggs with 2 slices of toast")
      if (/\bwith\b/i.test(token)) {
        const subParts = token.split(/\bwith\b/i).map(sp => sp.trim().replace(/^[.,;!?\s]+|[.,;!?\s]+$/g, '')).filter(Boolean);
        phrases.push(...subParts);
      } else {
        phrases.push(token);
      }
    }

    return phrases.filter(p => !/^(a|an|the|of|some|roughly|approx|around)$/i.test(p.trim()));
  }

  /**
   * Parse a single ingredient phrase (e.g. "2 rotis", "one bowl of dal", "a cup of curd").
   */
  parseItemPhrase(phrase, index) {
    let clean = phrase.trim().replace(/^[.,;!?\s]+|[.,;!?\s]+$/g, '');
    if (!clean) return null;

    let rawQuantity = null;
    let rawUnit = null;
    let preparation = null;
    let foodQuery = clean;
    let isApproximate = false;
    let sizeModifier = null;

    // Detect approximation markers
    if (/\b(around|approx|approximately|about|roughly|nearly)\b/i.test(clean)) {
      isApproximate = true;
      foodQuery = foodQuery.replace(/\b(around|approx|approximately|about|roughly|nearly)\b/gi, '').trim();
    }

    // Detect "some", "a little", "few"
    let isUnspecifiedQty = false;
    if (/\b(some|a\s+little|little|a\s+bit\s+of|few|a\s+few)\b/i.test(foodQuery)) {
      isUnspecifiedQty = true;
      foodQuery = foodQuery.replace(/\b(some|a\s+little|little|a\s+bit\s+of|few|a\s+few)\b/gi, '').trim();
    }

    // Strip remaining narrative leads like "had", "ate"
    foodQuery = foodQuery.replace(/^(?:had|ate|drank|consumed)\s+/i, '').trim();

    // Check size adjectives (e.g. "small bowl of", "medium banana")
    const sizeMatch = foodQuery.match(/^(?:(\d+(?:\.\d+)?)\s+)?(small|medium|large|big)\s+(bowl|cup|plate|glass|serving|size|sized)?\s*(?:of)?\s*(.*)$/i);
    if (sizeMatch) {
      if (sizeMatch[1]) rawQuantity = parseFloat(sizeMatch[1]);
      sizeModifier = sizeMatch[2].toLowerCase();
      if (sizeMatch[3] && sizeMatch[3] !== 'size' && sizeMatch[3] !== 'sized') {
        rawUnit = this.canonicalizeUnit(sizeMatch[3]);
      }
      foodQuery = sizeMatch[4].trim();
    }

    // ─── Pattern 1: Explicit Number + Metric Weight (e.g. "150 grams of paneer", "200 g chicken")
    if (rawQuantity === null) {
      const metricMatch = foodQuery.match(/^(\d+(?:\.\d+)?)\s*(g|grams?|gm|gms|kg|kilos?|kilograms?|ml|milliliters?|oz|ounces?|lbs?|pounds?)\b\s*(?:of)?\s*(.*)$/i);
      if (metricMatch) {
        rawQuantity = parseFloat(metricMatch[1]);
        rawUnit = this.canonicalizeUnit(metricMatch[2]);
        foodQuery = metricMatch[3].trim();
      }
    }

    // ─── Pattern 2: Fused quantity & metric unit (e.g. "200g grilled chicken", "100g rice")
    if (rawQuantity === null) {
      const fusedMatch = foodQuery.match(/^(\d+(?:\.\d+)?)(g|gram|grams|gm|gms|kg|kilo|kilos|ml|oz|lb)\b\s*(?:of)?\s*(.*)$/i);
      if (fusedMatch) {
        rawQuantity = parseFloat(fusedMatch[1]);
        rawUnit = this.canonicalizeUnit(fusedMatch[2]);
        foodQuery = fusedMatch[3].trim();
      }
    }

    // ─── Pattern 3: Number + Container/Unit + "of" (e.g. "1 bowl of dal", "2 slices of toast", "1 cup curd")
    if (rawQuantity === null) {
      const containerMatch = foodQuery.match(/^(\d+(?:\.\d+)?)\s*(cups?|bowls?|katori|katoris|plates?|glasses?|glass|slices?|pieces?|pcs?|tbsp|tablespoons?|tsp|teaspoons?|servings?|handfuls?)\b\s*(?:of)?\s*(.*)$/i);
      if (containerMatch) {
        rawQuantity = parseFloat(containerMatch[1]);
        rawUnit = this.canonicalizeUnit(containerMatch[2]);
        foodQuery = containerMatch[3].trim();
      }
    }

    // ─── Pattern 4: Indefinite article "a" / "an" + Container + "of" (e.g. "a plate of chicken biryani", "a glass of buttermilk")
    if (rawQuantity === null && !isUnspecifiedQty) {
      const articleContainerMatch = foodQuery.match(/^(?:a|an)\s+(cups?|bowls?|katori|plates?|glasses?|glass|slices?|pieces?|handful)\b\s*(?:of)?\s*(.*)$/i);
      if (articleContainerMatch) {
        rawQuantity = 1;
        rawUnit = this.canonicalizeUnit(articleContainerMatch[1]);
        foodQuery = articleContainerMatch[2].trim();
      }
    }

    // ─── Pattern 4b: Bare Container + "of" (e.g. "plate of chicken biryani", "bowl of dal", "cup of curd")
    if (rawQuantity === null && !isUnspecifiedQty) {
      const bareContainerMatch = foodQuery.match(/^(cups?|bowls?|katori|katoris|plates?|glasses?|glass|slices?|pieces?|servings?|handfuls?)\b\s*(?:of)?\s*(.*)$/i);
      if (bareContainerMatch) {
        rawQuantity = 1;
        rawUnit = this.canonicalizeUnit(bareContainerMatch[1]);
        foodQuery = bareContainerMatch[2].trim();
      }
    }

    // ─── Pattern 5: Number + Food item directly (e.g. "2 rotis", "3 boiled eggs")
    if (rawQuantity === null) {
      const countMatch = foodQuery.match(/^(\d+(?:\.\d+)?)\s+(.*)$/i);
      if (countMatch) {
        rawQuantity = parseFloat(countMatch[1]);
        rawUnit = 'piece';
        foodQuery = countMatch[2].trim();
      }
    }

    // ─── Pattern 6: Indefinite article "a" / "an" + plain food (e.g. "a banana", "an apple")
    if (rawQuantity === null && !isUnspecifiedQty) {
      const plainArticleMatch = foodQuery.match(/^(?:a|an)\s+(.+)$/i);
      if (plainArticleMatch) {
        rawQuantity = 1;
        rawUnit = 'piece';
        foodQuery = plainArticleMatch[1].trim();
      }
    }

    // Clean remaining punctuation & "of "
    foodQuery = foodQuery.replace(/^[.,;!?\s]+|[.,;!?\s]+$/g, '');
    foodQuery = foodQuery.replace(/^of\s+/i, '').trim();

    // Extract preparation term if present
    for (const prep of PREPARATION_TERMS) {
      const prepReg = new RegExp(`\\b${prep}\\b`, 'i');
      if (prepReg.test(foodQuery)) {
        preparation = prep;
        break;
      }
    }

    // ─── Resolve Food Entity ─────────────────────────────────────────────────
    const entityResult = this.resolveFoodEntity(foodQuery, preparation);

    const ingId = `ing_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`;
    const finalQuantity = isUnspecifiedQty ? null : rawQuantity;

    // Gram weight resolution
    let resolvedWeightG = null;
    let portionId = null;
    let portionDescription = null;

    if (finalQuantity !== null && finalQuantity > 0) {
      if (rawUnit === 'g') {
        resolvedWeightG = Math.round(finalQuantity * 10) / 10;
        portionDescription = `${resolvedWeightG}g`;
      } else if (rawUnit === 'kg') {
        resolvedWeightG = Math.round(finalQuantity * 1000 * 10) / 10;
        portionDescription = `${resolvedWeightG}g`;
      } else if (entityResult.matchedFood) {
        const weightCalc = this.resolvePortionWeight(entityResult.matchedFood, finalQuantity, rawUnit, sizeModifier);
        if (weightCalc) {
          resolvedWeightG = weightCalc.weight_g;
          portionId = weightCalc.portion_id;
          portionDescription = weightCalc.portion_description;
        }
      } else if (entityResult.defaultWeight) {
        let mult = entityResult.defaultWeight;
        if (sizeModifier === 'small') mult = Math.round(mult * 0.75);
        if (sizeModifier === 'large') mult = Math.round(mult * 1.35);
        resolvedWeightG = Math.round(finalQuantity * mult * 10) / 10;
        portionDescription = `${finalQuantity} ${rawUnit || 'portion'} (${resolvedWeightG}g)`;
      }
    }

    // Determine status & confidence
    let status = 'confirmed';
    let confidence = 0.95;

    if (entityResult.isAmbiguous) {
      status = 'ambiguous_food';
      confidence = 0.60;
    } else if (finalQuantity === null || resolvedWeightG === null) {
      status = 'missing_portion';
      confidence = entityResult.matchedFood || entityResult.fdcId ? 0.75 : 0.50;
    } else if (!entityResult.matchedFood && !entityResult.fdcId) {
      status = 'unrecognized';
      confidence = 0.40;
    }

    return {
      id: ingId,
      raw_text: clean,
      food_query: foodQuery,
      food_name: entityResult.displayName || foodQuery,
      fdc_id: entityResult.isAmbiguous ? null : (entityResult.fdcId || null),
      quantity: finalQuantity,
      unit: rawUnit || (finalQuantity ? 'piece' : null),
      weight_g: resolvedWeightG,
      confidence,
      status,
      preparation: preparation || entityResult.preparation || null,
      is_approximate: isApproximate,
      portion_id: portionId,
      portion_description: portionDescription || (resolvedWeightG ? `${resolvedWeightG}g` : null),
      candidates: entityResult.candidates || [],
      clarification_prompt: entityResult.clarificationPrompt || null,
      available_portions: entityResult.matchedFood?.portions || [],
    };
  }

  /**
   * Resolve food entity against curated aliases and the USDA SQLite catalog.
   */
  resolveFoodEntity(foodQuery, preparation) {
    const clean = foodQuery.toLowerCase().trim();
    const singular = this.singularize(clean);

    // 1. Direct Curated Alias Lookup
    if (CURATED_ALIASES[clean] || CURATED_ALIASES[singular]) {
      const aliasData = CURATED_ALIASES[clean] || CURATED_ALIASES[singular];
      if (aliasData.ambiguous) {
        return {
          displayName: aliasData.candidates[0].common_name.split('(')[0].trim(),
          isAmbiguous: true,
          clarificationPrompt: aliasData.prompt,
          candidates: aliasData.candidates,
          fdcId: null,
          category: aliasData.category,
        };
      }

      const food = this.catalog.getById(aliasData.fdc_id);
      return {
        displayName: aliasData.name || food?.common_name || food?.description,
        fdcId: aliasData.fdc_id,
        matchedFood: food,
        defaultWeight: aliasData.default_weight,
        defaultUnit: aliasData.default_unit,
        category: aliasData.category,
        isAmbiguous: false,
      };
    }

    // 2. Query FoodCatalogService in foods.db
    const searchRes = this.catalog.searchFoods(clean, { limit: 6 });

    if (searchRes && searchRes.count > 0) {
      if (searchRes.is_ambiguous && searchRes.candidates && searchRes.candidates.length > 1) {
        return {
          displayName: clean,
          isAmbiguous: true,
          clarificationPrompt: searchRes.clarification_prompt || `Which variety of ${clean} did you have?`,
          candidates: searchRes.candidates,
          fdcId: null,
        };
      }

      const topMatch = searchRes.foods[0];
      return {
        displayName: topMatch.common_name || topMatch.description,
        fdcId: topMatch.fdc_id,
        matchedFood: topMatch,
        isAmbiguous: false,
        category: topMatch.food_category,
      };
    }

    // 3. Fallback search with singular form
    if (singular !== clean) {
      const singularRes = this.catalog.searchFoods(singular, { limit: 6 });
      if (singularRes && singularRes.count > 0) {
        const topMatch = singularRes.foods[0];
        return {
          displayName: topMatch.common_name || topMatch.description,
          fdcId: topMatch.fdc_id,
          matchedFood: topMatch,
          isAmbiguous: singularRes.is_ambiguous,
          clarificationPrompt: singularRes.clarification_prompt,
          candidates: singularRes.candidates || [],
          category: topMatch.food_category,
        };
      }
    }

    // 4. Unrecognized food
    return {
      displayName: clean,
      fdcId: null,
      matchedFood: null,
      isAmbiguous: false,
    };
  }

  /**
   * Resolve portion weight in grams from USDA food portions database.
   */
  resolvePortionWeight(food, quantity, unit, sizeModifier) {
    if (!food) return null;

    const portions = food.portions || this.catalog.getPortionsForFood(food.fdc_id);
    if (!portions || portions.length === 0) {
      // Standard baseline weights if no USDA portions listed
      if (unit === 'cup') return { weight_g: Math.round(quantity * 200), portion_description: `${quantity} cup (200g)` };
      if (unit === 'bowl') return { weight_g: Math.round(quantity * (sizeModifier === 'small' ? 150 : 200)), portion_description: `${quantity} bowl (${sizeModifier === 'small' ? 150 : 200}g)` };
      if (unit === 'glass') return { weight_g: Math.round(quantity * 240), portion_description: `${quantity} glass (240g)` };
      if (unit === 'plate') return { weight_g: Math.round(quantity * 350), portion_description: `${quantity} plate (350g)` };
      if (unit === 'tablespoon') return { weight_g: Math.round(quantity * 15), portion_description: `${quantity} tbsp (15g)` };
      if (unit === 'piece') return { weight_g: Math.round(quantity * 50), portion_description: `${quantity} piece (50g)` };
      return null;
    }

    const normUnit = (unit || '').toLowerCase();

    // 1. Check for size modifier on fruits/items (e.g. "one small banana", "medium apple")
    if (sizeModifier) {
      const sizePortion = portions.find(p => {
        const desc = `${p.modifier || ''} ${p.unit || ''} ${p.portion_description || ''}`.toLowerCase();
        return desc.includes(sizeModifier);
      });
      if (sizePortion && sizePortion.gram_weight) {
        const totalGrams = Math.round(quantity * Number(sizePortion.gram_weight) * 10) / 10;
        return {
          weight_g: totalGrams,
          portion_id: sizePortion.portion_id || sizePortion.id,
          portion_description: `${quantity} ${sizeModifier} (${totalGrams}g)`,
        };
      }
    }

    // 2. Direct unit match in portions
    const matchedPortion = portions.find(p => {
      const pUnit = (p.unit || '').toLowerCase();
      const pMod = (p.modifier || '').toLowerCase();
      const pDesc = (p.portion_description || '').toLowerCase();

      if (normUnit === 'cup' && (pUnit.includes('cup') || pMod.includes('cup') || pDesc.includes('cup'))) return true;
      if (normUnit === 'slice' && (pUnit.includes('slice') || pMod.includes('slice') || pDesc.includes('slice'))) return true;
      if (normUnit === 'bowl' && (pUnit.includes('bowl') || pUnit.includes('cup') || pMod.includes('cup'))) return true;
      if (normUnit === 'glass' && (pUnit.includes('glass') || pUnit.includes('cup') || pMod.includes('cup') || pUnit.includes('fl oz'))) return true;
      if (normUnit === 'plate' && (pUnit.includes('plate') || pUnit.includes('dish') || pUnit.includes('serving'))) return true;
      if (normUnit === 'tablespoon' && (pUnit.includes('tbsp') || pMod.includes('tbsp') || pUnit.includes('tablespoon'))) return true;
      if (normUnit === 'teaspoon' && (pUnit.includes('tsp') || pMod.includes('tsp') || pUnit.includes('teaspoon'))) return true;
      if (normUnit === 'piece' && (pUnit.includes('piece') || pUnit.includes('unit') || pMod.includes('medium') || pMod.includes('large') || pUnit.includes('item'))) return true;
      return false;
    });

    if (matchedPortion && matchedPortion.gram_weight) {
      let gw = Number(matchedPortion.gram_weight);
      if (sizeModifier === 'small' && normUnit === 'bowl') gw = Math.round(gw * 0.75);
      const totalGrams = Math.round(quantity * gw * 10) / 10;
      return {
        weight_g: totalGrams,
        portion_id: matchedPortion.portion_id || matchedPortion.id,
        portion_description: `${quantity} ${matchedPortion.modifier || matchedPortion.unit || normUnit} (${totalGrams}g)`,
      };
    }

    // Default to first verified portion if quantity is provided
    if (portions[0] && portions[0].gram_weight) {
      const p0 = portions[0];
      const gw = Number(p0.gram_weight);
      const totalGrams = Math.round(quantity * gw * 10) / 10;
      return {
        weight_g: totalGrams,
        portion_id: p0.portion_id || p0.id,
        portion_description: `${quantity} × ${p0.modifier || p0.unit || 'serving'} (${totalGrams}g)`,
      };
    }

    return null;
  }

  /**
   * Convert plural food names to singular.
   */
  singularize(word) {
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

  /**
   * Standardize unit names into canonical keys.
   */
  canonicalizeUnit(unitStr) {
    if (!unitStr) return null;
    const lower = unitStr.toLowerCase().trim();

    for (const [canonical, synonyms] of Object.entries(UNIT_SYNONYMS)) {
      if (canonical === lower || synonyms.includes(lower)) {
        return canonical;
      }
    }
    return lower;
  }

  /**
   * Future ML Training Annotation Schema Formatter (Requirement 10)
   * 
   * Formats a meal parse event into an annotated dataset record for supervised
   * food-entity extraction model training.
   * Only generated with explicit user consent (opt-in).
   */
  formatMlAnnotation(rawText, parsedIngredients, userCorrections = [], isOptIn = false) {
    if (!isOptIn) {
      return {
        allowed_for_training: false,
        notice: 'User did not opt in to model training data collection.',
      };
    }

    const entities = [];
    const textLower = rawText.toLowerCase();

    for (const ing of parsedIngredients) {
      const foodQuery = ing.food_query ? ing.food_query.toLowerCase() : '';
      const startIdx = textLower.indexOf(foodQuery);

      if (startIdx !== -1) {
        entities.push({
          start_char: startIdx,
          end_char: startIdx + foodQuery.length,
          entity_type: 'FOOD',
          text: foodQuery,
          fdc_id: ing.fdc_id,
          normalized_food: ing.food_name,
        });
      }

      if (ing.quantity !== null) {
        const qtyStr = String(ing.quantity);
        const qtyIdx = textLower.indexOf(qtyStr);
        if (qtyIdx !== -1) {
          entities.push({
            start_char: qtyIdx,
            end_char: qtyIdx + qtyStr.length,
            entity_type: 'QUANTITY',
            text: qtyStr,
            value: ing.quantity,
          });
        }
      }

      if (ing.unit) {
        const unitIdx = textLower.indexOf(ing.unit.toLowerCase());
        if (unitIdx !== -1) {
          entities.push({
            start_char: unitIdx,
            end_char: unitIdx + ing.unit.length,
            entity_type: 'UNIT',
            text: ing.unit,
          });
        }
      }

      if (ing.preparation) {
        const prepIdx = textLower.indexOf(ing.preparation.toLowerCase());
        if (prepIdx !== -1) {
          entities.push({
            start_char: prepIdx,
            end_char: prepIdx + ing.preparation.length,
            entity_type: 'PREPARATION',
            text: ing.preparation,
          });
        }
      }
    }

    return {
      allowed_for_training: true,
      anonymized_id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      raw_text: rawText,
      entities: entities.sort((a, b) => a.start_char - b.start_char),
      corrections: userCorrections,
    };
  }
}

const mealParserServiceInstance = new MealParserService();

module.exports = {
  MealParserService,
  mealParserService: mealParserServiceInstance,
};
