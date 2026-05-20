# Nutriq — Free Hosting Deployment Guide

> **Frontend** → GitHub Pages (free, forever)
> **Backend** → Render.com (free tier)
> **Database** → Railway.app (free MySQL, $5 credit)

---

## Architecture Overview

```
Browser → GitHub Pages (React/Vite)
              ↓  API calls
         Render.com (Node.js backend)
              ↓  SQL queries
         Railway.app (MySQL database)
```

---

## STEP 1 — Prepare the Repository

### 1.1 Copy the GitHub Actions workflow
```
Copy:   github/deploy.yml
  To:   .github/workflows/deploy.yml     ← create folders if needed
```

### 1.2 Copy the SPA 404 redirect page
```
Copy:   github/404.html
  To:   public/404.html
```

### 1.3 Add the SPA redirect script to index.html
Open `index.html` and paste this inside the <head>, before any other scripts:

<script>
  (function(l) {
    if (l.search[1] === '/') {
      var decoded = l.search.slice(1).split('&').map(function(s) {
        return s.replace(/~and~/g, '&');
      }).join('?');
      window.history.replaceState(null, null,
        l.pathname.slice(0, -1) + decoded + l.hash
      );
    }
  }(window.location));
</script>

### 1.4 Update vite.config.js
Open vite.config.js and set the base to your GitHub repo name:

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/YOUR-REPO-NAME/',   // replace with your actual repo name
})

---

## STEP 2 — Deploy the Database (Railway)

1. Go to https://railway.app → Sign up with GitHub
2. Click New Project → MySQL
3. Once created, click the MySQL service → Variables tab
4. Copy these values (needed for the backend):
   - MYSQL_HOST
   - MYSQL_USER
   - MYSQL_PASSWORD
   - MYSQL_DATABASE

---

## STEP 3 — Deploy the Backend (Render)

1. Go to https://render.com → Sign up with GitHub
2. Click New → Web Service
3. Connect your GitHub repo
4. Configure:
   - Root Directory:  backend
   - Runtime:         Node
   - Build Command:   npm install
   - Start Command:   node server.js
   - Plan:            Free

5. Add Environment Variables:
   PORT           = 5000
   DB_HOST        = <railway MYSQL_HOST>
   DB_USER        = <railway MYSQL_USER>
   DB_PASSWORD    = <railway MYSQL_PASSWORD>
   DB_NAME        = <railway MYSQL_DATABASE>
   GEMINI_API_KEY = <your Gemini API key>

6. Click Deploy — Render gives you a URL like:
   https://nutriq-backend.onrender.com
   (Save this URL — needed for Step 4)

---

## STEP 4 — Set the Frontend Secret on GitHub

1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Click New repository secret
3. Add:
   Name:  VITE_API_URL
   Value: https://nutriq-backend.onrender.com

---

## STEP 5 — Push to GitHub

# First time
git init
git add .
git commit -m "Initial commit — Nutriq"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git push -u origin main

# If you already have a repo
git add .
git commit -m "Production deployment setup"
git push

---

## STEP 6 — Enable GitHub Pages

1. Go to your GitHub repo → Settings → Pages
2. Source: Deploy from a branch
3. Branch: gh-pages  /  Folder: / (root)
4. Click Save

Your live URL will be:
https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/

---

## Verification Checklist

[ ] github/deploy.yml  copied to  .github/workflows/deploy.yml
[ ] github/404.html    copied to  public/404.html
[ ] SPA redirect script added to index.html
[ ] vite.config.js has correct base (your repo name)
[ ] Railway MySQL database is running
[ ] Render backend is deployed and running
[ ] VITE_API_URL secret is set in GitHub repo Settings
[ ] Pushed to main branch
[ ] GitHub Pages enabled on gh-pages branch

---

## Troubleshooting

Blank page after deploy   → Check base in vite.config.js matches repo name exactly
Page refresh gives 404    → Ensure public/404.html exists and SPA script is in index.html
API calls fail            → Check VITE_API_URL secret has no trailing slash
Backend crashes           → Check Render logs; verify all 5 env variables are set
DB connection fails       → Ensure Railway service is awake; check credentials

---

## Free Tier Limits

GitHub Pages  → 1 GB storage, 100 GB/month bandwidth
Render free   → Backend sleeps after 15 min inactivity (wakes in ~30s)
Railway       → $5 free credit (~500 hours of MySQL)

TIP: Add a free uptime monitor at https://uptimerobot.com
     to ping your backend every 10 minutes — prevents Render cold starts.
