from database import create_project, create_task, add_document, add_chat_log, get_projects

def seed():
    # Create demo project
    pid = create_project("Demo Course Project", "A demo project pre-filled with sample tasks, docs and chat logs.")

    # Add tasks
    create_task(pid, "Set up CI/CD pipeline", "Create GitHub Actions workflow and basic tests.", "todo", "2026-07-01")
    create_task(pid, "Implement Authentication", "Add user auth and session handling.", "in_progress", "2026-07-05")
    create_task(pid, "Write Documentation", "Add README and developer guide.", "review", "2026-07-10")
    create_task(pid, "Final Testing", "Run E2E tests and fix regressions.", "todo", "2026-07-20")

    # Add a sample document
    doc_content = """
This is a sample syllabus and guidelines file for the Demo Course Project.

Topics:
- Module 1: Requirements and Design
- Module 2: Implementation
- Module 3: Evaluation and Reporting

Use this document to test the RAG indexing and retrieval pipeline.
"""
    add_document(pid, "demo_syllabus.txt", doc_content)

    # Add some chat logs
    add_chat_log(pid, "assistant", "Welcome! How can I help with your Demo Project?", agent_sender="orchestrator")
    add_chat_log(pid, "user", "Please create tasks for the upcoming milestones.", agent_sender="user")

    print(f"Seeded demo project with id={pid}")

if __name__ == '__main__':
    seed()
