from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request

from app.models.schemas import UploadResponse
from app.services.pdf_processor import process_pdf
from app.services.vectorstore import add_documents
from app.services.session_manager import (
    get_session_raw,
    set_primary_pdf,
    add_supporting_pdf,
    collection_name_for,
)

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(
    request: Request,
    file: UploadFile = File(...),
    session_id: str = Form(...),
):
    user_id = request.state.user_id
    session = await get_session_raw(session_id, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    chunks = await process_pdf(file)

    if not chunks:
        raise HTTPException(status_code=400, detail="No text could be extracted from the PDF.")

    collection = collection_name_for(session_id)
    num_chunks = add_documents(collection, chunks)

    if not session.get("filename"):
        await set_primary_pdf(session_id, file.filename)
    else:
        await add_supporting_pdf(session_id, file.filename)

    return UploadResponse(
        filename=file.filename,
        num_chunks=num_chunks,
        message="PDF processed and stored successfully.",
    )
