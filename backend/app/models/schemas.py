from pydantic import BaseModel


class ChatRequest(BaseModel):
    session_id: str
    question: str
    chat_history: list[dict[str, str]] = []


class UploadResponse(BaseModel):
    filename: str
    num_chunks: int
    message: str


class SessionResponse(BaseModel):
    id: str
    name: str
    created_at: str
    primary_pdf: str
    supporting_pdfs: list[str] = []
