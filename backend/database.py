import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "project_tracker.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Projects table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Tasks table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL CHECK(status IN ('todo', 'in_progress', 'review', 'done')),
        position INTEGER DEFAULT 0,
        due_date TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
    """)
    
    # Documents table (RAG source material)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        content TEXT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
    """)
    
    # Chat History table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        agent_sender TEXT,
        step_info TEXT, -- JSON string detailing agent thoughts/tool calls
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
    """)
    
    conn.commit()
    
    # Insert default project if none exists
    cursor.execute("SELECT COUNT(*) FROM projects")
    if cursor.fetchone()[0] == 0:
        cursor.execute(
            "INSERT INTO projects (name, description) VALUES (?, ?)",
            ("My Academic Capstone", "Default workspace for organizing academic coursework and project milestones.")
        )
        conn.commit()
        
        # Add a couple of initial sample tasks
        cursor.execute("INSERT INTO tasks (project_id, title, description, status, position, due_date) VALUES (?, ?, ?, ?, ?, ?)",
                       (1, "Define Project Scope", "Brainstorm project ideas and create a scope definition document.", "done", 0, "2026-06-10"))
        cursor.execute("INSERT INTO tasks (project_id, title, description, status, position, due_date) VALUES (?, ?, ?, ?, ?, ?)",
                       (1, "Draft System Architecture", "Design UI mockups and database schemas for the project tracker.", "in_progress", 0, "2026-06-18"))
        cursor.execute("INSERT INTO tasks (project_id, title, description, status, position, due_date) VALUES (?, ?, ?, ?, ?, ?)",
                       (1, "Set up Development Environment", "Configure FastAPI backend and build a skeleton front-end.", "todo", 0, "2026-06-25"))
        conn.commit()
        
    conn.close()

# Project Helpers
def get_projects():
    conn = get_db_connection()
    projects = conn.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(p) for p in projects]

def create_project(name, description=""):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO projects (name, description) VALUES (?, ?)", (name, description))
    project_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return project_id

# Task Helpers
def get_tasks(project_id):
    conn = get_db_connection()
    tasks = conn.execute("SELECT * FROM tasks WHERE project_id = ? ORDER BY status, position", (project_id,)).fetchall()
    conn.close()
    return [dict(t) for t in tasks]

def create_task(project_id, title, description="", status="todo", due_date=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get max position in this lane
    pos_row = conn.execute("SELECT MAX(position) FROM tasks WHERE project_id = ? AND status = ?", (project_id, status)).fetchone()
    position = (pos_row[0] or 0) + 1
    
    cursor.execute(
        "INSERT INTO tasks (project_id, title, description, status, position, due_date) VALUES (?, ?, ?, ?, ?, ?)",
        (project_id, title, description, status, position, due_date)
    )
    task_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return task_id

def update_task_status(task_id, new_status, new_position=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if new_position is not None:
        cursor.execute("UPDATE tasks SET status = ?, position = ? WHERE id = ?", (new_status, new_position, task_id))
    else:
        cursor.execute("UPDATE tasks SET status = ? WHERE id = ?", (new_status, task_id))
    conn.commit()
    conn.close()

def update_task_details(task_id, title, description, due_date):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE tasks SET title = ?, description = ?, due_date = ? WHERE id = ?", (title, description, due_date, task_id))
    conn.commit()
    conn.close()

def delete_task(task_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()

# Document / RAG Helpers
def add_document(project_id, file_name, content):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO documents (project_id, file_name, content) VALUES (?, ?, ?)",
        (project_id, file_name, content)
    )
    doc_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return doc_id

def get_documents(project_id):
    conn = get_db_connection()
    docs = conn.execute("SELECT id, project_id, file_name, uploaded_at FROM documents WHERE project_id = ?", (project_id,)).fetchall()
    conn.close()
    return [dict(d) for d in docs]

def get_document_contents(project_id):
    conn = get_db_connection()
    docs = conn.execute("SELECT id, file_name, content FROM documents WHERE project_id = ?", (project_id,)).fetchall()
    conn.close()
    return [dict(d) for d in docs]

# Chat Helpers
def get_chat_history(project_id, limit=50):
    conn = get_db_connection()
    chats = conn.execute(
        "SELECT * FROM chat_logs WHERE project_id = ? ORDER BY timestamp ASC LIMIT ?",
        (project_id, limit)
    ).fetchall()
    conn.close()
    return [dict(c) for c in chats]

def add_chat_log(project_id, role, content, agent_sender=None, step_info=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    step_info_str = json.dumps(step_info) if step_info else None
    cursor.execute(
        "INSERT INTO chat_logs (project_id, role, content, agent_sender, step_info) VALUES (?, ?, ?, ?, ?)",
        (project_id, role, content, agent_sender, step_info_str)
    )
    log_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return log_id
