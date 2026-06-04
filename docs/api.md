# API Reference

## Projects

### `GET /api/projects`

Returns a list of all projects.

### `POST /api/projects`

Creates a new project.

Request body:

```json
{
  "name": "Project Name",
  "description": "Project description"
}
```

## Tasks

### `GET /api/projects/{project_id}/tasks`

Returns tasks for a specific project.

### `POST /api/projects/{project_id}/tasks`

Creates a task under a project.

Request body:

```json
{
  "title": "Task title",
  "description": "Task details",
  "status": "todo",
  "due_date": "2026-07-01"
}
```

### `PUT /api/tasks/{task_id}/status`

Updates task status and optional position.

Request body:

```json
{
  "status": "in_progress",
  "position": 2
}
```

### `PUT /api/tasks/{task_id}/details`

Updates title, description, or due date.

Request body:

```json
{
  "title": "Updated title",
  "description": "Updated description",
  "due_date": "2026-07-12"
}
```

### `DELETE /api/tasks/{task_id}`

Deletes a task by ID.

## Document Upload / RAG

### `POST /api/projects/{project_id}/upload`

Uploads a file for indexing and RAG retrieval.

Form field:

- `file`: uploaded document file

### `GET /api/projects/{project_id}/documents`

Lists uploaded documents for a project.

## Chat

### `GET /api/projects/{project_id}/chats`

Returns chat history for a project.

### `POST /api/projects/{project_id}/chats/stream`

Sends a user message and returns SSE streaming results.

Request body:

```json
{
  "content": "Your question or request",
  "agent_route": "pm"  // or "rag", "debug", null
}
```

## Notes

- The backend will persist chat logs and instrument agent routing for auditability.
- The SSE endpoint delivers events containing assistant messages and routing metadata.
