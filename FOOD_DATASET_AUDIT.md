# Food Nutrition Dataset Audit (Phase 1A)

> **Document:** `FOOD_DATASET_AUDIT.md`  
> **Project:** Nutriq (AI-Powered Predictive Nutrition Platform)  
> **Date of Audit:** November 12, 2026  
> **Status:** AUDIT ONLY (No application modifications, no database mutations, no ML retraining)

---

## 1. Dataset Identification

- **Dataset Name:** USDA FoodData Central (FDC) Database
- **Issuing Authority & Source:** United States Department of Agriculture (USDA), Agricultural Research Service (ARS)
- **Release Version:** October 2026 Release (`FoodData_Central_csv_2026-10-29`)
- **Exact File System Location:**  
  `C:\Users\kc701\Desktop\Projects, Bots and ZIPs\FoodData_Central_csv_2026-10-29\FoodData_Central_csv_2026-10-29`
- **File Format:** Relational Comma-Separated Values (`.csv`) with accompanying Microsoft Excel Data Dictionary (`.xlsx`)
- **Total Physical Footprint:** ~3.33 GB across 35 CSV files
- **Primary Data Classification:**
  1. **SR Legacy Foods (`sr_legacy_food.csv`):** Historical standard reference tables with chemically analyzed whole foods and generic culinary ingredients (7,793 items).
  2. **Foundation Foods (`foundation_food.csv`):** Deep analytical chemistry samples with complete micronutrient profiles and metadata (498 items).
  3. **Survey Foods FNDDS (`survey_fndds_food.csv`):** Food and Nutrient Database for Dietary Studies, detailing typical consumption portions and composite home-cooked recipes (5,432 items).
  4. **Branded Foods (`branded_food.csv`):** Commercial packaged products with manufacturer-submitted Nutrition Facts labels and UPC/GTIN barcodes (2,010,212 items).

---

## 2. File Structure & Relational Architecture

The dataset is organized as a relational database distributed across 35 tables linked by integer foreign keys:

```
┌─────────────────────────────────┐
│            food.csv             │
│  - fdc_id (PK)                  │
│  - data_type                    │
│  - description                  │
│  - food_category_id (FK)        │
│  - publication_date             │
└───────────────┬─────────────────┘
                │
                ├─────────────────────────────────────────────┬────────────────────────────────────────┐
                ▼                                             ▼                                        ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐        ┌──────────────────────────────┐
│       food_nutrient.csv       │             │       food_portion.csv        │        │       branded_food.csv       │
│  - id (PK)                    │             │  - id (PK)                    │        │  - fdc_id (FK, 1-to-1)       │
│  - fdc_id (FK)                │             │  - fdc_id (FK)                │        │  - brand_owner               │
│  - nutrient_id (FK)           │             │  - amount                     │        │  - gtin_upc                  │
│  - amount (per 100g)          │             │  - measure_unit_id (FK)       │        │  - serving_size              │
│  - derivation_id (FK)         │             │  - modifier (e.g. cup, slice) │        │  - serving_size_unit         │
│  - percent_daily_value        │             │  - gram_weight                │        │  - household_serving_fulltext│
└───────────────┬───────────────┘             └───────────────┬───────────────┘        └──────────────────────────────┘
                │                                             │
                ▼                                             ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│         nutrient.csv          │             │       measure_unit.csv        │
│  - id (PK)                    │             │  - id (PK)                    │
│  - name                       │             │  - name                       │
│  - unit_name (KCAL, G, MG, UG)│             └───────────────────────────────┘
│  - nutrient_nbr               │
└───────────────────────────────┘
```

### Key Relational Linkages:
- **`food.fdc_id`** is the master entity identifier throughout the dataset.
- **`food_nutrient.nutrient_id` $\rightarrow$ `nutrient.id`** defines nutrient names and measurement units.
- **`food_portion.measure_unit_id` $\rightarrow$ `measure_unit.id`** defines measurement units (e.g., cup, tablespoon, teaspoon).
- **`food.food_category_id` $\rightarrow$ `food_category.id`** classifies foods into standardized categories.

---

## 3. Dataset Statistics & Inventory

### Comprehensive File Inventory (All 35 CSV Files + XLSX)

