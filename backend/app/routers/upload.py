from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.models.schemas import UploadResponse
from app.services.pdf_processor import process_pdf
from app.services.vectorstore import add_documents
from app.services.session_manager import (
    get_session,
    set_primary_pdf,
    add_supporting_pdf,
    collection_name_for,
)

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    session_id: str = Form(...),
):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    chunks = await process_pdf(file)

    if not chunks:
        raise HTTPException(status_code=400, detail="No text could be extracted from the PDF.")

    collection = collection_name_for(session_id)
    num_chunks = add_documents(collection, chunks)

    if not session["primary_pdf"]:
        set_primary_pdf(session_id, file.filename)
    else:
        add_supporting_pdf(session_id, file.filename)

    return UploadResponse(
        filename=file.filename,
        num_chunks=num_chunks,
        message="PDF processed and stored successfully.",
    )
