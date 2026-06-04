# Smart Project Tracker Multi-Agent

A modern academic project tracker with FastAPI backend, React/Vite frontend, SQLite persistence, and multi-agent AI orchestration.

## Overview

This project combines:
- FastAPI backend with REST APIs for projects, tasks, document indexing, and chat history
- React + Vite frontend for Kanban boards, timelines, document upload, and AI chat
- SQLite database for local persistence and seeded demo data
- A RAG-enabled document upload workflow for knowledge retrieval
- AI agent orchestration for project planning and support messages

## Repository Structure

- `backend/`
  - `app.py` - FastAPI application and API routes
  - `database.py` - SQLite helpers, schema creation, and seed data
  - `agents/` - AI orchestration and helper agents
  - `config.py` - environment variable loader
  - `requirements.txt` - Python dependencies
  - `seed_dummy.py` - script to insert demo projects, tasks, documents, and chat logs
- `frontend/`
  - `src/` - React application source files
  - `package.json` - frontend dependency and script manifest
  - `README.md` - frontend-specific usage notes
- `run_project.bat` - Windows launcher for backend and frontend
- `package.json` - root script helper for frontend development
- `README.md` - this project documentation
- `docs/` - deeper setup and architecture notes

## Prerequisites

- Node.js and npm
- Python 3.14+
- Git

## Setup

1. Install backend dependencies:

```bash
pip install -r backend/requirements.txt
```

2. Install frontend dependencies from the root:

```bash
npm run install:frontend
```

3. Create local backend environment config:

```bash
copy backend\.env.example backend\.env
```

4. Add your real Groq API key to `backend/.env`:

```text
GROQ_API_KEY=your-groq-api-key-here
```

5. Seed demo data (optional):

```bash
python backend/seed_dummy.py
```

## Running the Project

### Option 1: Use the Windows launcher

Run `run_project.bat` to start both backend and frontend.

### Option 2: Manual start

Start the backend:

```bash
python -m uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000
```

Start the frontend from the project root:

```bash
npm run dev
```

Open the frontend at `http://localhost:5173`.

## API Endpoints

- `GET /api/projects` - list projects
- `POST /api/projects` - create project
- `GET /api/projects/{project_id}/tasks` - list tasks
- `POST /api/projects/{project_id}/tasks` - create task
- `PUT /api/tasks/{task_id}/status` - update task status
- `PUT /api/tasks/{task_id}/details` - edit task details
- `DELETE /api/tasks/{task_id}` - delete a task
- `POST /api/projects/{project_id}/upload` - upload and index a document
- `GET /api/projects/{project_id}/documents` - list indexed documents
- `GET /api/projects/{project_id}/chats` - fetch chat history
- `POST /api/projects/{project_id}/chats/stream` - send chat message with SSE stream

## Notes

- `backend/.env` is ignored by git for security.
- `backend/.env.example` is provided for local setup.
- `seed_dummy.py` inserts a demo project, sample tasks, a document, and chat logs.

## Documentation

Further documentation is available in the `docs/` folder:
- `docs/setup.md`
- `docs/architecture.md`
- `docs/api.md`
