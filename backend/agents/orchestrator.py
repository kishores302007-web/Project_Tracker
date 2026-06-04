import os
import json
from typing import Dict, Any, List, Generator
from .. import config
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

from .pm_agent import pm_agent
from .rag_agent import rag_agent
from .debug_agent import debug_agent
from ..database import add_chat_log

class AgentOrchestrator:
    def __init__(self):
        self.router_llm = ChatGroq(
            api_key=config.GROQ_API_KEY,
            model="llama-3.1-8b-instant",  # Fast classifier
            temperature=0.0
        )
        
    def _classify_query(self, query: str) -> str:
        prompt = f"""Classify the user's project request into one of four routing keys:
- 'PM': For project planning, milestone scheduling, task board creation, or task updates.
- 'RAG': For inquiries about project guidelines, syllabus documents, rubric files, grading criteria, or general files uploaded by the user.
- 'DEBUG': For programming issues, compiler bugs, writing code, or code reviews.
- 'MULTI': For compound requests requiring project planning based on file criteria (e.g. "Suggest tasks based on the project guidelines").

Output ONLY the routing key ('PM', 'RAG', 'DEBUG', or 'MULTI'). Do not include explanation.

User query: "{query}"
Routing Key:"""

        messages = [
            SystemMessage(content="You are a routing classification system for a student project tracker AI assistant."),
            HumanMessage(content=prompt)
        ]
        
        response = self.router_llm.invoke(messages)
        route = response.content.strip().upper()
        
        # Validation fallback
        for possible in ["MULTI", "DEBUG", "RAG", "PM"]:
            if possible in route:
                return possible
        return "PM"  # default to PM

    def orchestrate(self, project_id: int, user_query: str, history: List[Dict[str, str]] = None, forced_route: str = None) -> Generator[str, None, None]:
        # 1. Classification
        if forced_route and forced_route.upper() in ["PM", "RAG", "DEBUG", "MULTI"]:
            route = forced_route.upper()
            yield json.dumps({
                "event": "route_selected",
                "agent": "orchestrator",
                "route": route,
                "message": f"Direct connection active. Routed query directly to {route} Agent."
            })
        else:
            yield json.dumps({
                "event": "thinking",
                "agent": "orchestrator",
                "message": "Classifying student query..."
            })
            
            route = self._classify_query(user_query)
            
            yield json.dumps({
                "event": "route_selected",
                "agent": "orchestrator",
                "route": route,
                "message": f"Routed query to {route} system."
            })
        
        steps = []
        final_answer = ""
        tool_calls = []
        citations = []
        
        if route == "RAG":
            yield json.dumps({
                "event": "thinking",
                "agent": "rag_agent",
                "message": "Searching project files and manuals..."
            })
            res = rag_agent.run(project_id, user_query)
            final_answer = res["content"]
            citations = res.get("citations", [])
            steps.append({
                "agent": "rag_agent",
                "message": f"Retrieved context from {res.get('retrieved_count', 0)} chunks.",
                "details": f"Sources referenced: {', '.join(citations) if citations else 'None'}"
            })
            
        elif route == "DEBUG":
            yield json.dumps({
                "event": "thinking",
                "agent": "debug_agent",
                "message": "Analyzing code syntax and compiler issues..."
            })
            res = debug_agent.run(user_query)
            final_answer = res["content"]
            steps.append({
                "agent": "debug_agent",
                "message": "Analyzed code structure and formulated debugging steps."
            })
            
        elif route == "PM":
            yield json.dumps({
                "event": "thinking",
                "agent": "pm_agent",
                "message": "Reviewing board tasks and drafting schedule..."
            })
            res = pm_agent.run(project_id, user_query, history)
            final_answer = res["content"]
            tool_calls = res.get("tool_calls", [])
            steps.append({
                "agent": "pm_agent",
                "message": f"Organized roadmap. Executed {len(tool_calls)} DB actions."
            })
            
        elif route == "MULTI":
            # Multi-agent flow!
            # Step 1: Run RAG search to fetch relevant criteria
            yield json.dumps({
                "event": "thinking",
                "agent": "rag_agent",
                "message": "First, extracting relevant guidelines from uploaded manuals..."
            })
            rag_res = rag_agent.run(project_id, user_query)
            context = rag_res["content"]
            citations = rag_res.get("citations", [])
            
            steps.append({
                "agent": "rag_agent",
                "message": "Retrieved requirements from documents.",
                "details": f"Sources: {', '.join(citations)}"
            })
            
            # Step 2: Feed guidelines context into PM Agent
            yield json.dumps({
                "event": "thinking",
                "agent": "pm_agent",
                "message": "Now, mapping guidelines to Kanban tasks and project timelines..."
            })
            
            enhanced_query = f"""User query: {user_query}
            
Guidelines context from reference documents:
{context}

Please structure appropriate tasks based on this document context!"""
            
            pm_res = pm_agent.run(project_id, enhanced_query, history)
            final_answer = pm_res["content"]
            tool_calls = pm_res.get("tool_calls", [])
            
            steps.append({
                "agent": "pm_agent",
                "message": f"Created milestones based on retrieved rules. Run {len(tool_calls)} actions."
            })
            
        # Log to database
        # Collect step logs
        step_log = {
            "route": route,
            "steps": steps,
            "tool_calls": tool_calls,
            "citations": citations
        }
        
        # Save chat transcript
        add_chat_log(
            project_id=project_id,
            role="assistant",
            content=final_answer,
            agent_sender=route.lower() + "_agent",
            step_info=step_log
        )
        
        yield json.dumps({
            "event": "complete",
            "content": final_answer,
            "route": route,
            "steps": steps,
            "tool_calls": tool_calls,
            "citations": citations
        })

orchestrator = AgentOrchestrator()
