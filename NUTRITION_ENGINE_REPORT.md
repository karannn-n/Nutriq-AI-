# Local Nutrition Calculation Engine Report (Phase 1C)

> **Document:** `NUTRITION_ENGINE_REPORT.md`  
> **Project:** Nutriq (AI-Powered Predictive Nutrition Platform)  
> **Phase:** 1C — Local Nutrition Calculation Engine  
> **Execution Date:** November 12, 2026  
> **Author:** Antigravity AI Assistant & Engineering Team  
> **Status:** COMPLETED & VERIFIED (47/47 Tests Passing, 100% Deterministic Precision)

---

## 1. Architecture

Phase 1C delivers Nutriq’s autonomous, deterministic nutrition calculation engine. The system operates entirely locally without requiring external calls to Google Gemini for nutritional calculations, while preserving Gemini as a temporary alternative for legacy flows.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NUTRIQ CLIENT LAYER (React)                     │
│               MealLog.jsx / Dashboard.jsx / History.jsx                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP REST API
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       EXPRESS 5 REST API ROUTER                        │
│   GET /api/foods/search            POST /api/nutrition/calculate       │
│   GET /api/foods/:fdcId/portions   POST /api/nutrition/parse-meal       │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       FOOD CATALOG SERVICE           │  │   MEAL COMPOSITION ENGINE    │
│  - Pre-compiled prepared statements  │  │  - Multi-ingredient sums    │
│  - Multi-tier search & typo fallback │  │  - Duplicate consolidation   │
│  - Exact portion conversions         │  │  - Partial total detection   │
│  - Ambiguity detection & prompts     │  │  - Null preservation checks  │
└───────────────────┬──────────────────┘  └──────────────┬───────────────┘
                    │                                    │
                    ▼                                    │
