/**
 * Local Food Database Service
 * 
 * In-memory indexer and search provider for the normalized USDA FoodData Central dataset.
 * Supports fast lookup by ID, exact name, aliases, fuzzy substring matching, and ambiguity detection.
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'food_database.json');

class FoodDatabase {
  constructor(customPath) {
    this.filePath = customPath || DB_PATH;
    this.foods = [];
    this.idMap = new Map();
    this.aliasMap = new Map();
    this.initialized = false;
    this.load();
  }

  load() {
    try {
      if (!fs.existsSync(this.filePath)) {
        console.warn(`[FoodDatabase] Database file not found at ${this.filePath}. Initializing empty.`);
        this.foods = [];
        return;
      }

      const raw = fs.readFileSync(this.filePath, 'utf8');
      this.foods = JSON.parse(raw);
      this.buildIndices();
      this.initialized = true;
    } catch (err) {
      console.error(`[FoodDatabase] Error loading food database:`, err.message);
      this.foods = [];
    }
  }

  buildIndices() {
    this.idMap.clear();
    this.aliasMap.clear();

    for (const food of this.foods) {
      this.idMap.set(food.id, food);

      // Index exact primary name
      const normName = this.normalize(food.name);
      const normCommon = this.normalize(food.common_name);
      
      this.addToAliasIndex(normName, food);
      this.addToAliasIndex(normCommon, food);

      // Index all aliases
      if (Array.isArray(food.aliases)) {
        for (const alias of food.aliases) {
          this.addToAliasIndex(this.normalize(alias), food);
        }
      }
    }
  }

  addToAliasIndex(key, food) {
    if (!key) return;
    if (!this.aliasMap.has(key)) {
      this.aliasMap.set(key, []);
    }
    const list = this.aliasMap.get(key);
    if (!list.some(f => f.id === food.id)) {
      list.push(food);
    }
  }

  normalize(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // remove punctuation
      .replace(/\s+/g, ' ');
  }

  /**
   * Get a food item by unique ID
   */
  getById(id) {
    if (!id) return null;
    return this.idMap.get(id) || null;
  }

  /**
   * Match a food name or alias against the database.
   * Detects exact matches vs ambiguous multi-matches.
   */
  matchFood(nameQuery) {
    if (!nameQuery || typeof nameQuery !== 'string') {
      return { match: null, isAmbiguous: false, notFound: true, query: nameQuery };
    }

    const norm = this.normalize(nameQuery);
    if (!norm) {
      return { match: null, isAmbiguous: false, notFound: true, query: nameQuery };
    }

    // 1. Direct ID match
    if (this.idMap.has(nameQuery)) {
      return { match: this.idMap.get(nameQuery), confidence: 'exact_id', isAmbiguous: false };
    }

    // 2. Exact alias / name match
    if (this.aliasMap.has(norm)) {
      const candidates = this.aliasMap.get(norm);
      if (candidates.length === 1) {
        return { match: candidates[0], confidence: 'exact_alias', isAmbiguous: false };
      } else {
        // Multiple foods share this exact alias (e.g. 'milk' -> whole milk, skim milk)
        return {
          match: null,
          isAmbiguous: true,
          candidates: candidates.map(c => ({ id: c.id, name: c.common_name, group: c.food_group })),
          query: nameQuery,
          reason: `Multiple foods match '${nameQuery}'. Please specify the variant.`,
        };
      }
    }

    // 3. Substring / Token Search
    const searchResults = this.search(norm, 5);
    if (searchResults.length === 1 && searchResults[0].score >= 0.8) {
      return { match: searchResults[0].food, confidence: 'high_confidence_substring', isAmbiguous: false };
    }

    if (searchResults.length > 0) {
      return {
        match: null,
        isAmbiguous: true,
        candidates: searchResults.map(r => ({ id: r.food.id, name: r.food.common_name, group: r.food.food_group })),
        query: nameQuery,
        reason: `Ambiguous food description '${nameQuery}'. Candidate matches found.`,
      };
    }

    return {
      match: null,
      isAmbiguous: false,
      notFound: true,
      query: nameQuery,
      reason: `Food '${nameQuery}' was not found in the local USDA database.`,
    };
  }

  /**
   * Search foods by query string
   */
  search(query, limit = 10) {
    if (!query || typeof query !== 'string') return [];
    const norm = this.normalize(query);
    if (!norm) return [];

    const results = [];

    for (const food of this.foods) {
      let score = 0;
      const normName = this.normalize(food.name);
      const normCommon = this.normalize(food.common_name);

      if (normName === norm || normCommon === norm) {
        score = 1.0;
      } else if (food.aliases?.some(a => this.normalize(a) === norm)) {
        score = 0.95;
      } else if (normCommon.startsWith(norm)) {
        score = 0.85;
      } else if (normCommon.includes(norm)) {
        score = 0.75;
      } else if (food.aliases?.some(a => this.normalize(a).includes(norm))) {
        score = 0.65;
      } else if (normName.includes(norm)) {
        score = 0.50;
      }

      if (score > 0) {
        results.push({ food, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Return all food records
   */
  getAllFoods() {
    return this.foods;
  }

  /**
   * Count of foods
   */
  get count() {
    return this.foods.length;
  }
}

// Singleton default instance
const foodDbInstance = new FoodDatabase();

module.exports = {
  FoodDatabase,
  foodDatabase: foodDbInstance,
};

