import React, { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:8001';

function App() {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'planner' | 'explorer'
  const [rightTab, setRightTab] = useState('flow'); // 'flow' | 'logs' | 'api'
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

  // Db tables data
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

  // Planner Modals
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [selectedSourceSite, setSelectedSourceSite] = useState('');

  const chatEndRef = useRef(null);

  // Scroll chat to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load data from backend on mount and tab switch
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
    const interval = setInterval(loadData, 5000); // Poll updates every 5s
    return () => clearInterval(interval);
  }, [activeTab]);

  // Triggered when user selects a user dropdown option
  const handleUserChange = (e) => {
    setUserEmail(e.target.value);
    setMessages([
      {
        sender: 'bot',
        text: `Switched user profile to **${e.target.value}**. Requisition warehouse connection configured. What parts do you need?`,
        step: 1
      }
    ]);
    setSessionState({});
    setCurrentStep(1);
    setExecutionLogs([`Session restarted for user ${e.target.value}`]);
    setApiCalls([]);
  };

  // Main chat submit handler
  const handleSend = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim() || isProcessing) return;

    if (!textToSend) setInputText('');

    // Append user message
    setMessages(prev => [...prev, { sender: 'user', text }]);
    setIsProcessing(true);
    setCurrentStep(1);
    setExecutionLogs(['Connecting to server...', 'Validating user authentication...']);

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

      // Animate execution timeline steps for high-fidelity digital worker simulation
      let stepTimer = 1;
      const targetStep = data.step || 6;
      
      const interval = setInterval(() => {
        if (stepTimer < targetStep) {
          stepTimer += 1;
          setCurrentStep(stepTimer);
          
          // Slice execution logs and API calls to simulate real-time progress
          const progressLogs = data.execution_logs.slice(0, Math.ceil((data.execution_logs.length / targetStep) * stepTimer));
          setExecutionLogs(progressLogs);

          const progressAPIs = data.simulated_api_calls.slice(0, Math.ceil((data.simulated_api_calls.length / targetStep) * stepTimer));
          setApiCalls(progressAPIs);
        } else {
          clearInterval(interval);
          // Set final values
          setCurrentStep(targetStep);
          setExecutionLogs(data.execution_logs);
          setApiCalls(data.simulated_api_calls);
          setSessionState(data.session_state || {});
          
          // Append Bot Response
          setMessages(prev => [...prev, { 
            sender: 'bot', 
            text: data.response,
            step: data.step,
            pending_order: data.session_state?.pending_order || null,
            active_candidates: data.session_state?.active_candidates || null
          }]);
          setIsProcessing(false);
          loadData(); // reload stats
        }
      }, 500);

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { sender: 'bot', text: 'Error connecting to the Replenisher Agent backend. Make sure the backend server is running.' }]);
      setIsProcessing(false);
    }
  };

  const handleScenarioSelect = (scenario) => {
    if (isProcessing) return;
    
    // Auto configure user email depending on scenario for realistic demonstration
    if (scenario.id === 'clarify' || scenario.id === 'history') {
      setUserEmail('dave.miller@fieldtech.com');
    } else if (scenario.id === 'out_of_stock') {
      setUserEmail('dave.miller@fieldtech.com');
    } else {
      setUserEmail('dave.miller@fieldtech.com');
    }
    
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
    // Find options where stock exists
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
    if (!confirm("Are you sure you want to reset the database? This clears all requisitions and restores initial seeded stock.")) return;
    try {
      await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
      setMessages([
        {
          sender: 'bot',
          text: 'Database successfully reset to initial seed values! Let\'s start a new material replenishment scenario.',
          step: 1
        }
      ]);
      setSessionState({});
      setCurrentStep(1);
      setExecutionLogs(['Database reset. Replenisher Worker ready.']);
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
      desc: 'Requests standard drive belt. Demonstrates zero back-office lookup speed.',
      query: 'I need 2 drive belts for work order WO-1024'
    },
    {
      id: 'clarify',
      title: '2. Intelligent Clarification',
      desc: 'Ambiguous request. Prompts technician to select standard or heavy duty.',
      query: 'Need a drive belt for unit AHU-500'
    },
    {
      id: 'history',
      title: '3. Historical Intelligence',
      desc: 'Retrieves parts historically replaced on unit. Suggests correct parts.',
      query: 'Show me what parts were previously used on functional unit AHU-500-EAST'
    },
    {
      id: 'out_of_stock',
      title: '4. Planner Stockout Exception',
      desc: 'Out of stock at local site. Shows connected site stock and routes to planner.',
      query: 'Request 1 Solenoid Valve for WO-9943'
    }
  ];

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="logo-section">
          <div className="logo-icon">R</div>
          <div>
            <h1 className="logo-text">Smart Replenisher</h1>
          </div>
          <span className="logo-badge">AGENT.v1</span>
        </div>

        <div className="header-controls">
          <div className="role-selector">
            <label>Technician Profile:</label>
            <select className="role-select" value={userEmail} onChange={handleUserChange}>
              <option value="dave.miller@fieldtech.com">Dave Miller (SITE-EAST)</option>
              <option value="sarah.jenkins@fieldtech.com">Sarah Jenkins (SITE-NORTH)</option>
            </select>
          </div>

          <div className="api-status">
            <div className="status-dot"></div>
            <span>System Active</span>
          </div>

          <button className="reset-btn" onClick={handleResetDb}>Reset DB</button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="tabs-bar">
        <button 
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Technician Chat Portal
        </button>
        <button 
          className={`tab-btn ${activeTab === 'planner' ? 'active' : ''}`}
          onClick={() => setActiveTab('planner')}
        >
          Planner MMR Dashboard
        </button>
        <button 
          className={`tab-btn ${activeTab === 'explorer' ? 'active' : ''}`}
          onClick={() => setActiveTab('explorer')}
        >
          Mock Database Explorer
        </button>
      </nav>

      {/* Core Workspace */}
      {activeTab === 'chat' && (
        <div className="dashboard-grid">
          
          {/* Left panel: Scenarios */}
          <aside className="sidebar-left">
            <h3 className="panel-title">Demo Scenarios</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Click any scenario to pre-populate the input box, then press Enter to execute.
            </p>
            <div className="scenarios-list">
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
          </aside>

          {/* Center panel: Chat */}
          <main className="chat-panel">
            <div className="chat-history">
              {messages.map((m, idx) => (
                <div key={idx} className={`message-bubble ${m.sender}`}>
                  <div className={`avatar ${m.sender === 'user' ? 'user-av' : 'bot-av'}`}>
                    {m.sender === 'user' ? 'T' : 'AI'}
                  </div>
                  <div className="message-content">
                    <p style={{ whiteSpace: 'pre-wrap' }}>{m.text}</p>
                    
                    {/* Render candidate part selectors */}
                    {m.active_candidates && (
                      <div className="actions-row" style={{ flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.8rem' }}>
                        {m.active_candidates.map((c, cIdx) => (
                          <button 
                            key={cIdx} 
                            className="btn-cancel" 
                            style={{ borderColor: 'var(--accent-blue)', color: '#fff', fontSize: '0.8rem' }}
                            onClick={() => handleCandidateSelect(c)}
                          >
                            {c.description} ({c.part_number})
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Render order confirmation card */}
                    {m.pending_order && (
                      <div className="requisition-card">
                        <div className="req-field">
                          <span className="req-label">Part Number:</span>
                          <span className="req-value">{m.pending_order.part_number}</span>
                        </div>
                        <div className="req-field">
                          <span className="req-label">Description:</span>
                          <span className="req-value">{m.pending_order.description}</span>
                        </div>
                        <div className="req-field">
                          <span className="req-label">Quantity:</span>
                          <span className="req-value">{m.pending_order.quantity}</span>
                        </div>
                        <div className="req-field">
                          <span className="req-label">Fulfillment Site:</span>
                          <span className="req-value">{m.pending_order.site_id}</span>
                        </div>
                        <div className="req-field">
                          <span className="req-label">Work Order:</span>
                          <span className="req-value">{m.pending_order.work_order_id}</span>
                        </div>
                        <div className="actions-row">
                          <button className="btn-confirm" onClick={() => handleConfirmOrder(true)}>
                            Yes, Confirm Order
                          </button>
                          <button className="btn-cancel" onClick={() => handleConfirmOrder(false)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="message-bubble assistant">
                  <div className="avatar bot-av">AI</div>
                  <div className="message-content" style={{ color: 'var(--accent-cyan)', fontStyle: 'italic' }}>
                    Replenisher worker analyzing request...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-input-bar">
              <input 
                type="text" 
                className="chat-input"
                placeholder="Ask Replenisher for parts, check availability or view history..."
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
                Send
              </button>
            </div>
          </main>

          {/* Right panel: Digital Worker Plan Flow & Debugger */}
          <aside className="sidebar-right">
            <div className="tab-selector-small">
              <button 
                className={`tab-btn-sm ${rightTab === 'flow' ? 'active' : ''}`}
                onClick={() => setRightTab('flow')}
              >
                Plan Flow
              </button>
              <button 
                className={`tab-btn-sm ${rightTab === 'logs' ? 'active' : ''}`}
                onClick={() => setRightTab('logs')}
              >
                Execution Logs
              </button>
              <button 
                className={`tab-btn-sm ${rightTab === 'api' ? 'active' : ''}`}
                onClick={() => setRightTab('api')}
              >
                Developer API Logs
              </button>
            </div>

            <div className="right-panel-content">
              {rightTab === 'flow' && (
                <div className="plan-flow">
                  <div className={`flow-step ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}>
                    <div className="flow-node">1</div>
                    <div className="flow-info">
                      <h5>User Identification</h5>
                      <p>Resolve email details to retrieve technician ID and warehouse mappings.</p>
                    </div>
                  </div>

                  <div className={`flow-step ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}>
                    <div className="flow-node">2</div>
                    <div className="flow-info">
                      <h5>NLU Intent Parsing</h5>
                      <p>Analyze query using Gemini NLP to extract intent, description, and quantity.</p>
                    </div>
                  </div>

                  <div className={`flow-step ${currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : ''}`}>
                    <div className="flow-node">3</div>
                    <div className="flow-info">
                      <h5>Catalog Lookup</h5>
                      <p>Search standard parts listings and compatible unit specs.</p>
                    </div>
                  </div>

                  <div className={`flow-step ${currentStep === 4 ? 'active' : currentStep > 4 ? 'completed' : ''}`}>
                    <div className="flow-node">4</div>
                    <div className="flow-info">
                      <h5>Ambiguity Check</h5>
                      <p>Verify matches and request clarification if multiple items are found.</p>
                    </div>
                  </div>

                  <div className={`flow-step ${currentStep === 5 ? 'active' : currentStep > 5 ? 'completed' : ''}`}>
                    <div className="flow-node">5</div>
                    <div className="flow-info">
                      <h5>Inventory Inspection</h5>
                      <p>Query stock quantities at local warehouses vs. global locations.</p>
                    </div>
                  </div>

                  <div className={`flow-step ${currentStep === 6 ? 'active' : currentStep > 6 ? 'completed' : ''}`}>
                    <div className="flow-node">6</div>
                    <div className="flow-info">
                      <h5>MMR Creation</h5>
                      <p>Generate maintenance requisitions and notify inventory planners.</p>
                    </div>
                  </div>
                </div>
              )}

              {rightTab === 'logs' && (
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
              )}

              {rightTab === 'api' && (
                <div className="debug-list">
                  {apiCalls.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>
                      No simulated API requests logged yet. Submit a query to track payloads.
                    </p>
                  ) : (
                    apiCalls.map((call, cIdx) => (
                      <div key={cIdx} className="debug-card">
                        <div className="debug-header">
                          <span className={`method-tag ${call.method}`}>{call.method}</span>
                          <span>{call.timestamp}</span>
                        </div>
                        <div className="debug-content">
                          <div className="debug-path">{call.path}</div>
                          {call.request && (
                            <div style={{ marginBottom: '0.4rem' }}>
                              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Request payload:</p>
                              <pre className="debug-json">{JSON.stringify(call.request, null, 2)}</pre>
                            </div>
                          )}
                          <div>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Response body:</p>
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
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Planner Management Control</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Monitor incoming Maintenance Material Requisitions (MMRs) and manage stockout exceptions routed from field technicians.
            </p>

            {/* Stats Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-header">Total Requisitions</span>
                <span className="stat-value">{stats.total_requisitions}</span>
                <span className="stat-desc">Created via conversational agents</span>
              </div>
              <div className="stat-card">
                <span className="stat-header">Success Rate</span>
                <span className="stat-value" style={{ color: stats.success_rate > 80 ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
                  {stats.success_rate}%
                </span>
                <span className="stat-desc">Auto-fulfillment rate</span>
              </div>
              <div className="stat-card" style={{ borderLeft: '3px solid var(--accent-red)' }}>
                <span className="stat-header">Stockout Exceptions</span>
                <span className="stat-value" style={{ color: stats.exception_count > 0 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                  {stats.exception_count}
                </span>
                <span className="stat-desc">Awaiting inventory resolution</span>
              </div>
              <div className="stat-card">
                <span className="stat-header">Hours Saved</span>
                <span className="stat-value" style={{ color: 'var(--accent-cyan)' }}>{stats.estimated_hours_saved}h</span>
                <span className="stat-desc">Est. technician time saved</span>
              </div>
            </div>

            {/* Requisitions Table */}
            <div className="table-card" style={{ marginTop: '1.5rem' }}>
              <div className="table-header-row">
                <h3>Active Requisitions</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Polled in real-time
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>MMR ID</th>
                      <th>Work Order</th>
                      <th>Part Number</th>
                      <th>Description</th>
                      <th>Qty</th>
                      <th>Warehouse Site</th>
                      <th>Requested By</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requisitions.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                          No requisitions created.
                        </td>
                      </tr>
                    ) : (
                      requisitions.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>MMR-{r.id}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{r.work_order_id}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{r.part_number}</td>
                          <td>{r.description}</td>
                          <td>{r.qty_requested}</td>
                          <td>{r.site_id}</td>
                          <td>{r.creator_name} ({r.created_by})</td>
                          <td>
                            <span className={`status-badge ${r.status.toLowerCase()}`}>
                              {r.status}
                            </span>
                          </td>
                          <td>
                            {r.status === 'Pending' && (
                              <button className="action-btn-sm" onClick={() => handleApproveReq(r.id)}>
                                Approve & Issue
                              </button>
                            )}
                            {r.status === 'Exception' && (
                              <button className="action-btn-sm resolve" onClick={() => handleOpenResolveModal(r)}>
                                Resolve Stockout
                              </button>
                            )}
                            {r.status === 'Approved' && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fulfilled</span>
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
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Database Table Explorer</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Inspect live contents of SQL database tables mapped inside the mock ERP system.
            </p>

            {/* Inventory Database View */}
            <div className="table-card">
              <div className="table-header-row">
                <h3>Warehouse Inventory Levels (`inventory` table)</h3>
              </div>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Part Number</th>
                    <th>Description</th>
                    <th>Warehouse Site</th>
                    <th>Bin Location</th>
                    <th>Qty On Hand</th>
                    <th>Qty Reserved</th>
                    <th>Net Available</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{inv.part_number}</td>
                      <td>{inv.description}</td>
                      <td>{inv.site_id}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{inv.warehouse_location}</td>
                      <td style={{ fontWeight: 'bold' }}>{inv.qty_on_hand}</td>
                      <td>{inv.qty_reserved}</td>
                      <td style={{ color: (inv.qty_on_hand - inv.qty_reserved) > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {inv.qty_on_hand - inv.qty_reserved}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Parts Catalog Database View */}
            <div className="table-card" style={{ marginTop: '2rem' }}>
              <div className="table-header-row">
                <h3>Parts Catalog Registry (`parts` table)</h3>
              </div>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Part Number</th>
                    <th>Description</th>
                    <th>Unit Type Target</th>
                    <th>Product Family</th>
                    <th>Compatible Units</th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map((p) => (
                    <tr key={p.part_number}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{p.part_number}</td>
                      <td>{p.description}</td>
                      <td>{p.unit_type}</td>
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
      )}

      {/* Exception Resolution Modal */}
      {showResolveModal && selectedReq && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Resolve Stockout Exception: MMR-{selectedReq.id}</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Technician **{selectedReq.creator_name}** requested **{selectedReq.qty_requested}x {selectedReq.description}** at **{selectedReq.site_id}**. 
              However, the local site is currently out of stock.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Transfer stock from alternative warehouse:
              </label>
              
              <select 
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  color: 'white',
                  padding: '0.6rem',
                  fontFamily: 'var(--font-sans)'
                }}
                value={selectedSourceSite}
                onChange={e => setSelectedSourceSite(e.target.value)}
              >
                {inventory
                  .filter(inv => inv.part_number === selectedReq.part_number && inv.site_id !== selectedReq.site_id)
                  .map(inv => (
                    <option key={inv.site_id} value={inv.site_id}>
                      {inv.site_id} ({inv.qty_on_hand} available in stock)
                    </option>
                  ))
                }
                {inventory.filter(inv => inv.part_number === selectedReq.part_number && inv.site_id !== selectedReq.site_id).length === 0 && (
                  <option value="">No alternative sites have stock</option>
                )}
              </select>
            </div>

            <div className="actions-row" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn-cancel" onClick={() => setShowResolveModal(false)}>
                Cancel
              </button>
              <button 
                className="btn-confirm" 
                style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))' }}
                onClick={handleResolveReqSubmit}
                disabled={!selectedSourceSite}
              >
                Resolve & Approve Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
