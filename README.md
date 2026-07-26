# ⚙️ Smart Replenisher: AI-Powered Digital Worker & Requisition Studio

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Gemini](https://img.shields.io/badge/Gemini_API-Enabled-8E75C2?style=for-the-badge&logo=google-gemini&logoColor=white)](https://ai.google.dev/)

An AI-powered digital worker application designed to automate the process of finding parts and creating Maintenance Material Requisitions (MMRs) for field technicians. It replaces manual database searches and complex ERP navigation with a natural language interface connected to a live SQLite inventory database.

---

## 🎯 Forward Deployed Engineer (FDE) Role Alignment Highlights

This repository directly demonstrates the key competencies and system design patterns required in a **Forward Deployed Engineer (FDE) / Solutions Engineer** role:

1.  **Conversational LLM Pipeline with SQL Data Access**: Integrates Google Gemini API (`gemini-1.5-flash`) via structured JSON schema instructions to translate unstructured technician prompts into structured SQL database parameters (extraction, intent classification, and unit-compatibility matching).
2.  **Connected Warehouse Inventory Routing**: Real-time warehouse site mapping based on technician emails, verifying stock quantities, and generating Maintenance Material Requisitions (MMRs) in SQLite via SQLAlchemy.
3.  **Human-in-the-Loop (HITL) Exception Resolvers**: Visual interfaces that manage candidate part checklists during ambiguous queries, and route stockout exceptions to a central planner dashboard for stock transfer and approval.
4.  **Interactive Developer Console & Logs Streamer**: Provides a side-by-side view of (a) the active 6-stage AI workflow, (b) low-level simulated REST API requests/responses (JSON), and (c) folder trace logs to illustrate system integration details.
5.  **Dual Engine (Gemini & Fallback NLU)**: Robust regex-and-keyword fallback parser that ensures the application remains functional offline or key-less, dynamically activating the Gemini LLM once a valid key is provided.

---

## 🚀 Key Features

### 1. 💬 Conversational Part Ordering & Intent Parsing
*   Auto-identifies technician accounts, extracts part descriptions, functional units, and requested quantities.
*   Guides the user through order validation checks and confirmation cards.

### 2. 🔍 Intelligent Part Catalog & Historical Search
*   Performs multi-tier searches: searches by unit compatibility, product category, or fallback to historical task logs for similar equipment models.

### 3. 👥 Human-in-the-Loop Dialogues
*   **Disambiguation**: Displays a checklist of candidate parts in the chat if multiple items match the description (e.g. standard vs. heavy-duty belt).
*   **Approval Prompt**: Displays order details with green checkmark/cross confirmations before booking.

### 4. 🎛️ Planner Control Center & Stock Transfer
*   Active requisitions registry with search and toggle filter tabs (Dave Miller / Sarah Jenkins / All Requisitions).
*   Exceptions resolver modal letting planners transfer stocks from alternative sites to auto-approve pending requisitions.

### 5. 📦 Live DB Registry & Explorer
*   Transparent inspectable tables representing the SQLite database entities (`inventory`, `parts`).

---

## 🛠️ Tech Stack & Architecture

```
AIReplenisher/
├── backend/                  # Python 3.11 + FastAPI + SQLite + SQLAlchemy
│   ├── app/
│   │   ├── database.py       # SQLite connection & seed initialization
│   │   ├── main.py           # REST endpoints for chat state & planner
│   │   ├── models.py         # SQLAlchemy schemas (Users, Inventory, Tasks)
│   │   └── nlp.py            # Gemini API client & regex NLU fallback
│   ├── .env                  # Configuration variables & Gemini API Key
│   └── requirements.txt
├── frontend/                 # React 18 + Vite + Custom Glassmorphic CSS
│   ├── src/
│   │   ├── App.jsx           # UI client: Chat, Stepper nodes, Planner, Explorer
│   │   ├── index.css         # Custom SaaS Dark Mode Styling
│   │   └── main.jsx          # React mounting
│   └── index.html
└── README.md
```

---

## 🏁 Quick Start Guide

### 1. Prerequisite Configuration
Ensure you have Python 3 and Node.js installed. Create a `.env` file inside the `backend` folder to configure the Gemini API key:

Create `backend/.env`:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
PORT=8001
DATABASE_URL=sqlite:///./replenisher.db
```

*Note: If no API key is specified, the system will automatically run in local fallback mode using regex-based extraction.*

---

### 2. Launch the Backend
Navigate to the `backend` directory, activate virtual environment, and start the development server:

```bash
cd backend
# Activate virtual environment
source venv/bin/activate
# Run backend development server (starts on http://localhost:8001)
uvicorn app.main:app --reload --port 8001
```
The server will start at `http://localhost:8001`. You can inspect the autogenerated Swagger API documentation at `http://localhost:8001/docs`.

---

### 3. Launch the Frontend
Navigate to the `frontend` directory, install npm packages, and launch the dev server:

```bash
cd frontend
npm install
# Run Vite dev server (starts on http://localhost:5174)
npm run dev
```
Open the local address printed (`http://localhost:5174/`) in your browser to interact with the dashboard.

---

## 📄 License & Attribution
Designed and built by **Tejal Bhavsar** for the Forward Deployed Engineer (FDE) application portfolio.
