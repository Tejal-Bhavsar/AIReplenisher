from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, relationship
import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, nullable=False)  # "Technician", "Planner"
    site_id = Column(String, nullable=False)  # Connected warehouse/site ID
    
    requisitions = relationship("Requisition", back_populates="creator")

class Part(Base):
    __tablename__ = "parts"
    
    part_number = Column(String, primary_key=True, index=True)
    description = Column(String, nullable=False)
    unit_type = Column(String, nullable=False)  # e.g., AHU-500, PMP-100
    product_family = Column(String, nullable=False)  # e.g., HVAC Filters, Valves
    compatible_units = Column(String, nullable=True)  # JSON-like string of compatible units or descriptions

    inventory_items = relationship("Inventory", back_populates="part")
    requisitions = relationship("Requisition", back_populates="part")
    historical_tasks = relationship("HistoricalTask", back_populates="part")

class Inventory(Base):
    __tablename__ = "inventory"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    part_number = Column(String, ForeignKey("parts.part_number"), nullable=False)
    site_id = Column(String, nullable=False)
    warehouse_location = Column(String, nullable=False)
    qty_on_hand = Column(Integer, default=0)
    qty_reserved = Column(Integer, default=0)
    
    part = relationship("Part", back_populates="inventory_items")

class Requisition(Base):
    __tablename__ = "requisitions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    work_order_id = Column(String, nullable=False)
    part_number = Column(String, ForeignKey("parts.part_number"), nullable=False)
    qty_requested = Column(Integer, default=1)
    site_id = Column(String, nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="Pending")  # Pending, Approved, Rejected, Exception
    date_created = Column(DateTime, default=datetime.datetime.utcnow)
    
    creator = relationship("User", back_populates="requisitions")
    part = relationship("Part", back_populates="requisitions")

class HistoricalTask(Base):
    __tablename__ = "historical_tasks"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    work_order_id = Column(String, nullable=False)
    functional_unit_id = Column(String, nullable=False)  # e.g. AHU-500-EAST
    part_number = Column(String, ForeignKey("parts.part_number"), nullable=False)
    qty_used = Column(Integer, default=1)
    date = Column(String, nullable=False)
    
    part = relationship("Part", back_populates="historical_tasks")
