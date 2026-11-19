# Nutriq — Phase 2: Independent Natural-Language Meal Parsing Engine Report

**Status:** Completed & Verified  
**Date:** November 12, 2026  
**Implementation Scope:** Complete Decoupling of Text Meal Logging from Google Gemini API; Local NLP Meal Parsing Pipeline; Benchmark Verification; Frontend Interactive Draft & Clarification Interface.

---

## 1. Executive Summary

In Phase 2, Nutriq achieved full independence from third-party artificial intelligence APIs for all text-based meal logging and nutritional analysis. A deterministic, sub-millisecond natural-language food parsing pipeline (`backend/services/mealParserService.js`) was engineered and integrated directly with Nutriq's curated USDA FoodData Central reference database (`data/indexes/foods.db`, containing 13,723 foods and 36,681 verified portions).

Key milestones accomplished:
1. **Zero Third-Party AI for Text:** Google Gemini API calls for text analysis have been completely replaced with Nutriq's local meal parsing engine. No API key, network egress, or external compute is required to parse complex multi-item meals.
2. **Deterministic & Authoritative:** Extracted ingredients are mapped to unique USDA FDC identifiers and resolved to exact gram weights, ensuring reproducible nutritional calculations.
3. **Transparent Ambiguity Resolution:** Ambiguous food items (e.g. *dal*, *paneer*, *rice*) and unspecified portions (e.g. *some salad*, *some spinach sabzi*) are automatically flagged with structured clarification questions and one-click candidate selections, eliminating AI hallucinations.
4. **Interactive Draft Workflow:** The frontend `Describe Meal` tab now features an interactive review card where users can resolve clarifications with a single click, adjust gram quantities, view live recalculations across 8 tracked nutrients, and confirm before saving.
5. **Preserved Gemini Vision for Photos:** While text logging is 100% decoupled, Gemini Vision image analysis (`POST /api/meals/image`) is preserved intact for users who photograph meals.
6. **Future ML Training Readiness:** A structured annotation schema (`formatMlAnnotation`) records character spans for `FOOD`, `QUANTITY`, `UNIT`, and `PREPARATION`, complete with opt-in privacy compliance for training future on-device ML models.
7. **100% Test Verification:** All 6 backend test suites (69/69 tests passed, 100%) and clean production Vite frontend builds were achieved.

---

## 2. Local NLP Parser Architecture & Component Design

The local meal parsing service (`mealParserService.js`) is organized into an 8-stage deterministic pipeline:

```
Raw Natural Language Input
           │
           ▼
[Stage 1: Text Normalization]
  • Strips narrative prefixes ("I had", "Breakfast was", "I ate around")
  • Converts compound fractions ("1 1/2" -> 1.5, "half a" -> 0.5)
  • Standardizes English number words ("two" -> 2, "one" -> 1)
           │
           ▼
[Stage 2: Phrase Segmentation]
  • Splits on conjunctions ("and", "with", "along with", "plus", "served with")
  • Splits on punctuation (commas, semicolons, line breaks)
           │
           ▼
[Stage 3: Quantity & Unit Extraction]
  • Pattern 1: Explicit Metric ("150 grams of paneer", "250 ml milk")
  • Pattern 2: Fused Quantities ("200g chicken", "100g rice")
  • Pattern 3: Numbered Containers ("1 bowl of dal", "2 slices of toast")
  • Pattern 4: Indefinite Articles ("a plate of biryani", "a banana")
  • Pattern 5: Bare Containers ("plate of biryani", "cup of curd")
  • Pattern 6: Direct Item Counts ("2 rotis", "3 boiled eggs")
           │
           ▼
[Stage 4: Preparation & Size Extraction]
  • Extracts cooking methods ("boiled", "grilled", "roasted", "fried", "toasted", "raw")
  • Detects size modifiers ("small", "medium", "large")
           │
           ▼
[Stage 5: Entity Resolution (Alias Dictionary & foods.db)]
  • Fast curated alias map (chapatis, dals, biryani, chaas, paneer, oats, etc.)
  • Sub-millisecond FTS query against USDA foods.db catalog
           │
           ▼
[Stage 6: Portion Weight Resolution]
  • Resolves household units ("bowl", "cup", "slice", "glass", "plate")
  • Queries food_portions table in foods.db for analytical USDA gram weights
  • Applies size multipliers (e.g., small bowl = 0.5x standard bowl)
           │
           ▼
[Stage 7: Ambiguity & Quality Scoring]
  • Flags status: confirmed, ambiguous_food, missing_portion, or unrecognized
  • Computes confidence score (0.0 to 1.0)
  • Generates specific user clarification questions with candidate options
           │
           ▼
[Stage 8: Deterministic Draft Output]
  • If all items confirmed: triggers foodCatalogService for 8 tracked nutrients
  • Outputs structured draft ready for interactive UI review or automated logging
```

