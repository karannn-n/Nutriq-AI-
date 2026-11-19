/**
 * Local Food Catalog Service
 * 
 * Production-ready read-only service backed by SQLite (data/indexes/foods.db).
 * Queries Nutriq's curated USDA FoodData Central catalog (13,723 foods, 36,681 portions).
 * 
 * Features:
 *  - Sub-millisecond indexed food retrieval by FDC ID, common name, or category.
 *  - Food-specific portion lookups with exact gram weights.
 *  - Regional Indian & colloquial alias matching with ambiguity detection.
 *  - Fuzzy typo & spelling variation tolerance (Levenshtein + phonetic map).
 *  - Deterministic nutrient calculations for single foods and multi-ingredient meals.
 *  - Strict data quality rules: preserves unmeasured nutrients as null, flags partial totals,
 *    validates positive serving sizes (>0), consolidates duplicate ingredients, and preserves provenance.
 */

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

// Locate foods.db across local and production deployment environments
const candidatePaths = [
  process.env.FOODS_DB_PATH,
  path.resolve(__dirname, '../../data/indexes/foods.db'),
  path.resolve(__dirname, '../data/indexes/foods.db'),
  path.resolve(__dirname, './data/indexes/foods.db'),
  path.resolve(process.cwd(), 'data/indexes/foods.db'),
  path.resolve(process.cwd(), '../data/indexes/foods.db'),
].filter(Boolean);
const DB_PATH = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];

class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

// Canonical tracked nutrients metadata
const TRACKED_NUTRIENTS = [
  { key: 'calories', name: 'Calories', unit: 'kcal' },
  { key: 'protein_g', name: 'Protein', unit: 'g' },
  { key: 'carbs_g', name: 'Carbohydrates', unit: 'g' },
  { key: 'fat_g', name: 'Total Fat', unit: 'g' },
  { key: 'vitamin_d_mcg', name: 'Vitamin D', unit: 'mcg' },
  { key: 'iron_mg', name: 'Iron', unit: 'mg' },
  { key: 'zinc_mg', name: 'Zinc', unit: 'mg' },
  { key: 'b12_mcg', name: 'Vitamin B-12', unit: 'mcg' },
];

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

// Common spelling variations for fuzzy alias lookup
const PHONETIC_VARIATIONS = {
  dhal: 'dal',
  daal: 'dal',
  channa: 'chana',
  chhole: 'chana',
  cholay: 'chana',
  panir: 'paneer',
  paneeer: 'paneer',
  rooti: 'roti',
  chappati: 'chapati',
  chapatti: 'chapati',
  biriyani: 'biryani',
  briyani: 'biryani',
  rajmah: 'rajma',
  palack: 'palak',
  spinich: 'spinach',
  spinnach: 'spinach',
  chiken: 'chicken breast',
  lentil: 'lentils',
  egg: 'eggs',
  oat: 'oats',
};

// Fast Levenshtein distance
function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const row = Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) row[j] = j;

  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], prev, row[j]) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[n] = prev;
  }
  return row[n];
}

class FoodCatalogService {
  constructor(databasePath = DB_PATH) {
    this.dbPath = databasePath;
    this.db = null;
    this.stmts = {};
    this.aliasCache = [];
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(this.dbPath)) {
        console.warn(`[FoodCatalogService] SQLite database not found at ${this.dbPath}.`);
        return;
      }

      this.db = new DatabaseSync(this.dbPath, { readOnly: true });

      this.stmts = {
        getFoodByFdcId: this.db.prepare('SELECT * FROM foods WHERE fdc_id = ?'),
        getFoodByIdOrFdc: this.db.prepare('SELECT * FROM foods WHERE id = ? OR fdc_id = ?'),
        getPortionsForFood: this.db.prepare('SELECT * FROM food_portions WHERE fdc_id = ? ORDER BY id'),
        getPortionById: this.db.prepare('SELECT * FROM food_portions WHERE id = ?'),
        getAliasesByAlias: this.db.prepare('SELECT * FROM food_aliases WHERE alias = ? COLLATE NOCASE'),
        getAllAliases: this.db.prepare('SELECT DISTINCT alias, ambiguous, clarification_prompt FROM food_aliases'),
        searchCommonPrefix: this.db.prepare('SELECT * FROM foods WHERE common_name LIKE ? COLLATE NOCASE LIMIT ?'),
        searchCommonSubstring: this.db.prepare('SELECT * FROM foods WHERE common_name LIKE ? COLLATE NOCASE LIMIT ?'),
        searchDescSubstring: this.db.prepare('SELECT * FROM foods WHERE description LIKE ? COLLATE NOCASE LIMIT ?'),
        countFoods: this.db.prepare('SELECT COUNT(*) as count FROM foods'),
        countPortions: this.db.prepare('SELECT COUNT(*) as count FROM food_portions'),
        countAliases: this.db.prepare('SELECT COUNT(*) as count FROM food_aliases'),
        listFoodsPaginated: this.db.prepare('SELECT * FROM foods ORDER BY fdc_id LIMIT ? OFFSET ?'),
      };

