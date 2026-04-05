# AnswerMyDocs

RAG-based chat with documents web application with multi-session support.

## Stack Decisions

| Layer       | Technology                     | Why                                                      |
|-------------|--------------------------------|----------------------------------------------------------|
| Backend     | Python + FastAPI               | Async-first, great for streaming responses               |
| RAG         | LangChain                      | Mature RAG abstractions, loaders, splitters, retrievers   |
| Vector DB   | Qdrant Cloud (AWS us-east-1)   | Managed vector DB, free tier, per-collection isolation    |
| Database    | MongoDB Atlas                  | Session + message persistence, async via motor            |
| Embeddings  | OpenAI text-embedding-3-small  | Cost-effective, strong performance for retrieval          |
| LLM         | OpenAI gpt-4o                  | Best balance of quality and speed for chat                |
| Frontend    | Next.js (App Router)           | React with server components, file-based routing          |
| Styling     | Tailwind CSS                   | Utility-first, ships with create-next-app                |

## Folder Structure

```
answermydocs/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app entry point (lifespan: MongoDB init)
│   │   ├── config.py                # Settings and constants
│   │   ├── db.py                    # Motor async MongoDB client
│   │   ├── routers/
│   │   │   ├── sessions.py          # POST/GET/DELETE /sessions, GET messages
│   │   │   ├── upload.py            # POST /upload (session-aware)
│   │   │   └── chat.py              # POST /chat (streaming, saves messages)
│   │   ├── services/
│   │   │   ├── session_manager.py   # Session CRUD (MongoDB)
│   │   │   ├── message_store.py     # Message save/fetch (MongoDB)
│   │   │   ├── pdf_processor.py     # PDF loading + chunking
│   │   │   ├── vectorstore.py       # Qdrant Cloud operations (per-session collections)
│   │   │   └── llm.py               # OpenAI LLM streaming
│   │   └── models/
│   │       └── schemas.py           # Pydantic models
│   └── requirements.txt
├── frontend/
│   └── src/app/
│       ├── page.tsx                  # App shell, session state management
│       └── components/
│           ├── Sidebar.tsx           # Collapsible sidebar, upload dropzone, session list
│           ├── ChatPanel.tsx         # Chat interface, paperclip attach, streaming
│           └── MessageBubble.tsx     # Message display
├── .env.example
└── CONTEXT.md
```

## Key Design Decisions

- **Multi-session architecture**: Each PDF upload creates an isolated chat session with its own Qdrant collection (`session_{id}`). Supporting PDFs can be attached and are queried together.
- **Qdrant Cloud**: Collections auto-created on first upload. Cosine similarity, 1536-dim vectors (text-embedding-3-small). Collections deleted when session is deleted.
- **MongoDB persistence**: Sessions and messages stored in MongoDB Atlas. Chat history survives page refreshes.
- **Streaming responses**: Backend uses FastAPI `StreamingResponse` with LangChain `astream`. Frontend reads with `fetch()` + `ReadableStream`.
- **Collapsible sidebar**: ChatGPT/Claude-style sidebar with session list, toggles to 0px width with smooth transition.
- **App Router**: Next.js App Router with client components for interactive UI.
- **Chunking strategy**: `RecursiveCharacterTextSplitter` with 1000 char chunks, 200 char overlap. Tunable in `config.py`.
- **Top-k retrieval**: 5 most similar chunks sent as context to the LLM. Configurable in `config.py`.
- **Dark UI**: Vercel/shadcn-inspired dark theme with Inter font, border-only styling, no shadows.

## API Endpoints

| Method | Endpoint                          | Description                                    |
|--------|-----------------------------------|------------------------------------------------|
| POST   | `/sessions`                       | Create a new session                           |
| GET    | `/sessions`                       | List all sessions                              |
| DELETE | `/sessions/{session_id}`          | Delete session + Qdrant collection + messages  |
| GET    | `/sessions/{session_id}/messages` | Get chat history for a session                 |
| POST   | `/upload`                         | Upload PDF to a session (form: file, session_id) |
| POST   | `/chat`                           | Chat within a session (streaming response)     |
| GET    | `/health`                         | Health check                                   |

## What Has Been Built

- [x] PDF upload endpoint — accepts PDF, extracts text, chunks, embeds, stores in Qdrant
- [x] Chat endpoint — retrieves relevant chunks, streams GPT-4o response
- [x] Multi-session support — create, list, delete sessions with isolated collections
- [x] Supporting PDF attachments — paperclip icon to add more PDFs to a session
- [x] Collapsible sidebar — session list with active highlighting, delete, upload dropzone
- [x] MongoDB persistence — sessions + messages survive page refresh
- [x] Dark Vercel/shadcn UI — Inter font, design tokens, responsive layout

## What Is Pending

- [ ] Source citations in chat responses (show which chunks were used)
- [ ] Authentication
- [ ] Deployment configuration (Docker, docker-compose)
- [ ] Support for non-PDF formats (DOCX, TXT, Markdown)
- [ ] Configurable chunking and retrieval parameters via UI
- [ ] Session renaming
