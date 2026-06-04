import os
from typing import Dict, Any, List
from .. import config
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from ..rag.vector_store import retriever

class RAGAgent:
    def __init__(self):
        self.llm = ChatGroq(
            api_key=config.GROQ_API_KEY,
            model="llama-3.3-70b-versatile",
            temperature=0.2
        )

    def run(self, project_id: int, user_query: str, search_query: str = None) -> Dict[str, Any]:
        # Perform retrieval
        query_for_search = search_query if search_query else user_query
        retrieved_chunks = retriever.retrieve(project_id, query_for_search, top_k=4)
        
        # Build context string
        context_str = ""
        citations = []
        for idx, chunk in enumerate(retrieved_chunks):
            context_str += f"\n--- Source {idx+1}: {chunk['file_name']} (Relevance: {chunk['score']}) ---\n"
            context_str += chunk['content'] + "\n"
            if chunk['file_name'] not in citations:
                citations.append(chunk['file_name'])
                
        system_prompt = f"""You are an expert Research AI Agent. Your role is to help students by answering questions using the retrieved reference documents (like guidelines, rubrics, syllabus, papers).
        
Use the retrieved context sections below to answer the student's query. If the context does not contain the answer, tell them honestly that you couldn't find the exact detail in the uploaded documents, but provide general guidance based on your knowledge.

Always cite the source document name in your answer. For example, [guidelines.txt] or [syllabus.pdf].

RETIRED CONTEXT FROM UPLOADED DOCUMENTS:
{context_str if context_str else "No documents uploaded yet for this project."}
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_query)
        ]
        
        response = self.llm.invoke(messages)
        
        return {
            "agent": "rag_agent",
            "content": response.content,
            "citations": citations,
            "retrieved_count": len(retrieved_chunks)
        }

rag_agent = RAGAgent()
