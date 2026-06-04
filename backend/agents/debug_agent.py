import os
from typing import Dict, Any, List
from .. import config
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

class DebugAgent:
    def __init__(self):
        self.llm = ChatGroq(
            api_key=config.GROQ_API_KEY,
            model="llama-3.3-70b-versatile",
            temperature=0.1
        )

    def run(self, user_query: str) -> Dict[str, Any]:
        system_prompt = """You are a senior Software Engineer and Technical Tech Lead AI Agent.
Your role is to help students write, debug, and optimize their code (Python, JavaScript, SQL, HTML/CSS, C++, Java, etc.).

Analyze their query. If it contains a code snippet or error stack trace:
1. Explain the root cause of the error clearly and simply.
2. Provide the corrected/optimized version of the code inside a markdown code block.
3. Suggest a brief test case or verification method to make sure the code works.

If their query is general (e.g. asking how to write a function), provide clean code blocks with descriptive comments. Keep explanations concise, clear, and highly educational.
"""
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_query)
        ]
        
        response = self.llm.invoke(messages)
        
        return {
            "agent": "debug_agent",
            "content": response.content
        }

debug_agent = DebugAgent()
