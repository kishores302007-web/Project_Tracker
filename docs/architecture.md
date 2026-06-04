# Architecture Overview

## High-Level Design

This project is a multi-agent academic project tracker with a split frontend/backend architecture:

- **Frontend:** React application built with Vite.
- **Backend:** FastAPI service exposing REST endpoints.
- **Database:** SQLite file-backed store under `backend/project_tracker.db`.
- **AI agents:** Orchestration logic in `backend/agents/` and streaming chat support.
- **RAG support:** Document upload and indexing for retrieval-enhanced responses.

## Backend Components

### `backend/app.py`

Defines the FastAPI app and API routes for:
- project and task management
- document upload and listing
- chat history and SSE streaming

### `backend/database.py`

Handles SQLite persistence and schema creation:
- `projects`
- `tasks`
- `documents`
- `chat_logs`

The module also seeds a default project and sample tasks when the database is initialized.

### `backend/config.py`

Loads local environment variables from `backend/.env` and exposes:
- `GROQ_API_KEY`

### `backend/seed_dummy.py`

Adds sample data for quick local testing:
- demo project
- tasks across multiple statuses
- a sample document
- chat history entries

## Frontend Components

### `frontend/src/App.jsx`

Main application file containing:
- project selection sidebar
- kanban board with task drag/drop
- timeline table for milestone tracking
- agent network UI for AI chat routing
- SSE consumption for streaming AI responses

### `frontend/package.json`

Manages dependencies and scripts:
- `dev` for local development with Vite
- `build` for production build
- `lint` for ESLint checks
- `preview` for local preview

## Data Flow

1. User interacts with the React frontend.
2. Frontend fetches/sends data to the FastAPI backend.
3. Backend persists tasks, documents, and chat logs in SQLite.
4. Documents uploaded through the UI are stored and listed for RAG queries.
5. Chat messages are sent to the orchestration layer which produces streamed assistant responses.

## Deployment Notes

This repository is optimized for local development. For production deployment, consider:
- migrating SQLite to a managed relational database
- securing backend secrets with environment variables or a vault
- adding authentication and authorization
- containerizing with Docker