      const rows = this.stmts.getAllAliases.all();
      this.aliasCache = rows.map(r => r.alias.toLowerCase());
    } catch (err) {
      console.error(`[FoodCatalogService] Database init error:`, err.message);
      this.db = null;
    }
  }

  get isReady() {
    return Boolean(this.db && this.stmts.getFoodByFdcId);
  }

  get count() {
    if (!this.isReady) return 0;
    try {
      return this.stmts.countFoods.get().count;
    } catch {
      return 0;
    }
  }

  /**
   * Format raw SQL food row into normalized application object
   */
  _formatFoodObject(row, portions = null) {
    if (!row) return null;

    const fdcId = Number(row.fdc_id);
    const resolvedPortions = portions || (this.isReady ? this.stmts.getPortionsForFood.all(fdcId) : []);

    const servingWeightsMap = {};
    const formattedPortions = [];

    for (const p of resolvedPortions) {
      const gw = Number(p.gram_weight);
      const unitKey = (p.unit || '').toLowerCase().trim();
      if (unitKey && !servingWeightsMap[unitKey]) {
        servingWeightsMap[unitKey] = gw;
      }
      formattedPortions.push({
        id: Number(p.id),
        portion_id: Number(p.id),
        fdc_id: fdcId,
        amount: Number(p.amount) || 1,
        unit: p.unit,
        modifier: p.modifier || '',
        portion_description: p.portion_description || '',
        display_name: p.display_name,
        gram_weight: gw,
      });
    }

    return {
      id: row.id || `usda_${fdcId}`,
      fdc_id: fdcId,
      name: row.description,
      description: row.description,
      common_name: row.common_name,
      food_group: row.food_category,
      food_category: row.food_category,
      food_category_id: row.food_category_id,
      data_type: row.data_type,
      publication_date: row.publication_date,
      portion_count: row.portion_count || formattedPortions.length,
      completeness_score: row.completeness_score,
      nutrients_per_100g: {
        calories: { value: row.calories !== null ? Number(row.calories) : null, unit: 'kcal' },
        protein_g: { value: row.protein_g !== null ? Number(row.protein_g) : null, unit: 'g' },
        carbs_g: { value: row.carbs_g !== null ? Number(row.carbs_g) : null, unit: 'g' },
        fat_g: { value: row.fat_g !== null ? Number(row.fat_g) : null, unit: 'g' },
        vitamin_d_mcg: { value: row.vitamin_d_mcg !== null ? Number(row.vitamin_d_mcg) : null, unit: 'mcg' },
        iron_mg: { value: row.iron_mg !== null ? Number(row.iron_mg) : null, unit: 'mg' },
        zinc_mg: { value: row.zinc_mg !== null ? Number(row.zinc_mg) : null, unit: 'mg' },
        b12_mcg: { value: row.b12_mcg !== null ? Number(row.b12_mcg) : null, unit: 'mcg' },
      },
      calories: row.calories !== null ? Number(row.calories) : null,
      protein_g: row.protein_g !== null ? Number(row.protein_g) : null,
      carbs_g: row.carbs_g !== null ? Number(row.carbs_g) : null,
      fat_g: row.fat_g !== null ? Number(row.fat_g) : null,
      vitamin_d_mcg: row.vitamin_d_mcg !== null ? Number(row.vitamin_d_mcg) : null,
      iron_mg: row.iron_mg !== null ? Number(row.iron_mg) : null,
      zinc_mg: row.zinc_mg !== null ? Number(row.zinc_mg) : null,
      b12_mcg: row.b12_mcg !== null ? Number(row.b12_mcg) : null,
      serving_weights_g: servingWeightsMap,
      portions: formattedPortions,
      source: {
        name: 'USDA FoodData Central',
        source_id: String(fdcId),
        data_type: row.data_type,
        publication_date: row.publication_date,
      },
    };
  }

  /**
   * Retrieve a food by identifier (integer 172421, '172421', 'usda_172421', or 'usda_fdc_172421')
   */
  getById(id) {
    if (!this.isReady || id === undefined || id === null) return null;

    let numericId = null;
    let stringId = String(id).trim();

    if (typeof id === 'number') {
      numericId = id;
    } else if (/^\d+$/.test(stringId)) {
      numericId = parseInt(stringId, 10);
    } else if (stringId.startsWith('usda_fdc_')) {
      numericId = parseInt(stringId.replace('usda_fdc_', ''), 10);
    } else if (stringId.startsWith('usda_')) {
      numericId = parseInt(stringId.replace('usda_', ''), 10);
    }

    try {
      let row = null;
      if (numericId) {
        row = this.stmts.getFoodByFdcId.get(numericId);
      }
      if (!row) {
        row = this.stmts.getFoodByIdOrFdc.get(stringId, numericId || 0);
      }
      if (!row) return null;
      return this._formatFoodObject(row);
    } catch (err) {
      console.error(`[FoodCatalogService] Error in getById(${id}):`, err.message);
      return null;
    }
  }

  /**
   * Retrieve all portion conversions for a specific food
   */
  getPortionsForFood(fdcId) {
    if (!this.isReady || !fdcId) return [];
    try {
      const numFdcId = typeof fdcId === 'number' ? fdcId : parseInt(String(fdcId).replace(/^usda_(fdc_)?/, ''), 10);
      if (isNaN(numFdcId)) return [];
      const rows = this.stmts.getPortionsForFood.all(numFdcId);
      return rows.map(p => ({
        id: Number(p.id),
        portion_id: Number(p.id),
        fdc_id: numFdcId,
        amount: Number(p.amount) || 1,
        unit: p.unit,
        modifier: p.modifier || '',
        portion_description: p.portion_description || '',
        display_name: p.display_name,
        gram_weight: Number(p.gram_weight),
      }));
    } catch (err) {
      console.error(`[FoodCatalogService] Error in getPortionsForFood(${fdcId}):`, err.message);
      return [];
    }
  }

  /**
   * Retrieve a specific portion by ID
   */
  getPortionById(portionId) {
    if (!this.isReady || !portionId) return null;
    try {
      const numId = parseInt(portionId, 10);
      if (isNaN(numId)) return null;
      const row = this.stmts.getPortionById.get(numId);
      if (!row) return null;
      return {
        id: Number(row.id),
        portion_id: Number(row.id),
        fdc_id: Number(row.fdc_id),
        amount: Number(row.amount) || 1,
        unit: row.unit,
        modifier: row.modifier || '',
        portion_description: row.portion_description || '',
        display_name: row.display_name,
        gram_weight: Number(row.gram_weight),
      };
    } catch (err) {
      console.error(`[FoodCatalogService] Error in getPortionById(${portionId}):`, err.message);
      return null;
    }
  }

  /**
   * Food search functionality supporting:
   *  - Exact food-name matching
   *  - Partial matching
   *  - Common-name matching
   *  - Indian food aliases
   *  - Case-insensitive search
   *  - Fuzzy matching for spelling variations
   *  - Ambiguity detection
   * 
   * @param {string} query - Search term
   * @param {Object} [options] - Options { limit: 20 }
   * @returns {Object} Search results
   */
  searchFoods(query, options = {}) {
    const limit = Math.min(100, Math.max(1, options.limit || 20));

    if (!query || typeof query !== 'string' || !query.trim()) {
      return {
        query: query || '',
        count: 0,
        is_ambiguous: false,
        clarification_prompt: null,
        foods: [],
        candidates: [],
      };
    }

    const cleanQuery = query.trim().toLowerCase();

    // 1. Direct FDC ID lookup
    if (/^\d+$/.test(cleanQuery) || cleanQuery.startsWith('usda_')) {
      const directFood = this.getById(cleanQuery);
      if (directFood) {
        return {
          query,
          count: 1,
          is_ambiguous: false,
          clarification_prompt: null,
          foods: [directFood],
          candidates: [directFood],
        };
      }
    }

    // 2. Exact & Phonetic Alias Lookup
    let aliasQuery = cleanQuery;
    if (PHONETIC_VARIATIONS[cleanQuery]) {
      aliasQuery = PHONETIC_VARIATIONS[cleanQuery];
    }

    let aliasMatches = this.stmts.getAliasesByAlias.all(aliasQuery);

    // If no direct alias, check fuzzy Levenshtein distance on known aliases (distance <= 2)
    if (aliasMatches.length === 0 && this.aliasCache.length > 0) {
      let bestDist = 3;
      let matchedAlias = null;
      for (const known of this.aliasCache) {
        const d = levenshtein(cleanQuery, known);
        if (d <= 2 && d < bestDist) {
          bestDist = d;
          matchedAlias = known;
        }
      }
      if (matchedAlias) {
        aliasQuery = matchedAlias;
        aliasMatches = this.stmts.getAliasesByAlias.all(matchedAlias);
      }
    }

    if (aliasMatches.length > 0) {
      const isAmbiguous = aliasMatches[0].ambiguous === 1;
      const clarificationPrompt = aliasMatches[0].clarification_prompt || null;

      const candidates = aliasMatches.map(a => {
        const food = this.getById(a.fdc_id);
        const portions = this.getPortionsForFood(a.fdc_id);
        return {
          fdc_id: a.fdc_id,
          id: `usda_${a.fdc_id}`,
          alias_matched: a.alias,
          variety: a.variety,
          common_name: food?.common_name || a.common_name,
          description: food?.description || a.common_name,
          food_category: food?.food_category || a.category,
          confidence: a.confidence,
          calories_per_100g: food?.calories ?? null,
          protein_g_per_100g: food?.protein_g ?? null,
          carbs_g_per_100g: food?.carbs_g ?? null,
          fat_g_per_100g: food?.fat_g ?? null,
          portion_count: portions.length,
          portions,
          food,
        };
      });

      return {
        query,
        matched_alias: aliasQuery,
        is_ambiguous: isAmbiguous,
        clarification_prompt: clarificationPrompt,
        count: candidates.length,
        candidates,
        foods: candidates.map(c => c.food || c),
      };
    }

    // 3. Database Text Search (Prefix, Substring, Description)
    const resultsMap = new Map();

    // 3a. Prefix match on common_name
    const prefixRows = this.stmts.searchCommonPrefix.all(`${cleanQuery}%`, limit);
    for (const row of prefixRows) {
      resultsMap.set(row.fdc_id, { row, score: 0.90 });
    }

    // 3b. Substring match on common_name
    if (resultsMap.size < limit) {
      const subRows = this.stmts.searchCommonSubstring.all(`%${cleanQuery}%`, limit);
      for (const row of subRows) {
        if (!resultsMap.has(row.fdc_id)) {
          resultsMap.set(row.fdc_id, { row, score: 0.75 });
        }
      }
    }

    // 3c. Substring match on description
    if (resultsMap.size < limit) {
      const descRows = this.stmts.searchDescSubstring.all(`%${cleanQuery}%`, limit);
      for (const row of descRows) {
        if (!resultsMap.has(row.fdc_id)) {
          resultsMap.set(row.fdc_id, { row, score: 0.60 });
        }
      }
    }

    const sortedList = Array.from(resultsMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => this._formatFoodObject(item.row));

    const isMultiMatch = sortedList.length > 1;

    return {
      query,
      count: sortedList.length,
      is_ambiguous: isMultiMatch,
      clarification_prompt: isMultiMatch
        ? `Multiple foods match '${query}'. Please select the specific item.`
        : null,
      foods: sortedList,
      candidates: sortedList.map(f => ({
        fdc_id: f.fdc_id,
        id: f.id,
        common_name: f.common_name,
        food_category: f.food_category,
        portions: f.portions,
      })),
    };
  }

  /**
   * Match food for natural language meal composition
   */
  matchFood(nameQuery) {
    if (!nameQuery || typeof nameQuery !== 'string' || !nameQuery.trim()) {
      return { match: null, isAmbiguous: false, notFound: true, query: nameQuery };
    }

    const searchResult = this.searchFoods(nameQuery, { limit: 10 });

    if (searchResult.count === 0) {
      return {
        match: null,
        isAmbiguous: false,
        notFound: true,
        query: nameQuery,
        reason: `Food '${nameQuery}' was not found in the local USDA database.`,
      };
    }

    if (searchResult.is_ambiguous) {
      return {
        match: null,
        isAmbiguous: true,
        candidates: searchResult.candidates || searchResult.foods,
        clarification_prompt: searchResult.clarification_prompt,
        query: nameQuery,
        reason: searchResult.clarification_prompt || `Multiple foods match '${nameQuery}'. Please specify the variant.`,
      };
    }

    const matchFood = searchResult.foods[0];
    return {
      match: matchFood,
      confidence: searchResult.matched_alias ? 'alias_exact' : 'single_match',
      isAmbiguous: false,
      query: nameQuery,
    };
  }

  /**
   * Deterministic nutrient calculation for a single food item
   * 
   * Formula: nutrient_amount = (nutrient_per_100g * serving_weight_in_grams) / 100
   * 
   * @param {number|string|Object} foodOrFdcId - Food object or FDC ID
   * @param {Object} options - { weight_g, portion_id, quantity, unit }
   * @returns {Object} Calculated nutrients breakdown
   */
  calculateSingleFoodNutrients(foodOrFdcId, options = {}) {
    let food = typeof foodOrFdcId === 'object' && foodOrFdcId !== null ? foodOrFdcId : this.getById(foodOrFdcId);
    if (!food) {
      throw new ValidationError(`Food ID '${foodOrFdcId}' not found in database.`, 'food_id');
    }

    let gramWeight = null;
    let inputQty = 1;
    let inputUnit = 'g';
    let matchedPortion = null;

    // 1. Explicit weight_g
    if (options.weight_g !== undefined && options.weight_g !== null) {
      const w = Number(options.weight_g);
      if (isNaN(w) || w <= 0) {
        throw new ValidationError(`Serving weight must be a positive number greater than 0. Received: ${options.weight_g}`, 'weight_g');
      }
      gramWeight = Math.round(w * 1000) / 1000;
      inputQty = gramWeight;
      inputUnit = 'g';
    } else if (options.portion_id) {
      // 2. Direct portion ID
      const portion = this.getPortionById(options.portion_id);
      if (!portion) {
        throw new ValidationError(`Portion ID '${options.portion_id}' not found.`, 'portion_id');
      }
      if (food.fdc_id && portion.fdc_id !== food.fdc_id) {
        throw new ValidationError(`Portion ID '${options.portion_id}' belongs to FDC ${portion.fdc_id}, not ${food.fdc_id}.`, 'portion_id');
      }
      matchedPortion = portion;
      const q = options.quantity !== undefined ? Number(options.quantity) : 1;
      if (isNaN(q) || q <= 0) {
        throw new ValidationError(`Portion quantity must be greater than zero. Received: ${options.quantity}`, 'quantity');
      }
      gramWeight = Math.round(q * portion.gram_weight * 1000) / 1000;
      inputQty = q;
      inputUnit = portion.display_name || portion.unit || 'serving';
    } else {
      // 3. Unit and quantity conversion
      inputQty = options.quantity !== undefined ? Number(options.quantity) : 1;
      inputUnit = options.unit || 'g';
      if (isNaN(inputQty) || inputQty <= 0) {
        throw new ValidationError(`Quantity must be greater than zero. Received: ${options.quantity}`, 'quantity');
      }

      const rawUnit = inputUnit.toLowerCase().trim();
      const cleanUnit = rawUnit.replace(/s$/, '');

      // Check universal units
      if (UNIVERSAL_WEIGHT_UNITS[rawUnit] !== undefined) {
        gramWeight = Math.round(inputQty * UNIVERSAL_WEIGHT_UNITS[rawUnit] * 1000) / 1000;
      } else if (UNIVERSAL_WEIGHT_UNITS[cleanUnit] !== undefined) {
        gramWeight = Math.round(inputQty * UNIVERSAL_WEIGHT_UNITS[cleanUnit] * 1000) / 1000;
      } else {
        // Food-specific portions lookup
        const portions = this.getPortionsForFood(food.fdc_id);
        for (const p of portions) {
          const pUnit = (p.unit || '').toLowerCase().trim();
          const pMod = (p.modifier || '').toLowerCase().trim();
          const pDesc = (p.portion_description || '').toLowerCase().trim();
          const pDisp = (p.display_name || '').toLowerCase().trim();

          if (
            pUnit === rawUnit || pUnit === cleanUnit ||
            pMod === rawUnit || pMod === cleanUnit ||
            pDesc.includes(rawUnit) || pDisp.includes(rawUnit)
          ) {
            matchedPortion = p;
            const ratio = p.amount && p.amount > 0 ? inputQty / p.amount : inputQty;
            gramWeight = Math.round(ratio * p.gram_weight * 1000) / 1000;
            break;
          }
        }
      }

      if (gramWeight === null) {
        const available = this.getPortionsForFood(food.fdc_id).map(p => p.unit);
        throw new ValidationError(
          `Unrecognized unit '${inputUnit}' for ${food.common_name}. Available units: g, kg, oz, lb, ${available.join(', ')}`,
          'unit'
        );
      }
    }

    if (gramWeight === null || gramWeight <= 0) {
      throw new ValidationError(`Calculated serving weight must be strictly positive (>0). Received: ${gramWeight}`, 'gram_weight');
    }

    // Deterministic calculation for each tracked nutrient
    const nutrients = {};
    const unknownNutrients = [];
    const knownNutrients = [];

    for (const nutDef of TRACKED_NUTRIENTS) {
      const key = nutDef.key;
      const unit = nutDef.unit;

      let per100g = null;
      if (food.nutrients_per_100g && food.nutrients_per_100g[key] !== undefined) {
        const entry = food.nutrients_per_100g[key];
        per100g = typeof entry === 'object' && entry !== null ? entry.value : entry;
      } else if (food[key] !== undefined) {
        per100g = food[key];
      }

      if (per100g === null || per100g === undefined) {
        nutrients[key] = {
          value: null,
          unit,
          isUnknown: true,
          source: 'unmeasured_in_usda',
        };
        unknownNutrients.push(key);
      } else {
        const numVal = Number(per100g);
        if (isNaN(numVal) || numVal < 0) {
          throw new ValidationError(`Corrupted nutrient data for '${key}' in ${food.common_name}.`, 'nutrient');
        }

        const rawAmount = (numVal * gramWeight) / 100.0;
        const roundedAmount = Math.round(rawAmount * 100) / 100;

        nutrients[key] = {
          value: roundedAmount,
          raw_value: rawAmount,
          unit,
          isUnknown: false,
        };
        knownNutrients.push(key);
      }
    }

    return {
      fdc_id: food.fdc_id,
      food_id: food.id || `usda_${food.fdc_id}`,
      food_name: food.common_name || food.description,
      food_category: food.food_category,
      input_quantity: Number(inputQty),
      input_unit: inputUnit,
      serving_weight_in_grams: gramWeight,
      portion_info: matchedPortion,
      nutrients,
      completeness: {
        all_nutrients_known: unknownNutrients.length === 0,
        unknown_nutrients: unknownNutrients,
        known_nutrients: knownNutrients,
        completeness_percentage: Math.round((knownNutrients.length / TRACKED_NUTRIENTS.length) * 100),
      },
      source: {
        name: 'USDA FoodData Central',
        fdc_id: food.fdc_id,
        data_type: food.data_type,
        publication_date: food.publication_date,
      },
    };
  }

  /**
   * Deterministic calculation for a multi-ingredient composite meal
   * 
   * Aggregates nutrient totals of confirmed ingredients, preserves unmeasured nutrients as null,
   * flags partial totals with details of missing ingredients, and consolidates duplicate ingredients.
   * 
   * @param {Array} ingredients - List of ingredient objects [{ fdc_id, weight_g }, ...]
   * @returns {Object} Comprehensive meal nutrition summary
   */
  calculateDeterministicNutrition(ingredients) {
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      throw new ValidationError('At least one ingredient is required for nutrient calculation.', 'ingredients');
    }

    // 1. Consolidate duplicate ingredients (same fdc_id and same unit/portion)
    const consolidated = [];
    const seenMap = new Map();

    for (let i = 0; i < ingredients.length; i++) {
      const item = ingredients[i];
      if (!item || typeof item !== 'object') {
        throw new ValidationError(`Ingredient at index ${i} must be an object.`, 'ingredients');
      }

      const fdcId = item.fdc_id || (item.food && item.food.fdc_id) || item.food_id;
      if (!fdcId) {
        throw new ValidationError(`Ingredient at index ${i} is missing 'fdc_id'.`, 'fdc_id');
      }

      const portionKey = item.portion_id || item.unit || 'g';
      const compositeKey = `${fdcId}__${portionKey}`;

      if (seenMap.has(compositeKey)) {
        const existing = seenMap.get(compositeKey);
        if (item.weight_g !== undefined && existing.weight_g !== undefined) {
          existing.weight_g += Number(item.weight_g);
          existing.wasConsolidated = true;
        } else if (item.quantity !== undefined && existing.quantity !== undefined) {
          existing.quantity += Number(item.quantity);
          existing.wasConsolidated = true;
        } else {
          consolidated.push({ ...item, originalIndex: i });
        }
      } else {
        const cloned = { ...item, originalIndex: i };
        consolidated.push(cloned);
        seenMap.set(compositeKey, cloned);
      }
    }

    // 2. Calculate each ingredient
    const calculatedIngredients = [];
    let totalMealWeight = 0;

    const totals = {};
    for (const nutDef of TRACKED_NUTRIENTS) {
      totals[nutDef.key] = {
        value: 0,
        unit: nutDef.unit,
        isPartial: false,
        missingIn: [],
        knownCount: 0,
      };
    }

    for (const item of consolidated) {
      const fdcId = item.fdc_id || (item.food && item.food.fdc_id) || item.food_id;
      const calcResult = this.calculateSingleFoodNutrients(fdcId, item);
      calculatedIngredients.push({
        ...calcResult,
        was_consolidated: Boolean(item.wasConsolidated),
      });

      totalMealWeight += calcResult.serving_weight_in_grams;

      for (const [key, nutInfo] of Object.entries(calcResult.nutrients)) {
        if (totals[key]) {
          if (nutInfo.isUnknown || nutInfo.value === null) {
            totals[key].isPartial = true;
            totals[key].missingIn.push(calcResult.food_name);
          } else {
            totals[key].value = Math.round((totals[key].value + nutInfo.value) * 100) / 100;
            totals[key].knownCount += 1;
          }
        }
      }
    }

    // 3. Format final aggregate totals
    const finalTotals = {};
    const unmeasuredNutrients = [];
    const partialNutrients = [];

    for (const [key, t] of Object.entries(totals)) {
      const allMissing = t.knownCount === 0;
      if (allMissing) {
        unmeasuredNutrients.push(key);
      } else if (t.isPartial) {
        partialNutrients.push(key);
      }

      finalTotals[key] = {
        amount: allMissing ? null : t.value,
        unit: t.unit,
        is_complete: !t.isPartial && !allMissing,
        is_partial: t.isPartial && !allMissing,
        missing_in_ingredients: t.missingIn,
      };
    }

    return {
      type: 'meal',
      ingredient_count: calculatedIngredients.length,
      total_weight_grams: Math.round(totalMealWeight * 100) / 100,
      ingredients: calculatedIngredients,
      totals: finalTotals,
      completeness: {
        all_nutrients_known: unmeasuredNutrients.length === 0 && partialNutrients.length === 0,
        unmeasured_nutrients: unmeasuredNutrients,
        partial_nutrients: partialNutrients,
        has_partial_totals: partialNutrients.length > 0,
      },
      db_compatible_nutrition: {
        calories: finalTotals.calories.amount !== null ? Math.round(finalTotals.calories.amount) : null,
        protein_g: finalTotals.protein_g.amount,
        carbs_g: finalTotals.carbs_g.amount,
        fat_g: finalTotals.fat_g.amount,
        vitamin_d_mcg: finalTotals.vitamin_d_mcg.amount,
        iron_mg: finalTotals.iron_mg.amount,
        zinc_mg: finalTotals.zinc_mg.amount,
        b12_mcg: finalTotals.b12_mcg.amount,
      },
      source: 'USDA FoodData Central',
    };
  }

  /**
   * Return paginated list of foods
   */
  getAllFoods(limit = 100, offset = 0) {
    if (!this.isReady) return [];
    try {
      const rows = this.stmts.listFoodsPaginated.all(limit, offset);
      return rows.map(r => this._formatFoodObject(r));
    } catch {
      return [];
    }
  }

  /**
   * Service health and statistics
   */
  getStats() {
    if (!this.isReady) return { isReady: false };
    return {
      isReady: true,
      total_foods: this.stmts.countFoods.get().count,
      total_portions: this.stmts.countPortions.get().count,
      total_aliases: this.stmts.countAliases.get().count,
      database_path: this.dbPath,
    };
  }
}

const foodCatalogServiceInstance = new FoodCatalogService();

module.exports = {
  FoodCatalogService,
  foodCatalogService: foodCatalogServiceInstance,
  ValidationError,
  TRACKED_NUTRIENTS,
};
