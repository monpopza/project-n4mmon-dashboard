# n4mmon-dashboard — Deployment Guide

This guide covers deploying the n4mmon-dashboard SPA to GitHub Pages via GitHub Actions.

---

## 1. Prerequisites

Before the first deploy, complete these one-time setup steps in the GitHub repository:

1. **Enable GitHub Pages** in the repository settings.
   - Go to: `Settings → Pages → Source`
   - Set source to **GitHub Actions** (not a branch).

2. **Create the `github-pages` environment**.
   - Go to: `Settings → Environments → New environment`
   - Name it exactly: `github-pages`
   - No protection rules are required for personal repositories.

3. **Add all required secrets** (see Section 2 below).
   - Go to: `Settings → Secrets and variables → Actions → New repository secret`

---

## 2. Required GitHub Actions Secrets

Add each of the following secrets to the repository before triggering a deploy.
All values map directly to the environment variables documented in `.env.example`.

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `VITE_FIREBASE_API_KEY` | Firebase project API key (monpopza-3ed44) | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | `monpopza-3ed44.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | `monpopza-3ed44` |
| `VITE_SHORTLINK_API_URL` | Production base URL of shortlink-web backend | `https://api.nammon.men` |
| `VITE_SHORTLINK_ADMIN_TOKEN` | Bearer token for shortlink /api/stats and /api/notifications | `your-admin-token` |
| `VITE_POLYMARKET_API_URL` | Production base URL of polymarket-web backend | `https://polymarket.nammon.men` |
| `VITE_TRADE_API_URL` | Production base URL of trade-company HTTP server | `https://trade.nammon.men` |
| `VITE_ANDROID_BOT_API_URL` | Production base URL of android-bot FastAPI | `https://androidbot.nammon.men` |
| `VITE_ANDROID_BOT_API_KEY` | X-API-Key for android-bot /api/devices | `your-api-key` |

**Security note:** Never commit `.env` to version control. The `.env` file is gitignored.
`VITE_ANDROID_BOT_API_KEY` is embedded in the built JS bundle — this is acceptable for a personal-use tool deployed under Firebase Auth, but rotate the key if the repository is ever made public.

---

## 3. How to Trigger a Deploy

### Automatic deploy (on push)

Any push to the `main` branch that touches files under
`company-workspace/project-workspace/project-n4mmon-dashboard/**`
will automatically trigger the `Deploy n4mmon-dashboard to GitHub Pages` workflow.

### Manual deploy (workflow_dispatch)

To deploy without a code change:

1. Go to: `Actions → Deploy n4mmon-dashboard to GitHub Pages`
2. Click **Run workflow**
3. Select branch `main`
4. Click **Run workflow**

This is useful after updating secrets or when you need to force a redeploy of an existing build.

---

## 4. Local Dev vs Production URL Difference

The `vite.config.ts` sets the Vite `base` option conditionally:

```typescript
base: process.env.NODE_ENV === "production" ? "/project-n4mmon-dashboard/" : "/",
```

| Environment | Base path | URL |
|-------------|-----------|-----|
| Local dev (`bun run dev`) | `/` | `http://localhost:5174/` |
| Production (GitHub Pages) | `/project-n4mmon-dashboard/` | `https://<username>.github.io/project-n4mmon-dashboard/` |

**Why this matters:** All Vite-built asset paths (`/src/main.ts`, `/assets/...`) are prefixed with the base.
If `base` is wrong, the deployed site loads a blank page because the browser cannot find the JS/CSS bundles.
The dev server is unaffected because it always uses `/`.

**Vue Router note:** If Vue Router is configured with `createWebHistory()`, pass the base to it as well:

```typescript
// src/router/index.ts
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});
```

`import.meta.env.BASE_URL` is automatically set by Vite to match the `base` config value at build time.

---

## 5. Post-Deploy Checklist

After the first successful deploy, complete these steps to make the production dashboard fully functional:

### 5a. Verify the deployed URL

The live URL will be:
```
https://<github-username>.github.io/project-n4mmon-dashboard/
```

Confirm the URL in the GitHub Actions run log under the `Deploy to GitHub Pages` step output (`page_url`).

### 5b. Update CORS on all 4 backend services

The dashboard makes browser-originated API requests to each backend service.
Each service requires the production GitHub Pages URL in its CORS allowlist so requests are not blocked.

Set the `DASHBOARD_URL` environment variable to the live GitHub Pages URL in each service's `.env` file:

| Service | .env file location | Variable to set |
|---------|-------------------|-----------------|
| shortlink-web | `project-shortlink-web/backend/.env` | `DASHBOARD_URL=https://<username>.github.io/project-n4mmon-dashboard` |
| android-bot | `project-remote-android-bot/.env` | `DASHBOARD_URL=https://<username>.github.io/project-n4mmon-dashboard` |
| polymarket-web | `project-polymarket-web/.env` | `DASHBOARD_URL=https://<username>.github.io/project-n4mmon-dashboard` |
| trade-company | `project-trade-company/.env` | `DASHBOARD_URL=https://<username>.github.io/project-n4mmon-dashboard` |

After setting the variable, restart each backend service so the new origin is picked up.
Without this step, all API panel requests from the production dashboard will fail with `Access-Control-Allow-Origin` errors.

### 5c. Verify Firebase Auth authorized domains

Firebase Auth blocks sign-in from origins not in its allowlist.

1. Go to: Firebase Console → Authentication → Settings → Authorized domains
2. Add: `<github-username>.github.io`

Without this step, the Google Sign-in redirect will fail on the production domain.

### 5d. Smoke test each panel

After completing steps 5b and 5c, verify each panel loads data correctly:

- [ ] Login page renders and Google Sign-in completes
- [ ] Shortlink Stats Panel shows total links and clicks (no CORS error in DevTools)
- [ ] System Health Panel shows green status for at least one service
- [ ] Android Bot Panel shows device count (or "offline" gracefully if service is down)
- [ ] Polymarket Portfolio Panel shows balance and P&L
- [ ] Trade Simulation Panel shows equity and cash balance

---

*deployment-guide.md — project-n4mmon-dashboard. Created by DevOps Engineer 2026-05-16 (T1002).*
