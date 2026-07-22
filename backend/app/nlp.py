import os
import json
import re
import google.generativeai as genai
from pydantic import BaseModel
from typing import Optional

# Configure Gemini API
API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

class ExtractedEntities(BaseModel):
    intent: str  # "search_part" | "create_requisition" | "view_history" | "unknown"
    part_description: Optional[str] = None
    quantity: int = 1
    functional_unit_id: Optional[str] = None
    work_order_id: Optional[str] = None

SYSTEM_INSTRUCTION = """
You are the Natural Language Understanding (NLU) extraction component of the Smart Replenisher system. 
Analyze the user's maintenance part request and extract the parameters into a JSON object.

Intent classification rules:
- "search_part": The user wants to search for, lookup, or check the availability of a part. E.g. "Do we have air filters?", "I need to find drive belts for AHU-500-EAST."
- "create_requisition": The user wants to reserve, requisition, order, or request a part for a specific work order or task. E.g. "Reserve 2 filters for WO-8812", "Request 1 Solenoid valve."
- "view_history": The user is asking about previously used parts, history, or past work tasks. E.g. "What parts were used for AHU-500-EAST in the past?", "Show me history of filters used on WO-8812."

You MUST return ONLY a raw JSON object matching this schema. Do not include markdown code block formatting (such as ```json) or any explanation.

Schema:
{
  "intent": "search_part" | "create_requisition" | "view_history" | "unknown",
  "part_description": string (e.g., "air filter", "V-Belt", or null if not found),
  "quantity": integer (default to 1 if not specified),
  "functional_unit_id": string (e.g., "AHU-500-EAST", "CHL-900-NORTH", or null if not found),
  "work_order_id": string (e.g., "WO-8812", "WO-9943", or null if not found)
}
"""

def fallback_parse(text: str) -> ExtractedEntities:
    """
    Fallback parser using regular expressions and keywords when Gemini API is unavailable.
    """
    text_lower = text.lower()
    
    # 1. Intent Detection
    intent = "search_part"
    if any(k in text_lower for k in ["order", "reserve", "request", "requisition", "get", "create requisition"]):
        intent = "create_requisition"
    elif any(k in text_lower for k in ["history", "past", "previously", "used before", "records"]):
        intent = "view_history"
        
    # 2. Extract Work Order (WO-XXXX)
    wo_match = re.search(r'\bwo-\d+\b', text_lower)
    work_order_id = wo_match.group(0).upper() if wo_match else None
    
    # 3. Extract Functional Unit (AHU-500-EAST, etc)
    # Match standard alphanumeric patterns like XXX-123-YYY
    unit_match = re.search(r'\b[a-zA-Z]{3}-\d+(?:-[a-zA-Z]+)?\b', text_lower)
    functional_unit_id = unit_match.group(0).upper() if unit_match else None
    
    # 4. Extract Quantity
    qty = 1
    qty_match = re.search(r'\b(\d+)\s*(?:x|qty|quantity|units|pcs|pieces)?\b', text_lower)
    if qty_match:
        # Avoid matching numbers in WO-8812 or AHU-500
        # Check surrounding context
        num_str = qty_match.group(1)
        # Check if this number is part of WO or AHU
        idx = text_lower.find(num_str)
        if idx > 0 and text_lower[idx-1] == '-':
            pass # Part of WO-XXXX or AHU-500
        else:
            qty = int(num_str)
            
    # 5. Extract Part Description
    part_description = None
    parts_keywords = ["filter", "hepa", "valve", "solenoid", "belt", "v-belt", "drive belt"]
    for kw in parts_keywords:
        if kw in text_lower:
            part_description = kw
            break
            
    if not part_description and "part" in text_lower:
        part_description = "part"
        
    return ExtractedEntities(
        intent=intent,
        part_description=part_description,
        quantity=qty,
        functional_unit_id=functional_unit_id,
        work_order_id=work_order_id
    )

def parse_query_with_gemini(query: str) -> ExtractedEntities:
    """
    Call Gemini API to parse the natural language query.
    Falls back to regex-based parser if API fails or is unconfigured.
    """
    if not API_KEY or API_KEY == "YOUR_GEMINI_API_KEY":
        return fallback_parse(query)
        
    try:
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config={"response_mime_type": "application/json"}
        )
        
        response = model.generate_content([
            {"text": SYSTEM_INSTRUCTION},
            {"text": f"User query: {query}"}
        ])
        
        # Parse JSON output
        result_text = response.text.strip()
        # Clean potential markdown wrapping if present
        if result_text.startswith("```"):
            result_text = re.sub(r'^```(?:json)?\n', '', result_text)
            result_text = re.sub(r'\n```$', '', result_text)
            
        data = json.loads(result_text)
        return ExtractedEntities(**data)
        
    except Exception as e:
        print(f"Gemini API Exception (falling back): {e}")
        return fallback_parse(query)
