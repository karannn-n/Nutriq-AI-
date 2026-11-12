# Nutriq — Deterministic Local Food Nutrition Engine Specification

> **Phase 1: Local Food Nutrition Engine Architecture & Integration**  
> *Author:* Nutriq Engineering Team  
> *Date:* November 2026 (Version 2.1.0)

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client UI (React 19)                     │
│  - Mode Switch: USDA Local Engine vs Gemini AI Alternative   │
│  - Multi-Ingredient Meal Composer & Portion Units Selector  │
│  - Ambiguity & Portion Confirmation Interactive Cards       │
│  - Live Running Sums & USDA Provenance Display              │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP REST / JSON
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Express Backend API Gateway                 │
│  GET  /api/nutrition/foods          (Catalog Search)        │
│  GET  /api/nutrition/foods/:id      (Single Food Profile)   │
│  POST /api/nutrition/calculate      (Deterministic Formula) │
│  POST /api/nutrition/parse-meal     (Decomposition Engine)  │
│  POST /api/meals                    (Persist with Engine ID)│
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│   Local Food Database        │ │    Deterministic Nutrient  │
│   (USDA FoodData Central)    │ │    Calculation Engine      │
│   - 67+ Curated Staple Foods │ │   Formula:                 │
│   - Exact Per-100g Nutrients │ │   Amount = per100g * g /100│
│   - Portion Conversion Maps  │ │   Preserves nulls (no zero)│
│   - Sub-millisecond Indexes  │ │   Validates weights > 0    │
└──────────────────────────────┘ └────────────────────────────┘
```

---

## 2. Deterministic Calculation Formula

Nutrient calculation is purely mathematical and repeatable:

$$\text{nutrient amount} = \frac{\text{nutrient per } 100\text{ g} \times \text{serving weight in grams}}{100}$$

### Worked Examples:
1. **Cooked White Rice (USDA FDC 168878):**
   - Energy per 100 g: $130\text{ kcal}$
   - Protein per 100 g: $2.69\text{ g}$
   - Carbs per 100 g: $28.17\text{ g}$
   - Iron per 100 g: $1.20\text{ mg}$
   - Serving: $150\text{ g}$
   $$\text{Calories} = \frac{130 \times 150}{100} = 195\text{ kcal}$$
   $$\text{Protein} = \frac{2.69 \times 150}{100} = 4.04\text{ g}$$
   $$\text{Carbohydrates} = \frac{28.17 \times 150}{100} = 42.26\text{ g}$$
   $$\text{Iron} = \frac{1.20 \times 150}{100} = 1.80\text{ mg}$$

2. **Cooked Lentils / Dal (USDA FDC 172421):**
   - Energy per 100 g: $116\text{ kcal}$
   - Protein per 100 g: $9.02\text{ g}$
   - Iron per 100 g: $3.33\text{ mg}$
   - Zinc per 100 g: $1.27\text{ mg}$
   - Serving: $1\text{ cup} = 198\text{ g}$
   $$\text{Calories} = \frac{116 \times 198}{100} = 229.68\text{ kcal}$$
   $$\text{Protein} = \frac{9.02 \times 198}{100} = 17.86\text{ g}$$
   $$\text{Iron} = \frac{3.33 \times 198}{100} = 6.59\text{ mg}$$
   $$\text{Zinc} = \frac{1.27 \times 198}{100} = 2.51\text{ mg}$$

---

## 3. Unit Conversion & Portion Validation

Nutriq validates all serving inputs and converts them to gram weight before calculation:

### Universal Units:
- `g`, `gram`, `grams`: Factor $1.0$
- `kg`, `kilogram`, `kilograms`: Factor $1000.0$
- `oz`, `ounce`, `ounces`: Factor $28.3495$
- `lb`, `pound`, `pounds`: Factor $453.592$

### Food-Specific Portion Units (USDA FDC Portion Tables):
Portions vary by food density. For instance:
- `1 cup` cooked white rice $= 158\text{ g}$
- `1 cup` cooked lentils $= 198\text{ g}$
- `1 cup` raw spinach $= 30\text{ g}$
- `1 slice` whole wheat bread $= 32\text{ g}$
- `1 large egg` $= 50\text{ g}$
- `1 medium apple` $= 182\text{ g}$
- `1 roti / chapati` $= 40\text{ g}$

### Validation Rules:
1. **Quantity must be positive:** $Q > 0$. Zero, negative values, `NaN`, and `Infinity` throw a `ValidationError`.
2. **Unit must be recognized:** Units not found in universal weights or the food's portion map are rejected with a helpful message listing allowed units.
3. **Food must exist:** Null, undefined, or missing food IDs throw a `ValidationError`.

---

## 4. Multi-Ingredient Meal Composition

A meal is represented as an array of confirmed ingredients:

$$\text{Meal} = \{ \text{ingredient}_1, \text{ingredient}_2, \dots, \text{ingredient}_k \}$$

Total nutrient calculation sums each confirmed ingredient:

$$\text{Total Nutrient}_j = \sum_{i=1}^{k} \text{Amount}_{i, j}$$

### Missing / Unknown Data Handling:
- If all ingredients have known values for nutrient $j$, $\text{Total}_j$ is marked `isComplete: true`.
- If one or more ingredients have an unmeasured / unknown value (`null`) for nutrient $j$, $\text{Total}_j$ calculates the known subtotal and flags `isComplete: false`, attaching `missingIn: [food names]`.
- Nutriq **never replaces null with zero** in the calculation engine.

---

## 5. Ambiguity & Confirmation Flow

When a user inputs a natural language meal string, the decomposition engine analyzes each ingredient phrase:

1. **Ambiguous Food Name:** If a term matches multiple distinct foods in the database (e.g. `"milk"` matches Whole Milk, Skim Milk, Soy Milk, Almond Milk; or `"vegetables"` matches Broccoli, Spinach, Carrots):
   - Status: `ambiguous`
   - `requiresConfirmation: true`
   - Returns candidate suggestions for user selection.
2. **Missing Portion Weight:** If a user specifies a food without quantity (e.g. `"rice"` or `"some lentils"`):
   - Status: `missing_quantity`
   - `requiresConfirmation: true`
   - Prompts the user to specify quantity and unit.
3. **Confirmed Item:** When both food and portion are unambiguous:
   - Status: `confirmed`
   - Included immediately in deterministic calculation.

---

## 6. API Reference

### 1. `GET /api/nutrition/foods`
Search or browse the local USDA food database.
- **Query params:** `query` (string), `limit` (number, default 20)
- **Response:** `{ count, total, foods: [...] }`

### 2. `GET /api/nutrition/foods/:id`
Fetch single food record with complete nutrient profile and portion sizes.
- **Response:** `{ food: { id, name, common_name, food_group, nutrients_per_100g, serving_weights_g, source } }`

### 3. `POST /api/nutrition/calculate`
Deterministically calculate nutrients for a single food or a composite meal.
- **Request Body (Single Food):** `{ food_id: "usda_fdc_168878", quantity: 150, unit: "g" }`
- **Request Body (Composite Meal):** `{ ingredients: [{ food_id, quantity, unit, confirmed }] }`
- **Response:** Calculated nutrients, total gram weight, completeness metadata, and USDA provenance.

### 4. `POST /api/nutrition/parse-meal`
Decompose natural language meal text, detect ambiguous ingredients, and return confirmed vs ambiguous items.
- **Request Body:** `{ description: "150g rice, 1 cup lentils and 100g spinach" }`
- **Response:** `{ parsed_items, confirmed_ingredients, ambiguous_ingredients, requires_user_confirmation, nutrition }`

### 5. `POST /api/meals` (Integrated Endpoint)
Creates a meal record in Supabase. Supports both `ingredients` (deterministic USDA path) and `engine: "gemini"` (legacy alternative).

---

## 7. Status of Gemini Replacement & Limitations

> [!IMPORTANT]
> **Gemini Status in Phase 1:**  
> In accordance with the Phase 1 specification:
> - **Gemini has NOT been removed yet.**
> - Google Gemini 2.0 Flash remains fully available in the codebase as the existing alternative.
> - Gemini is accessible both through the API and via the dedicated tab in the frontend.
> - **Do not claim Gemini has been fully replaced until text and image meal logging have been fully verified and tested without it in subsequent phases.**

### Phase 1 Limitations:
1. **Catalog Scope:** Currently normalized to 67+ primary staple foods covering major grains, pulses, dairy, meats, seafood, vegetables, fruits, and Indian staples. Obscure branded packaged foods still benefit from either manual portion entry or the Gemini alternative.
2. **Image Meal Logging:** Image recognition currently relies on Gemini 2.0 Flash Vision. Replacing image parsing with a local computer vision model is scheduled for subsequent phases.
3. **Deficiency Risk & ML:** No changes were made to deficiency thresholds, alert calculations, or RDI targets in this phase, preserving complete stability.

