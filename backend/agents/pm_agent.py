import os
import json
from typing import Dict, Any, List
from .. import config
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from ..database import get_tasks, create_task, update_task_status

class ProjectManagerAgent:
    def __init__(self):
        self.llm = ChatGroq(
            api_key=config.GROQ_API_KEY,
            model="llama-3.3-70b-versatile",
            temperature=0.2
        )
        
    def _get_system_prompt(self, project_id: int) -> str:
        current_tasks = get_tasks(project_id)
        tasks_str = json.dumps(current_tasks, indent=2)
        
        return f"""You are a professional Project Manager (PM) AI Agent for students. Your job is to help them organize their project scope, timelines, and milestones.

You have access to the following tools via JSON formatting. If you want to use a tool, output a JSON block in your response.

TOOLS AVAILABLE:
1. Add Task:
   JSON: {{"action": "create_task", "title": "Task title", "description": "Task description", "status": "todo", "due_date": "YYYY-MM-DD"}}
   
2. Move Task status (todo, in_progress, review, done):
   JSON: {{"action": "update_task_status", "task_id": 12, "status": "in_progress"}}

CURRENT KANBAN BOARD STATE (Project ID: {project_id}):
{tasks_str}

RULES:
- When a student asks to add a task, suggest it and output the JSON block to execute the DB call. You can run multiple create_task calls in a single response if they want to import a milestone schedule.
- When they say they finished or started a task, use the update_task_status tool.
- Always explain what you did and why it helps their overall project timeline.
- Output the tool execution JSON blocks inside code blocks. For example:
```json
{{"action": "create_task", "title": "Setup Server", "description": "Initialize backend", "status": "todo", "due_date": "2026-06-12"}}
```
"""

    def run(self, project_id: int, user_query: str, history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        messages = [SystemMessage(content=self._get_system_prompt(project_id))]
        
        # Append chat history
        if history:
            for h in history[-6:]: # Keep last 6 messages for context window
                if h["role"] == "user":
                    messages.append(HumanMessage(content=h["content"]))
                else:
                    messages.append(HumanMessage(content=h["content"])) # Standard formatting
                    
        messages.append(HumanMessage(content=user_query))
        
        response = self.llm.invoke(messages)
        content = response.content
        
        # Extract and run tools
        executed_tools = []
        tool_json_blocks = re.findall(r'```json\s*(.*?)\s*```', content, re.DOTALL)
        
        clean_content = content
        
        for block in tool_json_blocks:
            try:
                tool_call = json.loads(block)
                action = tool_call.get("action")
                
                if action == "create_task":
                    title = tool_call.get("title")
                    desc = tool_call.get("description", "")
                    status = tool_call.get("status", "todo")
                    due = tool_call.get("due_date")
                    
                    task_id = create_task(project_id, title, desc, status, due)
                    executed_tools.append({
                        "tool": "create_task",
                        "params": {"title": title, "status": status},
                        "result": f"Task '{title}' created successfully with ID {task_id}."
                    })
                    
                elif action == "update_task_status":
                    tid = int(tool_call.get("task_id"))
                    status = tool_call.get("status")
                    
                    update_task_status(tid, status)
                    executed_tools.append({
                        "tool": "update_task_status",
                        "params": {"task_id": tid, "status": status},
                        "result": f"Task {tid} status changed to '{status}'."
                    })
            except Exception as e:
                executed_tools.append({
                    "tool": "error",
                    "error": str(e)
                })
                
        # Clean JSON blocks from the visible response to make it cleaner for display if desired,
        # or leave them for user tracking. We will clean them and present a clean report.
        clean_content = re.sub(r'```json\s*(.*?)\s*```', '', clean_content, flags=re.DOTALL).strip()
        if not clean_content:
            clean_content = "Tasks updated on the board."
            
        return {
            "agent": "pm_agent",
            "content": clean_content,
            "tool_calls": executed_tools
        }

import re
pm_agent = ProjectManagerAgent()
