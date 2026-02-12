import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv
from routers import document
from routers import addin
from routers import projects
from routers import research

load_dotenv()

# Rate Limiter (compartilhado com routers)
from routers.addin import limiter

app = FastAPI(
    title="Normaex API",
    description="API para formatação de documentos acadêmicos com IA",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS - Origins permitidas
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",") if os.getenv("ALLOWED_ORIGINS") else [
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "https://localhost:3001",
    "https://127.0.0.1:3001",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://normaex.com.br",
    "https://app.normaex.com.br",
    "https://api.normaex.com.br",
]

# Remover strings vazias
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# Routers
app.include_router(document.router, prefix="/api/documents", tags=["documents"])
app.include_router(addin.router, prefix="/api", tags=["addin"])
app.include_router(projects.router, tags=["projects"])
app.include_router(research.router, prefix="/api/research", tags=["research"])

@app.get("/")
def read_root():
    return {"message": "Normaex Backend is running"}

@app.get("/health")
def health_check():
    """Health check endpoint para monitoramento"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "service": "normaex-api"
    }