┌──────────────────────────────────────────────────────┐ │
│         SQLITE REFERENCE ENGINE (foods.db)           │◄┘
│  - Read-Only Mode (DatabaseSync via node:sqlite)     │
│  - 13,723 Curated Whole Foods                        │
│  - 36,681 Verified Portions                          │
│  - 65 Curated Colloquial & Indian Aliases            │
│  - B-Tree Indexes on fdc_id, common_name, alias      │
└──────────────────────────────────────────────────────┘
```

### Key Architectural Highlights:
1. **Zero External Runtime Dependencies:** Implemented using Node.js v22 built-in `node:sqlite` (`DatabaseSync`), avoiding fragile native C++ build steps on target deployment environments.
2. **Read-Only Concurrency:** The database connection is opened strictly with `{ readOnly: true }`, ensuring thread-safety, zero lock contention, and immune database state.
3. **Pre-Compiled Prepared Statements:** All database queries (ID lookup, portion resolution, alias matching, prefix/substring search) are compiled once at initialization, delivering sub-millisecond execution times (<1.5 ms).
4. **Preserved Compatibility:** Existing Supabase database tables (`meals`, `nutrition`), authentication middleware (`requireAuth`), rate limiters, and Gemini AI endpoints remain untouched and fully backward-compatible.

---

## 2. Database Schema Used (`data/indexes/foods.db`)

The SQLite database structure was established in Phase 1B and verified with `PRAGMA integrity_check` (status: `ok`):

### 1. `foods` Table (13,723 records)
```sql
CREATE TABLE foods (
    id TEXT PRIMARY KEY,                       -- e.g. 'usda_172421'
    fdc_id INTEGER NOT NULL UNIQUE,            -- USDA FoodData Central ID (e.g. 172421)
    data_type TEXT NOT NULL,                   -- 'sr_legacy_food', 'foundation_food', 'survey_fndds_food'
    description TEXT NOT NULL,                 -- Official USDA taxonomic description
    common_name TEXT NOT NULL,                 -- Clean colloquial title-cased name
    food_category_id TEXT,                     -- USDA commodity category ID
    food_category TEXT NOT NULL,               -- e.g. 'Legumes and Legume Products'
    publication_date TEXT,                     -- Original publication date
    calories REAL,                             -- Energy (kcal) per 100g edible portion
    protein_g REAL,                            -- Protein (g) per 100g
    carbs_g REAL,                              -- Total carbohydrate (g) per 100g
    fat_g REAL,                                -- Total lipid (g) per 100g
    vitamin_d_mcg REAL,                        -- Vitamin D (mcg) per 100g (NULL if unmeasured)
    iron_mg REAL,                              -- Elemental Iron (mg) per 100g
    zinc_mg REAL,                              -- Elemental Zinc (mg) per 100g
    b12_mcg REAL,                              -- Vitamin B-12 (mcg) per 100g (NULL if unmeasured)
    portion_count INTEGER NOT NULL DEFAULT 0,  -- Number of verified portions
    completeness_score REAL NOT NULL DEFAULT 0.0 -- % of 8 core nutrients populated
);
```

### 2. `food_portions` Table (36,681 records)
```sql
CREATE TABLE food_portions (
    id INTEGER PRIMARY KEY,                    -- Portion identifier
    fdc_id INTEGER NOT NULL,                   -- FK referencing foods(fdc_id)
    amount REAL NOT NULL,                      -- Numeric amount (e.g. 1.0)
    unit TEXT NOT NULL,                        -- Unit name (e.g. 'cup', 'tbsp', 'slice')
    modifier TEXT,                             -- Modifier descriptor (e.g. 'cooked', 'drained')
    portion_description TEXT,                  -- Survey text (e.g. '1 cup')
    display_name TEXT NOT NULL,                -- User-facing formatted label (e.g. '1 cup (198.0 g)')
    gram_weight REAL NOT NULL,                 -- Strictly positive conversion factor (>0)
    FOREIGN KEY (fdc_id) REFERENCES foods(fdc_id)
);
```

### 3. `food_aliases` Table (65 records)
```sql
CREATE TABLE food_aliases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alias TEXT NOT NULL,                       -- Colloquial / regional name (e.g. 'dal', 'chawal')
    language TEXT NOT NULL,                    -- Language code ('hi', 'en')
    category TEXT,                             -- Food group category
    ambiguous INTEGER NOT NULL,                -- 1 if multi-candidate, 0 if 1-to-1 exact
    clarification_prompt TEXT,                 -- Prompt shown to user to resolve ambiguity
    fdc_id INTEGER NOT NULL,                   -- FK referencing foods(fdc_id)
    common_name TEXT NOT NULL,                 -- Candidate food name
    variety TEXT,                              -- Specific culinary variety (e.g. 'Masoor Dal')
    confidence REAL NOT NULL,                  -- Candidate confidence score (0.0 - 1.0)
    FOREIGN KEY (fdc_id) REFERENCES foods(fdc_id)
);
```

### 4. Database B-Tree Indexes
- `idx_foods_fdc_id` on `foods(fdc_id)`
- `idx_foods_common_name` on `foods(common_name COLLATE NOCASE)`
- `idx_foods_category` on `foods(food_category)`
- `idx_portions_fdc_id` on `food_portions(fdc_id)`
- `idx_aliases_alias` on `food_aliases(alias COLLATE NOCASE)`
- `idx_aliases_fdc_id` on `food_aliases(fdc_id)`

---

## 3. Search Implementation

Food searching is executed by `foodCatalogService.searchFoods(query, options)` using a 5-tier search hierarchy:

1. **Tier 1: Direct Entity Lookup**
   - If `query` is numeric (`172421`) or starts with `usda_`, performs an instant primary-key B-tree lookup on `foods(fdc_id)`.
2. **Tier 2: Alias Resolution with Disambiguation**
   - Matches against `food_aliases(alias COLLATE NOCASE)`.
   - If the alias is flagged `ambiguous: 1` (e.g. *dal*, *roti*, *chawal*, *paneer*), returns `is_ambiguous: true`, the specific `clarification_prompt`, and candidate options with serving portion previews.
3. **Tier 3: Fuzzy Typo & Phonetic Tolerance**
   - Evaluates common regional misspellings and phonetic variations via dictionary map (`dhal` $\rightarrow$ `dal`, `channa` $\rightarrow$ `chana`, `panir` $\rightarrow$ `paneer`, `rooti` $\rightarrow$ `roti`, `biriyani` $\rightarrow$ `biryani`, `spinnach` $\rightarrow$ `spinach`).
   - If unmapped, performs Levenshtein distance matching ($\le 2$ edit distance) across known alias keys.
4. **Tier 4: Prefix Matching on Common Name**
   - Executes `SELECT * FROM foods WHERE common_name LIKE ?% COLLATE NOCASE` using B-tree range scan (score: 0.90).
5. **Tier 5: Substring Matching on Common Name & Official Description**
   - Executes `LIKE %?%` across `common_name` and `description` with relevance ranking (score: 0.75 and 0.60).

---

## 4. Alias Matching & Ambiguity Handling

To protect nutritional integrity, Nutriq never guesses between distinct nutritional variants. Ambiguous staples require user confirmation:

| Search Term | Ambiguous? | Clarification Prompt | Returned Candidate Matches |
|---|:---:|---|---|
| **`dal` / `dhal` / `daal`** | **YES** | *"Which variety of dal / lentils are you having?"* | • Masoor / Brown Dal (FDC 172421, 116 kcal)<br>• Toor / Arhar Dal (FDC 170430, 118 kcal)<br>• Moong Dal (FDC 169137, 105 kcal)<br>• Chana Dal (FDC 173757, 164 kcal) |
| **`roti` / `rooti` / `chapati`** | **YES** | *"Is the roti whole wheat (atta) or plain flour?"* | • Whole Wheat Chapati / Roti (FDC 174075, 297 kcal)<br>• Plain Chapati / Roti (FDC 171844, 297 kcal) |
| **`chawal` / `rice`** | **YES** | *"Are you having white rice or brown rice?"* | • Cooked White Rice (FDC 168878, 130 kcal)<br>• Cooked Brown Rice (FDC 169704, 112 kcal) |
| **`paneer` / `panir`** | **YES** | *"Is it plain fresh paneer or cooked in a dish like Palak Paneer?"* | • Paneer Cheese (FDC 2705740, 299 kcal)<br>• Palak Paneer (FDC 2709631, 189 kcal)<br>• Full Fat Cottage Cheese (FDC 2346384, 98 kcal) |
| **`chana` / `channa`** | **YES** | *"Are the chickpeas cooked/boiled or dried raw?"* | • Boiled Chana (FDC 173757, 164 kcal)<br>• Raw Dried Chana (FDC 173756, 378 kcal) |
| **`dosa`** | **YES** | *"Is it a plain dosa or a masala dosa with potato filling?"* | • Dosa, plain (FDC 2708347, 168 kcal)<br>• Dosa, with filling (FDC 2709129, 214 kcal) |
| **`biryani` / `biriyani`** | **YES** | *"Which kind of biryani: chicken, vegetable, or meat?"* | • Chicken Biryani (FDC 2706538, 180 kcal)<br>• Veg Biryani (FDC 2708985, 145 kcal)<br>• Meat Biryani (FDC 2706490, 201 kcal) |
| **`milk`** | **YES** | *"Is it whole milk, reduced fat (2%), or skim milk?"* | • Whole Milk (FDC 2705385, 61 kcal)<br>• Reduced Fat 2% Milk (FDC 2705386, 50 kcal)<br>• Skim Milk (FDC 2705388, 34 kcal) |
| **`rajma`** | **NO** | Direct match | • Cooked Kidney Beans (FDC 2707381, 127 kcal) |
| **`ghee`** | **NO** | Direct match | • Pure Ghee / Clarified Butter (FDC 171314, 884 kcal) |
| **`samosa`** | **NO** | Direct match | • Samosa (FDC 2708730, 262 kcal) |
| **`chicken curry`**| **NO** | Direct match | • Chicken Curry (FDC 2706437, 143 kcal) |

---

## 5. Portion Conversion & Weight Resolution

Serving sizes are converted into gram weight strictly according to food-specific data:

### Conversion Priority Hierarchy:
1. **Direct Grams:** If `weight_g` is provided, gram weight is exact ($> 0$).
2. **Direct Portion ID:** If `portion_id` is supplied, retrieves the verified `gram_weight` from `food_portions` for that food.
3. **Food-Specific Unit Matching:** If `unit` is passed (e.g. `cup`, `tbsp`, `slice`, `piece`, `serving`), matches against portions belonging to that specific food:
   - *Cooked Lentils (FDC 172421):* `1 cup = 198.0 g`, `1 tbsp = 12.3 g`
   - *Cooked White Rice (FDC 168878):* `1 cup = 158.0 g`
   - *Cooked Spinach (FDC 168463):* `1 cup = 180.0 g`
   - *Whole Wheat Chapati (FDC 174075):* `1 roti / serving = 45.0 g`
   - *Raw Whole Egg (FDC 323604):* `1 egg / serving = 50.0 g`
4. **Universal Units:** `kg` ($1,000\,\text{g}$), `oz` ($28.3495\,\text{g}$), `lb` ($453.592\,\text{g}$).
5. **Rejection:** Any unrecognized unit or non-positive weight triggers `ValidationError (HTTP 400)`.

---

## 6. Calculation Formulas & Data Quality Rules

### 1. Deterministic Calculation Formula
$$\text{nutrient amount} = \frac{\text{nutrient per 100g} \times \text{serving weight in grams}}{100}$$

### 2. Multi-Ingredient Aggregation & Duplicate Consolidation
When multiple ingredients are passed:
- Ingredients sharing identical `fdc_id` and measurement unit are consolidated into a single combined weight.
- Nutrients are summed across all confirmed ingredients:
  $$\text{Meal Total}_k = \sum_{i=1}^{N} \text{Ingredient}_{i,k}$$

### 3. Strict Data Quality Rules:
- **Null Preservation:** Unmeasured or unknown nutrients are recorded as `null` and never replaced with `0.0`.
- **Partial Total Indication:** If food $A$ has known Vitamin D and food $B$ has `null` Vitamin D:
  - `totals.vitamin_d_mcg.is_complete = false`
  - `totals.vitamin_d_mcg.is_partial = true`
  - `totals.vitamin_d_mcg.missing_in_ingredients = ["Food B"]`
- **All-Missing Nutrients:** If all ingredients lack data for a nutrient, the total is reported as `null` (not zero).
- **Rounding:** Display values are rounded to 2 decimal places ($100.00$), while raw unrounded floating-point amounts are preserved in `raw_value`.
- **Provenance:** Every calculation returns `fdc_id`, `data_type`, `food_category`, and `publication_date`.

---

## 7. API Documentation

### 1. `GET /api/foods/search`
Searches the local USDA database with exact, common-name, alias, and typo matching.

**Query Parameters:**
- `q` (string, required): Search term (e.g. `dal`, `paneer`, `panir`, `roti`, `chawal`, `oats`).
- `limit` (number, optional): Maximum results to return (default 20, max 100).

**Sample Request:**
```http
GET /api/foods/search?q=dal HTTP/1.1
Host: localhost:5000
```

**Sample Response (Ambiguous Query):**
```json
{
  "query": "dal",
  "matched_alias": "dal",
  "is_ambiguous": true,
  "clarification_prompt": "Which variety of dal / lentils are you having?",
  "count": 4,
  "candidates": [
    {
      "fdc_id": 172421,
      "id": "usda_172421",
      "alias_matched": "dal",
      "variety": "Masoor / Brown Dal",
      "common_name": "Cooked Lentils (mature seeds, without salt)",
      "food_category": "Legumes and Legume Products",
      "confidence": 0.95,
      "calories_per_100g": 116.0,
      "protein_g_per_100g": 9.02,
      "carbs_g_per_100g": 20.13,
      "fat_g_per_100g": 0.38,
      "portions": [
        { "portion_id": 90596, "display_name": "1 cup (198.0 g)", "gram_weight": 198.0, "unit": "cup" },
        { "portion_id": 90597, "display_name": "1 tbsp (12.3 g)", "gram_weight": 12.3, "unit": "tbsp" }
      ]
    },
    {
      "fdc_id": 169137,
      "id": "usda_169137",
      "variety": "Moong Dal",
      "common_name": "Cooked Mung beans (mature seeds, sprouted, drained, without salt)",
      "confidence": 0.90
    }
  ]
}
```

---

### 2. `GET /api/foods/:fdcId/portions`
Retrieves verified household portion conversions and gram weights for a specific food.

**Path Parameters:**
- `fdcId` (integer, required): USDA FoodData Central ID (e.g. `172421`).

**Sample Request:**
```http
GET /api/foods/172421/portions HTTP/1.1
Host: localhost:5000
```

**Sample Response:**
```json
{
  "fdc_id": 172421,
  "food_name": "Cooked Lentils (mature seeds, without salt)",
  "food_category": "Legumes and Legume Products",
  "portion_count": 2,
  "portions": [
    {
      "id": 90596,
      "portion_id": 90596,
      "fdc_id": 172421,
      "amount": 1.0,
      "unit": "cup",
      "modifier": "cup",
      "display_name": "1 cup (198.0 g)",
      "gram_weight": 198.0
    },
    {
      "id": 90597,
      "portion_id": 90597,
      "fdc_id": 172421,
      "amount": 1.0,
      "unit": "tbsp",
      "modifier": "tbsp",
      "display_name": "1 tbsp (12.3 g)",
      "gram_weight": 12.3
    }
  ]
}
```

---

### 3. `POST /api/nutrition/calculate`
Deterministically calculates nutrient quantities for a single food or multi-ingredient composite meal.

**Sample Request (Multi-Ingredient Meal with Direct Weights & Portions):**
```http
POST /api/nutrition/calculate HTTP/1.1
Host: localhost:5000
Content-Type: application/json

