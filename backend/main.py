from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import document

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(document.router, prefix="/api/documents", tags=["documents"])

@app.get("/")
def read_root():
    return {"message": "Normaex Backend is running"}
