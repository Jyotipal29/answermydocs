from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env")

BASE_DIR = Path(__file__).resolve().parent.parent
CHROMA_PERSIST_DIR = str(BASE_DIR / "data" / "chroma")
SESSIONS_FILE = str(BASE_DIR / "data" / "sessions.json")

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200

EMBEDDING_MODEL = "text-embedding-3-small"
LLM_MODEL = "gpt-4o"
RETRIEVER_TOP_K = 5
