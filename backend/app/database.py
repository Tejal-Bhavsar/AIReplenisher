from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import json
import os
from dotenv import load_dotenv

# Load env variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./replenisher.db")

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def seed_database(db):
    from .models import User, Part, Inventory, HistoricalTask, Requisition, Base
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    # Check if already seeded
    if db.query(User).first() is not None:
        return
        
    # Seed Users
    users = [
        User(id="TECH-001", name="Dave Miller", email="dave.miller@fieldtech.com", role="Technician", site_id="SITE-EAST"),
        User(id="TECH-002", name="Sarah Jenkins", email="sarah.jenkins@fieldtech.com", role="Technician", site_id="SITE-NORTH"),
        User(id="PLANNER-001", name="Marcus Vance", email="marcus.vance@fieldtech.com", role="Planner", site_id="SITE-EAST")
    ]
    for u in users:
        db.add(u)
        
    # Seed Parts
    parts = [
        Part(
            part_number="FILT-AIR-99",
            description="Industrial Grade Air Filter 24x24x2",
            unit_type="AHU-500",
            product_family="HVAC Filters",
            compatible_units=json.dumps(["AHU-500-EAST", "AHU-500-WEST"])
        ),
        Part(
            part_number="FILT-HEPA-02",
            description="High-Efficiency HEPA Filter H13",
            unit_type="AHU-500",
            product_family="HVAC Filters",
            compatible_units=json.dumps(["AHU-500-EAST", "AHU-500-WEST"])
        ),
        Part(
            part_number="VALV-SOL-12",
            description="Solenoid Valve 1/2 inch Brass",
            unit_type="CHL-900",
            product_family="Valves",
            compatible_units=json.dumps(["CHL-900-NORTH"])
        ),
        Part(
            part_number="BELT-DRV-08",
            description="Heavy Duty Drive Belt V-Belt A46",
            unit_type="AHU-500",
            product_family="Transmission Components",
            compatible_units=json.dumps(["AHU-500-EAST", "AHU-500-WEST"])
        ),
        Part(
            part_number="BELT-DRV-12",
            description="Standard V-Belt A48",
            unit_type="AHU-500",
            product_family="Transmission Components",
            compatible_units=json.dumps(["AHU-500-EAST", "AHU-500-WEST"])
        )
    ]
    for p in parts:
        db.add(p)
        
    # Seed Inventory
    inventory_items = [
        Inventory(part_number="FILT-AIR-99", site_id="SITE-EAST", warehouse_location="WH-E-Row1-Shelf3", qty_on_hand=15, qty_reserved=0),
        Inventory(part_number="FILT-AIR-99", site_id="SITE-NORTH", warehouse_location="WH-N-Row2-Shelf1", qty_on_hand=4, qty_reserved=0),
        Inventory(part_number="FILT-HEPA-02", site_id="SITE-EAST", warehouse_location="WH-E-Row1-Shelf4", qty_on_hand=5, qty_reserved=1),
        Inventory(part_number="VALV-SOL-12", site_id="SITE-NORTH", warehouse_location="WH-N-Row4-Shelf2", qty_on_hand=10, qty_reserved=0),
        Inventory(part_number="VALV-SOL-12", site_id="SITE-EAST", warehouse_location="WH-E-Row5-Shelf1", qty_on_hand=0, qty_reserved=0),
        # Out of stock belt in East, but available in North
        Inventory(part_number="BELT-DRV-08", site_id="SITE-EAST", warehouse_location="WH-E-Row2-Shelf2", qty_on_hand=0, qty_reserved=0),
        Inventory(part_number="BELT-DRV-08", site_id="SITE-NORTH", warehouse_location="WH-N-Row3-Shelf4", qty_on_hand=12, qty_reserved=2),
        Inventory(part_number="BELT-DRV-12", site_id="SITE-EAST", warehouse_location="WH-E-Row2-Shelf3", qty_on_hand=8, qty_reserved=0)
    ]
    for inv in inventory_items:
        db.add(inv)
        
    # Seed Historical Tasks
    historical = [
        HistoricalTask(work_order_id="WO-8812", functional_unit_id="AHU-500-EAST", part_number="FILT-AIR-99", qty_used=2, date="2026-03-12"),
        HistoricalTask(work_order_id="WO-9943", functional_unit_id="CHL-900-NORTH", part_number="VALV-SOL-12", qty_used=1, date="2026-04-15"),
        HistoricalTask(work_order_id="WO-1024", functional_unit_id="AHU-500-EAST", part_number="BELT-DRV-08", qty_used=1, date="2026-05-18")
    ]
    for h in historical:
        db.add(h)
        
    db.commit()
