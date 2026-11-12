# Nutriq — Food Data Import Process & USDA FoodData Central Guide

> **Phase 1: Local Food Nutrition Engine**  
> *Data Source:* USDA FoodData Central (SR Legacy & Foundation Foods)  
> *Target Nutrients:* Energy (kcal), Protein (g), Carbohydrates (g), Total Fat (g), Vitamin D (mcg), Iron (mg), Zinc (mg), Vitamin B12 (mcg)

---

## 1. Overview & Objective

Prior to Phase 1, Nutriq relied entirely on the Google Gemini 2.0 Flash API to generate nutritional values from user meal descriptions. While Gemini is effective at natural language understanding, LLMs can hallucinate numerical values, produce non-deterministic nutritional estimations, and cannot guarantee scientific repeatability.

Phase 1 introduces an **authoritative, local, deterministic food-composition database** sourced directly from the **United States Department of Agriculture (USDA) FoodData Central (FDC)**.

---

## 2. Data Sources & Authority

The normalized dataset is built from two primary USDA databases:
1. **USDA SR Legacy (Standard Reference Legacy):** The historical foundation of food composition tables, providing chemically verified values for standard agricultural commodities and staple foods (e.g. cooked grains, lentils, meats, dairy, fruits, vegetables).
2. **USDA Foundation Foods:** The modern USDA program with extensive analytical chemistry sub-samples, precise portion weights, and transparent analytical methods.

### Target Nutrient Mapping

USDA FoodData Central identifies nutrients by unique integer Nutrient IDs. Nutriq tracks eight core macronutrients and micronutrients:

| Nutriq Key | USDA Nutrient ID(s) | Official USDA Nutrient Name | Canonical Unit |
|---|---|---|---|
| `calories` | 1008, 208 | Energy | `kcal` |
| `protein_g` | 1003, 203 | Protein | `g` |
| `carbs_g` | 1005, 205 | Carbohydrate, by difference | `g` |
| `fat_g` | 1004, 204 | Total lipid (fat) | `g` |
| `vitamin_d_mcg` | 1114, 1110 | Vitamin D (D2 + D3) | `mcg` (µg) |
| `iron_mg` | 1089, 303 | Iron, Fe | `mg` |
| `zinc_mg` | 1095, 309 | Zinc, Zn | `mg` |
| `b12_mcg` | 1178, 418 | Vitamin B-12 | `mcg` (µg) |

---

## 3. Preservation of Missing / Unknown Values (Zero vs. Null)

A fundamental principle of scientific nutrition databases is that **an unmeasured nutrient is NOT zero**.

- **True Zero (`value: 0`):** An analytical test was performed and found no detectable amount (e.g., Vitamin B12 in cooked lentils is truly 0 mcg because plants do not synthesize cobalamin).
- **Unknown / Unmeasured (`value: null`):** The nutrient was not analyzed in that sample batch, or analytical data was not published by the USDA.

### Schema Representation:
```json
"nutrients_per_100g": {
  "calories": { "value": 31, "unit": "kcal" },
  "protein_g": { "value": 3.12, "unit": "g" },
  "carbs_g": { "value": 4.22, "unit": "g" },
  "fat_g": { "value": 0.57, "unit": "g" },
  "iron_mg": { "value": 12.18, "unit": "mg" },
  "zinc_mg": { "value": 2.03, "unit": "mg" },
  "vitamin_d_mcg": { "value": null, "unit": "mcg" },
  "b12_mcg": { "value": null, "unit": "mcg" }
}
```
When `value` is `null`, Nutriq preserves it as unknown across all calculations and flags any aggregate totals as partial rather than silently corrupting calculations.

---

## 4. The Import & Normalization Script

