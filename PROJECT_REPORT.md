# Nutriq — Comprehensive Project Report

> **AI-Powered Predictive Nutrition & Micronutrient Intelligence Platform**  
> *Repository:* `karannn-n/Nutriq-AI-` | *Version:* `1.0.0 (Production Ready)` | *Date:* March 2026

---

## 1. Executive Summary

Most existing nutrition and calorie tracking applications focus solely on caloric intake and macronutrient splits (protein, carbohydrates, fats). They overlook **micronutrients** (Vitamin D, Iron, Zinc, Vitamin B12), leading to undetected deficiencies that impact energy, cognition, and long-term health.

**Nutriq** solves this by combining natural language processing and computer vision with predictive analytics. Users can log meals by simply describing what they ate or uploading a meal photo. Nutriq parses the nutritional profile using Google Gemini 2.0 Flash, tracks running bio-metrics, flags projected deficiency risks before they manifest, and provides actionable dietary interventions.

---

## 2. System Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                 Client Layer (Browser / PWA)                │
│  React 19 + Vite | Framer Motion | Recharts | Lucide React   │
│  Supabase Auth Client | Multi-Theme Engine | Protected Routes│
│  Offline Sync Queue | Local Storage & Duplicate Prevention  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / REST / Bearer JWT
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               API Gateway & Backend Service                 │
│         Node.js + Express 5 + Multer + Auth Middleware      │
│         Rate Limiting | Security Headers | Health Monitor   │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Relational Storage      │ │         AI Engine          │
│     Supabase PostgreSQL      │ │    Google Gemini 2.0 Flash │
│  - profiles (auth.users)     │ │  - Multimodal Vision       │
│  - meals & nutrition         │ │  - NLP Nutrient Extraction │
│  - deficiency_alerts         │ │  - Preventive Dietary Tips │
│  - recommendations & settings│ │  (Server-Side Only)        │
│  - Row Level Security (RLS)  │ └────────────────────────────┘
└──────────────────────────────┘
```

### Core Technologies
- **Frontend:** React 19, Vite 8, React Router v7, `@supabase/supabase-js`, Framer Motion, Recharts, Lucide React, Glassmorphic Vanilla CSS.
- **Backend:** Node.js, Express 5, Multer, `express-rate-limit`, `@supabase/supabase-js` (admin & auth client).
- **AI / LLM:** Google Gemini 2.0 Flash via `@google/generative-ai` (structured JSON extraction, image recognition, personalized health insights, running strictly server-side).
- **Database & Auth:** Supabase PostgreSQL with Row Level Security (RLS) on all tables, auth triggers, and automatic profile creation.
- **Deployment Pipeline:** GitHub Pages (Frontend SPA), Render (Backend web service via Blueprint `render.yaml`), GitHub Actions CI/CD.

---

## 3. Features Implemented (STEP 1, STEP 2 & STEP 3)

| Feature | Description | Status |
|---|---|:---:|
| **Supabase PostgreSQL Database** | Complete relational schema for profiles, meals, nutrition, deficiency_alerts, recommendations, and user_settings with foreign keys, cascading deletes, and client_id duplicate prevention. | ✅ Completed |
| **Row Level Security (RLS)** | Full RLS policies across all tables enforcing strict tenant isolation (`auth.uid() = user_id`). | ✅ Completed |
| **Supabase Authentication** | Email/password signup, login, persistent session restoration, token auto-refresh, and logout with auto-profile trigger on `auth.users`. | ✅ Completed |
| **Full Meal CRUD Engine** | Create (NLP / Photo), Read (paginated, searched, filtered), Update (inline edit of macros & micros), and Delete with confirmation modal. | ✅ Completed |
| **Meal History Explorer** | Dedicated responsive history dashboard with search query filtering, start/end date range picker, pagination controls, and detailed nutritional modal. | ✅ Completed |
| **Server-Side AI Pipeline** | Gemini 2.0 Flash meal NLP parsing and vision photo analysis remain strictly server-side with zero key exposure. | ✅ Completed |
| **AI Output Validation & Sanitizer** | Fallback-resilient schema cleaner with unit-stripping, key alias mapping, and biological plausibility bounds. | ✅ Completed |
| **Predictive 7-Day Deficiency Engine** | Rolling 7-day intake analysis against Recommended Daily Intakes (RDI) for Vitamin D, Iron, Zinc, and B12 with dynamic AI recommendations. | ✅ Completed |
| **Nutritional Risk Disclaimers** | Prominent disclaimers across Dashboard, Insights, and Alerts clarifying insights as nutritional indicators, not medical diagnoses. | ✅ Completed |
| **Live Dynamic Dashboard** | Health score (0-100), 7-day rolling calorie average, macro ratio breakdown, micronutrient radar chart, recent meals, and dismissible deficiency alerts. | ✅ Completed |
| **Nutrient Intelligence & Insights** | Micronutrient radar chart, daily trend bar charts, macro distribution, and generative AI weekly health evaluation. | ✅ Completed |
| **Cloud User & Dietary Settings** | Full persistence of user profile, daily calorie targets, dietary preference (vegan, keto, etc.), reminder time, and notification toggles in Supabase. | ✅ Completed |
| **Offline Mode & Sync Queue** | Local simulation fallback, persistent `nutriq_sync_queue`, duplicate prevention via `client_id`, automatic reconnection sync, and header status pill (`SyncStatusBadge`). | ✅ Completed |
| **Security Hardening & Rate Limiting** | Rate limiting on global API (300 req/15m) and AI endpoints (30 req/m), security headers, strict MIME image validation, input length guards, and safe logging. | ✅ Completed |
| **Express Production Quality** | Centralized error handling, enhanced `/api/health` status monitor, CORS origin validation, and graceful shutdown (`SIGTERM`/`SIGINT`). | ✅ Completed |
| **CI / CD Pipeline** | Automated GitHub Actions workflow executing backend test suite, frontend linting, production build, and automated GitHub Pages deployment. | ✅ Completed |
| **Production Blueprint** | `render.yaml` Blueprint for automated backend deployment on Render with health checks and environment configuration. | ✅ Completed |

---

## 4. API Endpoints Created / Modified

| Endpoint | Method | Auth | Description |
|---|---|:---:|---|
| `/api/health` | `GET` | No | System health, environment, uptime, and database connection status |
| `/api/meals` | `POST` | `Bearer JWT` | Analyzes meal text with Gemini 2.0 Flash; supports offline sync duplicate prevention via `client_id` |
| `/api/meals/image` | `POST` | `Bearer JWT` | Multipart photo upload analyzed via Gemini Vision & saved to Supabase |
| `/api/meals` | `GET` | `Bearer JWT` | Paginated meal history with search query and date range filtering |
| `/api/meals/:id` | `GET` | `Bearer JWT` | Fetches single meal details with macronutrient & micronutrient breakdown |
| `/api/meals/:id` | `PUT` | `Bearer JWT` | Updates meal description, calories, macros, and micronutrients |
| `/api/meals/:id` | `DELETE` | `Bearer JWT` | Deletes meal record and cascades deletion to nutrition row |
| `/api/dashboard` | `GET` | `Bearer JWT` | Aggregates 7-day intake, health score, active deficiency alerts, and recent meals |
| `/api/insights` | `GET` | `Bearer JWT` | Generates daily trend series, radar fulfillment metrics, and AI weekly health summary |
| `/api/alerts` | `GET` | `Bearer JWT` | Fetches active deficiency alerts and associated recommendations |
| `/api/alerts/:id/dismiss`| `PUT` | `Bearer JWT` | Dismisses a deficiency alert for the authenticated user |
| `/api/user/profile` | `GET` | `Bearer JWT` | Fetches active user profile from `public.profiles` |
| `/api/user/profile` | `PUT` | `Bearer JWT` | Updates user full name, phone number, and bio |
| `/api/user/settings` | `GET` | `Bearer JWT` | Fetches user settings (theme, calories, dietary plan, reminders) |
| `/api/user/settings` | `PUT` | `Bearer JWT` | Upserts user settings into `public.user_settings` |

---

## 5. Database Schema & RLS Architecture

The database is defined in [`supabase/schema.sql`](file:///c:/Users/kc701/Desktop/Projects,%20Bots%20and%20ZIPs/Nutriq/Nutriq2/supabase/schema.sql) and migration file [`supabase/migrations/20260329000000_initial_schema.sql`](file:///c:/Users/kc701/Desktop/Projects,%20Bots%20and%20ZIPs/Nutriq/Nutriq2/supabase/migrations/20260329000000_initial_schema.sql).

### Tables:
1. **`public.profiles`**: `id` (UUID references `auth.users`), `full_name`, `email`, `avatar_url`, `phone`, `bio`, `created_at`, `updated_at`.
2. **`public.user_settings`**: `user_id` (UUID references `auth.users`), `theme`, `target_calories`, `dietary_preference`, `email_notifications`, `deficiency_alerts_enabled`, `daily_reminder_time`, `updated_at`.
3. **`public.meals`**: `id` (UUID primary key), `user_id` (UUID references `auth.users`), `client_id` (TEXT, unique client sync identifier), `description`, `image_url`, `logged_at`, `created_at`.
4. **`public.nutrition`**: `id` (UUID primary key), `meal_id` (UUID references `meals`), `user_id` (UUID references `auth.users`), `calories`, `protein_g`, `carbs_g`, `fat_g`, `vitamin_d_mcg`, `iron_mg`, `zinc_mg`, `b12_mcg`, `created_at`.
5. **`public.deficiency_alerts`**: `id` (UUID primary key), `user_id` (UUID references `auth.users`), `nutrient`, `severity`, `current_avg`, `target_rdi`, `message`, `is_dismissed`, `created_at`.
6. **`public.recommendations`**: `id` (UUID primary key), `user_id` (UUID references `auth.users`), `alert_id` (UUID references `deficiency_alerts`), `nutrient`, `recommendation`, `created_at`.

### High-Performance Indexes:
- `idx_meals_user_logged`: `(user_id, logged_at DESC)`
- `idx_meals_user_client_id`: `(user_id, client_id) WHERE client_id IS NOT NULL`
- `idx_meals_user_desc`: `(user_id, description)`
- `idx_nutrition_user_created`: `(user_id, created_at DESC)`
- `idx_nutrition_meal_id`: `(meal_id)`
- `idx_alerts_user_created`: `(user_id, created_at DESC)`
- `idx_alerts_active`: `(user_id, is_dismissed) WHERE is_dismissed = false` (partial index)
- `idx_recommendations_user_created`: `(user_id, created_at DESC)`

---

## 6. Verification & Automated Test Results

- **Backend Automated Test Suite ([backend/test_suite.js](file:///c:/Users/kc701/Desktop/Projects,%20Bots%20and%20ZIPs/Nutriq/Nutriq2/backend/test_suite.js))**:
  - `validateAndSanitizeNutrition` handles valid full input: **PASS**
  - Sanitization of negative numbers and strings with units: **PASS**
  - Fallback estimation for empty input: **PASS**
  - 7-day rolling deficiency threshold detection (< 70% of RDI): **PASS**
  - Health score bounding (0–100): **PASS**
  - `requireAuth` rejects missing Authorization header: **PASS**
  - `requireAuth` rejects malformed Bearer tokens: **PASS**
  - Meal description length limit (1,000 characters): **PASS**
  - Multer fileFilter rejects non-image executable/script MIME types: **PASS**
  - Idempotency client identifier format: **PASS**
  - **Result: 10/10 tests passed (100%)**
- **Syntax Check**: `node -c backend/server.js backend/services/aiService.js backend/supabase.js backend/middleware/auth.js` exited with code `0`.
- **ESLint**: Passed with 0 errors.
- **Frontend Production Build**: `npm run build` compiled 2,757 modules with 0 errors.

---

## 7. Future Horizons (Post-1.0 Roadmap)

1. **Barcode & Packaged Food Scanner**:
   - Integrate OpenFoodFacts / USDA FoodData Central API for packaged food barcode scanning.
2. **Proactive AI Meal Planner & Grocery Generator**:
   - Automated 7-day meal plan generator specifically tailored to replenish user-specific nutrient gaps.
3. **Multi-Nutrient Library Expansion**:
   - Expand beyond the initial 4 micronutrients to track Calcium, Magnesium, Potassium, Omega-3 fatty acids, and daily hydration logging.
4. **Wearable & Fitness API Integration**:
   - Sync daily active burn with Apple Health, Google Fit, and Whoop.