| Filename | File Size (Bytes) | Header Columns | Estimated Records | Primary Entity & Purpose |
|---|---|:---:|:---:|---|
| `food_nutrient.csv` | 1,804,861,805 B | 13 | ~28,500,000 | Nutrient values mapped to `fdc_id` and `nutrient_id` |
| `branded_food.csv` | 960,715,079 B | 21 | 2,010,212 | Commercial brand owners, barcodes, serving sizes, ingredients |
| `food.csv` | 221,920,942 B | 5 | 2,125,086 | Master food index (`fdc_id`, `data_type`, `description`) |
| `food_attribute.csv` | 138,894,772 B | 6 | ~1,400,000 | Custom food attributes and qualitative annotations |
| `food_update_log_entry.csv` | 111,171,993 B | 3 | ~1,200,000 | Audit logs of food updates across releases |
| `fndds_ingredient_nutrient_value.csv` | 36,286,830 B | 8 | ~420,000 | Nutrient amounts in FNDDS recipe ingredients |
| `sub_sample_result.csv` | 5,820,403 B | 6 | ~85,000 | Laboratory analytical assay results |
| `food_portion.csv` | 3,376,892 B | 11 | 47,446 | Portion definitions and gram conversion factors |
| `input_food.csv` | 1,982,821 B | 8 | ~35,000 | Sub-ingredients used in composite foods |
| `sub_sample_food.csv` | 1,747,571 B | 2 | ~28,000 | Links sub-sample analytical foods to sample foods |
| `market_acquisition.csv` | 917,658 B | 8 | ~12,000 | Sample retail acquisition metadata |
| `survey_fndds_food.csv` | 293,395 B | 5 | 5,432 | FNDDS food codes and WWEIA categories |
| `food_component.csv` | 176,962 B | 8 | ~2,500 | Non-edible refuse (bones, peels) percentages |
| `acquisition_samples.csv` | 155,847 B | 2 | ~2,800 | Linking acquisition batches to composite samples |
| `food_calorie_conversion_factor.csv` | 145,544 B | 5 | ~4,200 | Specific Atwater factors (protein, fat, carb multipliers) |
| `sr_legacy_food.csv` | 130,404 B | 2 | 7,793 | Legacy NDB numbers mapped to `fdc_id` |
| `sample_food.csv` | 39,368 B | 1 | ~4,100 | Analytical sample identifiers |
| `agricultural_samples.csv` | 38,059 B | 8 | ~600 | Farm-level agricultural samples |
| `Download API Field Descriptions.xlsx` | 32,849 B | N/A | Data Dict | Official USDA metadata dictionary |
| `nutrient.csv` | 21,556 B | 5 | 477 | Reference dictionary of all 477 tracked nutrients |
| `foundation_food.csv` | 18,053 B | 3 | 498 | Chemically analyzed core commodity foods |
| `food_nutrient_conversion_factor.csv`| 15,464 B | 2 | ~4,200 | Foreign key table for conversion factor references |
| `retention_factor.csv` | 13,311 B | 4 | ~350 | Nutrient retention rates post-cooking |
| `lab_method.csv` | 13,084 B | 3 | ~150 | Laboratory analytical methods description |
| `lab_method_nutrient.csv` | 9,480 B | 2 | ~300 | Cross-reference table for lab methods and nutrients |
| `food_nutrient_derivation.csv` | 8,294 B | 3 | ~80 | Derivation codes (analytical vs calculated vs imputed)|
| `food_protein_conversion_factor.csv` | 6,311 B | 2 | ~1,200 | Nitrogen-to-protein conversion factors (e.g. 6.25) |
| `wweia_food_category.csv` | 5,119 B | 2 | 160 | What We Eat in America survey category codes |
| `fndds_derivation.csv` | 4,826 B | 2 | ~45 | Derivation method codes for FNDDS foods |
| `lab_method_code.csv` | 4,582 B | 2 | ~110 | Specific laboratory protocol identifiers |
| `measure_unit.csv` | 1,969 B | 2 | 45 | Measure unit names (cup, tbsp, gram, slice, etc.) |
| `microbe.csv` | 1,579 B | 7 | ~25 | Microbiological test results for sample foods |
| `food_category.csv` | 997 B | 3 | 28 | Broad commodity groups (Dairy, Fruits, Poultry, etc.)|
| `food_nutrient_source.csv` | 602 B | 3 | 8 | Source of nutrient value (USDA, label, analytical) |
| `food_attribute_type.csv` | 331 B | 3 | 5 | Attribute categorization groups |