{
  "ingredients": [
    { "fdc_id": 172421, "portion_id": 90596, "quantity": 1 },
    { "fdc_id": 171844, "weight_g": 60 }
  ]
}
```

**Sample Response:**
```json
{
  "type": "meal",
  "ingredient_count": 2,
  "total_weight_grams": 258.0,
  "ingredients": [
    {
      "fdc_id": 172421,
      "food_name": "Cooked Lentils (mature seeds, without salt)",
      "serving_weight_in_grams": 198.0,
      "nutrients": {
        "calories": { "value": 229.68, "unit": "kcal", "isUnknown": false },
        "protein_g": { "value": 17.86, "unit": "g", "isUnknown": false },
        "carbs_g": { "value": 39.86, "unit": "g", "isUnknown": false },
        "fat_g": { "value": 0.75, "unit": "g", "isUnknown": false },
        "vitamin_d_mcg": { "value": 0.0, "unit": "mcg", "isUnknown": false },
        "iron_mg": { "value": 6.59, "unit": "mg", "isUnknown": false },
        "zinc_mg": { "value": 2.51, "unit": "mg", "isUnknown": false },
        "b12_mcg": { "value": 0.0, "unit": "mcg", "isUnknown": false }
      }
    },
    {
      "fdc_id": 171844,
      "food_name": "Chapati / Roti (Plain)",
      "serving_weight_in_grams": 60.0,
      "nutrients": {
        "calories": { "value": 178.2, "unit": "kcal", "isUnknown": false },
        "protein_g": { "value": 6.75, "unit": "g", "isUnknown": false },
        "carbs_g": { "value": 27.82, "unit": "g", "isUnknown": false },
        "fat_g": { "value": 4.47, "unit": "g", "isUnknown": false },
        "vitamin_d_mcg": { "value": null, "unit": "mcg", "isUnknown": true },
        "iron_mg": { "value": 1.81, "unit": "mg", "isUnknown": false },
        "zinc_mg": { "value": 0.94, "unit": "mg", "isUnknown": false },
        "b12_mcg": { "value": null, "unit": "mcg", "isUnknown": true }
      }
    }
  ],
  "totals": {
    "calories": { "amount": 407.88, "unit": "kcal", "is_complete": true, "is_partial": false },
    "protein_g": { "amount": 24.61, "unit": "g", "is_complete": true, "is_partial": false },
    "carbs_g": { "amount": 67.68, "unit": "g", "is_complete": true, "is_partial": false },
    "fat_g": { "amount": 5.22, "unit": "g", "is_complete": true, "is_partial": false },
    "vitamin_d_mcg": {
      "amount": 0.0,
      "unit": "mcg",
      "is_complete": false,
      "is_partial": true,
      "missing_in_ingredients": ["Chapati / Roti (Plain)"]
    },
    "iron_mg": { "amount": 8.4, "unit": "mg", "is_complete": true, "is_partial": false },
    "zinc_mg": { "amount": 3.45, "unit": "mg", "is_complete": true, "is_partial": false },
    "b12_mcg": {
      "amount": 0.0,
      "unit": "mcg",
      "is_complete": false,
      "is_partial": true,
      "missing_in_ingredients": ["Chapati / Roti (Plain)"]
    }
  },
  "completeness": {
    "all_nutrients_known": false,
    "has_partial_totals": true,
    "partial_nutrients": ["vitamin_d_mcg", "b12_mcg"],
    "unmeasured_nutrients": []
  },
  "db_compatible_nutrition": {
    "calories": 408,
    "protein_g": 24.61,
    "carbs_g": 67.68,
    "fat_g": 5.22,
    "vitamin_d_mcg": 0.0,
    "iron_mg": 8.4,
    "zinc_mg": 3.45,
    "b12_mcg": 0.0
  },
  "source": "USDA FoodData Central"
}
```

---

## 8. Test Results & Verification

All test suites were executed across the codebase:

```
======================================================================
TEST EXECUTION SUMMARY
======================================================================
Suite 1: Nutriq Production Test Suite (test_suite.js)
  - Result: 10 / 10 passed (100%)
  - Coverage: Auth, RDI benchmarks, health score, validation, rate limiting

