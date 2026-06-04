# Setup Guide

## Prerequisites

- Node.js and npm installed
- Python 3.14 or newer installed
- Git for cloning and version control

## Install Dependencies

### Backend

From the project root:

```bash
pip install -r backend/requirements.txt
```

### Frontend

From the project root:

```bash
npm run install:frontend
```

## Local Environment Configuration

Create a local environment file for backend secrets:

```bash
copy backend\.env.example backend\.env
```

Then edit `backend/.env` and set:

```text
GROQ_API_KEY=your-groq-api-key-here
```

## Seed Demo Content

To populate the database with initial sample projects, tasks, documents, and chat logs:

```bash
python backend/seed_dummy.py
```

## Running the Application

### Option 1: Windows launcher

Run `run_project.bat` from the repository root.

### Option 2: Manual startup

Backend:

```bash
python -m uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```bash
npm run dev
```

Access the UI at:

```text
http://localhost:5173
```

## Deploying Frontend to Vercel

This repository separates frontend and backend. The frontend is a static Vite app and can be deployed to Vercel. The backend (FastAPI) should be deployed separately (e.g., Render, Fly, Railway) and its base URL exposed to the frontend via an environment variable.

1. Set the Vercel environment variable `VITE_API_BASE` to your backend API base URL (for example `https://api.example.com/api`).

2. Vercel will run the build command using `vercel.json`. The root includes a `vercel-build` script which runs the frontend build.

3. After deployment, the frontend will call the backend using the `VITE_API_BASE` value.

Notes:
- Do not commit `backend/.env` — use `backend/.env.example` instead.
- SQLite is file-backed and not suitable for serverless persistent storage; host the backend on a platform with persistent storage or use a managed DB when deploying the backend.

## Notes

- The backend listens on port `8000`.
- The frontend is served at port `5173`.
- `backend/.env` should never be committed.
- If you need a clean database, delete `backend/project_tracker.db` and restart the backend.