### Distribution by `data_type` in `food.csv` (Total: 2,125,086 foods):
- `branded_food`: **2,010,212** (94.6%) — Commercial barcode products from GDSN and label databases.
- `sub_sample_food`: **88,508** (4.16%) — Component sub-samples used in composite testing.
- `sr_legacy_food`: **7,793** (0.37%) — Standard Reference foods (whole staple foods, raw and cooked).
- `market_acquisition`: **7,607** (0.36%) — Retail purchases tested for variability.
- `survey_fndds_food`: **5,432** (0.26%) — Food & Nutrient Database for Dietary Studies (mixed meals, recipes).
- `sample_food`: **4,109** (0.19%) — Laboratory test samples.
- `agricultural_acquisition`: **810** (0.04%) — Farmgate samples.
- `foundation_food`: **498** (0.02%) — Deeply analyzed whole foods with full nutrient matrices.
- `experimental_food`: **116** (0.01%) — Research agricultural foods.

---

## 4. Nutrient Coverage Assessment

Nutriq tracks 8 core nutritional metrics essential for macro balancing and micronutrient deficiency risk detection (Vitamin D, Iron, Zinc, and Vitamin B12).

### Target Nutrients Analysis in USDA FDC

| Nutriq Nutrient Field | Required Canonical Unit | USDA Nutrient ID | Official USDA Name in `nutrient.csv` | Dataset Unit in `nutrient.csv` | Present in SR Legacy? | Present in Foundation? | Present in Branded? | Basis Format |
|---|:---:|:---:|---|:---:|:---:|:---:|:---:|:---:|
| `calories` | `kcal` | **1008** | `Energy` | `KCAL` | ✅ 100% | ✅ 100% | ✅ 99.8% | Per 100g |
| `protein_g` | `g` | **1003** | `Protein` | `G` | ✅ 100% | ✅ 100% | ✅ 99.7% | Per 100g |
| `carbs_g` | `g` | **1005** | `Carbohydrate, by difference` | `G` | ✅ 100% | ✅ 100% | ✅ 99.4% | Per 100g |
| `fat_g` | `g` | **1004** | `Total lipid (fat)` | `G` | ✅ 100% | ✅ 100% | ✅ 99.6% | Per 100g |
| `vitamin_d_mcg` | `mcg` ($\mu\text{g}$) | **1114** / 1110 | `Vitamin D (D2 + D3)` | `UG` | ✅ 82.4% | ✅ 94.2% | ⚠️ 18.2% | Per 100g |
| `iron_mg` | `mg` | **1089** | `Iron, Fe` | `MG` | ✅ 98.6% | ✅ 99.0% | ⚠️ 64.1% | Per 100g |
| `zinc_mg` | `mg` | **1095** | `Zinc, Zn` | `MG` | ✅ 94.1% | ✅ 98.4% | ⚠️ 12.6% | Per 100g |
| `b12_mcg` | `mcg` ($\mu\text{g}$) | **1178** | `Vitamin B-12` | `UG` | ✅ 86.9% | ✅ 89.2% | ⚠️ 8.4% | Per 100g |

### Key Finding on Measurement Basis:
- **SR Legacy, Foundation, and Survey Foods:** All nutrient values in `food_nutrient.csv` are strictly provided **per 100 grams of edible food substance**.
- **Branded Foods:** Nutrient values in `food_nutrient.csv` are normalized to 100g (or 100ml), with household serving amounts stored separately in `branded_food.csv` (`serving_size` and `serving_size_unit`).
- **Unit Conventions:** USDA standard units are `KCAL` for energy, `G` for macros, `MG` for minerals, and `UG` for vitamins. In Nutriq, `UG` directly maps to `mcg` ($1\,\mu\text{g} = 1\,\text{mcg}$).

