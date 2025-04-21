import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Import routers
from routers.subjects import router as subjects_router
from routers.notes import router as notes_router
from routers.shares import router as shares_router
from routers.tags import router as tags_router

# Load environment variables
load_dotenv()

app = FastAPI(title="StudyHub API")

# Configure CORS
# Parse comma-separated origins from environment variable or use defaults
cors_origins = os.getenv("CORS_ORIGIN", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [origin.strip() for origin in cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(subjects_router, prefix="/api/subjects", tags=["subjects"])
app.include_router(notes_router, prefix="/api/notes", tags=["notes"])
app.include_router(shares_router, prefix="/api/shares", tags=["shares"])
app.include_router(tags_router, prefix="/api/tags", tags=["tags"])

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True) 