The import pipeline is located at [`backend/scripts/import_usda.js`](file:///c:/Users/kc701/Desktop/Projects,%20Bots%20and%20ZIPs/Nutriq/Nutriq2/backend/scripts/import_usda.js).

### Features:
1. **Authoritative Seed Catalog:** Contains 67+ staple food definitions spanning grains, pulses, dairy, meats, vegetables, fruits, nuts, and Indian culinary staples (e.g., basmati rice, lentils/dal, chickpeas/chana, paneer, roti/chapati).
2. **Dual-Mode Operation:**
   - **Offline / Seed Mode (Default):** Generates the normalized JSON immediately using chemically verified USDA values.
   - **Online Mode (`--online`):** Queries the live USDA FoodData Central REST API (`https://api.nal.usda.gov/fdc/v1/food/<fdcId>`), extracts raw food nutrient arrays, and normalizes portions.
3. **Portion Mapping:** Automatically extracts gram weights from USDA `foodPortions` for cups, tablespoons, slices, pieces, and bowls.

### Running the Import:

```bash
# 1. Run standard import (uses authoritative USDA seed catalog)
npm run import:foods --prefix backend

# 2. Or run via node directly
node backend/scripts/import_usda.js

# 3. Optional: Live USDA API refresh using an API key
node backend/scripts/import_usda.js --online --api-key=YOUR_USDA_KEY
```

---

## 5. Normalized Dataset Schema

The output is written to:
- [`backend/data/food_database.json`](file:///c:/Users/kc701/Desktop/Projects,%20Bots%20and%20ZIPs/Nutriq/Nutriq2/backend/data/food_database.json) (backend service)
- [`src/data/food_database.json`](file:///c:/Users/kc701/Desktop/Projects,%20Bots%20and%20ZIPs/Nutriq/Nutriq2/src/data/food_database.json) (client-side offline engine)

### Record Format:
```json
{
  "id": "usda_fdc_172421",
  "name": "Lentils, mature seeds, cooked, boiled, without salt",
  "common_name": "Cooked Lentils (Brown / Green Dal)",
  "food_group": "Legumes and Legume Products",
  "aliases": [
    "cooked lentils (brown / green dal)",
    "lentils",
    "cooked lentils",
    "dal",
    "daal",
    "boiled lentils",
    "dhal"
  ],
  "nutrients_per_100g": {
    "calories": { "value": 116, "unit": "kcal" },
    "protein_g": { "value": 9.02, "unit": "g" },
    "carbs_g": { "value": 20.13, "unit": "g" },
    "fat_g": { "value": 0.38, "unit": "g" },
    "vitamin_d_mcg": { "value": 0, "unit": "mcg" },
    "iron_mg": { "value": 3.33, "unit": "mg" },
    "zinc_mg": { "value": 1.27, "unit": "mg" },
    "b12_mcg": { "value": 0, "unit": "mcg" }
  },
  "serving_weights_g": {
    "g": 1,
    "gram": 1,
    "grams": 1,
    "kg": 1000,
    "cup": 198,
    "tbsp": 12.3,
    "bowl": 200,
    "serving": 198
  },
  "source": {
    "name": "USDA FoodData Central",
    "type": "SR Legacy",
    "source_id": "172421",
    "retrieval_date": "2026-11-12",
    "citation": "U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, 2026."
  }
}
```

---

## 6. How to Expand the Food Database

To add new foods to the local database:

1. **Find the USDA FoodData Central ID:**
   Visit [fdc.nal.usda.gov](https://fdc.nal.usda.gov) and search for the whole food item. Record the numeric FDC ID.
2. **Add Entry to `USDA_SEED_CATALOG` in `backend/scripts/import_usda.js`:**
   ```javascript
   {
     fdcId: 173757,
     name: "Chickpeas, mature seeds, cooked, boiled, without salt",
     common_name: "Cooked Chickpeas (Chana)",
     food_group: "Legumes and Legume Products",
     aliases: ["chickpeas", "chana", "garbanzo beans", "boiled chickpeas"],
     serving_weights_g: { cup: 164, bowl: 180, tbsp: 10.3 },
     default_nutrients: {
       calories: 164, protein_g: 8.86, carbs_g: 27.42, fat_g: 2.59,
       vitamin_d_mcg: 0, iron_mg: 2.89, zinc_mg: 1.53, b12_mcg: 0
     }
   }
   ```
3. **Re-run the import script:**
   ```bash
   node backend/scripts/import_usda.js
   ```
4. **Copy to frontend:**
   ```bash
   cp backend/data/food_database.json src/data/food_database.json
   ```
5. **Run test suite to verify:**
   ```bash
   npm test --prefix backend
   ```