Suite 2: Local Nutrient Engine Test Suite (test_nutrient_engine.js)
  - Result: 13 / 13 passed (100%)
  - Coverage: Unit conversions, Phase 1 benchmark foods, composite meal sums

Suite 3: HTTP Endpoint Integration Tests (test_endpoints.js)
  - Result: 10 / 10 passed (100%)
  - Coverage: GET /api/health, GET /api/nutrition/foods, POST /api/nutrition/calculate

Suite 4: Phase 1C Local Engine & API Test Suite (test_local_engine.js)
  - Result: 14 / 14 passed (100%)
  - Coverage:
      1. Exact food search (numeric, string, FDC prefix)
      2. Alias-based search (rajma, ghee, samosa, curry, chutney, milk, etc.)
      3. Ambiguous food handling (dal, roti, chawal, paneer, chana, dosa, biryani)
      4. Portion lookup & exact gram weights
      5. Gram conversion (metric, imperial, and food-specific)
      6. Known Verification Case (Cooked lentils 198g)
      7. Multi-ingredient composite meal calculations & duplicate consolidation
      8. Missing nutrient handling (null preservation & partial total flags)
      9. Invalid food IDs rejection (ValidationError / HTTP 400)
     10. Invalid serving sizes rejection (negative, zero, NaN / HTTP 400)
     11. Incorrect units rejection (ValidationError / HTTP 400)
     12. Data source traceability
     13. HTTP API Endpoints (/api/foods/search, /api/foods/:fdcId/portions, /api/nutrition/calculate)
     14. Sub-millisecond performance benchmark (<5ms per query)