---

## 3. Evaluation on the 6 Required Benchmark Test Cases

The parser was evaluated against all 6 benchmark expressions specified in the requirements. Each case behaves deterministically with zero variance:

| # | Benchmark Input | Segmented Items | Resolved Status | FDC ID | Resolved Weight | Clarification Prompt Generated |
|---|---|---|---|---|---|---|
| 1 | *"I had 2 rotis, one bowl of dal and a cup of curd."* | 1. 2 rotis<br>2. 1 bowl dal<br>3. 1 cup curd | `needs_confirmation`<br>(Confidence: 0.83) | 174075<br>null<br>171284 | 86g<br>null<br>245g | **"Which variety of dal / lentils did you have?"**<br>Options: Masoor, Moong, Toor, Chana |
| 2 | *"Breakfast was 3 boiled eggs with 2 slices of toast and a banana."* | 1. 3 boiled eggs<br>2. 2 slices toast<br>3. 1 banana | `ready`<br>(Confidence: 0.95) | 173424<br>172689<br>173944 | 150g<br>50g<br>118g | *None — 100% verified immediately.*<br>Calculated: **490.5 kcal, 28.3g protein** |
| 3 | *"I ate around 150 grams of paneer with 1 cup cooked rice."* | 1. 150g paneer<br>2. 1 cup cooked rice | `needs_confirmation`<br>(Confidence: 0.77) | null<br>168878 | 150g<br>158g | **"Was the paneer fresh/plain or part of a prepared dish (e.g. palak paneer)?"** |
| 4 | *"Had a plate of chicken biryani with a glass of buttermilk."* | 1. 1 plate chicken biryani<br>2. 1 glass buttermilk | `ready`<br>(Confidence: 0.95) | 2706538<br>167697 | 196g<br>245g | *None — 100% verified immediately.*<br>Calculated: **302.2 kcal, 22.1g protein** |
| 5 | *"One small bowl of moong dal, 2 chapatis and some spinach sabzi."* | 1. 1 small bowl moong dal<br>2. 2 chapatis<br>3. some spinach sabzi | `needs_confirmation`<br>(Confidence: 0.88) | 169137<br>174075<br>168463 | 93g<br>86g<br>null | **"Please specify the serving quantity or weight for 'Cooked Spinach (Spinach Sabzi)' (e.g., 100g, 1 cup)."** |
| 6 | *"200g grilled chicken, 100g rice and some salad."* | 1. 200g grilled chicken<br>2. 100g rice<br>3. some salad | `needs_confirmation`<br>(Confidence: 0.77) | 171477<br>null<br>168462 | 200g<br>100g<br>null | **"Was the rice white or brown, and was it cooked?"**<br>**"Please specify the serving quantity or weight for 'Mixed Green Salad'."** |

---

## 4. API Endpoints Specification

### 4.1 Dedicated Parsing Endpoint: `POST /api/meals/parse`
Receives free text and generates a structured draft representation. Does **not** insert or write to the database.

* **Endpoint:** `POST /api/meals/parse`
* **Headers:** `Content-Type: application/json`
* **Request Payload:**
  ```json
  {
    "description": "I had 2 rotis, one bowl of dal and a cup of curd."
  }
  ```
