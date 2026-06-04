import React, { useState, useEffect, useRef } from 'react';
import { 
  Briefcase, 
  CheckSquare, 
  MessageSquare, 
  FileText, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Calendar, 
  Terminal, 
  Sparkles, 
  Database,
  Cpu,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

const AGENT_META = {
  orchestrator: {
    name: 'Orchestrator Node',
    role: 'Central AI router. Analyzes requirements to direct messages or trigger collaborative pipelines.',
    color: '#EAB308',
    pulse: 'var(--color-warning-glow)',
    icon: Cpu
  },
  pm_agent: {
    name: 'PM Agent (LangChain)',
    role: 'Deconstructs project milestones into Kanban tasks and executes automated database writes.',
    color: '#9333EA',
    pulse: 'var(--color-primary-glow)',
    icon: Sparkles
  },
  rag_agent: {
    name: 'Research RAG Agent',
    role: 'Queries syllabus, guidelines, and manuals using a local BM25 text retriever to explain rules.',
    color: '#06B6D4',
    pulse: 'var(--color-secondary-glow)',
    icon: FileText
  },
  debug_agent: {
    name: 'Code Debugger Agent',
    role: 'Technical code reviewer. Resolves bugs, explains errors, and suggests refactoring steps.',
    color: '#F97316',
    pulse: 'var(--color-warning-glow)',
    icon: Terminal
  },
  sqlite: {
    name: 'SQLite Database',
    role: 'Database tracking tasks, milestones, logs, and document fragments.',
    color: '#22C55E',
    pulse: 'var(--color-success-glow)',
    icon: Database
  }
};

export default function App() {
  // Navigation & Workspace State
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('kanban');

  // Co-Pilot Chat Modes
  const [chatMode, setChatMode] = useState('orchestrate'); // orchestrate, pm, rag, debug
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [thinkingLogs, setThinkingLogs] = useState([]);

  // Forms and Modals
  const [showAddTaskForm, setShowAddTaskForm] = useState(null); // lane status or null
  const [taskFormTitle, setTaskFormTitle] = useState('');
  const [taskFormDesc, setTaskFormDesc] = useState('');
  const [taskFormDue, setTaskFormDue] = useState('');
  
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectFormName, setProjectFormName] = useState('');
  const [projectFormDesc, setProjectFormDesc] = useState('');

  // Node Focus & Connections
  const [selectedAgentKey, setSelectedAgentKey] = useState('orchestrator');
  const [agentsState, setAgentsState] = useState({
    orchestrator: { status: 'idle', message: 'Ready' },
    pm_agent: { status: 'idle', message: 'Ready' },
    rag_agent: { status: 'idle', message: 'Ready' },
    debug_agent: { status: 'idle', message: 'Ready' },
    sqlite: { status: 'idle', message: 'Ready' }
  });

  const [activeFlows, setActiveFlows] = useState({
    orchToPm: false,
    orchToRag: false,
    orchToDebug: false,
    pmToSqlite: false
  });

  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);

  const chatEndRef = useRef(null);

  const promptPills = [
    { label: '📋 Outline Tasks', query: 'Suggest 4 milestones and tasks to organize my project database implementation.', mode: 'pm' },
    { label: '🔍 Check Rubrics', query: 'What are the grading criteria or rubrics in my uploaded manual?', mode: 'rag' },
    { label: '💻 Optimize Code', query: 'Review this Python code snippet for syntax bugs:\n```python\nimport sqlite3\nconn = sqlite3.connect("db.sqlite")\ncursor = conn.cursor()\n```', mode: 'debug' }
  ];

  // Initialize
  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (activeProject) {
      fetchTasks(activeProject.id);
      fetchDocuments(activeProject.id);
      fetchChatHistory(activeProject.id);
    }
  }, [activeProject]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, thinkingLogs]);

  // Network Fetch Functions
  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects`);
      const data = await res.json();
      setProjects(data);
      if (data.length > 0 && !activeProject) {
        setActiveProject(data[0]);
      }
    } catch (e) {
      console.error("Error fetching projects", e);
    }
  };

  const fetchTasks = async (projectId) => {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`);
      const data = await res.json();
      setTasks(data);
    } catch (e) {
      console.error("Error fetching tasks", e);
    }
  };

  const fetchDocuments = async (projectId) => {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/documents`);
      const data = await res.json();
      setDocuments(data);
    } catch (e) {
      console.error("Error fetching documents", e);
    }
  };

  const fetchChatHistory = async (projectId) => {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/chats`);
      const data = await res.json();
      setChatHistory(data);
    } catch (e) {
      console.error("Error fetching chats", e);
    }
  };

  // Task & Project Mutators
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (projectFormName.trim() === '') return;
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectFormName, description: projectFormDesc })
      });
      const data = await res.json();
      setProjects([data, ...projects]);
      setActiveProject(data);
      setProjectFormName('');
      setProjectFormDesc('');
      setShowProjectModal(false);
    } catch (e) {
      console.error("Error creating project", e);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (taskFormTitle.trim() === '') return;
    try {
      const res = await fetch(`${API_BASE}/projects/${activeProject.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskFormTitle,
          description: taskFormDesc,
          status: showAddTaskForm,
          due_date: taskFormDue || null
        })
      });
      const data = await res.json();
      setTasks([...tasks, data]);
      setTaskFormTitle('');
      setTaskFormDesc('');
      setTaskFormDue('');
      setShowAddTaskForm(null);
    } catch (e) {
      console.error("Error adding task", e);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await fetch(`${API_BASE}/tasks/${taskId}`, { method: 'DELETE' });
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (e) {
      console.error("Error deleting task", e);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await fetch(`${API_BASE}/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchTasks(activeProject.id);
    } catch (e) {
      console.error("Error updating task status", e);
    }
  };

  // Drag and Drop
  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    setDraggedTaskId(null);
    setDragOverStatus(null);
  };

  const handleDragOver = (e, laneStatus) => {
    e.preventDefault();
    if (dragOverStatus !== laneStatus) {
      setDragOverStatus(laneStatus);
    }
  };

  const handleDrop = async (laneStatus) => {
    if (!draggedTaskId) return;
    
    const taskIndex = tasks.findIndex(t => t.id === draggedTaskId);
    if (taskIndex === -1) return;
    
    const task = tasks[taskIndex];
    if (task.status === laneStatus) return;

    // Optimistic UI update
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = { ...task, status: laneStatus };
    setTasks(updatedTasks);

    try {
      await fetch(`${API_BASE}/tasks/${draggedTaskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: laneStatus })
      });
    } catch (e) {
      console.error("Error updating status on drop", e);
      fetchTasks(activeProject.id);
    }
  };

  // File Indexer
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/projects/${activeProject.id}/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchDocuments(activeProject.id);
        setChatHistory(prev => [...prev, {
          id: Date.now(),
          role: 'assistant',
          content: `Document [${file.name}] successfully indexed for RAG queries!`,
          agent_sender: 'rag_agent'
        }]);
      }
    } catch (e) {
      console.error("Upload error", e);
    }
  };

  // SSE Stream Sender
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (inputText.trim() === '' || loading) return;

    const query = inputText;
    setInputText('');
    setLoading(true);
    setThinkingLogs([]);

    // Reset Agent Network visual state
    setAgentsState({
      orchestrator: { status: 'idle', message: 'Ready' },
      pm_agent: { status: 'idle', message: 'Ready' },
      rag_agent: { status: 'idle', message: 'Ready' },
      debug_agent: { status: 'idle', message: 'Ready' },
      sqlite: { status: 'idle', message: 'Ready' }
    });
    setActiveFlows({
      orchToPm: false,
      orchToRag: false,
      orchToDebug: false,
      pmToSqlite: false
    });

    setChatHistory(prev => [...prev, {
      id: Date.now() + 1,
      role: 'user',
      content: query,
      agent_sender: 'user'
    }]);

    try {
      const response = await fetch(`${API_BASE}/projects/${activeProject.id}/chats/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: query,
          agent_route: chatMode === 'orchestrate' ? null : chatMode.toUpperCase()
        })
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawData = line.substring(6);
            try {
              const data = JSON.parse(rawData);
              processEvent(data);
            } catch (err) {
              console.error("Error parsing streaming package", rawData, err);
            }
          }
        }
      }
    } catch (e) {
      console.error("SSE stream failed", e);
      setLoading(false);
    }
  };

  const processEvent = (data) => {
    const { event, agent, message, route, content, steps, tool_calls, citations } = data;

    if (message) {
      setThinkingLogs(prev => [...prev, `[${agent.toUpperCase()}] ${message}`]);
    }

    setAgentsState(prev => {
      const newState = { ...prev };
      Object.keys(newState).forEach(k => {
        newState[k] = { ...newState[k], status: 'idle' };
      });

      if (event === 'thinking') {
        newState[agent] = { status: 'thinking', message: message };
        setSelectedAgentKey(agent);
      } else if (event === 'route_selected') {
        newState.orchestrator = { status: 'done', message: `Routed directly to ${route}` };
      } else if (event === 'complete') {
        newState[agent || 'orchestrator'] = { status: 'idle', message: 'Ready' };
      }
      return newState;
    });

    setActiveFlows(prev => {
      const newFlows = { ...prev };
      if (event === 'route_selected') {
        newFlows.orchToPm = route === 'PM' || route === 'MULTI';
        newFlows.orchToRag = route === 'RAG' || route === 'MULTI';
        newFlows.orchToDebug = route === 'DEBUG';
      }
      if (agent === 'pm_agent' && message.includes('DB')) {
        newFlows.pmToSqlite = true;
      }
      return newFlows;
    });

    if (event === 'complete') {
      const sender = route ? route.toLowerCase() + '_agent' : 'orchestrator';
      setChatHistory(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: content,
        agent_sender: sender,
        citations: citations,
        step_info: { steps, tool_calls }
      }]);
      
      setActiveFlows({
        orchToPm: false,
        orchToRag: false,
        orchToDebug: false,
        pmToSqlite: false
      });
      setAgentsState({
        orchestrator: { status: 'idle', message: 'Ready' },
        pm_agent: { status: 'idle', message: 'Ready' },
        rag_agent: { status: 'idle', message: 'Ready' },
        debug_agent: { status: 'idle', message: 'Ready' },
        sqlite: { status: 'idle', message: 'Ready' }
      });

      fetchTasks(activeProject.id);
      setLoading(false);
    }
  };

  // Node Clicking sets Chat DM routing
  const handleNodeClick = (nodeKey) => {
    setSelectedAgentKey(nodeKey);
    if (['pm_agent', 'rag_agent', 'debug_agent'].includes(nodeKey)) {
      const mode = nodeKey.replace('_agent', '');
      setChatMode(mode);
    } else if (nodeKey === 'orchestrator') {
      setChatMode('orchestrate');
    }
  };

  const getTasksByStatus = (status) => tasks.filter(t => t.status === status);

  const getCompletionPercentage = () => {
    if (tasks.length === 0) return 0;
    const doneTasks = tasks.filter(t => t.status === 'done').length;
    return Math.round((doneTasks / tasks.length) * 100);
  };

  return (
    <div className="app-container">
      {/* Sidebar: Projects and Simple Help Info */}
      <aside className="sidebar glass">
        <div className="brand">
          <Briefcase className="brand-icon" />
          <span>SmartTracker.AI</span>
        </div>
        
        <h3 className="section-label">Projects</h3>
        <div className="project-list">
          {projects.map(p => (
            <div 
              key={p.id} 
              className={`project-item ${activeProject?.id === p.id ? 'active' : ''}`}
              onClick={() => {
                setActiveProject(p);
                setThinkingLogs([]);
                setChatMode('orchestrate');
              }}
            >
              <ChevronRight size={14} />
              <span style={{ fontSize: '0.85rem' }}>{p.name}</span>
            </div>
          ))}
        </div>

        <button className="new-project-btn" onClick={() => setShowProjectModal(true)}>
          <Plus size={14} />
          <span>Add Project</span>
        </button>

        {/* User-friendly Help Info Box */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 12, marginTop: 'auto', fontSize: '0.74rem',
          color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 6
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--text-main)' }}>
            <HelpCircle size={14} />
            <span>How to use</span>
          </div>
          <p>Click on any agent node in the <strong>Agent Network Graph</strong> tab to directly message that specific AI agent!</p>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-panel">
        <header className="header glass">
          <div className="header-left">
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{activeProject?.name || "Project Dashboard"}</span>
              <Sparkles size={16} style={{ color: 'var(--color-primary)' }} />
            </h1>
            <p>{activeProject?.description || "Select a project to start planning."}</p>
          </div>
          
          <div className="header-right">
            <label className="upload-zone">
              <Plus size={14} />
              <span>Index Guidelines (RAG)</span>
              <input 
                type="file" 
                onChange={handleFileUpload} 
                style={{ display: 'none' }} 
                accept=".txt,.pdf,.md,.doc,.json"
              />
            </label>

            <div className="progress-container">
              <div className="progress-track">
                <div className="progress-bar" style={{ width: `${getCompletionPercentage()}%` }}></div>
              </div>
              <span className="progress-label">{getCompletionPercentage()}% done</span>
            </div>
          </div>
        </header>

        {/* Tab switcher */}
        <nav className="tabs">
          <button className={`tab ${activeTab === 'kanban' ? 'active' : ''}`} onClick={() => setActiveTab('kanban')}>
            <CheckSquare size={15} />
            <span>Kanban Board</span>
          </button>
          
          <button className={`tab ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveTab('timeline')}>
            <TrendingUp size={15} />
            <span>Milestone Gantt</span>
          </button>
          
          <button className={`tab ${activeTab === 'network' ? 'active' : ''}`} onClick={() => setActiveTab('network')}>
            <Cpu size={15} />
            <span>Agent Network Map</span>
          </button>
        </nav>

        {/* Tab panels */}
        <section className="view-content">
          {activeTab === 'kanban' && (
            <div className="kanban-view">
              {['todo', 'in_progress', 'review', 'done'].map(status => {
                const laneTasks = getTasksByStatus(status);
                const isDragOver = dragOverStatus === status;
                
                return (
                  <div 
                    key={status} 
                    className={`lane ${isDragOver ? 'drag-over' : ''}`}
                    onDragOver={(e) => handleDragOver(e, status)}
                    onDrop={() => handleDrop(status)}
                  >
                    <div className="lane-header">
                      <h4 className="lane-title">
                        <span style={{ 
                          width: 8, height: 8, borderRadius: '50%', 
                          background: status === 'todo' ? 'var(--color-warning)' : 
                                      status === 'in_progress' ? 'var(--color-secondary)' : 
                                      status === 'review' ? 'var(--color-primary)' : 'var(--color-success)' 
                        }}></span>
                        <span>{
                          status === 'todo' ? 'To Do' :
                          status === 'in_progress' ? 'In Progress' :
                          status === 'review' ? 'In Review' : 'Completed'
                        }</span>
                      </h4>
                      <span className="lane-badge">{laneTasks.length}</span>
                    </div>

                    <div className="task-list">
                      {laneTasks.map(task => (
                        <div 
                          key={task.id} 
                          className="task-card glass"
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                        >
                          <div className="task-card-header">
                            <span className="task-title">{task.title}</span>
                            <button className="task-action-btn delete" onClick={() => handleDeleteTask(task.id)}>
                              <Trash2 size={11} />
                            </button>
                          </div>
                          {task.description && <p className="task-desc">{task.description}</p>}
                          <div className="task-footer">
                            <span className="task-date">
                              <Calendar size={11} />
                              <span>{task.due_date || "No due date"}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {showAddTaskForm === status ? (
                      <form onSubmit={handleAddTask} className="task-form glass">
                        <input 
                          type="text" 
                          placeholder="Task Title..." 
                          value={taskFormTitle} 
                          onChange={(e) => setTaskFormTitle(e.target.value)} 
                          autoFocus
                          required
                        />
                        <textarea 
                          placeholder="Description..." 
                          value={taskFormDesc} 
                          onChange={(e) => setTaskFormDesc(e.target.value)}
                        />
                        <input 
                          type="date" 
                          value={taskFormDue} 
                          onChange={(e) => setTaskFormDue(e.target.value)} 
                        />
                        <div className="task-form-buttons">
                          <button type="button" className="form-btn cancel" onClick={() => setShowAddTaskForm(null)}>Cancel</button>
                          <button type="submit" className="form-btn save">Save</button>
                        </div>
                      </form>
                    ) : (
                      <button className="add-task-btn" onClick={() => setShowAddTaskForm(status)}>
                        <Plus size={12} />
                        <span>Add Task</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="timeline-view">
              <h2 className="section-label" style={{ marginBottom: 16 }}>Project Roadmap</h2>
              {tasks.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '40px' }}>
                  No tasks defined. Type in the chat helper on the right to start drafting milestones!
                </div>
              ) : (
                <table className="timeline-table">
                  <thead>
                    <tr>
                      <th>Task Milestone</th>
                      <th>Target Status</th>
                      <th>Due Date</th>
                      <th>Progress Tracker</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(task => (
                      <tr key={task.id}>
                        <td style={{ fontWeight: 600 }}>{task.title}</td>
                        <td>
                          {/* Easy status switcher directly on Gantt timeline! */}
                          <select 
                            value={task.status} 
                            onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                            style={{
                              background: 'var(--bg-input)', color: '#fff', border: '1px solid var(--border)',
                              padding: '2px 6px', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer'
                            }}
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="review">In Review</option>
                            <option value="done">Completed</option>
                          </select>
                        </td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={13} className="text-muted" />
                            {task.due_date || "TBD"}
                          </span>
                        </td>
                        <td className="timeline-bar-cell">
                          <div className="timeline-bar-wrapper">
                            <div className={`timeline-bar ${task.status}`}></div>
                          </div>
                        </td>
                        <td>
                          <button 
                            className="task-action-btn delete"
                            onClick={() => handleDeleteTask(task.id)}
                            style={{ padding: 4 }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'network' && (
            <div className="agent-view">
              <div className="agent-canvas">
                <div className="network-grid"></div>
                
                <svg style={{ width: '100%', height: '100%', position: 'absolute', pointerEvents: 'none' }}>
                  <defs>
                    <linearGradient id="grad-pm" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#EAB308" />
                      <stop offset="100%" stopColor="#9333EA" />
                    </linearGradient>
                    <linearGradient id="grad-rag" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#EAB308" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                    <linearGradient id="grad-debug" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#EAB308" />
                      <stop offset="100%" stopColor="#F97316" />
                    </linearGradient>
                    <linearGradient id="grad-sqlite" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#9333EA" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity="0.8" />
                    </linearGradient>
                  </defs>
                  
                  {/* Connectors */}
                  <line 
                    x1="300" y1="60" x2="300" y2="170" 
                    stroke={activeFlows.orchToPm ? "url(#grad-pm)" : "var(--border)"} 
                    strokeWidth={activeFlows.orchToPm ? "3" : "1.5"}
                    strokeDasharray={activeFlows.orchToPm ? "6, 6" : "none"}
                    style={{ animation: activeFlows.orchToPm ? "line-flow 1s linear infinite" : "none" }}
                  />
                  <line 
                    x1="300" y1="60" x2="140" y2="170" 
                    stroke={activeFlows.orchToRag ? "url(#grad-rag)" : "var(--border)"} 
                    strokeWidth={activeFlows.orchToRag ? "3" : "1.5"}
                    strokeDasharray={activeFlows.orchToRag ? "6, 6" : "none"}
                    style={{ animation: activeFlows.orchToRag ? "line-flow 1.2s linear infinite" : "none" }}
                  />
                  <line 
                    x1="300" y1="60" x2="460" y2="170" 
                    stroke={activeFlows.orchToDebug ? "url(#grad-debug)" : "var(--border)"} 
                    strokeWidth={activeFlows.orchToDebug ? "3" : "1.5"}
                    strokeDasharray={activeFlows.orchToDebug ? "6, 6" : "none"}
                    style={{ animation: activeFlows.orchToDebug ? "line-flow 1.2s linear infinite" : "none" }}
                  />
                  <line 
                    x1="300" y1="210" x2="300" y2="280" 
                    stroke={activeFlows.pmToSqlite ? "url(#grad-sqlite)" : "var(--border)"} 
                    strokeWidth={activeFlows.pmToSqlite ? "3" : "1.5"}
                    strokeDasharray={activeFlows.pmToSqlite ? "6, 6" : "none"}
                    style={{ animation: activeFlows.pmToSqlite ? "line-flow 0.8s linear infinite" : "none" }}
                  />
                </svg>

                {/* Nodes */}
                {/* Orchestrator */}
                <div 
                  className={`agent-node ${agentsState.orchestrator.status === 'thinking' ? 'active' : ''} ${chatMode === 'orchestrate' ? 'pulse' : ''}`} 
                  style={{ top: '60px', left: '300px', '--pulse-color': 'var(--color-warning-glow)' }}
                  onClick={() => handleNodeClick('orchestrator')}
                >
                  <div className="agent-avatar glow-primary">
                    <Cpu size={22} />
                  </div>
                  <span className="agent-name">Orchestrator</span>
                  <span className="agent-status-msg">{agentsState.orchestrator.message}</span>
                </div>

                {/* RAG */}
                <div 
                  className={`agent-node ${agentsState.rag_agent.status === 'thinking' ? 'active' : ''} ${chatMode === 'rag' ? 'pulse' : ''}`} 
                  style={{ top: '180px', left: '140px', '--pulse-color': 'var(--color-secondary-glow)' }}
                  onClick={() => handleNodeClick('rag_agent')}
                >
                  <div className="agent-avatar">
                    <FileText size={22} />
                  </div>
                  <span className="agent-name">Research (RAG)</span>
                  <span className="agent-status-msg">{agentsState.rag_agent.message}</span>
                </div>

                {/* PM */}
                <div 
                  className={`agent-node ${agentsState.pm_agent.status === 'thinking' ? 'active' : ''} ${chatMode === 'pm' ? 'pulse' : ''}`} 
                  style={{ top: '180px', left: '300px', '--pulse-color': 'var(--color-primary-glow)' }}
                  onClick={() => handleNodeClick('pm_agent')}
                >
                  <div className="agent-avatar">
                    <Sparkles size={22} />
                  </div>
                  <span className="agent-name">PM Agent</span>
                  <span className="agent-status-msg">{agentsState.pm_agent.message}</span>
                </div>

                {/* Debugger */}
                <div 
                  className={`agent-node ${agentsState.debug_agent.status === 'thinking' ? 'active' : ''} ${chatMode === 'debug' ? 'pulse' : ''}`} 
                  style={{ top: '180px', left: '460px', '--pulse-color': 'var(--color-warning-glow)' }}
                  onClick={() => handleNodeClick('debug_agent')}
                >
                  <div className="agent-avatar">
                    <Terminal size={22} />
                  </div>
                  <span className="agent-name">Tech Debugger</span>
                  <span className="agent-status-msg">{agentsState.debug_agent.message}</span>
                </div>

                {/* SQLite DB */}
                <div 
                  className="agent-node" 
                  style={{ top: '290px', left: '300px' }}
                  onClick={() => handleNodeClick('sqlite')}
                >
                  <div className="agent-avatar glow-primary" style={{ borderColor: 'var(--color-success)' }}>
                    <Database size={22} style={{ color: 'var(--color-success)' }} />
                  </div>
                  <span className="agent-name" style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)' }}>SQLite DB</span>
                </div>
              </div>

              {/* Agent info details */}
              <div className="agent-info-card glass">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {React.createElement(AGENT_META[selectedAgentKey].icon, { 
                    size: 18, 
                    style: { color: AGENT_META[selectedAgentKey].color } 
                  })}
                  <h3 style={{ fontSize: '0.9rem' }}>{AGENT_META[selectedAgentKey].name}</h3>
                </div>
                
                <p className="agent-desc" style={{ fontSize: '0.78rem' }}>{AGENT_META[selectedAgentKey].role}</p>

                <div className="agent-meta-grid">
                  <div className="meta-box">
                    <div className="meta-label">Type</div>
                    <div className="meta-value" style={{ fontSize: '0.78rem' }}>{selectedAgentKey === 'sqlite' ? 'Storage' : 'Agent Node'}</div>
                  </div>
                  <div className="meta-box">
                    <div className="meta-label">Routing Status</div>
                    <div className="meta-value" style={{ 
                      fontSize: '0.78rem',
                      color: selectedAgentKey.includes(chatMode) || (chatMode === 'orchestrate' && selectedAgentKey === 'orchestrator')
                        ? 'var(--color-primary)' 
                        : 'var(--text-muted)'
                    }}>
                      {selectedAgentKey.includes(chatMode) || (chatMode === 'orchestrate' && selectedAgentKey === 'orchestrator')
                        ? 'Directly Routed' 
                        : 'Idle'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Right Column: Chat Panel */}
      <section className="chat-panel">
        <header className="chat-header">
          <div className="chat-header-status"></div>
          <span className="chat-header-title">Multi-Agent Co-Pilot</span>
        </header>

        {/* Direct messaging banner */}
        {chatMode !== 'orchestrate' && (
          <div style={{
            background: 'rgba(147, 51, 234, 0.12)',
            borderBottom: '1px solid rgba(147, 51, 234, 0.25)',
            padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: '0.76rem'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)', fontWeight: 500 }}>
              <Sparkles size={13} />
              <span>Direct DM: <strong>{AGENT_META[chatMode + '_agent']?.name}</strong></span>
            </span>
            <button 
              onClick={() => setChatMode('orchestrate')}
              style={{
                background: 'transparent', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', fontSize: '0.74rem', textDecoration: 'underline'
              }}
            >Reset to Auto</button>
          </div>
        )}

        <div className="chat-messages">
          {chatHistory.map((msg, index) => {
            const senderKey = msg.agent_sender || (msg.role === 'user' ? 'user' : 'orchestrator');
            const meta = AGENT_META[senderKey] || { name: 'Assistant', color: 'var(--color-primary)' };
            
            return (
              <div key={index} className={`message-bubble ${msg.role} ${senderKey.replace('_', '-')}`}>
                <div className="msg-avatar">
                  {msg.role === 'user' ? <MessageSquare size={14} /> : <Cpu size={14} />}
                </div>
                
                <div className="msg-body">
                  <span className="msg-sender" style={{ color: meta.color }}>
                    {msg.role === 'user' ? 'You' : meta.name}
                  </span>
                  
                  <div className="msg-content">
                    {msg.content}
                    
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="msg-citations">
                        {msg.citations.map((cite, cIdx) => (
                          <span key={cIdx} className="citation-tag">
                            Ref: {cite}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {thinkingLogs.map((log, idx) => (
                <div key={idx} className="thinking-log glow-primary">
                  <div className="spinner"></div>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* User-friendly quick actions pills */}
        <div style={{ 
          display: 'flex', gap: 6, padding: '8px 12px', overflowX: 'auto', 
          borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)'
        }}>
          {promptPills.map((pill, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInputText(pill.query);
                setChatMode(pill.mode);
              }}
              style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '5px 12px', fontSize: '0.72rem', color: 'var(--text-muted)',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'var(--transition)',
                outline: 'none'
              }}
              onMouseEnter={(e) => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-muted)'; }}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Chat input box */}
        <form onSubmit={handleSendChat} className="chat-input-area">
          <input 
            type="text" 
            className="chat-input"
            placeholder={
              chatMode === 'orchestrate' 
                ? "Ask AI Co-Pilot / type prompt..." 
                : `Direct message to ${chatMode.toUpperCase()} Agent...`
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
          />
          <button 
            type="submit" 
            className="chat-send-btn glow-primary" 
            disabled={loading || inputText.trim() === ''}
          >
            <ArrowRight size={16} />
          </button>
        </form>
      </section>

      {/* Project Workspace Modal */}
      {showProjectModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <form onSubmit={handleCreateProject} className="glass" style={{
            padding: 24, width: '90%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 14
          }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>Add Project Workspace</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Project Name</label>
              <input 
                type="text" 
                value={projectFormName} 
                onChange={(e) => setProjectFormName(e.target.value)} 
                placeholder="e.g. Capstone App" 
                style={{
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: 8, color: '#fff', outline: 'none', fontSize: '0.85rem'
                }}
                required 
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Description</label>
              <textarea 
                value={projectFormDesc} 
                onChange={(e) => setProjectFormDesc(e.target.value)} 
                placeholder="Brief summary..." 
                style={{
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: 8, color: '#fff', minHeight: 70,
                  outline: 'none', resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: '0.85rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button 
                type="button" 
                onClick={() => setShowProjectModal(false)}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--text-muted)',
                  cursor: 'pointer', fontSize: '0.8rem'
                }}
              >Cancel</button>
              <button 
                type="submit"
                style={{
                  background: 'var(--color-primary)', border: 'none', color: '#fff',
                  padding: '6px 16px', borderRadius: 8, cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.8rem'
                }}
              >Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