TOTAL TESTS PASSED: 47 / 47 (100% SUCCESS RATE)
======================================================================
```

### Known Verification Case Audit:
**Target:** Cooked lentils, 198g (USDA FDC 172421)
- **Calories:** $116.0 \times 1.98 = \mathbf{229.68\text{ kcal}}$ (Exact match)
- **Protein:** $9.02 \times 1.98 = \mathbf{17.86\text{ g}}$ (Exact match)
- **Carbohydrates:** $20.13 \times 1.98 = \mathbf{39.86\text{ g}}$ (Exact match)
- **Fat:** $0.38 \times 1.98 = \mathbf{0.75\text{ g}}$ (Exact match)
- **Iron:** $3.33 \times 1.98 = \mathbf{6.59\text{ mg}}$ (Exact match)
- **Zinc:** $1.27 \times 1.98 = \mathbf{2.51\text{ mg}}$ (Exact match)
- **Vitamin D:** $0.00\,\mu\text{g}$ (Exact match)
- **Vitamin B12:** $0.00\,\mu\text{g}$ (Exact match)

---

## 9. Performance Measurements

Benchmarked over 50 iterations under concurrent load:
- **Search Query Latency (`searchFoods`):** **1.163 ms** average (Target: <5.0 ms)
- **Nutrient Calculation Latency (`calculateDeterministicNutrition`):** **0.454 ms** average (Target: <5.0 ms)
- **Direct Primary Key Lookup (`getById`):** **0.082 ms** average
- **Portion Lookup (`getPortionsForFood`):** **0.114 ms** average
- **Memory Footprint:** SQLite in-process heap overhead is **<15 MB**
- **Concurrency Safety:** SQLite connection runs in read-only mode with zero file locks.

---

## 10. Known Limitations & Next Steps

### Limitations:
1. **Commercial Barcodes:** 2.01M commercial branded items remain excluded from the local offline core to preserve micronutrient accuracy.
2. **Natural Language Free Text:** Free-text descriptions without quantities require user confirmation via candidate cards.

### Next Steps for Phase 1D (Frontend & MealLog Integration):
1. **Interactive Search & Autocomplete in `MealLog.jsx`:** Connect the search bar to `GET /api/foods/search` with instant dropdown suggestions.
2. **Disambiguation Modal:** When a user selects ambiguous staples (*dal*, *roti*, *rice*, *paneer*), display candidate cards with portion selectors.
3. **Local-First Meal Persistence:** Send confirmed structured ingredients to `POST /api/meals` using `engine: 'local_usda'`, bypassing external AI latency.
4. **Offline PWA Sync:** Cache top staple foods in IndexedDB for zero-connectivity meal logging.