* **Response Payload (`HTTP 200 OK`):**
  ```json
  {
    "original_text": "I had 2 rotis, one bowl of dal and a cup of curd.",
    "status": "needs_confirmation",
    "has_ambiguities": true,
    "has_missing_portions": false,
    "has_unrecognized": false,
    "ingredient_count": 3,
    "confidence_score": 0.83,
    "clarifications": [
      {
        "ingredient_id": "ing_1_17629362",
        "ingredient_index": 1,
        "type": "ambiguous_food",
        "raw_text": "1 bowl of dal",
        "food_query": "dal",
        "question": "Which variety of dal / lentils did you have?",
        "options": [
          { "fdc_id": 172421, "name": "Masoor Dal (Brown/Red Lentils)", "food_category": "Legumes and Legume Products" },
          { "fdc_id": 169137, "name": "Moong Dal (Yellow Mung Beans)", "food_category": "Legumes and Legume Products" },
          { "fdc_id": 170430, "name": "Toor / Arhar Dal (Pigeon Peas)", "food_category": "Legumes and Legume Products" },
          { "fdc_id": 173757, "name": "Chana Dal (Bengal Gram Chickpeas)", "food_category": "Legumes and Legume Products" }
        ]
      }
    ],
    "ingredients": [
      {
        "id": "ing_0_17629362",
        "raw_text": "2 rotis",
        "food_name": "Whole Wheat Chapati / Roti",
        "fdc_id": 174075,
        "quantity": 2,
        "unit": "piece",
        "weight_g": 86,
        "confidence": 0.95,
        "status": "confirmed",
        "portion_description": "2 × 1 piece (86g)"
      },
      {
        "id": "ing_1_17629362",
        "raw_text": "1 bowl of dal",
        "food_name": "Masoor Dal",
        "fdc_id": null,
        "quantity": 1,
        "unit": "bowl",
        "weight_g": null,
        "confidence": 0.60,
        "status": "ambiguous_food"
      },
      {
        "id": "ing_2_17629362",
        "raw_text": "1 cup of curd",
        "food_name": "Plain Whole Milk Yogurt (Curd / Dahi)",
        "fdc_id": 171284,
        "quantity": 1,
        "unit": "cup",
        "weight_g": 245,
        "confidence": 0.95,
        "status": "confirmed",
        "portion_description": "1 × 1 cup (245g)"
      }
    ],
    "calculated_nutrition": null,
    "future_ml_schema": {
      "raw_text": "I had 2 rotis, one bowl of dal and a cup of curd.",
      "allowed_for_training": true,
      "entities": [ ... ]
    }
  }
  ```

---

### 4.2 Decoupled Logging Endpoint: `POST /api/meals`
Text logging requests are routed through `mealParserService` and calculated deterministically.
* **If status is `ready`:** Deterministic nutrition is calculated via `foodCatalogService` and saved to `meals`, `nutrition`, and `meal_ingredients` with `engine: "local_nlp"`.
* **If status is `needs_confirmation`:** Returns `HTTP 200` with `{ requiresConfirmation: true, parseResult }` unless `{ confirmAmbiguity: true }` is supplied.
* **Preserves `POST /api/meals/image`:** Gemini Vision is retained exclusively for uploaded photos.

---

## 5. Frontend Integration Walkthrough (`Describe Meal` Tab)

