from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import sessions, upload, chat

app = FastAPI(title="AnswerMyDocs API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router)
app.include_router(upload.router)
app.include_router(chat.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
