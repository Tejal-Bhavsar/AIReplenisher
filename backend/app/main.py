from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import datetime
import json

from .database import get_db, seed_database, engine
from .models import Base, User, Part, Inventory, Requisition, HistoricalTask
from .nlp import parse_query_with_gemini, ExtractedEntities

# Initialize database
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Replenisher API", version="1.0.0")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed database on startup
@app.on_event("startup")
def startup_event():
    db = next(get_db())
    try:
        seed_database(db)
    finally:
        db.close()

# Request/Response Schemas
class ChatRequest(BaseModel):
    message: str
    user_email: str
    current_step: int = 1
    session_state: Optional[Dict[str, Any]] = None

class RequisitionCreate(BaseModel):
    work_order_id: str
    part_number: str
    qty_requested: int
    site_id: str
    created_by: str

class RequisitionResolve(BaseModel):
    source_site_id: str  # Warehouse transferring stock from

# Helper to log simulated API requests
def make_api_log(method: str, path: str, request_body: Any = None, response_body: Any = None) -> Dict[str, Any]:
    return {
        "timestamp": datetime.datetime.now().strftime("%H:%M:%S.%f")[:-3],
        "method": method,
        "path": path,
        "request": request_body,
        "response": response_body
    }

@app.post("/api/reset")
def reset_database(db: Session = Depends(get_db)):
    # Drop all and recreate
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_database(db)
    return {"status": "success", "message": "Database reset to initial seeded state."}

@app.get("/api/parts")
def get_parts(db: Session = Depends(get_db)):
    return db.query(Part).all()

@app.get("/api/inventory")
def get_inventory(db: Session = Depends(get_db)):
    items = db.query(Inventory).all()
    result = []
    for item in items:
        result.append({
            "id": item.id,
            "part_number": item.part_number,
            "description": item.part.description,
            "site_id": item.site_id,
            "warehouse_location": item.warehouse_location,
            "qty_on_hand": item.qty_on_hand,
            "qty_reserved": item.qty_reserved
        })
    return result

@app.get("/api/requisitions")
def get_requisitions(db: Session = Depends(get_db)):
    reqs = db.query(Requisition).order_by(Requisition.id.desc()).all()
    result = []
    for r in reqs:
        result.append({
            "id": r.id,
            "work_order_id": r.work_order_id,
            "part_number": r.part_number,
            "description": r.part.description,
            "qty_requested": r.qty_requested,
            "site_id": r.site_id,
            "created_by": r.created_by,
            "creator_name": r.creator.name,
            "status": r.status,
            "date_created": r.date_created.strftime("%Y-%m-%d %H:%M:%S")
        })
    return result