The `Describe Meal` tab in [src/pages/MealLog.jsx](file:///c:/Users/kc701/Desktop/Projects,%20Bots%20and%20ZIPs/Nutriq/Nutriq2/src/pages/MealLog.jsx) provides a seamless two-stage user experience:

### Stage 1: Natural Text Input
* Text area with placeholder guidance.
* 6 quick benchmark chip buttons allowing users to test multi-item expressions with a single click.
* Primary action button: **"Analyze Meal"** (with loading spinner during local parsing).

### Stage 2: Interactive Draft Review & Clarification
When `parsedDraft` is loaded, the view updates with:
1. **Status & Confidence Pill:** Displays overall parsing confidence and verification badge.
2. **Clarification Card:** Highlighted in amber when ambiguities or missing portions are detected:
   * **Ambiguity Resolution:** One-click option buttons (e.g. `[Masoor Dal]`, `[Moong Dal]`, `[Toor Dal]`, `[Chana Dal]`). Clicking an option instantly resolves the item, updates its FDC ID, dismisses the question, and triggers live nutrient recalculation.
   * **Missing Portion Resolution:** Preset buttons (`[50g]`, `[100g]`, `[150g]`, `[200g]`, `[1 cup]`) and custom grams input.
3. **Editable Ingredient List:**
   * Shows food name, USDA category, preparation style badge, and FDC identifier.
   * Serving adjusters (`-25g`, `+25g`) allow fine-tuning portion sizes in real time.
   * Delete button (trash icon) to drop unwanted ingredients.
4. **Live Deterministic Nutrition Card:** Real-time summary across all 8 nutrients (Calories, Protein, Carbs, Fat, Vitamin D, Iron, Zinc, Vitamin B12) updating whenever ingredients are modified.
5. **Confirm & Save Meal:** Persists verified records via `POST /api/meals/catalog` and displays the saved confirmation card with the `LOCAL NLP ENGINE` badge.

---

## 6. Future ML Training Data Collection Schema (Requirement 10)

To support future fine-tuning of compact on-device sequence tagging models (e.g., lightweight BERT/DistilBERT or token classification transformers), `mealParserService.formatMlAnnotation` exports standard span-level training records.

### Schema Definition
```json
{
  "raw_text": "I had 2 rotis and 1 cup curd",
  "normalized_text": "2 rotis and 1 cup curd",
  "allowed_for_training": true,
  "confidence_score": 0.95,
  "entities": [
    {
      "start_char": 8,
      "end_char": 13,
      "entity_type": "FOOD",
      "text": "rotis",
      "fdc_id": 174075,
      "normalized_food": "Whole Wheat Chapati / Roti"
    },
    {
      "start_char": 6,
      "end_char": 7,
      "entity_type": "QUANTITY",
      "text": "2",
      "value": 2
    },
    {
      "start_char": 24,
      "end_char": 28,
      "entity_type": "FOOD",
      "text": "curd",
      "fdc_id": 171284,
      "normalized_food": "Plain Whole Milk Yogurt (Curd / Dahi)"
    },
    {
      "start_char": 18,
      "end_char": 21,
      "entity_type": "UNIT",
      "text": "cup"
    }
  ],
  "user_corrections": []
}
```

### Privacy & Consent Controls
* When `isOptIn: false`, `allowed_for_training: false` is enforced and character spans are not exported.
* Text inputs containing PII patterns (emails, phone numbers) are stripped.

---

## 7. Verification Results

All unit, integration, and HTTP endpoint test suites pass with 100% success rate:

```text
============================================================
Nutriq Test Suite Results
============================================================
1. Production Test Suite:            10 / 10 passed (100%)
2. Local Nutrient Engine:            13 / 13 passed (100%)
3. HTTP Endpoint API:                10 / 10 passed (100%)
4. Phase 1C Catalog Service:         14 / 14 passed (100%)
5. Phase 1D Catalog Meal Flow:        8 /  8 passed (100%)
6. Phase 2 Meal Parser Suite:        14 / 14 passed (100%)
------------------------------------------------------------
Total Backend Tests:                 69 / 69 passed (100%)
============================================================
```

### Frontend Build Output
```text
vite v8.0.8 building client environment for production...
✓ 2764 modules transformed.
dist/index.html                     0.86 kB │ gzip:   0.48 kB
dist/assets/index-Q8O-UdnM.css     42.98 kB │ gzip:   9.66 kB
dist/assets/index-Ct-S3bMT.js   1,286.89 kB │ gzip: 350.35 kB
✓ built in 2.21s with 0 errors.
```

---

## 8. Limitations & Future Work

1. **Brand Names & Packaged Goods:** The current curated catalog focuses on foundational ingredients, staple dishes, and whole foods. Branded packaged items (e.g. specific bar brands) can be expanded in Phase 3 by indexing USDA Branded Food records.
2. **Regional Dish Recipes:** Multi-ingredient mixed curries (e.g., complex biryani recipes, stews) use composite USDA representations. A user-defined custom recipe builder will allow saving personal ingredient ratios.
3. **Continuous Annotation Logging:** The opt-in ML training schema is ready in code; in production, saving opt-in corrections to a dedicated Supabase dataset table will facilitate continuous active learning.

