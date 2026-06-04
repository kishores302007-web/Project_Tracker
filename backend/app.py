import os
import json
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List

from .database import (
    init_db, get_projects, create_project, get_tasks,
    create_task, update_task_status, update_task_details, delete_task,
    add_document, get_documents, get_chat_history, add_chat_log
)
from .agents.orchestrator import orchestrator

# Initialize database
init_db()

app = FastAPI(title="Smart Project Tracker Multi-Agent Backend")

# Enable CORS for frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    status: Optional[str] = "todo"
    due_date: Optional[str] = None

class TaskStatusUpdate(BaseModel):
    status: str
    position: Optional[int] = None

class TaskDetailsUpdate(BaseModel):
    title: str
    description: Optional[str] = ""
    due_date: Optional[str] = None

class ChatUserMessage(BaseModel):
    content: str
    agent_route: Optional[str] = None

# API Routes
@app.get("/")
def read_root():
    return {"status": "online", "message": "Smart Project Tracker API is active"}

# Projects
@app.get("/api/projects")
def list_projects():
    try:
        return get_projects()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/projects")
def add_project(project: ProjectCreate):
    try:
        pid = create_project(project.name, project.description)
        return {"id": pid, "name": project.name, "description": project.description}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Tasks
@app.get("/api/projects/{project_id}/tasks")
def list_tasks(project_id: int):
    try:
        return get_tasks(project_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/projects/{project_id}/tasks")
def add_task(project_id: int, task: TaskCreate):
    try:
        tid = create_task(project_id, task.title, task.description, task.status, task.due_date)
        return {
            "id": tid,
            "project_id": project_id,
            "title": task.title,
            "description": task.description,
            "status": task.status,
            "due_date": task.due_date
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/tasks/{task_id}/status")
def move_task(task_id: int, payload: TaskStatusUpdate):
    try:
        update_task_status(task_id, payload.status, payload.position)
        return {"id": task_id, "status": payload.status, "position": payload.position}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/tasks/{task_id}/details")
def edit_task(task_id: int, payload: TaskDetailsUpdate):
    try:
        update_task_details(task_id, payload.title, payload.description, payload.due_date)
        return {"id": task_id, "title": payload.title, "description": payload.description, "due_date": payload.due_date}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/tasks/{task_id}")
def remove_task(task_id: int):
    try:
        delete_task(task_id)
        return {"status": "success", "id": task_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Document Upload (RAG indexing)
@app.post("/api/projects/{project_id}/upload")
async def upload_document(project_id: int, file: UploadFile = File(...)):
    try:
        contents = await file.read()
        try:
            text_content = contents.decode("utf-8")
        except UnicodeDecodeError:
            # Fallback for other encodings
            text_content = contents.decode("latin-1")
            
        doc_id = add_document(project_id, file.filename, text_content)
        return {"status": "success", "id": doc_id, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/projects/{project_id}/documents")
def list_documents(project_id: int):
    try:
        return get_documents(project_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Chats
@app.get("/api/projects/{project_id}/chats")
def list_chats(project_id: int):
    try:
        return get_chat_history(project_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/projects/{project_id}/chats/stream")
def send_chat_message_stream(project_id: int, msg: ChatUserMessage):
    # Log user message to database
    add_chat_log(project_id=project_id, role="user", content=msg.content, agent_sender="user")
    
    # Retrieve past chat history for context
    history = get_chat_history(project_id, limit=20)
    
    # Format history as simple dict list for agents
    history_dicts = [{"role": h["role"], "content": h["content"]} for h in history]
    
    # Server-Sent Events stream generator
    def sse_generator():
        for event_data in orchestrator.orchestrate(project_id, msg.content, history_dicts, msg.agent_route):
            yield f"data: {event_data}\n\n"
            
    return StreamingResponse(sse_generator(), media_type="text/event-stream")
