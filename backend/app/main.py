from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import auth, products, dashboard
from .utils.database import engine, Base

app = FastAPI()

# Create database tables
Base.metadata.create_all(bind=engine)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(products.router, prefix="/api", tags=["products"])
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])