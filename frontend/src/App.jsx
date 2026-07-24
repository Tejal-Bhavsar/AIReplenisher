import React, { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:8001';

// Detailed SVG Icon assets for a premium feel
const Icons = {
  robot: (
    <svg className="logo-icon-svg" width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2V5M12 5C8.13401 5 5 8.13401 5 12C5 13.9033 5.76214 15.629 7 16.9002V20C7 21.1046 7.89543 22 9 22H15C16.1046 22 17 21.1046 17 20V16.9002C18.2379 15.629 19 13.9033 19 12C19 8.13401 15.866 5 12 5Z" stroke="url(#logo-grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 12H9.01M15 12H15.01" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 16C10.5 16.5 11.2 16.8 12 16.8C12.8 16.8 13.5 16.5 14 16" stroke="url(#logo-grad)" strokeWidth="2" strokeLinecap="round"/>
      <defs>
        <linearGradient id="logo-grad" x1="5" y1="5" x2="19" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  ),
  chat: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  ),
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9"></rect>
      <rect x="14" y="3" width="7" height="5"></rect>
      <rect x="14" y="12" width="7" height="9"></rect>
      <rect x="3" y="16" width="7" height="5"></rect>
    </svg>
  ),
  database: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path>
    </svg>
  ),
  user: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  ),
  send: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  ),
  reset: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
    </svg>
  ),
  trendUp: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
      <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
  ),
  scenario: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
  ),
  checkmark: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  )
};

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [rightTab, setRightTab] = useState('flow');
  const [userEmail, setUserEmail] = useState('dave.miller@fieldtech.com');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am your AI Material Replenisher. Tell me what parts you need and the work order ID, and I will search inventory and handle the requisitions for you.',
      step: 1
    }
  ]);
  const [currentStep, setCurrentStep] = useState(1);
  const [executionLogs, setExecutionLogs] = useState([
    'Replenisher Worker initialized. Awaiting technician query...'
  ]);
  const [apiCalls, setApiCalls] = useState([]);
  const [sessionState, setSessionState] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const [inventory, setInventory] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [parts, setParts] = useState([]);
  const [stats, setStats] = useState({
    total_requisitions: 0,
    success_rate: 100,
    exception_count: 0,
    pending_count: 0,
    low_stock_alerts: 0,
    estimated_hours_saved: 0,
    product_families: {}
  });

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [selectedSourceSite, setSelectedSourceSite] = useState('');

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    try {
      const invRes = await fetch(`${API_BASE}/api/inventory`);
      const invData = await invRes.json();
      setInventory(invData);

      const reqRes = await fetch(`${API_BASE}/api/requisitions`);
      const reqData = await reqRes.json();
      setRequisitions(reqData);

      const statsRes = await fetch(`${API_BASE}/api/dashboard-stats`);
      const statsData = await statsRes.json();
      setStats(statsData);

      const partsRes = await fetch(`${API_BASE}/api/parts`);
      const partsData = await partsRes.json();
      setParts(partsData);
    } catch (err) {
      console.error("Error loading backend data:", err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleUserChange = (e) => {
    setUserEmail(e.target.value);
    setMessages([
      {
        sender: 'bot',
        text: `Switched session to profile: **${e.target.value}**. Requisition warehouse routing set. How can I assist you today?`,
        step: 1
      }
    ]);
    setSessionState({});
    setCurrentStep(1);
    setExecutionLogs([`Session configured for user: ${e.target.value}`]);
    setApiCalls([]);
  };

  const handleSend = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim() || isProcessing) return;

    if (!textToSend) setInputText('');

    setMessages(prev => [...prev, { sender: 'user', text }]);
    setIsProcessing(true);
    setCurrentStep(1);
    setExecutionLogs(['Initializing Replenisher core state...', 'Resolving technician profile...']);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          user_email: userEmail,
          current_step: currentStep,
          session_state: sessionState
        })
      });

      const data = await response.json();

      let stepTimer = 1;
      const targetStep = data.step || 6;
      
      const interval = setInterval(() => {
        if (stepTimer < targetStep) {
          stepTimer += 1;
          setCurrentStep(stepTimer);
          
          const progressLogs = data.execution_logs.slice(0, Math.ceil((data.execution_logs.length / targetStep) * stepTimer));
          setExecutionLogs(progressLogs);

          const progressAPIs = data.simulated_api_calls.slice(0, Math.ceil((data.simulated_api_calls.length / targetStep) * stepTimer));
          setApiCalls(progressAPIs);
        } else {
          clearInterval(interval);
          setCurrentStep(targetStep);
          setExecutionLogs(data.execution_logs);
          setApiCalls(data.simulated_api_calls);
          setSessionState(data.session_state || {});
          
          setMessages(prev => [...prev, { 
            sender: 'bot', 
            text: data.response,
            step: data.step,
            pending_order: data.session_state?.pending_order || null,
            active_candidates: data.session_state?.active_candidates || null
          }]);
          setIsProcessing(false);
          loadData();
        }
      }, 400);

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { sender: 'bot', text: 'Error communicating with AI digital worker. Please verify the Python backend is running.' }]);
      setIsProcessing(false);
    }
  };

  const handleScenarioSelect = (scenario) => {
    if (isProcessing) return;
    setUserEmail('dave.miller@fieldtech.com');
    setInputText(scenario.query);
    setSessionState({});
  };

  const handleConfirmOrder = async (isConfirmed) => {
    const confirmationText = isConfirmed ? 'Yes, please reserve.' : 'No, cancel order.';
    handleSend(confirmationText);
  };

  const handleCandidateSelect = async (candidate) => {
    handleSend(candidate.description);
  };

  const handleApproveReq = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/requisitions/${id}/approve`, {
        method: 'PUT'
      });
      if (!res.ok) {
        const error = await res.json();
        alert(error.detail || "Approval failed");
      } else {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenResolveModal = (req) => {
    setSelectedReq(req);
    const itemInventory = inventory.filter(inv => inv.part_number === req.part_number && inv.qty_on_hand > 0);
    if (itemInventory.length > 0) {
      setSelectedSourceSite(itemInventory[0].site_id);
    } else {
      setSelectedSourceSite('');
    }
    setShowResolveModal(true);
  };

  const handleResolveReqSubmit = async () => {
    if (!selectedSourceSite) {
      alert("Please select a source warehouse to transfer from.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/requisitions/${selectedReq.id}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_site_id: selectedSourceSite })
      });
      if (!res.ok) {
        const error = await res.json();
        alert(error.detail || "Resolve failed");
      } else {
        setShowResolveModal(false);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetDb = async () => {
    if (!confirm("Are you sure you want to reset the database? This restores stock and removes old records.")) return;
    try {
      await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
      setMessages([
        {
          sender: 'bot',
          text: 'Database reset completed. Mock tables populated with seed data. What parts do you need?',
          step: 1
        }
      ]);
      setSessionState({});
      setCurrentStep(1);
      setExecutionLogs(['Database reset completed. Replenisher Worker online.']);
      setApiCalls([]);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const scenarios = [
    {
      id: 'lookup',
      title: '1. Instant Part Lookup',
      desc: 'Retrieves stock level and creates a direct approved MMR from inventory.',
      query: 'I need 2 drive belts for work order WO-1024'
    },
    {
      id: 'clarify',
      title: '2. Intelligent Clarification',
      desc: 'Demonstrates ambiguity handling when multiple candidate parts match description.',
      query: 'Need a drive belt for unit AHU-500'
    },
    {
      id: 'history',
      title: '3. Historical Intelligence',
      desc: 'Leverages historical records to suggest parts previously used on an AHU unit.',
      query: 'Show me what parts were previously used on functional unit AHU-500-EAST'
    },
    {
      id: 'out_of_stock',
      title: '4. Planner Exception Routing',
      desc: 'Fires an exception when parts are unavailable locally, routing to planner.',
      query: 'Request 1 Solenoid Valve for WO-9943'
    }
  ];

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="logo-section">
          {Icons.robot}
          <div>
            <h1 className="logo-text">Smart Replenisher</h1>
          </div>
          <span className="logo-badge">AGENT WORKER</span>
        </div>

        <div className="header-controls">
          <div className="role-selector">
            {Icons.user}
            <label>Technician Profile:</label>
            <select className="role-select" value={userEmail} onChange={handleUserChange}>
              <option value="dave.miller@fieldtech.com">Dave Miller (SITE-EAST)</option>
              <option value="sarah.jenkins@fieldtech.com">Sarah Jenkins (SITE-NORTH)</option>
            </select>
          </div>

          <div className="api-status">
            <div className="status-dot"></div>
            <span>Agent Active</span>
          </div>

          <button className="reset-btn" onClick={handleResetDb}>
            {Icons.reset}
            Reset Database
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="tabs-bar">
        <button 
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          {Icons.chat}
          Technician Agent Console
        </button>
        <button 
          className={`tab-btn ${activeTab === 'planner' ? 'active' : ''}`}
          onClick={() => setActiveTab('planner')}
        >
          {Icons.dashboard}
          Planner Exception Control
        </button>
        <button 
          className={`tab-btn ${activeTab === 'explorer' ? 'active' : ''}`}
          onClick={() => setActiveTab('explorer')}
        >
          {Icons.database}
          Database Registry
        </button>
      </nav>

      {/* Main Grid */}
      {activeTab === 'chat' && (
        <div className="dashboard-grid">
          
          {/* Left Sidebar */}
          <aside className="sidebar-left">
            <h3 className="panel-title">
              {Icons.scenario}
              Scenarios Select
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Select a predefined technician scenario to pre-populate the input bar.
            </p>
            <div className="scenarios-list" style={{ marginBottom: '1.5rem' }}>
              {scenarios.map(sc => (
                <div 
                  key={sc.id} 
                  className={`scenario-card ${inputText === sc.query ? 'active' : ''}`}
                  onClick={() => handleScenarioSelect(sc)}
                >
                  <h4>{sc.title}</h4>
                  <p>{sc.desc}</p>
                </div>
              ))}
            </div>

            <h3 className="panel-title">
              {Icons.database}
              My Requisitions
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '0.75rem' }}>
              Requisition requests submitted by this technician account.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '0.2rem' }}>
              {requisitions
                .filter(r => {
                  const techEmailMap = {
                    'dave.miller@fieldtech.com': 'TECH-001',
                    'sarah.jenkins@fieldtech.com': 'TECH-002'
                  };
                  return r.created_by === techEmailMap[userEmail];
                })
                .map(r => (
                  <div key={r.id} style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    fontSize: '0.8rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>MMR-{r.id}</span>
                      <span className={`status-badge ${r.status.toLowerCase()}`} style={{ fontSize: '0.6rem', padding: '0.15rem 0.4rem', border: 'none' }}>
                        {r.status}
                      </span>
                    </div>
                    <div style={{ color: '#fff', fontWeight: '600' }}>
                      {r.description} <span style={{ color: 'var(--text-secondary)' }}>(x{r.qty_requested})</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
                      WO: {r.work_order_id} | Site: {r.site_id}
                    </div>
                  </div>
                ))
              }
              {requisitions.filter(r => {
                const techEmailMap = {
                  'dave.miller@fieldtech.com': 'TECH-001',
                  'sarah.jenkins@fieldtech.com': 'TECH-002'
                };
                return r.created_by === techEmailMap[userEmail];
              }).length === 0 && (
                <div style={{
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  padding: '1.5rem 1rem',
                  border: '1px dashed var(--border-color)',
                  borderRadius: '10px'
                }}>
                  No requisitions created yet.
                </div>
              )}
            </div>
          </aside>

          {/* Center Chat View */}
          <main className="chat-panel">
            <div className="chat-history">
              {messages.map((m, idx) => (
                <div key={idx} className={`message-bubble ${m.sender}`}>
                  <div className={`avatar ${m.sender === 'user' ? 'user-av' : 'bot-av'}`}>
                    {m.sender === 'user' ? Icons.user : Icons.robot}
                  </div>
                  <div className="message-content">
                    <p style={{ whiteSpace: 'pre-wrap' }}>{m.text}</p>
                    
                    {/* Render candidate part selectors */}
                    {m.active_candidates && (
                      <div className="actions-row" style={{ flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                        {m.active_candidates.map((c, cIdx) => (
                          <button 
                            key={cIdx} 
                            className="btn-cancel" 
                            style={{ borderColor: 'var(--accent-blue)', color: '#fff', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            onClick={() => handleCandidateSelect(c)}
                          >
                            <span>➔</span> {c.description} ({c.part_number})
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Render order confirmation card */}
                    {m.pending_order && (
                      <div className="requisition-card">
                        <div className="req-field">
                          <span className="req-label">Part Selected</span>
                          <span className="req-value">{m.pending_order.part_number}</span>
                        </div>
                        <div className="req-field">
                          <span className="req-label">Specification</span>
                          <span className="req-value">{m.pending_order.description}</span>
                        </div>
                        <div className="req-field">
                          <span className="req-label">Quantity</span>
                          <span className="req-value">{m.pending_order.quantity} units</span>
                        </div>
                        <div className="req-field">
                          <span className="req-label">Target Site</span>
                          <span className="req-value">{m.pending_order.site_id}</span>
                        </div>
                        <div className="req-field">
                          <span className="req-label">Assigned Work Order</span>
                          <span className="req-value">{m.pending_order.work_order_id}</span>
                        </div>
                        <div className="actions-row">
                          <button className="btn-confirm" onClick={() => handleConfirmOrder(true)}>
                            {Icons.checkmark}
                            Yes, Confirm Order
                          </button>
                          <button className="btn-cancel" onClick={() => handleConfirmOrder(false)}>
                            Cancel Requisition
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="message-bubble assistant">
                  <div className="avatar bot-av">{Icons.robot}</div>
                  <div className="message-content" style={{ color: 'var(--accent-cyan)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="status-dot" style={{ margin: 0 }}></div>
                    AI Replenisher is executing agentic steps...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-input-bar">
              <input 
                type="text" 
                className="chat-input"
                placeholder="Check stock or request parts (e.g. 'I need 2 drive belts for WO-1024')..."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                disabled={isProcessing}
              />
              <button 
                className="chat-send-btn"
                onClick={() => handleSend()}
                disabled={isProcessing}
              >
                {Icons.send}
                Execute Request
              </button>
            </div>
          </main>

          {/* Right Pipeline Stepper / Logs Panel */}
          <aside className="sidebar-right">
            <div className="tab-selector-small">
              <button 
                className={`tab-btn-sm ${rightTab === 'flow' ? 'active' : ''}`}
                onClick={() => setRightTab('flow')}
              >
                Pipeline Monitor
              </button>
              <button 
                className={`tab-btn-sm ${rightTab === 'logs' ? 'active' : ''}`}
                onClick={() => setRightTab('logs')}
              >
                Terminal Trace
              </button>
              <button 
                className={`tab-btn-sm ${rightTab === 'api' ? 'active' : ''}`}
                onClick={() => setRightTab('api')}
              >
                API Payloads
              </button>
            </div>

            <div className="right-panel-content">
              {rightTab === 'flow' && (
                <div className="plan-flow">
                  <div className={`flow-step ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}>
                    <div className="flow-node">{currentStep > 1 ? Icons.checkmark : '01'}</div>
                    <div className="flow-info">
                      <h5>User Identification</h5>
                      <p>Resolves technician profile and default site mappings from SQL.</p>
                    </div>
                  </div>

                  <div className={`flow-step ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}>
                    <div className="flow-node">{currentStep > 2 ? Icons.checkmark : '02'}</div>
                    <div className="flow-info">
                      <h5>Gemini Intent Parsing</h5>
                      <p>Extracts entity tags (part description, target unit, quantities) from query.</p>
                    </div>
                  </div>

                  <div className={`flow-step ${currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : ''}`}>
                    <div className="flow-node">{currentStep > 3 ? Icons.checkmark : '03'}</div>
                    <div className="flow-info">
                      <h5>Intelligent Catalog Lookup</h5>
                      <p>Searches matching items by code description, unit, or repair history.</p>
                    </div>
                  </div>

                  <div className={`flow-step ${currentStep === 4 ? 'active' : currentStep > 4 ? 'completed' : ''}`}>
                    <div className="flow-node">{currentStep > 4 ? Icons.checkmark : '04'}</div>
                    <div className="flow-info">
                      <h5>Ambiguity Check</h5>
                      <p>Resolves specification candidate details or asks target questions.</p>
                    </div>
                  </div>

                  <div className={`flow-step ${currentStep === 5 ? 'active' : currentStep > 5 ? 'completed' : ''}`}>
                    <div className="flow-node">{currentStep > 5 ? Icons.checkmark : '05'}</div>
                    <div className="flow-info">
                      <h5>Inventory Check</h5>
                      <p>Queries bin counts in technician default warehouses.</p>
                    </div>
                  </div>

                  <div className={`flow-step ${currentStep === 6 ? 'active' : currentStep > 6 ? 'completed' : ''}`}>
                    <div className="flow-node">{currentStep > 6 ? Icons.checkmark : '06'}</div>
                    <div className="flow-info">
                      <h5>MMR Creation</h5>
                      <p>Creates database material records and updates stocks.</p>
                    </div>
                  </div>
                </div>
              )}

              {rightTab === 'logs' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    <span>std_trace_logs.log</span>
                    <span>115kb</span>
                  </div>
                  <div className="exec-logs">
                    {executionLogs.map((log, lIdx) => {
                      let logType = '';
                      if (log.includes('ERROR:')) logType = 'error';
                      else if (log.includes('WARNING:')) logType = 'warning';
                      else if (log.includes('SUCCESS:')) logType = 'success';
                      return (
                        <div key={lIdx} className={`exec-log-line ${logType}`}>
                          {log}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {rightTab === 'api' && (
                <div className="debug-list">
                  {apiCalls.length === 0 ? (
                    <div style={{ padding: '3rem 1rem', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Console clean. Run a scenario to track JSON payloads in real-time.
                      </p>
                    </div>
                  ) : (
                    apiCalls.map((call, cIdx) => (
                      <div key={cIdx} className="debug-card">
                        <div className="debug-header">
                          <span className={`method-tag ${call.method}`}>{call.method}</span>
                          <span>{call.timestamp}</span>
                        </div>
                        <div className="debug-content">
                          <div className="debug-path"><strong>Request Endpoint:</strong> {call.path}</div>
                          {call.request && (
                            <div style={{ marginBottom: '0.6rem' }}>
                              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Payload Body (JSON):</p>
                              <pre className="debug-json">{JSON.stringify(call.request, null, 2)}</pre>
                            </div>
                          )}
                          <div>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Response (JSON):</p>
                            <pre className="debug-json">{JSON.stringify(call.response, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </aside>

        </div>
      )}

      {activeTab === 'planner' && (
        <div className="single-view">
          <div className="planner-container">
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>Planner Requisition Hub</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Review active requisitions, verify auto-approved cycles, and resolve stockout exceptions generated by technician natural language prompts.
              </p>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-header">Total Requisitions</span>
                <span className="stat-value">{stats.total_requisitions}</span>
                <span className="stat-desc">Conversational requisitions</span>
              </div>
              <div className="stat-card">
                <span className="stat-header">Auto-Fulfillment Rate</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="stat-value" style={{ color: stats.success_rate > 80 ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
                    {stats.success_rate}%
                  </span>
                  {stats.success_rate >= 80 && Icons.trendUp}
                </div>
                <span className="stat-desc">Approved instantly without delays</span>
              </div>
              <div className="stat-card" style={{ borderLeft: '3px solid var(--accent-red)' }}>
                <span className="stat-header">Pending Stock Exceptions</span>
                <span className="stat-value" style={{ color: stats.exception_count > 0 ? 'var(--accent-red)' : '#fff' }}>
                  {stats.exception_count}
                </span>
                <span className="stat-desc">Requires manual transfer approval</span>
              </div>
              <div className="stat-card">
                <span className="stat-header">Field Hours Saved</span>
                <span className="stat-value" style={{ color: 'var(--accent-cyan)' }}>{stats.estimated_hours_saved} hrs</span>
                <span className="stat-desc">Avg. 18m saved per order</span>
              </div>
            </div>

            {/* Requisitions Table */}
            <div className="table-card">
              <div className="table-header-row">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="status-dot"></span>
                  Active Requisitions Database
                </h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>MMR ID</th>
                      <th>Work Order</th>
                      <th>Part ID</th>
                      <th>Part Description</th>
                      <th>Qty</th>
                      <th>Technician Warehouse</th>
                      <th>Requested By</th>
                      <th>Status Badge</th>
                      <th style={{ textAlign: 'right' }}>Management Options</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requisitions.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3.5rem 2rem' }}>
                          No MMR requests logged in the database yet.
                        </td>
                      </tr>
                    ) : (
                      requisitions.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--accent-blue)' }}>MMR-{r.id}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{r.work_order_id}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{r.part_number}</td>
                          <td><strong>{r.description}</strong></td>
                          <td>{r.qty_requested}</td>
                          <td>{r.site_id}</td>
                          <td>{r.creator_name} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({r.created_by})</span></td>
                          <td>
                            <span className={`status-badge ${r.status.toLowerCase()}`}>
                              {r.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {r.status === 'Pending' && (
                              <button className="action-btn-sm" onClick={() => handleApproveReq(r.id)}>
                                Approve & Deduct
                              </button>
                            )}
                            {r.status === 'Exception' && (
                              <button className="action-btn-sm resolve" onClick={() => handleOpenResolveModal(r)}>
                                Resolve Stockout
                              </button>
                            )}
                            {r.status === 'Approved' && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: '600' }}>✓ Handed to Tech</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {activeTab === 'explorer' && (
        <div className="single-view">
          <div className="planner-container">
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>SQL Database Registry</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Query the persistent SQLite schema directly. View current quantities on hand, reserved slots, and equipment compatibility mappings.
              </p>
            </div>

            {/* Inventory Table */}
            <div className="table-card">
              <div className="table-header-row">
                <h3>Stock Bin Allocations (`inventory` table)</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Part Number</th>
                      <th>Description</th>
                      <th>Site ID</th>
                      <th>Bin Location (Aisle-Shelf)</th>
                      <th>Qty On Hand</th>
                      <th>Qty Reserved</th>
                      <th>Net Qty Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((inv) => (
                      <tr key={inv.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{inv.part_number}</td>
                        <td><strong>{inv.description}</strong></td>
                        <td>{inv.site_id}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{inv.warehouse_location}</td>
                        <td style={{ fontWeight: 'bold' }}>{inv.qty_on_hand}</td>
                        <td>{inv.qty_reserved}</td>
                        <td style={{ fontWeight: 'bold', color: (inv.qty_on_hand - inv.qty_reserved) > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {inv.qty_on_hand - inv.qty_reserved}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Parts Table */}
            <div className="table-card">
              <div className="table-header-row">
                <h3>Catalog Registry (`parts` table)</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Part Registry ID</th>
                      <th>Description Name</th>
                      <th>Unit Class compatibility</th>
                      <th>Product family category</th>
                      <th>Compatible hardware models</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map((p) => (
                      <tr key={p.part_number}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{p.part_number}</td>
                        <td><strong>{p.description}</strong></td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{p.unit_type}</td>
                        <td>{p.product_family}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {p.compatible_units ? JSON.parse(p.compatible_units).join(', ') : 'All'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Exception Resolution Modal */}
      {showResolveModal && selectedReq && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⚠️</span> Exception Transfer: MMR-{selectedReq.id}
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Technician **{selectedReq.creator_name}** needs **{selectedReq.qty_requested}x {selectedReq.description}** at **{selectedReq.site_id}** but stock is **0**.
              Select an alternative warehouse with stock to execute a transfer and fulfill the requisition.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                Select Source Warehouse Site:
              </label>
              
              <select 
                style={{
                  background: '#04060b',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  color: 'white',
                  padding: '0.75rem',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
                value={selectedSourceSite}
                onChange={e => setSelectedSourceSite(e.target.value)}
              >
                {inventory
                  .filter(inv => inv.part_number === selectedReq.part_number && inv.site_id !== selectedReq.site_id)
                  .map(inv => (
                    <option key={inv.site_id} value={inv.site_id}>
                      {inv.site_id} ({inv.qty_on_hand} units in stock)
                    </option>
                  ))
                }
                {inventory.filter(inv => inv.part_number === selectedReq.part_number && inv.site_id !== selectedReq.site_id).length === 0 && (
                  <option value="">No other sites have stock available</option>
                )}
              </select>
            </div>

            <div className="actions-row" style={{ justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn-cancel" onClick={() => setShowResolveModal(false)}>
                Cancel
              </button>
              <button 
                className="btn-confirm" 
                style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))' }}
                onClick={handleResolveReqSubmit}
                disabled={!selectedSourceSite}
              >
                {Icons.checkmark}
                Approve Transfer & Issue MMR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
