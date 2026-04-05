import tempfile
from pathlib import Path

from fastapi import UploadFile
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import CHUNK_SIZE, CHUNK_OVERLAP


async def process_pdf(file: UploadFile) -> list:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        loader = PyPDFLoader(tmp_path)
        documents = loader.load()

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
        )
        chunks = splitter.split_documents(documents)

        for chunk in chunks:
            chunk.metadata["source"] = file.filename

        return chunks
    finally:
        Path(tmp_path).unlink(missing_ok=True)