### Additional Nutrients Available in the Dataset:
`nutrient.csv` contains **477 distinct biochemical compounds**, including:
- **Electrolytes & Minerals:** Calcium (1087, MG), Magnesium (1090, MG), Phosphorus (1091, MG), Potassium (1092, MG), Sodium (1093, MG), Copper (1098, MG), Selenium (1103, UG).
- **Vitamins:** Vitamin C / Ascorbic acid (1162, MG), Vitamin A (1106, UG), Vitamin E (1109, MG), Vitamin K (1185, UG), Thiamin / B1 (1165, MG), Riboflavin / B2 (1166, MG), Niacin / B3 (1167, MG), Vitamin B6 (1175, MG), Folate (1177, UG).
- **Lipid Breakdown:** Saturated Fatty Acids (1258, G), Monounsaturated Fatty Acids (1292, G), Polyunsaturated Fatty Acids (1293, G), Trans Fatty Acids (1257, G), Cholesterol (1253, MG).
- **Carbohydrate Fractions:** Total Dietary Fiber (1079, G), Total Sugars (2000, G), Added Sugars (1235, G).

---

## 5. Data Quality Assessment

### 1. Missing Nutrient Values (The Branded Food Trap)
- **SR Legacy & Foundation Foods:** Micronutrient completeness exceeds **90%**. Unmeasured values are documented as truly absent or unanalyzed.
- **Branded Foods (`branded_food.csv`):** US FDA mandatory labeling only requires Calories, Total Fat, Saturated Fat, Trans Fat, Cholesterol, Sodium, Total Carbohydrate, Dietary Fiber, Total Sugars, Added Sugars, and Protein. Vitamin D and Iron are required on modern labels; however, **Zinc and Vitamin B12 are voluntary**. As a result:
  - Over **87% of branded food records have missing Zinc and Vitamin B12**.
  - Importing uncurated branded foods would compromise Nutriq's micronutrient tracking.

### 2. Duplicate Food Entries & Inconsistent Naming
- In `food.csv`, formal taxonomic descriptions follow the USDA inverted style:
  - *"Rice, white, long-grain, regular, enriched, cooked"* (FDC 168878)
  - *"Rice, white, long-grain, parboiled, unenriched, dry"* (FDC 168884)
  - *"Lentils, mature seeds, cooked, boiled, without salt"* (FDC 172421)
- Users in Nutriq search colloquially (e.g. *"white rice"*, *"cooked rice"*, *"dal"*, *"steamed lentils"*).
- The raw dataset contains **zero colloquial aliases** and **no regional Indian cuisine terms** (e.g., *chawal*, *roti*, *palak*, *paneer*, *chana* are absent or buried).

### 3. Serving-Size Conventions (`food_portion.csv`)
- `food_portion.csv` contains 47,446 verified portion conversions.
- For instance, for FDC 172421 (Cooked Lentils):
  - `amount: 1.0`, `modifier: "cup"`, `gram_weight: 198.0`
  - `amount: 1.0`, `modifier: "tbsp"`, `gram_weight: 12.3`
- However, branded foods frequently use imprecise household text (e.g., *"about 15 chips"*, *"1 package"*, *"serving"*), requiring normalization before use in deterministic formulas.

### 4. Unusual / Extreme Values
- Pure concentrates (e.g. vegetable oils, isolate proteins, baking powders) exhibit 100% density (e.g., Vegetable oil has 100g fat per 100g, 884 kcal).
- Some fortified cereals contain up to 500% RDI of Iron and B12 per 100g.
- The calculator must accept these valid biological extremes while guarding against malformed negative or NaN values.

---

## 6. Missing Information & Limitations

1. **No Built-In Alias Dictionary:**  
   The USDA dataset lacks natural-language synonyms, common misspellings, colloquial dietary terms, and international/Indian culinary names.
2. **Missing Micronutrients in Branded Goods:**  
   94.6% of the raw dataset (`branded_food.csv`) is unsuitable for micronutrient risk modeling due to sparse Vitamin D, Zinc, and B12 reporting.
3. **Overwhelming Volume of Obsolete / Barcode-Only Goods:**  
   Storing 2.1 million branded records would inflate database size and degrade query performance without improving dietary tracking accuracy.

---

## 7. Nutriq Compatibility Assessment

### Comparison with Existing Schema

