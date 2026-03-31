# Deploying on Render

This repo includes a Render Blueprint file (`render.yaml`) that creates:
- `tracker-api` (FastAPI backend)
- `tracker-frontend` (Vite static frontend)

## 1) Push latest changes to GitHub
Render deploys from GitHub, so make sure your latest commit is pushed.

## 2) Create services from Blueprint
1. Open Render dashboard.
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repo: `Mahesh0249/tracking-`.
4. Render detects `render.yaml` and prepares both services.
5. Click **Apply**.

## 3) Set required environment variables
In Render:
- For `tracker-api` set:
  - `MONGO_URI` = your MongoDB connection string
  - `ANTHROPIC_API_KEY` = optional (only if you want AI plan generation)

`VITE_API_URL` for frontend is auto-linked to backend URL through `render.yaml`.

## 4) Redeploy after changes
Every push to your default branch triggers automatic deploy.

## 5) Verify
- Backend health: open backend URL `/`
- Frontend: open frontend URL and test login/add entry flows
