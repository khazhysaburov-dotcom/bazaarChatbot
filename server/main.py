from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .cars import Car, WAREHOUSE_INVENTORY, DEALER_INVENTORY
from typing import List



app = FastAPI(
    title="Auto Bazaar API",
    description="API for the Auto Bazaar car dealership chatbot",
    version="1.0.0"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/dealer/inventory", response_model=List[Car])
async def get_cars(): 
    return DEALER_INVENTORY


@app.get("/api/warehouse/inventory", response_model=List[Car])
async def get_cars(): 
    return WAREHOUSE_INVENTORY


@app.get("/")
async def root(): 
    return {
        "message": "Welcome to Auto Bazaar API",
        "docs": "/docs",
        "dealer_inventory_endpoint": "/api/dealer/inventory",
        "warehouse_inventory_endpoint": "/api/warehouse/inventory"
    }