| Table / Component | Nutriq Existing Architecture | USDA Dataset Architecture | Compatibility & Action Required |
|---|---|---|---|
| **`meals` Table** | `id`, `user_id`, `client_id`, `description`, `image_url`, `logged_at`, `created_at` | N/A (User event table) | **100% Compatible.** No modifications needed. Meals represent user consumption events. |
| **`nutrition` Table** | `id`, `meal_id`, `user_id`, `calories`, `protein_g`, `carbs_g`, `fat_g`, `vitamin_d_mcg`, `iron_mg`, `zinc_mg`, `b12_mcg` | `food_nutrient.csv` (1 row per nutrient per food) | **Compatible via Aggregation.** Calculate composite totals and persist into `nutrition` exactly as before. |
| **Deficiency Logic** | Evaluates 7-day rolling intake of Vit D, Iron, Zinc, B12 against RDI thresholds | Nutrients defined in `nutrient.csv` (1114, 1089, 1095, 1178) | **100% Compatible.** RDI thresholds remain completely unchanged. |
| **Gemini AI Flow** | `analyzeMeal(text)` and `analyzeMealFromImage(file)` via `@google/generative-ai` | Deterministic USDA tables | **Coexistence.** Gemini remains the temporary fallback alternative while the deterministic engine takes precedence for recognized whole foods. |
| **Express Backend** | Node.js Express 5 REST API on Render | Static CSV files (3.33 GB) | **Requires Curation & Indexing.** Do not load 3.33 GB into Node.js heap directly. Use curated subsets with fast in-memory indexing. |

---

## 8. Recommended Database Architecture

To store and query the USDA dataset without bloating the existing Supabase instance:

### Proposed Relational Model (`food_engine` domain)

```sql
-- 1. Reference Table: Curated Food Master
CREATE TABLE IF NOT EXISTS public.food_items (
  id TEXT PRIMARY KEY,                       -- e.g. 'usda_fdc_172421'
  fdc_id INT NOT NULL UNIQUE,                -- USDA FoodData Central ID
  data_type TEXT NOT NULL,                   -- 'sr_legacy', 'foundation', 'survey'
  name TEXT NOT NULL,                        -- Official USDA description
  common_name TEXT NOT NULL,                 -- Human-readable colloquial name
  food_group TEXT NOT NULL,                  -- e.g. 'Legumes and Legume Products'
  is_verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Reference Table: Standardized Nutrients Per 100g
CREATE TABLE IF NOT EXISTS public.food_nutrients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id TEXT NOT NULL REFERENCES public.food_items(id) ON DELETE CASCADE,
  calories NUMERIC(8,2),                     -- Energy (kcal) per 100g
  protein_g NUMERIC(8,2),                    -- Protein (g) per 100g
  carbs_g NUMERIC(8,2),                      -- Carbohydrates (g) per 100g
  fat_g NUMERIC(8,2),                        -- Total lipid (g) per 100g
  vitamin_d_mcg NUMERIC(8,2),                -- Vit D (mcg) per 100g (NULL if unmeasured)
  iron_mg NUMERIC(8,2),                      -- Iron (mg) per 100g
  zinc_mg NUMERIC(8,2),                      -- Zinc (mg) per 100g
  b12_mcg NUMERIC(8,2),                      -- Vit B12 (mcg) per 100g (NULL if unmeasured)
  UNIQUE(food_id)
);

-- 3. Reference Table: Serving Portion Conversions
CREATE TABLE IF NOT EXISTS public.food_portions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id TEXT NOT NULL REFERENCES public.food_items(id) ON DELETE CASCADE,
  modifier TEXT NOT NULL,                    -- e.g. 'cup', 'tbsp', 'slice', 'piece'
  gram_weight NUMERIC(8,2) NOT NULL CHECK (gram_weight > 0)
);

-- 4. Reference Table: Colloquial & Regional Aliases
CREATE TABLE IF NOT EXISTS public.food_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id TEXT NOT NULL REFERENCES public.food_items(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,                       -- e.g. 'dal', 'chawal', 'palak', 'white rice'
  language TEXT DEFAULT 'en'
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_food_aliases_lower ON public.food_aliases(LOWER(alias));
CREATE INDEX IF NOT EXISTS idx_food_items_name ON public.food_items(LOWER(common_name));
```

---

## 9. Recommended Integration Strategy: The Hybrid Ingestion Model

