from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import document
from routers import addin
from routers import projects
from routers import research

app = FastAPI(
    title="Normaex API",
    description="API para formatação de documentos acadêmicos com IA",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(document.router, prefix="/api/documents", tags=["documents"])
app.include_router(addin.router, prefix="/api", tags=["addin"])
app.include_router(projects.router, tags=["projects"])
app.include_router(research.router, prefix="/api/research", tags=["research"])

@app.get("/")
def read_root():
    return {"message": "Normaex Backend is running"}