@app.put("/api/requisitions/{req_id}/approve")
def approve_requisition(req_id: int, db: Session = Depends(get_db)):
    req = db.query(Requisition).filter(Requisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    
    # Check inventory
    inv = db.query(Inventory).filter(
        Inventory.part_number == req.part_number,
        Inventory.site_id == req.site_id
    ).first()
    
    if not inv or (inv.qty_on_hand - inv.qty_reserved) < req.qty_requested:
        req.status = "Exception"
        db.commit()
        raise HTTPException(status_code=400, detail="Insufficient stock. Requisition set to Exception status.")
        
    # Deduct stock
    inv.qty_on_hand -= req.qty_requested
    req.status = "Approved"
    db.commit()
    return {"status": "success", "message": f"Requisition {req_id} approved and inventory deducted."}

@app.put("/api/requisitions/{req_id}/resolve")
def resolve_requisition(req_id: int, data: RequisitionResolve, db: Session = Depends(get_db)):
    """
    Planner resolves stock exception by transferring inventory from another warehouse.
    """
    req = db.query(Requisition).filter(Requisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
        
    # 1. Deduct stock from source site
    source_inv = db.query(Inventory).filter(
        Inventory.part_number == req.part_number,
        Inventory.site_id == data.source_site_id
    ).first()
    
    if not source_inv or source_inv.qty_on_hand < req.qty_requested:
        raise HTTPException(status_code=400, detail=f"Insufficient inventory at source site {data.source_site_id}")
        
    # 2. Reduce source stock, and mark requisition as Approved
    source_inv.qty_on_hand -= req.qty_requested
    req.status = "Approved"
    
    # 3. Add to target site history/logs if needed (we'll just log or complete the request)
    db.commit()
    return {"status": "success", "message": f"Requisition {req_id} resolved by transferring {req.qty_requested} unit(s) from {data.source_site_id}."}

@app.get("/api/dashboard-stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    reqs = db.query(Requisition).all()
    total_reqs = len(reqs)
    approved_reqs = len([r for r in reqs if r.status == "Approved"])
    exception_reqs = len([r for r in reqs if r.status == "Exception"])
    pending_reqs = len([r for r in reqs if r.status == "Pending"])
    
    # Calculate success rate
    success_rate = (approved_reqs / total_reqs * 100) if total_reqs > 0 else 100.0
    
    # Count low stock parts
    low_stock = db.query(Inventory).filter(Inventory.qty_on_hand <= 2).count()
    
    # Processing time comparisons
    # Manual: ~18 minutes, AI Replenisher: ~0.4s (400ms)
    time_saved_minutes = total_reqs * 17.6 # roughly 17.6 mins saved per requisition
    
    # Aggregate by family
    family_data = {}
    parts = db.query(Part).all()
    for p in parts:
        family_data[p.product_family] = family_data.get(p.product_family, 0) + 1

    return {
        "total_requisitions": total_reqs,
        "success_rate": round(success_rate, 1),
        "exception_count": exception_reqs,
        "pending_count": pending_reqs,
        "low_stock_alerts": low_stock,
        "estimated_hours_saved": round(time_saved_minutes / 60, 1),
        "product_families": family_data
    }

@app.post("/api/chat")
def process_chat(request: ChatRequest = Body(...), db: Session = Depends(get_db)):
    user_email = request.user_email.strip().lower()
    message = request.message.strip()
    session = request.session_state or {}
    
    execution_logs = []
    api_calls = []
    
    # --- STEP 1: USER IDENTIFICATION ---
    execution_logs.append(f"Received message from client. Target email: '{user_email}'")
    api_calls.append(make_api_log("GET", f"/api/users?email={user_email}", response_body={"query": f"email = {user_email}"}))
    
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        execution_logs.append(f"ERROR: No user found for email '{user_email}'. Refusing requisition pipeline.")
        return {
            "response": "Hello, I couldn't find a registered technician matching your email address. Please make sure your email is configured correctly in the system profile.",
            "step": 1,
            "execution_logs": execution_logs,
            "simulated_api_calls": api_calls,
            "session_state": {}
        }
        
    execution_logs.append(f"Successfully identified User: ID={user.id}, Name={user.name}, Primary Site={user.site_id}")
    api_calls[-1]["response"] = {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "site_id": user.site_id}
    
    # --- CHECK STATE: IS TECHNICIAN CONFIRMING AN ORDER? ---
    if session.get("pending_order"):
        pending = session["pending_order"]
        if any(confirm in message.lower() for confirm in ["yes", "y", "confirm", "approve", "okay", "ok", "sure", "do it"]):
            # Trigger Requisition Creation
            execution_logs.append(f"User confirmed requisition request. Creating record in IFS...")
            
            # Create requisition
            new_req = Requisition(
                work_order_id=pending["work_order_id"],
                part_number=pending["part_number"],
                qty_requested=pending["quantity"],
                site_id=pending["site_id"],
                created_by=user.id,
                status="Pending"
            )
            db.add(new_req)
            db.commit()
            db.refresh(new_req)
            
            req_body = {
                "work_order_id": new_req.work_order_id,
                "part_number": new_req.part_number,
                "qty_requested": new_req.qty_requested,
                "site_id": new_req.site_id,
                "created_by": new_req.created_by
            }
            api_calls.append(make_api_log("POST", "/api/requisitions", request_body=req_body, response_body={"id": new_req.id, "status": "Pending"}))
            
            # Check availability at site to determine if it is immediately approved or goes to exception
            inv = db.query(Inventory).filter(
                Inventory.part_number == new_req.part_number,
                Inventory.site_id == new_req.site_id
            ).first()
            
            available_qty = (inv.qty_on_hand - inv.qty_reserved) if inv else 0
            
            if inv and available_qty >= new_req.qty_requested:
                # Reserve inventory and approve
                inv.qty_reserved += new_req.qty_requested
                # Deduct inventory for immediate fulfillment
                inv.qty_on_hand -= new_req.qty_requested
                inv.qty_reserved -= new_req.qty_requested
                new_req.status = "Approved"
                db.commit()
                
                execution_logs.append(f"SUCCESS: Inventory checked and verified. Reserved & deducted {new_req.qty_requested}x {new_req.part_number} at {new_req.site_id}. Requisition MMR-{new_req.id} set to APPROVED.")
                api_calls.append(make_api_log("PUT", f"/api/requisitions/{new_req.id}/approve", response_body={"id": new_req.id, "status": "Approved"}))
                
                return {
                    "response": f"Great! Requisition **MMR-{new_req.id}** has been automatically created and **Approved**! I have reserved {new_req.qty_requested}x **{pending['description']}** from the **{new_req.site_id}** warehouse (Location: {inv.warehouse_location}). You are good to pick it up.",
                    "step": 6,
                    "execution_logs": execution_logs,
                    "simulated_api_calls": api_calls,
                    "session_state": {}
                }
            else:
                # Stockout Exception
                new_req.status = "Exception"
                db.commit()
                execution_logs.append(f"WARNING: Inventory stockout detected at {new_req.site_id}. Available: {available_qty}, Requested: {new_req.qty_requested}. Requisition MMR-{new_req.id} set to EXCEPTION. Notifying planners...")
                
                # Check global availability to provide helpful info
                global_invs = db.query(Inventory).filter(
                    Inventory.part_number == new_req.part_number,
                    Inventory.qty_on_hand > 0
                ).all()
                
                global_info = []
                for gi in global_invs:
                    if gi.site_id != new_req.site_id:
                        global_info.append(f"**{gi.site_id}** ({gi.qty_on_hand} in stock)")
                
                global_text = ""
                if global_info:
                    global_text = f" However, stock is available at: {', '.join(global_info)}. I have flagged this to your planner to review a stock transfer."
                else:
                    global_text = " There is currently no stock available across any warehouse site. I have forwarded an exception ticket to the procurement planner."
                
                return {
                    "response": f"Requisition **MMR-{new_req.id}** has been created, but was flagged as **Stockout Exception** because **{pending['description']}** is out of stock at **{new_req.site_id}**.{global_text}",
                    "step": 6,
                    "execution_logs": execution_logs,
                    "simulated_api_calls": api_calls,
                    "session_state": {}
                }
        else:
            execution_logs.append("User cancelled or declined the confirmation.")
            return {
                "response": "Understood. Requisition cancelled. What else can I help you with?",
                "step": 4,
                "execution_logs": execution_logs,
                "simulated_api_calls": api_calls,
                "session_state": {}
            }

    # --- CHECK STATE: IS TECHNICIAN SELECTING FROM CANDIDATES? ---
    if session.get("active_candidates"):
        candidates = session["active_candidates"]
        selected_part = None
        
        # Try to parse numeric option index or part number
        for i, cand in enumerate(candidates):
            idx_str = str(i + 1)
            if idx_str in message or cand["part_number"].lower() in message.lower() or cand["description"].lower() in message.lower():
                selected_part = cand
                break
                
        if selected_part:
            execution_logs.append(f"User selected part candidate: {selected_part['part_number']} - {selected_part['description']}")
            # Set up confirmation step
            wo_id = session.get("work_order_id") or "WO-GENERIC"
            qty = session.get("quantity") or 1
            
            new_session = {
                "pending_order": {
                    "part_number": selected_part["part_number"],
                    "description": selected_part["description"],
                    "quantity": qty,
                    "work_order_id": wo_id,
                    "site_id": user.site_id
                }
            }
            
            return {
                "response": f"Got it. You've selected **{selected_part['description']}** ({selected_part['part_number']}).\n\nWould you like me to go ahead and reserve **{qty} unit(s)** for Work Order **{wo_id}** at the **{user.site_id}** warehouse?",
                "step": 4,
                "execution_logs": execution_logs,
                "simulated_api_calls": api_calls,
                "session_state": new_session
            }
        else:
            execution_logs.append("Clarification was requested but input did not match any options.")
            return {
                "response": "I didn't catch that. Please select one of the options by entering its number (1, 2, etc.) or description.",
                "step": 4,
                "execution_logs": execution_logs,
                "simulated_api_calls": api_calls,
                "session_state": session
            }

    # --- STEP 2: INFORMATION EXTRACTION ---
    execution_logs.append("Processing query through NLU parser (Gemini API)...")
    entities = parse_query_with_gemini(message)
    execution_logs.append(f"Extracted parameters: intent='{entities.intent}', part_desc='{entities.part_description}', qty={entities.quantity}, unit_id='{entities.functional_unit_id}', wo_id='{entities.work_order_id}'")
    
    # Fill in defaults if missing
    wo_id = entities.work_order_id or "WO-GENERIC"
    qty = entities.quantity if entities.quantity > 0 else 1

    # --- STEP 3: INTELLECTUAL CATALOG SEARCH & STEP 4: VERIFICATION ---
    if entities.intent == "view_history" or (entities.intent == "search_part" and "history" in message.lower()):
        # Query History for the functional unit or work order
        execution_logs.append(f"Querying historical tasks for unit '{entities.functional_unit_id}'...")
        
        hist_query = db.query(HistoricalTask)
        if entities.functional_unit_id:
            hist_query = hist_query.filter(HistoricalTask.functional_unit_id == entities.functional_unit_id)
        elif entities.work_order_id:
            hist_query = hist_query.filter(HistoricalTask.work_order_id == entities.work_order_id)
            
        tasks = hist_query.all()
        api_calls.append(make_api_log("GET", f"/api/historical-tasks?unit={entities.functional_unit_id}", response_body=[{"id": t.id, "part_number": t.part_number} for t in tasks]))
        
        if not tasks:
            execution_logs.append("No history records found matching criteria.")
            return {
                "response": f"I couldn't find any historical records of parts used for unit **{entities.functional_unit_id or 'specified'}**.",
                "step": 3,
                "execution_logs": execution_logs,
                "simulated_api_calls": api_calls,
                "session_state": {}
            }
            
        # Compile unique parts
        hist_parts = {}
        for t in tasks:
            hist_parts[t.part_number] = {
                "part_number": t.part_number,
                "description": t.part.description,
                "qty": t.qty_used,
                "date": t.date
            }
            
        execution_logs.append(f"Found {len(hist_parts)} unique parts in repair history.")
        response_text = f"Based on the repair history for **{entities.functional_unit_id}**, the following parts were previously replaced:\n\n"
        for p in hist_parts.values():
            response_text += f"* **{p['description']}** ({p['part_number']}) - Used on {p['date']}\n"
            
        # Give quick action buttons to order one of these parts
        new_session = {
            "active_candidates": list(hist_parts.values()),
            "work_order_id": wo_id,
            "quantity": qty
        }
        
        response_text += "\nWhich of these would you like to request? (Select by name, code, or type of part)"
        return {
            "response": response_text,
            "step": 3,
            "execution_logs": execution_logs,
            "simulated_api_calls": api_calls,
            "session_state": new_session
        }

    # Search part catalog
    if not entities.part_description:
        execution_logs.append("WARNING: No part description could be extracted from text.")
        return {
            "response": "I see you're looking for parts, but I couldn't identify what you need. Could you specify the description or name of the part? (e.g. 'air filters', 'solenoid valve', etc.)",
            "step": 4,
            "execution_logs": execution_logs,
            "simulated_api_calls": api_calls,
            "session_state": {}
        }
        
    execution_logs.append(f"Searching parts catalog for query '{entities.part_description}'...")
    
    # Perform standard filter matching
    term = f"%{entities.part_description}%"
    candidates_query = db.query(Part).filter(
        (Part.description.like(term)) | 
        (Part.part_number.like(term)) | 
        (Part.product_family.like(term))
    )
    
    # If functional unit is specified, try to filter or order by compatibility
    if entities.functional_unit_id:
        # e.g., AHU-500-EAST -> AHU-500
        unit_prefix = "-".join(entities.functional_unit_id.split("-")[:2])
        execution_logs.append(f"Filtering parts list for unit compatibility: '{unit_prefix}'")
        candidates_query = candidates_query.filter(Part.unit_type.like(f"%{unit_prefix}%"))
        
    candidates = candidates_query.all()
    api_calls.append(make_api_log("GET", f"/api/parts?search={entities.part_description}", response_body=[c.part_number for c in candidates]))
    
    if not candidates:
        execution_logs.append(f"No catalog matches found for description: '{entities.part_description}'")
        return {
            "response": f"I checked the catalog, but I couldn't find any parts matching **'{entities.part_description}'** compatible with unit **{entities.functional_unit_id or 'all'}**.",
            "step": 3,
            "execution_logs": execution_logs,
            "simulated_api_calls": api_calls,
            "session_state": {}
        }

    # --- STEP 4: VERIFICATION / MULTIPLE CANDIDATES ---
    if len(candidates) > 1:
        execution_logs.append(f"MULTIPLE MATCHES ({len(candidates)}): Ambiguity detected. Requesting technician selection.")
        
        candidates_list = []
        response_text = f"I found multiple matches for **'{entities.part_description}'**:\n\n"
        for i, c in enumerate(candidates):
            candidates_list.append({"part_number": c.part_number, "description": c.description})
            response_text += f"{i+1}. **{c.description}** (`{c.part_number}`)\n"
            
        new_session = {
            "active_candidates": candidates_list,
            "work_order_id": wo_id,
            "quantity": qty
        }
        
        response_text += "\nPlease enter the number of the correct part (e.g. 1, 2) or describe the one you want."
        return {
            "response": response_text,
            "step": 4,
            "execution_logs": execution_logs,
            "simulated_api_calls": api_calls,
            "session_state": new_session
        }
        
    selected_part = candidates[0]
    execution_logs.append(f"Unique match verified: {selected_part.part_number} - {selected_part.description}")
    
    # --- STEP 5: AVAILABILITY CHECK ---
    execution_logs.append(f"Checking warehouse inventory at user site: {user.site_id}")
    inv = db.query(Inventory).filter(
        Inventory.part_number == selected_part.part_number,
        Inventory.site_id == user.site_id
    ).first()
    
    available_qty = (inv.qty_on_hand - inv.qty_reserved) if inv else 0
    api_calls.append(make_api_log("GET", f"/api/inventory?part={selected_part.part_number}&site={user.site_id}", response_body={"qty_on_hand": inv.qty_on_hand if inv else 0, "qty_reserved": inv.qty_reserved if inv else 0}))
    
    # Compile order prompt context
    new_session = {
        "pending_order": {
            "part_number": selected_part.part_number,
            "description": selected_part.description,
            "quantity": qty,
            "work_order_id": wo_id,
            "site_id": user.site_id
        }
    }
    
    if available_qty >= qty:
        execution_logs.append(f"Stock available: {available_qty} units on hand. Prompting technician to reserve.")
        return {
            "response": f"I found **{selected_part.description}** (`{selected_part.part_number}`) in stock at your local warehouse **{user.site_id}** ({available_qty} available, Location: {inv.warehouse_location}).\n\nWould you like me to reserve **{qty} unit(s)** for Work Order **{wo_id}**?",
            "step": 5,
            "execution_logs": execution_logs,
            "simulated_api_calls": api_calls,
            "session_state": new_session
        }
    else:
        execution_logs.append(f"Stockout detected at local site {user.site_id}. Searching other connected warehouses...")
        # Check global warehouses
        global_items = db.query(Inventory).filter(
            Inventory.part_number == selected_part.part_number,
            Inventory.qty_on_hand > 0
        ).all()
        
        global_sites = [g.site_id for g in global_items]
        execution_logs.append(f"Global check results: found stock at sites: {global_sites}")
        
        if global_items:
            options_text = ", ".join([f"**{gi.site_id}** ({gi.qty_on_hand - gi.qty_reserved} available)" for gi in global_items])
            return {
                "response": f"The item **{selected_part.description}** is currently **out of stock** at your local site **{user.site_id}**.\n\nHowever, I found it in stock at other locations: {options_text}.\n\nWould you like me to submit an exception request to route this from another warehouse?",
                "step": 5,
                "execution_logs": execution_logs,
                "simulated_api_calls": api_calls,
                "session_state": new_session
            }
        else:
            execution_logs.append("Global check failed. Completely out of stock.")
            return {
                "response": f"I found **{selected_part.description}** in our catalog, but it is **completely out of stock** across all warehouses.\n\nWould you like me to create a requisition exception for the procurement planner to expedite an emergency order?",
                "step": 5,
                "execution_logs": execution_logs,
                "simulated_api_calls": api_calls,
                "session_state": new_session
            }