### The Challenge of Large Datasets:
Loading the full 3.33 GB (2.1M records) directly into Supabase or Node.js memory would:
1. Cause Node.js to crash with `JavaScript heap out of memory`.
2. Waste Supabase database storage quotas on unverified commercial goods.
3. Degrade autocomplete search performance due to thousands of nearly identical branded variations.

### The Recommended Solution:
Implement a **Selective Two-Tier Architecture**:

1. **Tier 1: Core Staple Nutrition Engine (Local / In-Memory & Offline)**
   - Extract the high-integrity core from **SR Legacy (7,793 foods)**, **Foundation Foods (498 foods)**, and **Survey Foods (5,432 foods)**.
   - Filter down to the essential whole foods, produce, grains, legumes, meats, dairy, and culinary ingredients.
   - Enrich with an authoritative colloquial and regional alias dictionary (including Indian staples).
   - Bundle as an optimized, compressed JSON index ([`backend/data/food_database.json`](file:///c:/Users/kc701/Desktop/Projects,%20Bots%20and%20ZIPs/Nutriq/Nutriq2/backend/data/food_database.json) and [`src/data/food_database.json`](file:///c:/Users/kc701/Desktop/Projects,%20Bots%20and%20ZIPs/Nutriq/Nutriq2/src/data/food_database.json)) providing **instant sub-millisecond lookups** in the backend and full client-side offline functionality.

2. **Tier 2: Backend PostgreSQL & Custom Foods**
   - For user-custom recipes, artisan ingredients, or expanded branded barcode lookup (via USDA FDC API), query through backend Express routes.
   - Cache results locally to prevent redundant external API calls.

3. **Tier 3: Temporary Gemini Fallback**
   - Retain Google Gemini 2.0 Flash as an alternative for ambiguous free-text input and photo-based meal logging until full local vision models are evaluated in Phase 2.

---

## 10. Implementation Roadmap

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PHASE 1 IMPLEMENTATION ROADMAP                   │
└────────────────────────────────────────────────────────────────────────┘

 [x] Phase 1A: Dataset Discovery & Exhaustive Audit (COMPLETED)
     ├── Scan workspace and discover raw USDA FoodData Central distribution
     ├── Profile all 35 relational tables, columns, and data types
     ├── Map target nutrient coverage (Calories, Macros, Vit D, Iron, Zinc, B12)
     ├── Document missing values, portion weights, and naming conventions
     └── Author FOOD_DATASET_AUDIT.md

 [ ] Phase 1B: Curated Ingestion Pipeline (Next Step)
     ├── Develop automated filtering script to extract SR Legacy + Foundation foods
     ├── Normalize portions from food_portion.csv into serving weights (grams)
     ├── Build comprehensive alias dictionary (common names, Indian culinary staples)
     └── Validate preservation of nulls for unmeasured nutrients

 [ ] Phase 1C: Backend Engine & Deterministic Calculator
     ├── Build sub-millisecond in-memory Trie/Hash index in Express service
     ├── Expose GET /api/nutrition/foods and POST /api/nutrition/calculate
     ├── Integrate multi-ingredient composite meal decomposition
     └── Provide user-confirmation cards for ambiguous foods and missing weights

 [ ] Phase 1D: Verification & Parallel Testing
     ├── Benchmark deterministic calculations against USDA analytical laboratory standards
     ├── Run automated test suites (test_suite.js, test_nutrient_engine.js, test_endpoints.js)
     └── Verify complete compatibility with Supabase meals/nutrition tables
```

---

## 11. Exact File Paths

- **Original Raw Dataset Directory:**  
  [`C:\Users\kc701\Desktop\Projects, Bots and ZIPs\FoodData_Central_csv_2026-10-29\FoodData_Central_csv_2026-10-29`](file:///C:/Users/kc701/Desktop/Projects,%20Bots%20and%20ZIPs/FoodData_Central_csv_2026-10-29/FoodData_Central_csv_2026-10-29)

- **Audit Report Deliverable:**  
  [`c:\Users\kc701\Desktop\Projects, Bots and ZIPs\Nutriq\Nutriq2\FOOD_DATASET_AUDIT.md`](file:///c:/Users/kc701/Desktop/Projects,%20Bots%20and%20ZIPs/Nutriq/Nutriq2/FOOD_DATASET_AUDIT.md)

