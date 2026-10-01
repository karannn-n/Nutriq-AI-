# Nutriq — AI-Powered Predictive Nutrition & Micronutrient Intelligence Platform

[![Build & Deploy](https://github.com/karannn-n/Nutriq-AI-/actions/workflows/deploy.yml/badge.svg)](https://github.com/karannn-n/Nutriq-AI-/actions/workflows/deploy.yml)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19.x-blue.svg)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E.svg)](https://supabase.com)
[![Gemini](https://img.shields.io/badge/AI-Google%20Gemini%202.0%20Flash-8E75C4.svg)](https://ai.google.dev/)

> **Nutriq** bridges the critical gap in modern nutrition tracking by analyzing not only calories and macronutrients (protein, carbs, fat), but also essential **micronutrients** (Vitamin D, Iron, Zinc, Vitamin B12). Using multimodal AI (Google Gemini 2.0 Flash) and rolling 7-day predictive risk modeling, Nutriq detects potential deficiencies before they manifest and recommends targeted dietary interventions.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Tech Stack](#tech-stack)
3. [Repository Structure](#repository-structure)
4. [Prerequisites & Local Setup](#prerequisites--local-setup)
5. [Environment Variables](#environment-variables)
6. [Supabase Setup & Database Migration](#supabase-setup--database-migration)
7. [Authentication & Row-Level Security](#authentication--row-level-security)
8. [Google Gemini AI Setup](#google-gemini-ai-setup)
9. [Offline Architecture & Sync Queue](#offline-architecture--sync-queue)
10. [REST API Documentation](#rest-api-documentation)
11. [Production Deployment](#production-deployment)
    - [Frontend (GitHub Pages)](#frontend-deployment-github-pages)
    - [Backend (Render Blueprint)](#backend-deployment-render)
12. [CI / CD Automation](#ci--cd-automation)
13. [Security & Rate Limiting](#security--rate-limiting)

---

## System Architecture

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

---

## Tech Stack

| Component | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend** | React | 19.x | Component architecture and state management |
| **Build Tool** | Vite | 8.x | Modern bundler and development server |
| **Routing** | React Router | 7.x | Single Page Application client routing |
| **Animations** | Framer Motion | 12.x | Micro-interactions and animated modals |
| **Visual Charts** | Recharts | 3.x | Area charts, bar trends, and micronutrient radar |
| **Icons** | Lucide React | 1.x | Accessible vector iconography |
| **Backend** | Node.js + Express | 5.x | RESTful API service and authentication gateway |
| **Multipart Uploads**| Multer | 2.x | Secure file upload and image validation |
| **Rate Limiter** | express-rate-limit | 7.x | DoS defense and AI resource protection |
| **Database & Auth** | Supabase PostgreSQL | Latest | Relational persistence, Row-Level Security, JWT Auth |
| **AI / Vision** | Google Gemini 2.0 Flash | Latest | Multimodal food recognition and NLP nutrient parsing |

---

## Repository Structure

```
Nutriq2/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD test, lint & deploy workflow
├── backend/
│   ├── middleware/
│   │   └── auth.js             # Supabase JWT Bearer token authentication guard
│   ├── services/
│   │   └── aiService.js        # Gemini 2.0 Flash NLP & Vision prompt engineering & sanitizer
│   ├── uploads_tmp/            # Temporary disk buffer for uploaded meal images
│   ├── .env.example            # Backend environment template
│   ├── package.json            # Backend scripts and dependencies
│   ├── server.js               # Express application, routes, rate limiters & shutdown
│   ├── supabase.js             # Supabase admin client initialization
│   └── test_suite.js           # Automated test suite (npm test)
├── public/                     # Static assets
├── src/
│   ├── components/
│   │   ├── Navbar.jsx          # Public navigation bar
│   │   ├── ProtectedRoute.jsx  # Auth guard with redirect memory
│   │   └── SyncStatusBadge.jsx # Real-time online/offline sync status pill
│   ├── contexts/
│   │   ├── AuthContext.jsx     # Supabase Auth session & profile management
│   │   └── SyncContext.jsx     # Offline sync queue event provider
│   ├── hooks/
│   │   ├── useAuth.js          # Authentication hook
│   │   └── useSync.js          # Offline sync hook
│   ├── layouts/
│   │   └── AppLayout.jsx       # Authenticated layout with sidebar & top status bar
│   ├── pages/
│   │   ├── Dashboard.jsx       # 7-day health score, rolling calories & alerts
│   │   ├── Insights.jsx        # Radar chart, intake trends & AI health evaluation
│   │   ├── LandingPage.jsx     # Marketing landing page
│   │   ├── Login.jsx           # Supabase sign-in
│   │   ├── MealHistory.jsx     # Paginated meal explorer with search & date filters
│   │   ├── MealLog.jsx         # Natural language and photo meal logging
│   │   ├── Register.jsx        # Supabase sign-up
│   │   └── Settings.jsx        # Profile, dietary goals, themes & cloud preferences
│   ├── utils/
│   │   ├── offlineDb.js        # Local simulated nutritional calculation engine
│   │   ├── offlineSync.js      # Queue persistence and retry manager
│   │   ├── supabaseClient.js   # Frontend Supabase browser client
│   │   └── theme.js            # Theme definitions and CSS variable applicator
│   ├── App.jsx                 # Route registry and context providers
│   ├── index.css               # Design system, glassmorphism tokens and utilities
│   └── main.jsx                # Application root entry point
├── supabase/
│   ├── migrations/
│   │   └── 20260329000000_initial_schema.sql # Version-controlled schema migration
│   └── schema.sql              # Standalone Supabase SQL initialization script
├── .env.example                # Frontend environment template
├── render.yaml                 # Render Blueprint deployment configuration
└── vite.config.js              # Vite configuration with base path
```

---

## Prerequisites & Local Setup

### 1. Requirements
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- A free **Supabase** project account ([supabase.com](https://supabase.com))
- A free **Google Gemini API Key** ([aistudio.google.com](https://aistudio.google.com))

### 2. Clone the Repository
```bash
git clone https://github.com/karannn-n/Nutriq-AI-.git
cd Nutriq-AI-
```

### 3. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

---

## Environment Variables

### Frontend Configuration (`.env`)
Create a `.env` file in the root directory:
```env
# URL of the running Express Backend API
VITE_API_URL=http://localhost:5000

# Supabase Project API Keys (from Supabase Dashboard -> Settings -> API)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### Backend Configuration (`backend/.env`)
Create a `backend/.env` file:
```env
PORT=5000
NODE_ENV=development

# Supabase Credentials
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Gemini API Key (Server-Side Only)
GEMINI_API_KEY=your-gemini-api-key

# Client Origin allowed by CORS
CLIENT_ORIGIN=http://localhost:5173
```

---

## Supabase Setup & Database Migration

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
2. Navigate to the **SQL Editor** tab on the left sidebar.
3. Open [`supabase/schema.sql`](file:///c:/Users/kc701/Desktop/Projects,%20Bots%20and%20ZIPs/Nutriq/Nutriq2/supabase/schema.sql) in this repository, copy the full contents, and paste into the Supabase SQL Editor.
4. Click **Run**.

This script sets up:
- Tables: `profiles`, `user_settings`, `meals`, `nutrition`, `deficiency_alerts`, `recommendations`.
- High-performance indexes for fast date queries, partial indexes for active alerts, and `client_id` indexes for duplicate prevention.
- Automatic profile trigger on `auth.users` (`handle_new_user()`).
- Strict Row-Level Security (RLS) policies on every table.

---

## Authentication & Row-Level Security

- All user registration and session management is handled by **Supabase Auth** via standard JWT tokens.
- Protected frontend routes require an active session verified in `ProtectedRoute.jsx`.
- When communicating with the backend, the client includes the JWT token:
  ```http
  Authorization: Bearer <SUPABASE_JWT_ACCESS_TOKEN>
  ```
- The backend verifies the token using `supabaseAdmin.auth.getUser(token)` inside [`backend/middleware/auth.js`](file:///c:/Users/kc701/Desktop/Projects,%20Bots%20and%20ZIPs/Nutriq/Nutriq2/backend/middleware/auth.js).
- All database operations enforce user tenancy (`user_id = req.user.id`).

---

## Google Gemini AI Setup

Nutriq uses **Google Gemini 2.0 Flash** for:
1. **Natural Language Meal Logging**: Extracts calories, protein, carbs, fat, Vitamin D, Iron, Zinc, and B12.
2. **Computer Vision Photo Logging**: Analyzes meal images and estimates nutritional values.
3. **Weekly Insights Summaries**: Generates personalized preventive dietary interventions.

> **Security Rule**: The `GEMINI_API_KEY` is strictly confined to the Node.js backend environment and is **never** bundled or exposed to client-side code.

---

## Offline Architecture & Sync Queue

Nutriq features a resilient offline architecture:
- **Instant Local Feedback**: When offline, meals are evaluated through the local nutritional estimation engine in [`src/utils/offlineDb.js`](file:///c:/Users/kc701/Desktop/Projects,%20Bots%20and%20ZIPs/Nutriq/Nutriq2/src/utils/offlineDb.js).
- **Persistent Queue**: Queued meals are tagged with a client-generated UUID (`client_id`) in `localStorage` under `nutriq_sync_queue`.
- **Automatic Reconnection Sync**: The application listens to browser `online` events via [`SyncContext`](file:///c:/Users/kc701/Desktop/Projects,%20Bots%20and%20ZIPs/Nutriq/Nutriq2/src/contexts/SyncContext.jsx) and syncs pending meals to Supabase through the Express API.
- **Idempotency & Duplicate Prevention**: The backend verifies `client_id` before inserting; if the record already exists, it returns the existing meal without duplication.
- **Sync Status Pill**: The [`SyncStatusBadge`](file:///c:/Users/kc701/Desktop/Projects,%20Bots%20and%20ZIPs/Nutriq/Nutriq2/src/components/SyncStatusBadge.jsx) in the top header informs users when they are offline, syncing, or have pending items.

---

## REST API Documentation

### Base URL: `/api`

| Endpoint | Method | Auth Required | Description |
|---|---|:---:|---|
| `/health` | `GET` | No | System health, environment, uptime, and database connection status |
| `/meals` | `POST` | Yes (Bearer) | Analyzes natural language meal text with Gemini and saves to Supabase |
| `/meals/image` | `POST` | Yes (Bearer) | Analyzes uploaded food photo with Gemini Vision and saves to Supabase |
| `/meals` | `GET` | Yes (Bearer) | Paginated meal history (`page`, `limit`, `search`, `startDate`, `endDate`) |
| `/meals/:id` | `GET` | Yes (Bearer) | Single meal details with macronutrient and micronutrient breakdown |
| `/meals/:id` | `PUT` | Yes (Bearer) | Updates meal description, calories, macros, and micronutrients |
| `/meals/:id` | `DELETE` | Yes (Bearer) | Deletes meal and cascades deletion to nutrition record |
| `/dashboard` | `GET` | Yes (Bearer) | 7-day rolling calories, health score, active alerts, and recent meals |
| `/insights` | `GET` | Yes (Bearer) | Daily trend bar charts, micronutrient radar data, and AI summary |
| `/alerts` | `GET` | Yes (Bearer) | Active deficiency alerts and personalized recommendations |
| `/alerts/:id/dismiss`| `PUT` | Yes (Bearer) | Dismisses an alert for the current user |
| `/user/profile` | `GET` | Yes (Bearer) | Current user profile details |
| `/user/profile` | `PUT` | Yes (Bearer) | Updates full name, phone number, and bio |
| `/user/settings` | `GET` | Yes (Bearer) | User preferences (theme, target calories, dietary plan, reminders) |
| `/user/settings` | `PUT` | Yes (Bearer) | Saves updated user preferences to Supabase |

---

## Production Deployment

### Frontend Deployment (GitHub Pages)

The repository includes an automated GitHub Actions deployment workflow at `.github/workflows/deploy.yml`.

1. Go to your repository on GitHub -> **Settings** -> **Secrets and variables** -> **Actions**.
2. Add the following repository secrets:
   - `VITE_API_URL`: Your production backend URL (e.g. `https://nutriq-backend.onrender.com`)
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Public Anon Key
3. Push to `main` branch. GitHub Actions will test, lint, build, and deploy the frontend to the `gh-pages` branch.
4. Under **Settings** -> **Pages**, set Source to **Deploy from a branch** and select `gh-pages` / `root`.

### Backend Deployment (Render)

The project includes a ready-to-use [`render.yaml`](file:///c:/Users/kc701/Desktop/Projects,%20Bots%20and%20ZIPs/Nutriq/Nutriq2/render.yaml) Blueprint:

1. Log into [Render](https://render.com).
2. Click **New** -> **Blueprint**.
3. Connect your Nutriq repository. Render will automatically detect `render.yaml`.
4. Fill in the required environment variables:
   - `CLIENT_ORIGIN`: Your GitHub Pages URL (e.g. `https://karannn-n.github.io`)
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role secret
   - `SUPABASE_ANON_KEY`: Your Supabase anon public key
   - `GEMINI_API_KEY`: Your Google Gemini API key
5. Deploy the service.

---

## CI / CD Automation

The GitHub Actions workflow runs on every push and pull request to `main`:
1. **Backend Verification**: Runs `npm test` verifying 10 unit and security assertions.
2. **Frontend Linting**: Runs `npm run lint` across all React source files.
3. **Production Compilation**: Builds the Vite production bundle.
4. **Deploy**: Publishes production artifacts to GitHub Pages upon passing all checks.

To execute tests locally:
```bash
# Run backend test suite
cd backend
npm test

# Run frontend linting & production build
npm run lint
npm run build
```

---

## Security & Rate Limiting

- **Zero Client Secret Exposure**: Neither the Gemini API key nor the Supabase Service Role key are included in client bundles.
- **Strict Rate Limiting**:
  - Global API: 300 requests per 15 minutes per IP.
  - AI Endpoints (`/api/meals`, `/api/meals/image`): 30 requests per minute per IP.
- **Input Sanitization**: Meal descriptions are constrained to 1,000 characters; AI nutritional outputs are sanitized via `validateAndSanitizeNutrition()`.
- **Upload Safety**: Multer enforces a 10MB limit and whitelists image MIME types only (`jpeg`, `png`, `webp`, `gif`, `heic`). Uploaded files are cleaned up from temporary disk space in a `finally` block.
- **Security Headers**: Standard headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`) are applied on every API response.
- **Graceful Shutdown**: The Express server captures `SIGTERM` and `SIGINT` to safely close active connections before termination.

---

## Medical Disclaimer

Nutriq provides nutritional risk indicators and educational bio-metric evaluations based on Recommended Daily Intake (RDI) baselines. Nutriq does **not** provide medical diagnoses, treatment plans, or medical advice. Consult a licensed healthcare professional or registered dietitian for medical guidance.

---

## License

MIT License. Designed and developed with care.
